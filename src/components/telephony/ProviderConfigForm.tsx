'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { telephonyProviderSchema, type TelephonyProviderFormData } from '@/validations';
import { TELEPHONY_PROVIDERS } from '@/constants';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import type { TelephonyProvider } from '@/types';

interface ProviderConfigFormProps {
  provider?: TelephonyProvider | null;
  onSubmit: (data: TelephonyProviderFormData) => Promise<void>;
  onTest?: (providerType: string, credentials: unknown) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function ProviderConfigForm({ provider, onSubmit, onTest, onCancel }: ProviderConfigFormProps) {
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<TelephonyProviderFormData>({
    resolver: zodResolver(telephonyProviderSchema),
    defaultValues: provider ? {
      name: provider.name,
      provider_type: provider.provider_type,
      credentials: provider.credentials as TelephonyProviderFormData['credentials'],
      is_default: provider.is_default,
      is_active: provider.is_active,
      webhook_url: provider.webhook_url || '',
    } : {
      provider_type: 'twilio',
      is_default: false,
      is_active: true,
    },
  });

  const providerType = watch('provider_type');

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);

    const credentials = providerType === 'twilio'
      ? { accountSid: watch('credentials.accountSid' as never), authToken: watch('credentials.authToken' as never) }
      : { apiKey: watch('credentials.apiKey' as never) };

    const result = await onTest(providerType, credentials);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Provider Name"
        placeholder="My Twilio Account"
        error={errors.name?.message}
        {...register('name')}
        required
      />

      <Select
        label="Provider Type"
        options={TELEPHONY_PROVIDERS.map(p => ({ value: p.value, label: `${p.label} - ${p.description}` }))}
        error={errors.provider_type?.message}
        {...register('provider_type')}
      />

      {providerType === 'twilio' && (
        <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Twilio Credentials</span>
          </div>
          <Input
            label="Account SID"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            error={(errors.credentials as Record<string, { message?: string }>)?.accountSid?.message}
            {...register('credentials.accountSid' as never)}
            required
          />
          <Input
            label="Auth Token"
            placeholder="Your auth token"
            type="password"
            error={(errors.credentials as Record<string, { message?: string }>)?.authToken?.message}
            {...register('credentials.authToken' as never)}
            required
          />
        </div>
      )}

      {(providerType === 'vapi' || providerType === 'vobiz') && (
        <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{providerType === 'vapi' ? 'Vapi' : 'Vobiz'} Credentials</span>
          </div>
          <Input
            label="API Key"
            placeholder="Your API key"
            type="password"
            error={(errors.credentials as Record<string, { message?: string }>)?.apiKey?.message}
            {...register('credentials.apiKey' as never)}
            required
          />
        </div>
      )}

      <Input
        label="Webhook URL (optional)"
        placeholder="https://your-app.com/api/telephony/webhooks"
        error={errors.webhook_url?.message}
        {...register('webhook_url')}
      />

      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Default Provider</div>
          <div className="text-[11px]" style={{ color: '#3d5060' }}>Use this provider for new phone numbers</div>
        </div>
        <Toggle checked={watch('is_default')} onChange={(val) => setValue('is_default', val)} />
      </div>

      {testResult && (
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{
          background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {testResult.success ? (
            <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
          ) : (
            <XCircle className="w-4 h-4" style={{ color: '#f87171' }} />
          )}
          <span className="text-[12px]" style={{ color: testResult.success ? '#4ade80' : '#f87171' }}>
            {testResult.success ? 'Credentials validated successfully' : testResult.error || 'Validation failed'}
          </span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        {onTest && (
          <Button type="button" variant="outline" icon={<TestTube className="w-4 h-4" />} loading={testing} onClick={handleTest}>
            Test Credentials
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {provider ? 'Save Changes' : 'Add Provider'}
          </Button>
        </div>
      </div>
    </form>
  );
}
