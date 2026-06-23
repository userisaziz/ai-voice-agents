import type { CallResult, CallStatus, ProviderCallStatus, TelephonyProviderType } from '@/types';

export interface MakeCallOptions {
  to: string;
  from: string;
  webhookUrl: string;
  statusCallbackUrl?: string;
  recordingEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TelephonyProviderInterface {
  readonly providerType: TelephonyProviderType;

  /**
   * Initiate an outbound call
   */
  makeCall(options: MakeCallOptions): Promise<CallResult>;

  /**
   * Hangup an active call
   */
  hangupCall(callId: string): Promise<void>;

  /**
   * Get the current status of a call
   */
  getCallStatus(callId: string): Promise<ProviderCallStatus>;

  /**
   * Validate that the configured credentials are valid and working
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Get available phone numbers from the provider (optional)
   */
  getAvailableNumbers?(areaCode?: string): Promise<string[]>;
}

export interface WebhookPayload {
  eventType: string;
  callId?: string;
  callSid?: string;
  from?: string;
  to?: string;
  status?: string;
  duration?: number;
  recordingUrl?: string;
  rawPayload: unknown;
}

export interface InboundCallPayload {
  callId: string;
  from: string;
  to: string;
  providerData: Record<string, unknown>;
}

export function parseCallStatus(providerStatus: string): CallStatus {
  const statusMap: Record<string, CallStatus> = {
    // Twilio statuses
    'queued': 'initiated',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'failed': 'failed',
    'no-answer': 'no-answer',
    'busy': 'busy',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    // Vapi-specific statuses
    'ended': 'completed',
    'error': 'failed',
  };
  return statusMap[providerStatus.toLowerCase()] || 'initiated';
}
