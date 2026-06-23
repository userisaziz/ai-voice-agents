import type { VapiCredentials } from '@/types';
import type { TelephonyProviderInterface, MakeCallOptions, WebhookPayload, InboundCallPayload } from './types';
import { parseCallStatus } from './types';

export class VapiProvider implements TelephonyProviderInterface {
  readonly providerType = 'vapi' as const;
  private credentials: VapiCredentials;
  private baseUrl = 'https://api.vapi.ai';

  constructor(credentials: VapiCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async makeCall(options: MakeCallOptions): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const payload = {
        assistantId: this.credentials.assistantId,
        customer: {
          number: options.to,
        },
        phoneNumberId: options.from,
        ...(options.metadata && { assistantOverrides: options.metadata }),
      };

      const response = await fetch(`${this.baseUrl}/call/phone`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to initiate call' };
      }

      const data = await response.json();
      return { success: true, callId: data.id || data.callId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to hangup call');
    }
  }

  async getCallStatus(callId: string): Promise<{ callId: string; status: import('@/types').CallStatus; duration?: number }> {
    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get call status');
    }

    const data = await response.json();
    return {
      callId: data.id,
      status: parseCallStatus(data.status),
      duration: data.endedAt && data.startedAt
        ? Math.floor((new Date(data.endedAt).getTime() - new Date(data.startedAt).getTime()) / 1000)
        : undefined,
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/assistant`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableNumbers(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/phone-number`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.map((n: { number: string }) => n.number) || [];
  }

  static parseWebhook(body: Record<string, unknown>): WebhookPayload {
    const message = body.message as Record<string, unknown> | undefined;
    return {
      eventType: (message?.type as string) || (body.type as string) || 'unknown',
      callId: (message?.callId as string) || (body.callId as string),
      from: (message?.from as string) || (body.from as string),
      to: (message?.to as string) || (body.to as string),
      status: (message?.status as string) || (body.status as string),
      duration: message?.duration as number | undefined,
      recordingUrl: (message?.recordingUrl as string) || (body.recordingUrl as string),
      rawPayload: body,
    };
  }

  static parseInboundCall(body: Record<string, unknown>): InboundCallPayload {
    const message = body.message as Record<string, unknown> | undefined;
    return {
      callId: (message?.callId as string) || (body.callId as string) || '',
      from: (message?.from as string) || (body.from as string) || '',
      to: (message?.to as string) || (body.to as string) || '',
      providerData: {
        type: message?.type || body.type,
        assistantId: message?.assistantId || body.assistantId,
      },
    };
  }
}
