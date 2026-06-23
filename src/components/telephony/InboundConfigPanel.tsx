'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Bot, MessageSquare, Calendar, HelpCircle, Info } from 'lucide-react';
import { inboundConfigSchema, type InboundConfigFormData } from '@/validations';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Textarea } from '@/components/ui/Textarea';
import type { InboundConfig, PhoneNumber, Agent } from '@/types';

interface InboundConfigPanelProps {
  config?: InboundConfig | null;
  phoneNumbers: PhoneNumber[];
  agents: Agent[];
  onSubmit: (data: InboundConfigFormData) => Promise<void>;
  onCancel: () => void;
}

export function InboundConfigPanel({ config, phoneNumbers, agents, onSubmit, onCancel }: InboundConfigPanelProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<InboundConfigFormData>({
    resolver: zodResolver(inboundConfigSchema),
    defaultValues: config ? {
      phone_number_id: config.phone_number_id,
      agent_id: config.agent_id,
      greeting_override: config.greeting_override || '',
      lead_capture_enabled: config.lead_capture_enabled,
      appointment_booking_enabled: config.appointment_booking_enabled,
      faq_enabled: config.faq_enabled,
      service_info_enabled: config.service_info_enabled,
      is_active: config.is_active,
    } : {
      lead_capture_enabled: true,
      appointment_booking_enabled: true,
      faq_enabled: true,
      service_info_enabled: true,
      is_active: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Phone Number"
        placeholder="Select a phone number"
        options={phoneNumbers.map(p => ({ value: p.id, label: `${p.number}${p.friendly_name ? ` (${p.friendly_name})` : ''}` }))}
        error={errors.phone_number_id?.message}
        {...register('phone_number_id')}
        disabled={!!config}
      />

      <Select
        label="Assigned Agent"
        placeholder="Select an AI agent"
        options={[
          { value: '', label: 'No agent (use default)' },
          ...agents.map(a => ({ value: a.id, label: a.name })),
        ]}
        error={errors.agent_id?.message}
        {...register('agent_id')}
      />

      <Textarea
        label="Custom Greeting (optional)"
        placeholder="Hello! Thank you for calling..."
        rows={3}
        {...register('greeting_override')}
      />

      <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-[13px] font-semibold mb-3" style={{ color: '#e2e8f0' }}>Features</div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[12px]" style={{ color: '#94a3b8' }}>Lead Capture</span>
          </div>
          <Toggle checked={watch('lead_capture_enabled')} onChange={(val) => setValue('lead_capture_enabled', val)} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[12px]" style={{ color: '#94a3b8' }}>Appointment Booking</span>
          </div>
          <Toggle checked={watch('appointment_booking_enabled')} onChange={(val) => setValue('appointment_booking_enabled', val)} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[12px]" style={{ color: '#94a3b8' }}>FAQ Responses</span>
          </div>
          <Toggle checked={watch('faq_enabled')} onChange={(val) => setValue('faq_enabled', val)} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-[12px]" style={{ color: '#94a3b8' }}>Service Information</span>
          </div>
          <Toggle checked={watch('service_info_enabled')} onChange={(val) => setValue('service_info_enabled', val)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          {config ? 'Save Changes' : 'Create Config'}
        </Button>
      </div>
    </form>
  );
}
