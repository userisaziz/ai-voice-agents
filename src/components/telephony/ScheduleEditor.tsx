'use client';

import { Clock } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { CRON_PRESETS } from '@/constants';

interface ScheduleEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const matchedPreset = CRON_PRESETS.find(p => p.value === value);

  return (
    <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4" style={{ color: '#4ade80' }} />
        <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Schedule</span>
      </div>

      <Select
        label="Preset Schedule"
        placeholder="Select a preset or enter custom"
        options={[
          { value: '', label: 'Custom (manual entry)' },
          ...CRON_PRESETS.map(p => ({ value: p.value, label: p.label })),
        ]}
        value={matchedPreset?.value || ''}
        onChange={(e) => {
          const target = e.target as HTMLSelectElement;
          if (target.value) {
            onChange(target.value);
          }
        }}
      />

      <Input
        label="Cron Expression"
        placeholder="0 9 * * 1-5"
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        hint="Format: minute hour day month weekday (e.g., '0 9 * * 1-5' for weekdays at 9 AM)"
      />

      {value && (
        <div className="text-[11px] p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.05)', color: '#4ade80' }}>
          {describeCron(value)}
        </div>
      )}
    </div>
  );
}

function describeCron(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return 'Custom schedule';

  const [minute, hour, day, month, weekday] = parts;

  if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Runs every hour at minute 0';
  }
  if (minute === '0' && hour.startsWith('*/')) {
    return `Runs every ${hour.slice(2)} hours`;
  }
  if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `Runs daily at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (minute !== '*' && hour !== '*' && weekday === '1-5') {
    return `Runs weekdays at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (minute !== '*' && hour !== '*' && weekday === '1') {
    return `Runs every Monday at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (minute !== '*' && hour !== '*' && day !== '*' && month === '*') {
    return `Runs on day ${day} of each month at ${hour}:${minute.padStart(2, '0')}`;
  }

  return `Cron: ${cron}`;
}
