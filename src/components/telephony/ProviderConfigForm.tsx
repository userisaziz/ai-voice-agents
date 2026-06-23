'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, TestTube, CheckCircle, XCircle, Server, Phone, Key } from 'lucide-react';
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
  const credErrors = errors.credentials as Record<string, { message?: string }> | undefined;

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);

    const credentials = providerType === 'twilio'
      ? { accountSid: watch('credentials.accountSid' as never), authToken: watch('credentials.authToken' as never) }
      : providerType === 'vapi'
      ? { apiKey: watch('credentials.apiKey' as never), assistantId: watch('credentials.assistantId' as never) }
      : providerType === 'vobiz'
      ? {
          apiKey: watch('credentials.apiKey' as never),
          sipTrunkId: watch('credentials.sipTrunkId' as never),
          outboundTrunkId: watch('credentials.outboundTrunkId' as never),
          sipDomain: watch('credentials.sipDomain' as never),
          sipUsername: watch('credentials.sipUsername' as never),
          sipPassword: watch('credentials.sipPassword' as never),
          outboundNumber: watch('credentials.outboundNumber' as never),
          defaultTransferNumber: watch('credentials.defaultTransferNumber' as never),
        }
      : {
          sipTrunkId: watch('credentials.sipTrunkId' as never),
          outboundTrunkId: watch('credentials.outboundTrunkId' as never),
          sipDomain: watch('credentials.sipDomain' as never),
          sipUsername: watch('credentials.sipUsername' as never),
          sipPassword: watch('credentials.sipPassword' as never),
          outboundNumber: watch('credentials.outboundNumber' as never),
          defaultTransferNumber: watch('credentials.defaultTransferNumber' as never),
        };

    const result = await onTest(providerType, credentials);
    setTestResult(result);
    setTesting(false);
  };

  const sectionStyle = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' };

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

      {/* ========== TWILIO ========== */}
      {providerType === 'twilio' && (
        <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Twilio Credentials</span>
          </div>
          <Input
            label="Account SID"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            error={credErrors?.accountSid?.message}
            {...register('credentials.accountSid' as never)}
            required
          />
          <Input
            label="Auth Token"
            placeholder="Your auth token"
            type="password"
            error={credErrors?.authToken?.message}
            {...register('credentials.authToken' as never)}
            required
          />
        </div>
      )}

      {/* ========== VAPI ========== */}
      {providerType === 'vapi' && (
        <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Vapi Credentials</span>
          </div>
          <Input
            label="API Key"
            placeholder="Your Vapi API key"
            type="password"
            error={credErrors?.apiKey?.message}
            {...register('credentials.apiKey' as never)}
            required
          />
          <Input
            label="Assistant ID (optional)"
            placeholder="Vapi assistant ID"
            error={credErrors?.assistantId?.message}
            {...register('credentials.assistantId' as never)}
          />
        </div>
      )}

      {/* ========== VOBIZ (API + SIP Trunk) ========== */}
      {providerType === 'vobiz' && (
        <div className="space-y-4">
          {/* API Section */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Vobiz API Credentials</span>
            </div>
            <Input
              label="API Key"
              placeholder="Your Vobiz API key"
              type="password"
              error={credErrors?.apiKey?.message}
              {...register('credentials.apiKey' as never)}
              required
            />
            <Input
              label="User ID (optional)"
              placeholder="Vobiz user ID"
              error={credErrors?.userId?.message}
              {...register('credentials.userId' as never)}
            />
          </div>

          {/* SIP Trunk Section */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4" style={{ color: '#60a5fa' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>SIP Trunk Configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SIP Trunk ID"
                placeholder="your_trunk_id"
                error={credErrors?.sipTrunkId?.message}
                {...register('credentials.sipTrunkId' as never)}
                required
              />
              <Input
                label="Outbound Trunk ID"
                placeholder="your_outbound_trunk_id"
                error={credErrors?.outboundTrunkId?.message}
                {...register('credentials.outboundTrunkId' as never)}
                required
              />
            </div>
            <Input
              label="SIP Domain"
              placeholder="your_sip_domain (e.g. sip.vobiz.com)"
              error={credErrors?.sipDomain?.message}
              {...register('credentials.sipDomain' as never)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SIP Username"
                placeholder="your_sip_username"
                error={credErrors?.sipUsername?.message}
                {...register('credentials.sipUsername' as never)}
                required
              />
              <Input
                label="SIP Password"
                placeholder="your_sip_password"
                type="password"
                error={credErrors?.sipPassword?.message}
                {...register('credentials.sipPassword' as never)}
                required
              />
            </div>
          </div>

          {/* Phone Numbers Section */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Phone Number Configuration</span>
            </div>
            <Input
              label="Outbound Number"
              placeholder="+91XXXXXXXXXX"
              error={credErrors?.outboundNumber?.message}
              {...register('credentials.outboundNumber' as never)}
              required
            />
            <Input
              label="Default Transfer Number"
              placeholder="+91XXXXXXXXXX"
              error={credErrors?.defaultTransferNumber?.message}
              {...register('credentials.defaultTransferNumber' as never)}
              required
            />
          </div>
        </div>
      )}

      {/* ========== SIP TRUNK (Generic) ========== */}
      {providerType === 'sip' && (
        <div className="space-y-4">
          {/* SIP Trunk Section */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4" style={{ color: '#60a5fa' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>SIP Trunk Configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SIP Trunk ID"
                placeholder="your_trunk_id"
                error={credErrors?.sipTrunkId?.message}
                {...register('credentials.sipTrunkId' as never)}
                required
              />
              <Input
                label="Outbound Trunk ID"
                placeholder="your_outbound_trunk_id"
                error={credErrors?.outboundTrunkId?.message}
                {...register('credentials.outboundTrunkId' as never)}
                required
              />
            </div>
            <Input
              label="SIP Domain"
              placeholder="your_sip_domain (e.g. sip.provider.com)"
              error={credErrors?.sipDomain?.message}
              {...register('credentials.sipDomain' as never)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SIP Username"
                placeholder="your_sip_username"
                error={credErrors?.sipUsername?.message}
                {...register('credentials.sipUsername' as never)}
                required
              />
              <Input
                label="SIP Password"
                placeholder="your_sip_password"
                type="password"
                error={credErrors?.sipPassword?.message}
                {...register('credentials.sipPassword' as never)}
                required
              />
            </div>
          </div>

          {/* Phone Numbers Section */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Phone Number Configuration</span>
            </div>
            <Input
              label="Outbound Number"
              placeholder="+91XXXXXXXXXX"
              error={credErrors?.outboundNumber?.message}
              {...register('credentials.outboundNumber' as never)}
              required
            />
            <Input
              label="Default Transfer Number"
              placeholder="+91XXXXXXXXXX"
              error={credErrors?.defaultTransferNumber?.message}
              {...register('credentials.defaultTransferNumber' as never)}
              required
            />
          </div>

          {/* Advanced SIP Settings */}
          <div className="space-y-3 p-4 rounded-xl" style={sectionStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Advanced SIP Settings (optional)</span>
            </div>
            <Input
              label="SIP Registrar"
              placeholder="sip.provider.com"
              error={credErrors?.sipRegistrar?.message}
              {...register('credentials.sipRegistrar' as never)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SIP Port"
                placeholder="5060"
                error={credErrors?.sipPort?.message}
                {...register('credentials.sipPort' as never)}
              />
              <Select
                label="Transport"
                options={[
                  { value: 'udp', label: 'UDP' },
                  { value: 'tcp', label: 'TCP' },
                  { value: 'tls', label: 'TLS' },
                ]}
                error={credErrors?.sipTransport?.message}
                {...register('credentials.sipTransport' as never)}
              />
            </div>
          </div>
        </div>
      )}

      <Input
        label="Webhook URL (optional)"
        placeholder="https://your-app.com/api/telephony/webhooks"
        error={errors.webhook_url?.message}
        {...register('webhook_url')}
      />

      <div className="flex items-center justify-between p-4 rounded-xl" style={sectionStyle}>
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
