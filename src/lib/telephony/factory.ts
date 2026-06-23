import type { TelephonyProvider, TelephonyCredentials, TwilioCredentials, VapiCredentials, VobizCredentials } from '@/types';
import type { TelephonyProviderInterface } from './types';
import { TwilioProvider } from './twilio';
import { VapiProvider } from './vapi';

export class UnsupportedProviderError extends Error {
  constructor(providerType: string) {
    super(`Unsupported provider type: ${providerType}`);
    this.name = 'UnsupportedProviderError';
  }
}

export function createTelephonyProvider(provider: TelephonyProvider): TelephonyProviderInterface {
  return createProviderFromType(provider.provider_type, provider.credentials);
}

export function createProviderFromType(
  providerType: string,
  credentials: TelephonyCredentials
): TelephonyProviderInterface {
  switch (providerType) {
    case 'twilio':
      return new TwilioProvider(credentials as TwilioCredentials);
    case 'vapi':
      return new VapiProvider(credentials as VapiCredentials);
    case 'vobiz':
      // Vobiz uses a similar API pattern to Vapi, fallback to Vapi for now
      return new VapiProvider(credentials as VobizCredentials as unknown as VapiCredentials);
    default:
      throw new UnsupportedProviderError(providerType);
  }
}

export function isTwilioCredentials(creds: TelephonyCredentials): creds is TwilioCredentials {
  return 'accountSid' in creds && 'authToken' in creds;
}

export function isVapiCredentials(creds: TelephonyCredentials): creds is VapiCredentials {
  return 'apiKey' in creds && !('userId' in creds);
}

export function isVobizCredentials(creds: TelephonyCredentials): creds is VobizCredentials {
  return 'apiKey' in creds && 'userId' in creds;
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
        return { valid: true };
      }
      default:
        return { valid: false, error: `Unknown provider type: ${providerType}` };
    }
  } catch {
    return { valid: false, error: 'Invalid credentials format' };
  }
}
