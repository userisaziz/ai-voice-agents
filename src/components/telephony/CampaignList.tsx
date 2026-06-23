'use client';

import { motion } from 'framer-motion';
import { Play, Pause, Square, Edit2, Trash2, Users, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CAMPAIGN_STATUSES } from '@/constants';
import type { OutboundCampaign } from '@/types';

interface CampaignListProps {
  campaigns: OutboundCampaign[];
  onEdit: (campaign: OutboundCampaign) => void;
  onDelete: (campaign: OutboundCampaign) => void;
  onTrigger: (campaign: OutboundCampaign, action: string) => void;
}

export function CampaignList({ campaigns, onEdit, onDelete, onTrigger }: CampaignListProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = CAMPAIGN_STATUSES.find(s => s.value === status);
    return (
      <Badge variant={statusConfig?.color as 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' || 'gray'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getProgress = (campaign: OutboundCampaign) => {
    if (campaign.total_leads === 0) return 0;
    return Math.round((campaign.completed_leads / campaign.total_leads) * 100);
  };

  return (
    <div className="space-y-3">
      {campaigns.map((campaign, i) => (
        <motion.div
          key={campaign.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl transition-all duration-150"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{campaign.name}</span>
                  {getStatusBadge(campaign.status)}
                </div>
                {campaign.description && (
                  <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>{campaign.description}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {campaign.status === 'draft' && (
                <Button variant="outline" size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={() => onTrigger(campaign, 'start')}>
                  Start
                </Button>
              )}
              {campaign.status === 'running' && (
                <>
                  <Button variant="ghost" size="sm" icon={<Pause className="w-3.5 h-3.5" />} onClick={() => onTrigger(campaign, 'pause')} />
                  <Button variant="ghost" size="sm" icon={<Square className="w-3.5 h-3.5" style={{ color: '#f87171' }} />} onClick={() => onTrigger(campaign, 'stop')} />
                </>
              )}
              {campaign.status === 'paused' && (
                <Button variant="outline" size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={() => onTrigger(campaign, 'resume')}>
                  Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => onEdit(campaign)} />
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" style={{ color: '#f87171' }} />} onClick={() => onDelete(campaign)} />
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px]" style={{ color: '#3d5060' }}>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{campaign.completed_leads}/{campaign.total_leads} leads</span>
            </div>
            {campaign.cron_expression && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{campaign.cron_expression}</span>
              </div>
            )}
          </div>

          {campaign.total_leads > 0 && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${getProgress(campaign)}%`,
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
