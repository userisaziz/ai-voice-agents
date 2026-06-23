'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { outboundCampaignSchema, type OutboundCampaignFormData } from '@/validations';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ScheduleEditor } from './ScheduleEditor';
import { TIMEZONES } from '@/constants';
import type { OutboundCampaign, PhoneNumber, Agent } from '@/types';

interface CampaignFormProps {
  campaign?: OutboundCampaign | null;
  phoneNumbers: PhoneNumber[];
  agents: Agent[];
  onSubmit: (data: OutboundCampaignFormData) => Promise<void>;
  onCancel: () => void;
}

export function CampaignForm({ campaign, phoneNumbers, agents, onSubmit, onCancel }: CampaignFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<OutboundCampaignFormData>({
    resolver: zodResolver(outboundCampaignSchema),
    defaultValues: campaign ? {
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
      cron_expression: campaign.cron_expression || '',
      timezone: campaign.timezone,
      caller_number_id: campaign.caller_number_id,
      agent_id: campaign.agent_id,
      max_concurrent_calls: campaign.max_concurrent_calls,
      call_delay_seconds: campaign.call_delay_seconds,
      retry_attempts: campaign.retry_attempts,
      retry_delay_minutes: campaign.retry_delay_minutes,
    } : {
      status: 'draft',
      timezone: 'America/New_York',
      max_concurrent_calls: 1,
      call_delay_seconds: 0,
      retry_attempts: 0,
      retry_delay_minutes: 30,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Campaign Name"
        placeholder="Q1 Outreach Campaign"
        error={errors.name?.message}
        {...register('name')}
        required
      />

      <Textarea
        label="Description (optional)"
        placeholder="Brief description of this campaign..."
        rows={2}
        {...register('description')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Caller Number"
          placeholder="Select a phone number"
          options={phoneNumbers.filter(p => p.direction !== 'inbound').map(p => ({
            value: p.id,
            label: `${p.number}${p.friendly_name ? ` (${p.friendly_name})` : ''}`,
          }))}
          error={errors.caller_number_id?.message}
          {...register('caller_number_id')}
        />

        <Select
          label="AI Agent"
          placeholder="Select an agent"
          options={[
            { value: '', label: 'Use default agent' },
            ...agents.map(a => ({ value: a.id, label: a.name })),
          ]}
          error={errors.agent_id?.message}
          {...register('agent_id')}
        />
      </div>

      <ScheduleEditor
        value={watch('cron_expression') || ''}
        onChange={(val: string) => setValue('cron_expression', val)}
      />

      <Select
        label="Timezone"
        options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
        {...register('timezone')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max Concurrent Calls"
          type="number"
          min={1}
          max={10}
          error={errors.max_concurrent_calls?.message}
          {...register('max_concurrent_calls', { valueAsNumber: true })}
        />

        <Input
          label="Delay Between Calls (seconds)"
          type="number"
          min={0}
          max={60}
          error={errors.call_delay_seconds?.message}
          {...register('call_delay_seconds', { valueAsNumber: true })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Retry Attempts"
          type="number"
          min={0}
          max={5}
          error={errors.retry_attempts?.message}
          {...register('retry_attempts', { valueAsNumber: true })}
        />

        <Input
          label="Retry Delay (minutes)"
          type="number"
          min={5}
          max={1440}
          error={errors.retry_delay_minutes?.message}
          {...register('retry_delay_minutes', { valueAsNumber: true })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          {campaign ? 'Save Changes' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  );
}
