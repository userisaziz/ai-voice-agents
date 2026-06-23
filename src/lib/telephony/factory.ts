import type { TelephonyProvider, TelephonyCredentials, TwilioCredentials, VapiCredentials, VobizCredentials, SipCredentials } from '@/types';
import type { TelephonyProviderInterface } from './types';
import { TwilioProvider } from './twilio';
import { VapiProvider } from './vapi';
import { VobizProvider } from './vobiz';
import { SipProvider } from './sip';

export class UnsupportedProviderError extends Error {
  constructor(providerType: string) {
    super(`Unsupported provider type: ${providerType}`);
    this.name = 'UnsupportedProviderError';
  }
}

export function createTelephonyProvider(provider: TelephonyProvider): TelephonyProviderInterface {
  return createProviderFromType(provider.provider_type, provider.credentials, provider.webhook_url || undefined);
}

export function createProviderFromType(
  providerType: string,
  credentials: TelephonyCredentials,
  apiBaseUrl?: string
): TelephonyProviderInterface {
  switch (providerType) {
    case 'twilio':
      return new TwilioProvider(credentials as TwilioCredentials);
    case 'vapi':
      return new VapiProvider(credentials as VapiCredentials);
    case 'vobiz':
      return new VobizProvider(credentials as VobizCredentials);
    case 'sip':
      return new SipProvider(credentials as SipCredentials, apiBaseUrl);
    default:
      throw new UnsupportedProviderError(providerType);
  }
}

export function isTwilioCredentials(creds: TelephonyCredentials): creds is TwilioCredentials {
  return 'accountSid' in creds && 'authToken' in creds;
}

export function isVapiCredentials(creds: TelephonyCredentials): creds is VapiCredentials {
  return 'apiKey' in creds && !('userId' in creds) && !('sipTrunkId' in creds);
}

export function isVobizCredentials(creds: TelephonyCredentials): creds is VobizCredentials {
  return 'apiKey' in creds && 'sipTrunkId' in creds;
}

export function isSipCredentials(creds: TelephonyCredentials): creds is SipCredentials {
  return !('apiKey' in creds) && 'sipTrunkId' in creds;
}

export function validateCredentialsFormat(
  providerType: string,
  credentials: unknown
): { valid: boolean; error?: string } {
  try {
    switch (providerType) {
      case 'twilio': {
        const creds = credentials as TwilioCredentials;
        if (!creds.accountSid || !creds.authToken) {
          return { valid: false, error: 'Twilio requires accountSid and authToken' };
        }
        if (!creds.accountSid.startsWith('AC')) {
          return { valid: false, error: 'Account SID should start with AC' };
        }
        return { valid: true };
      }
      case 'vapi': {
        const creds = credentials as VapiCredentials;
        if (!creds.apiKey) {
          return { valid: false, error: 'Vapi requires apiKey' };
        }
        return { valid: true };
      }
      case 'vobiz': {
        const creds = credentials as VobizCredentials;
        if (!creds.apiKey) {
          return { valid: false, error: 'Vobiz requires apiKey' };
        }
        if (!creds.sipTrunkId) {
          return { valid: false, error: 'Vobiz requires SIP Trunk ID' };
        }
        if (!creds.sipDomain) {
          return { valid: false, error: 'Vobiz requires SIP Domain' };
        }
        if (!creds.sipUsername || !creds.sipPassword) {
          return { valid: false, error: 'Vobiz requires SIP credentials' };
        }
        if (!creds.outboundNumber) {
          return { valid: false, error: 'Vobiz requires outbound number' };
        }
        if (!creds.defaultTransferNumber) {
          return { valid: false, error: 'Vobiz requires default transfer number' };
        }
        return { valid: true };
      }
      case 'sip': {
        const creds = credentials as SipCredentials;
        if (!creds.sipTrunkId) {
          return { valid: false, error: 'SIP Trunk ID is required' };
        }
        if (!creds.sipDomain) {
          return { valid: false, error: 'SIP Domain is required' };
        }
        if (!creds.sipUsername || !creds.sipPassword) {
          return { valid: false, error: 'SIP credentials (username/password) are required' };
        }
        if (!creds.outboundNumber) {
          return { valid: false, error: 'Outbound number is required' };
        }
        if (!creds.defaultTransferNumber) {
          return { valid: false, error: 'Default transfer number is required' };
        }
        return { valid: true };
      }
      default:
        return { valid: false, error: `Unknown provider type: ${providerType}` };
    }
  } catch {
    return { valid: false, error: 'Invalid credentials format' };
  }
}
