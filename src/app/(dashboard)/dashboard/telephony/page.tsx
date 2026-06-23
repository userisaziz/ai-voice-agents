'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneIncoming, PhoneOutgoing, Radio, History, Plus } from 'lucide-react';
import { useBusinessStore } from '@/store/business';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// Telephony components
import { ProviderConfigForm } from '@/components/telephony/ProviderConfigForm';
import { InboundConfigPanel } from '@/components/telephony/InboundConfigPanel';
import { CampaignList } from '@/components/telephony/CampaignList';
import { CampaignForm } from '@/components/telephony/CampaignForm';
import { LeadUploadModal } from '@/components/telephony/LeadUploadModal';
import { PhoneNumberManager } from '@/components/telephony/PhoneNumberManager';
import { CallLogTable } from '@/components/telephony/CallLogTable';

// Services
import { getAgents } from '@/services/agents';
import { getTelephonyProviders, createTelephonyProvider, updateTelephonyProvider, deleteTelephonyProvider } from '@/services/telephony-providers';
import { getPhoneNumbers, createPhoneNumber, updatePhoneNumber, deletePhoneNumber } from '@/services/phone-numbers';
import { getInboundConfigs, createInboundConfig, updateInboundConfig, deleteInboundConfig } from '@/services/inbound-configs';
import { getOutboundCampaigns, createOutboundCampaign, updateOutboundCampaign, deleteOutboundCampaign } from '@/services/outbound-campaigns';
import { getCallLogs } from '@/services/call-logs';

// Types & validations
import type {
  Agent, TelephonyProvider, PhoneNumber, InboundConfig,
  OutboundCampaign, CallLog,
} from '@/types';
import type {
  TelephonyProviderFormData, InboundConfigFormData, OutboundCampaignFormData,
} from '@/validations';

const TABS = [
  { id: 'inbound',     label: 'Inbound',       icon: PhoneIncoming },
  { id: 'outbound',    label: 'Outbound',      icon: PhoneOutgoing },
  { id: 'providers',   label: 'Providers',     icon: Radio },
  { id: 'numbers',     label: 'Phone Numbers', icon: Phone },
  { id: 'call-logs',   label: 'Call Logs',     icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TelephonyPage() {
  const { business } = useBusinessStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('inbound');
  const [loading, setLoading] = useState(true);

  // Data states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<TelephonyProvider[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [inboundConfigs, setInboundConfigs] = useState<InboundConfig[]>([]);
  const [campaigns, setCampaigns] = useState<OutboundCampaign[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Modal states
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<TelephonyProvider | null>(null);
  const [inboundModalOpen, setInboundModalOpen] = useState(false);
  const [editingInbound, setEditingInbound] = useState<InboundConfig | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<OutboundCampaign | null>(null);
  const [uploadCampaignId, setUploadCampaignId] = useState<string | null>(null);

  // Load all data
  const loadAll = useCallback(async () => {
    if (!business) { setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getAgents(business.id),
        getTelephonyProviders(business.id),
        getPhoneNumbers(business.id),
        getInboundConfigs(business.id),
        getOutboundCampaigns(business.id),
        getCallLogs(business.id, { limit: 50 }),
      ]);

      const errors: string[] = [];

      // Agents
      if (results[0].status === 'fulfilled') setAgents(results[0].value);
      else { console.error('Failed to load agents:', results[0].reason); errors.push('agents'); }

      // Providers
      if (results[1].status === 'fulfilled') setProviders(results[1].value);
      else { console.error('Failed to load providers:', results[1].reason); errors.push('providers'); }

      // Phone numbers
      if (results[2].status === 'fulfilled') setPhoneNumbers(results[2].value);
      else { console.error('Failed to load phone numbers:', results[2].reason); errors.push('phone numbers'); }

      // Inbound configs
      if (results[3].status === 'fulfilled') setInboundConfigs(results[3].value);
      else { console.error('Failed to load inbound configs:', results[3].reason); errors.push('inbound configs'); }

      // Campaigns
      if (results[4].status === 'fulfilled') setCampaigns(results[4].value);
      else { console.error('Failed to load campaigns:', results[4].reason); errors.push('campaigns'); }

      // Call logs
      if (results[5].status === 'fulfilled') setCallLogs(results[5].value);
      else { console.error('Failed to load call logs:', results[5].reason); errors.push('call logs'); }

      if (errors.length > 0) {
        toast.error('Failed to load telephony data', `Could not load: ${errors.join(', ')}. Make sure the database schema has been applied.`);
      }
    } catch (err) {
      console.error('Unexpected error loading telephony data:', err);
      toast.error('Failed to load telephony data', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [business]);

  // --- Provider handlers ---
  const handleProviderSubmit = async (data: TelephonyProviderFormData) => {
    if (!business) return;
    try {
      if (editingProvider) {
        const updated = await updateTelephonyProvider(editingProvider.id, data);
        setProviders(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.success('Provider updated');
      } else {
        const created = await createTelephonyProvider(business.id, data);
        setProviders(prev => [created, ...prev]);
        toast.success('Provider added');
      }
      setProviderModalOpen(false);
      setEditingProvider(null);
    } catch (err) {
      toast.error('Provider error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await deleteTelephonyProvider(id);
      setProviders(prev => prev.filter(p => p.id !== id));
      toast.success('Provider deleted');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // --- Inbound config handlers ---
  const handleInboundSubmit = async (data: InboundConfigFormData) => {
    if (!business) return;
    try {
      if (editingInbound) {
        const updated = await updateInboundConfig(editingInbound.id, data);
        setInboundConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Inbound config updated');
      } else {
        const created = await createInboundConfig(business.id, data);
        setInboundConfigs(prev => [created, ...prev]);
        toast.success('Inbound config created');
      }
      setInboundModalOpen(false);
      setEditingInbound(null);
    } catch (err) {
      toast.error('Inbound config error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteInbound = async (id: string) => {
    try {
      await deleteInboundConfig(id);
      setInboundConfigs(prev => prev.filter(c => c.id !== id));
      toast.success('Config deleted');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // --- Campaign handlers ---
  const handleCampaignSubmit = async (data: OutboundCampaignFormData) => {
    if (!business) return;
    try {
      if (editingCampaign) {
        const updated = await updateOutboundCampaign(editingCampaign.id, data);
        setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Campaign updated');
      } else {
        const created = await createOutboundCampaign(business.id, data);
        setCampaigns(prev => [created, ...prev]);
        toast.success('Campaign created');
      }
      setCampaignModalOpen(false);
      setEditingCampaign(null);
    } catch (err) {
      toast.error('Campaign error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteCampaign = async (campaign: OutboundCampaign) => {
    try {
      await deleteOutboundCampaign(campaign.id);
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
      toast.success('Campaign deleted');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleTriggerCampaign = async (campaign: OutboundCampaign, action: string) => {
    try {
      const res = await fetch(`/api/telephony/campaigns/${campaign.id}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Trigger failed');
      toast.success(`Campaign ${action} triggered`);
      loadAll();
    } catch (err) {
      toast.error('Trigger error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleLeadUpload = async (file: File): Promise<{ created: number; errors: string[] }> => {
    if (!uploadCampaignId) throw new Error('No campaign selected');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/telephony/campaigns/${uploadCampaignId}/leads`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const result = await res.json();
    loadAll();
    return result;
  };

  // --- Phone number handlers ---
  const handleAddPhone = async (data: { number: string; friendly_name: string; provider_id: string; direction: string }) => {
    if (!business) return;
    try {
      const created = await createPhoneNumber(business.id, {
        ...data,
        direction: data.direction as 'inbound' | 'outbound' | 'both',
        is_active: true,
      });
      setPhoneNumbers(prev => [created, ...prev]);
      toast.success('Phone number added');
    } catch (err) {
      toast.error('Phone error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleUpdatePhone = async (id: string, data: Partial<PhoneNumber>) => {
    try {
      const updated = await updatePhoneNumber(id, data as Parameters<typeof updatePhoneNumber>[1]);
      setPhoneNumbers(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success('Phone number updated');
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeletePhone = async (id: string) => {
    try {
      await deletePhoneNumber(id);
      setPhoneNumbers(prev => prev.filter(p => p.id !== id));
      toast.success('Phone number deleted');
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 whitespace-nowrap flex-1 justify-center',
                active ? 'text-green-300 font-semibold' : 'hover:text-slate-300'
              )}
              style={{ color: active ? undefined : '#4b6070' }}
            >
              {active && (
                <motion.div
                  layoutId="telephony-tab-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Inbound Tab */}
          {activeTab === 'inbound' && (
            <Card>
              <CardHeader
                title="Inbound Call Configuration"
                description="Configure how incoming calls are handled"
                action={
                  <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingInbound(null); setInboundModalOpen(true); }}>
                    New Config
                  </Button>
                }
              />
              {inboundConfigs.length === 0 ? (
                <EmptyState
                  icon={<PhoneIncoming className="w-5 h-5" />}
                  title="No inbound configs"
                  description="Set up inbound call handling for your phone numbers"
                  action={{ label: 'Create Config', onClick: () => { setEditingInbound(null); setInboundModalOpen(true); } }}
                />
              ) : (
                <div className="space-y-3">
                  {inboundConfigs.map((config, i) => (
                    <motion.div
                      key={config.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                        <PhoneIncoming className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>
                          {config.phone_number?.number || 'Unknown number'}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>
                          Agent: {config.agent?.name || 'Default'} ·
                          {config.lead_capture_enabled && ' Lead capture'}
                          {config.appointment_booking_enabled && ' · Booking'}
                          {config.faq_enabled && ' · FAQ'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingInbound(config); setInboundModalOpen(true); }}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteInbound(config.id)}
                          icon={<span style={{ color: '#f87171', fontSize: '12px' }}>Delete</span>}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Outbound Tab */}
          {activeTab === 'outbound' && (
            <div className="space-y-5">
              <Card>
                <CardHeader
                  title="Outbound Campaigns"
                  description="Manage automated calling campaigns"
                  action={
                    <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingCampaign(null); setCampaignModalOpen(true); }}>
                      New Campaign
                    </Button>
                  }
                />
                {campaigns.length === 0 ? (
                  <EmptyState
                    icon={<PhoneOutgoing className="w-5 h-5" />}
                    title="No campaigns"
                    description="Create your first outbound calling campaign"
                    action={{ label: 'Create Campaign', onClick: () => { setEditingCampaign(null); setCampaignModalOpen(true); } }}
                  />
                ) : (
                  <CampaignList
                    campaigns={campaigns}
                    onEdit={(c) => { setEditingCampaign(c); setCampaignModalOpen(true); }}
                    onDelete={handleDeleteCampaign}
                    onTrigger={handleTriggerCampaign}
                  />
                )}
              </Card>

              {campaigns.length > 0 && (
                <Card>
                  <CardHeader title="Upload Leads" description="Import leads via CSV for your campaigns" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {campaigns.filter(c => c.status === 'draft' || c.status === 'running' || c.status === 'paused').map(c => (
                      <div key={c.id} className="p-3 rounded-xl flex items-center justify-between"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div>
                          <div className="text-[12px] font-semibold" style={{ color: '#e2e8f0' }}>{c.name}</div>
                          <div className="text-[10px]" style={{ color: '#3d5060' }}>{c.total_leads} leads</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setUploadCampaignId(c.id)}>Upload</Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <Card>
              <CardHeader
                title="Telephony Providers"
                description="Configure your telephony provider connections"
                action={
                  <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingProvider(null); setProviderModalOpen(true); }}>
                    Add Provider
                  </Button>
                }
              />
              {providers.length === 0 ? (
                <EmptyState
                  icon={<Radio className="w-5 h-5" />}
                  title="No providers configured"
                  description="Add a telephony provider to start making and receiving calls"
                  action={{ label: 'Add Provider', onClick: () => { setEditingProvider(null); setProviderModalOpen(true); } }}
                />
              ) : (
                <div className="space-y-3">
                  {providers.map((provider, i) => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                        <Radio className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{provider.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                            {provider.provider_type}
                          </span>
                          {provider.is_default && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>Default</span>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>
                          {provider.is_active ? 'Active' : 'Inactive'}
                          {provider.webhook_url && ` · Webhook: ${provider.webhook_url}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingProvider(provider); setProviderModalOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProvider(provider.id)}
                          icon={<span style={{ color: '#f87171', fontSize: '12px' }}>Delete</span>}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Phone Numbers Tab */}
          {activeTab === 'numbers' && (
            <Card>
              <CardHeader title="Phone Numbers" description="Manage your phone numbers and their assignments" />
              <PhoneNumberManager
                phoneNumbers={phoneNumbers}
                providers={providers}
                onAdd={handleAddPhone}
                onUpdate={handleUpdatePhone}
                onDelete={handleDeletePhone}
              />
            </Card>
          )}

          {/* Call Logs Tab */}
          {activeTab === 'call-logs' && (
            <Card>
              <CardHeader
                title="Call History"
                description="View all inbound and outbound call logs"
                action={
                  <Button variant="outline" size="sm" onClick={loadAll}>Refresh</Button>
                }
              />
              <CallLogTable calls={callLogs} loading={loading} />
            </Card>
          )}
        </>
      )}

      {/* Provider modal */}
      <Modal isOpen={providerModalOpen} onClose={() => { setProviderModalOpen(false); setEditingProvider(null); }}
        title={editingProvider ? 'Edit Provider' : 'Add Provider'} size="lg">
        <ProviderConfigForm
          provider={editingProvider}
          onSubmit={handleProviderSubmit}
          onCancel={() => { setProviderModalOpen(false); setEditingProvider(null); }}
        />
      </Modal>

      {/* Inbound config modal */}
      <Modal isOpen={inboundModalOpen} onClose={() => { setInboundModalOpen(false); setEditingInbound(null); }}
        title={editingInbound ? 'Edit Inbound Config' : 'New Inbound Config'} size="md">
        <InboundConfigPanel
          config={editingInbound}
          phoneNumbers={phoneNumbers}
          agents={agents}
          onSubmit={handleInboundSubmit}
          onCancel={() => { setInboundModalOpen(false); setEditingInbound(null); }}
        />
      </Modal>

      {/* Campaign modal */}
      <Modal isOpen={campaignModalOpen} onClose={() => { setCampaignModalOpen(false); setEditingCampaign(null); }}
        title={editingCampaign ? 'Edit Campaign' : 'New Campaign'} size="lg">
        <CampaignForm
          campaign={editingCampaign}
          phoneNumbers={phoneNumbers}
          agents={agents}
          onSubmit={handleCampaignSubmit}
          onCancel={() => { setCampaignModalOpen(false); setEditingCampaign(null); }}
        />
      </Modal>

      {/* Lead upload modal */}
      <Modal isOpen={!!uploadCampaignId} onClose={() => setUploadCampaignId(null)} title="Upload Leads" size="md">
        <LeadUploadModal
          campaignId={uploadCampaignId || ''}
          onUpload={handleLeadUpload}
          onClose={() => setUploadCampaignId(null)}
        />
      </Modal>
    </div>
  );
}
