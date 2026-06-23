import type { TwilioCredentials } from '@/types';
import type { TelephonyProviderInterface, MakeCallOptions, WebhookPayload, InboundCallPayload } from './types';
import { parseCallStatus } from './types';

export class TwilioProvider implements TelephonyProviderInterface {
  readonly providerType = 'twilio' as const;
  private credentials: TwilioCredentials;
  private baseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(credentials: TwilioCredentials) {
    this.credentials = credentials;
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.credentials.accountSid}:${this.credentials.authToken}`).toString('base64');
    return `Basic ${auth}`;
  }

  async makeCall(options: MakeCallOptions): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const params = new URLSearchParams({
        To: options.to,
        From: options.from,
        Url: options.webhookUrl,
      });

      if (options.statusCallbackUrl) {
        params.append('StatusCallback', options.statusCallbackUrl);
        params.append('StatusCallbackEvent', 'initiated ringing answered completed');
        params.append('StatusCallbackMethod', 'POST');
      }

      if (options.recordingEnabled) {
        params.append('Record', 'true');
        params.append('RecordingStatusCallback', options.statusCallbackUrl || options.webhookUrl);
      }

      const response = await fetch(`${this.baseUrl}/Accounts/${this.credentials.accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Failed to initiate call' };
      }

      const data = await response.json();
      return { success: true, callId: data.sid };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callId: string): Promise<void> {
    const params = new URLSearchParams({ Status: 'completed' });

    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.credentials.accountSid}/Calls/${callId}.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to hangup call');
    }
  }

  async getCallStatus(callId: string): Promise<{ callId: string; status: import('@/types').CallStatus; duration?: number }> {
    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.credentials.accountSid}/Calls/${callId}.json`,
      {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get call status');
    }

    const data = await response.json();
    return {
      callId: data.sid,
      status: parseCallStatus(data.status),
      duration: data.duration ? parseInt(data.duration, 10) : undefined,
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/Accounts/${this.credentials.accountSid}.json`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableNumbers(areaCode?: string): Promise<string[]> {
    const params = new URLSearchParams({
      PageSize: '10',
      VoiceEnabled: 'true',
    });

    if (areaCode) {
      params.append('AreaCode', areaCode);
    }

    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.credentials.accountSid}/AvailablePhoneNumbers/US/Local.json?${params}`,
      {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.available_phone_numbers?.map((n: { phone_number: string }) => n.phone_number) || [];
  }

  static parseWebhook(body: Record<string, unknown>): WebhookPayload {
    return {
      eventType: body.CallStatus as string || 'unknown',
      callId: body.CallSid as string,
      callSid: body.CallSid as string,
      from: body.From as string,
      to: body.To as string,
      status: body.CallStatus as string,
      duration: body.CallDuration ? parseInt(body.CallDuration as string, 10) : undefined,
      recordingUrl: body.RecordingUrl as string,
      rawPayload: body,
    };
  }

  static parseInboundCall(body: Record<string, unknown>): InboundCallPayload {
    return {
      callId: body.CallSid as string,
      from: body.From as string,
      to: body.To as string,
      providerData: {
        callStatus: body.CallStatus,
        direction: body.Direction,
        apiVersion: body.ApiVersion,
        accountSid: body.AccountSid,
      },
    };
  }

  static generateTwiML(options: {
    actionUrl?: string;
    greeting?: string;
    agentConnectUrl?: string;
  }): string {
    const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

    if (options.greeting) {
      parts.push(`  <Say>${options.greeting}</Say>`);
    }

    if (options.agentConnectUrl) {
      parts.push(`  <Dial>`);
      parts.push(`    <Conference>${options.agentConnectUrl}</Conference>`);
      parts.push(`  </Dial>`);
    } else if (options.actionUrl) {
      parts.push(`  <Gather input="speech dtmf" action="${options.actionUrl}" method="POST">`);
      parts.push(`    <Say>Please hold while we connect you.</Say>`);
      parts.push(`  </Gather>`);
    }

    parts.push('</Response>');
    return parts.join('\n');
  }
}
