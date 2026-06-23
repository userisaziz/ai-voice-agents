import type { SipCredentials } from '@/types';
import type { TelephonyProviderInterface, MakeCallOptions, WebhookPayload, InboundCallPayload } from './types';
import { parseCallStatus } from './types';

/**
 * Generic SIP Trunk Provider for direct SIP integration.
 * Works with any SIP trunk provider (e.g., Twilio SIP, Telnyx, SignalWire, etc.)
 */
export class SipProvider implements TelephonyProviderInterface {
  readonly providerType = 'sip' as const;
  private credentials: SipCredentials;
  private apiBaseUrl?: string;

  constructor(credentials: SipCredentials, apiBaseUrl?: string) {
    this.credentials = credentials;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get SIP trunk configuration for call routing
   */
  getSipTrunkConfig() {
    return {
      trunkId: this.credentials.sipTrunkId,
      outboundTrunkId: this.credentials.outboundTrunkId,
      domain: this.credentials.sipDomain,
      username: this.credentials.sipUsername,
      password: this.credentials.sipPassword,
      outboundNumber: this.credentials.outboundNumber,
      transferNumber: this.credentials.defaultTransferNumber,
      registrar: this.credentials.sipRegistrar,
      port: this.credentials.sipPort || '5060',
      transport: this.credentials.sipTransport || 'udp',
    };
  }

  /**
   * Build SIP URI for outbound calls
   */
  private buildSipUri(user: string): string {
    const port = this.credentials.sipPort ? `:${this.credentials.sipPort}` : '';
    const transport = this.credentials.sipTransport ? `;transport=${this.credentials.sipTransport}` : '';
    return `sip:${user}@${this.credentials.sipDomain}${port}${transport}`;
  }

  async makeCall(options: MakeCallOptions): Promise<{ success: boolean; callId?: string; error?: string }> {
    if (!this.apiBaseUrl) {
      return {
        success: false,
        error: 'SIP provider requires an API base URL for REST call control. Configure webhook_url on the provider.',
      };
    }

    try {
      const sipConfig = this.getSipTrunkConfig();

      const payload = {
        to: options.to,
        from: options.from || sipConfig.outboundNumber,
        trunk_id: sipConfig.trunkId,
        outbound_trunk_id: sipConfig.outboundTrunkId,
        sip_uri: this.buildSipUri(options.to),
        sip_domain: sipConfig.domain,
        sip_username: sipConfig.username,
        webhook_url: options.webhookUrl,
        status_callback_url: options.statusCallbackUrl || options.webhookUrl,
        recording_enabled: options.recordingEnabled || false,
        transfer_number: sipConfig.transferNumber,
        transport: sipConfig.transport,
        metadata: options.metadata || {},
      };

      const response = await fetch(`${this.apiBaseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sipConfig.username}:${sipConfig.password}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Failed to initiate SIP call' };
      }

      const data = await response.json();
      return { success: true, callId: data.id || data.call_id || data.callId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callId: string): Promise<void> {
    if (!this.apiBaseUrl) {
      throw new Error('SIP provider API base URL not configured');
    }

    const sipConfig = this.getSipTrunkConfig();

    const response = await fetch(`${this.apiBaseUrl}/calls/${callId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sipConfig.username}:${sipConfig.password}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to hangup SIP call');
    }
  }

  async getCallStatus(callId: string): Promise<{ callId: string; status: import('@/types').CallStatus; duration?: number }> {
    if (!this.apiBaseUrl) {
      throw new Error('SIP provider API base URL not configured');
    }

    const sipConfig = this.getSipTrunkConfig();

    const response = await fetch(`${this.apiBaseUrl}/calls/${callId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sipConfig.username}:${sipConfig.password}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get SIP call status');
    }

    const data = await response.json();
    return {
      callId: data.id || data.call_id,
      status: parseCallStatus(data.status),
      duration: data.duration_seconds || (
        data.ended_at && data.started_at
          ? Math.floor((new Date(data.ended_at).getTime() - new Date(data.started_at).getTime()) / 1000)
          : undefined
      ),
    };
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.apiBaseUrl) {
      // Without API base URL, we can only validate that credentials are non-empty
      return !!(
        this.credentials.sipTrunkId &&
        this.credentials.sipDomain &&
        this.credentials.sipUsername &&
        this.credentials.sipPassword &&
        this.credentials.outboundNumber
      );
    }

    try {
      const sipConfig = this.getSipTrunkConfig();
      const response = await fetch(`${this.apiBaseUrl}/trunks/${sipConfig.trunkId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sipConfig.username}:${sipConfig.password}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableNumbers(): Promise<string[]> {
    // SIP trunks typically don't expose number inventory via API
    // Return the configured outbound number if available
    return this.credentials.outboundNumber ? [this.credentials.outboundNumber] : [];
  }

  /**
   * Transfer an active call to the configured transfer number
   */
  async transferCall(callId: string, transferTo?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiBaseUrl) {
      return { success: false, error: 'SIP provider API base URL not configured' };
    }

    try {
      const target = transferTo || this.credentials.defaultTransferNumber;
      const sipConfig = this.getSipTrunkConfig();

      const response = await fetch(`${this.apiBaseUrl}/calls/${callId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sipConfig.username}:${sipConfig.password}`,
        },
        body: JSON.stringify({ to: target, sip_uri: this.buildSipUri(target) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Transfer failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static parseWebhook(body: Record<string, unknown>): WebhookPayload {
    return {
      eventType: (body.event_type as string) || (body.status as string) || 'unknown',
      callId: (body.call_id as string) || (body.id as string),
      callSid: (body.call_id as string) || (body.id as string),
      from: (body.from as string) || (body.from_number as string),
      to: (body.to as string) || (body.to_number as string),
      status: (body.status as string) || (body.call_status as string),
      duration: body.duration_seconds as number | undefined,
      recordingUrl: (body.recording_url as string) || undefined,
      rawPayload: body,
    };
  }

  static parseInboundCall(body: Record<string, unknown>): InboundCallPayload {
    return {
      callId: (body.call_id as string) || (body.id as string) || '',
      from: (body.from as string) || (body.from_number as string) || '',
      to: (body.to as string) || (body.to_number as string) || '',
      providerData: {
        trunk_id: body.trunk_id,
        sip_domain: body.sip_domain,
        sip_username: body.sip_username,
        transport: body.transport,
      },
    };
  }
}
