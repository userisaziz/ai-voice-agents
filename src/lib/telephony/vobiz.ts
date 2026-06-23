import type { VobizCredentials } from '@/types';
import type { TelephonyProviderInterface, MakeCallOptions, WebhookPayload, InboundCallPayload } from './types';
import { parseCallStatus } from './types';

export class VobizProvider implements TelephonyProviderInterface {
  readonly providerType = 'vobiz' as const;
  private credentials: VobizCredentials;
  private baseUrl = 'https://api.vobiz.com/v1';

  constructor(credentials: VobizCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Build SIP URI for outbound calls
   */
  private buildSipUri(to: string): string {
    return `sip:${to}@${this.credentials.sipDomain}`;
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
    };
  }

  async makeCall(options: MakeCallOptions): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const sipConfig = this.getSipTrunkConfig();

      const payload = {
        to: options.to,
        from: options.from || sipConfig.outboundNumber,
        trunk_id: sipConfig.trunkId,
        outbound_trunk_id: sipConfig.outboundTrunkId,
        sip_domain: sipConfig.domain,
        webhook_url: options.webhookUrl,
        status_callback_url: options.statusCallbackUrl || options.webhookUrl,
        recording_enabled: options.recordingEnabled || false,
        transfer_number: sipConfig.transferNumber,
        metadata: options.metadata || {},
      };

      const response = await fetch(`${this.baseUrl}/calls`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Failed to initiate call' };
      }

      const data = await response.json();
      return { success: true, callId: data.id || data.call_id || data.callId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to hangup call');
    }
  }

  async getCallStatus(callId: string): Promise<{ callId: string; status: import('@/types').CallStatus; duration?: number }> {
    const response = await fetch(`${this.baseUrl}/calls/${callId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get call status');
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
    try {
      // Validate API key
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) return false;

      // Validate SIP trunk exists
      const trunkResponse = await fetch(`${this.baseUrl}/trunks/${this.credentials.sipTrunkId}`, {
        headers: this.getHeaders(),
      });

      return trunkResponse.ok;
    } catch {
      return false;
    }
  }

  async getAvailableNumbers(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/phone-numbers`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.map((n: { number: string }) => n.number) || [];
    } catch {
      return [];
    }
  }

  /**
   * Transfer an active call to the configured transfer number
   */
  async transferCall(callId: string, transferTo?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const target = transferTo || this.credentials.defaultTransferNumber;

      const response = await fetch(`${this.baseUrl}/calls/${callId}/transfer`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ to: target }),
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
        status: body.status,
      },
    };
  }
}
