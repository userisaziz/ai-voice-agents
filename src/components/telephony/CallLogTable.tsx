'use client';

import { motion } from 'framer-motion';
import { PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CALL_STATUSES } from '@/constants';
import type { CallLog } from '@/types';

interface CallLogTableProps {
  calls: CallLog[];
  loading?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status: string) {
  const statusConfig = CALL_STATUSES.find(s => s.value === status);
  const variantMap: Record<string, 'green' | 'red' | 'yellow' | 'gray' | 'blue'> = {
    completed: 'green',
    failed: 'red',
    busy: 'yellow',
    'no-answer': 'yellow',
    ringing: 'blue',
    'in-progress': 'blue',
    queued: 'gray',
    initiated: 'gray',
  };
  return (
    <Badge variant={variantMap[status] || 'gray'}>
      {statusConfig?.label || status}
    </Badge>
  );
}

export function CallLogTable({ calls, loading }: CallLogTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#4ade80' }}>
          <PhoneIncoming className="w-5 h-5" />
        </div>
        <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>No call history</div>
        <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>Calls will appear here once made or received</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2a3f4d' }}>
        <div className="col-span-1">Dir</div>
        <div className="col-span-2">From</div>
        <div className="col-span-2">To</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Duration</div>
        <div className="col-span-3">Time</div>
      </div>

      {/* Rows */}
      {calls.map((call, i) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl transition-all duration-150"
          style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.01)'; }}
        >
          {/* Direction */}
          <div className="col-span-1">
            {call.direction === 'inbound' ? (
              <PhoneIncoming className="w-4 h-4" style={{ color: '#60a5fa' }} />
            ) : (
              <PhoneOutgoing className="w-4 h-4" style={{ color: '#4ade80' }} />
            )}
          </div>

          {/* From */}
          <div className="col-span-2 text-[12px] truncate" style={{ color: '#94a3b8' }}>
            {call.from_number || '-'}
          </div>

          {/* To */}
          <div className="col-span-2 text-[12px] truncate" style={{ color: '#94a3b8' }}>
            {call.to_number || '-'}
          </div>

          {/* Status */}
          <div className="col-span-2">
            {getStatusBadge(call.status)}
          </div>

          {/* Duration */}
          <div className="col-span-2 flex items-center gap-1 text-[12px]" style={{ color: '#94a3b8' }}>
            <Clock className="w-3 h-3" style={{ color: '#3d5060' }} />
            {formatDuration(call.duration_seconds)}
          </div>

          {/* Time */}
          <div className="col-span-3 text-[11px]" style={{ color: '#3d5060' }}>
            {formatDate(call.started_at || call.created_at)}
            {call.provider_type && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.04)', color: '#4b6070' }}>
                {call.provider_type}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
