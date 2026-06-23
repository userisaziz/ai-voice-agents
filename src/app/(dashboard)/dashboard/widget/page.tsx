'use client';

import { useEffect, useState } from 'react';
import { Code2, Plus, Copy, CheckCheck, Trash2, Edit2, Eye, MessageCircle, Phone } from 'lucide-react';
import { useBusinessStore } from '@/store/business';
import { getWidgets, createWidget, updateWidget, deleteWidget } from '@/services/widgets';
import { getAgents } from '@/services/agents';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { widgetSchema, type WidgetFormData } from '@/validations';
import { WIDGET_POSITIONS, WIDGET_TYPES } from '@/constants';
import { buildEmbedCode } from '@/lib/utils';
import type { EmbeddedWidget, Agent } from '@/types';

export default function WidgetPage() {
  const { business } = useBusinessStore();
  const toast = useToast();
  const [widgets, setWidgets] = useState<EmbeddedWidget[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<EmbeddedWidget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewWidget, setPreviewWidget] = useState<EmbeddedWidget | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<WidgetFormData>({
    resolver: zodResolver(widgetSchema),
    defaultValues: { widget_type: 'voice', position: 'bottom-right', primary_color: '#22c55e', is_active: true },
  });

  const load = async () => {
    if (!business) { setLoading(false); return; }
    setLoading(true);
    try {
      const [w, a] = await Promise.all([getWidgets(business.id), getAgents(business.id)]);
      setWidgets(w);
      setAgents(a);
    } catch {
      toast.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [business]);

  // Show guidance when business profile isn't set up yet
  if (!business && !loading) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Embedded Widgets"
            description="Deploy AI voice widgets on your website"
          />
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#e2e8f0' }}>Business Profile Required</h3>
            <p className="text-[13px] max-w-md mb-6" style={{ color: '#4b6070' }}>
              You need to set up your business profile first before creating widgets. This links your widgets to the correct business account.
            </p>
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all"
              style={{ background: '#22c55e', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Go to Settings
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const openCreate = () => {
    setEditingWidget(null);
    reset({ widget_type: 'voice', position: 'bottom-right', primary_color: '#22c55e', is_active: true, name: 'Main Widget' });
    setModalOpen(true);
  };

  const openEdit = (w: EmbeddedWidget) => {
    setEditingWidget(w);
    reset({ widget_type: w.widget_type || 'voice', name: w.name, agent_id: w.agent_id || undefined, position: w.position, primary_color: w.primary_color, greeting: w.greeting || '', is_active: w.is_active });
    setModalOpen(true);
  };

  const onSubmit = async (data: WidgetFormData) => {
    if (!business) return;
    try {
      if (editingWidget) {
        const updated = await updateWidget(editingWidget.id, data);
        setWidgets((prev) => prev.map((w) => w.id === updated.id ? updated : w));
        toast.success('Widget updated');
      } else {
        const created = await createWidget(business.id, data);
        setWidgets((prev) => [created, ...prev]);
        toast.success('Widget created');
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(editingWidget ? 'Failed to update widget' : 'Failed to create widget', msg);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWidget(id);
      setWidgets((prev) => prev.filter((w) => w.id !== id));
      toast.success('Widget deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to delete widget', msg);
    } finally {
      setDeletingId(null);
      setDeleteId(null);
    }
  };

  const copyEmbed = (widgetId: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const w = widgets.find((x) => x.id === widgetId);
    const code = buildEmbedCode(business?.id || '', appUrl, { position: w?.position, mode: w?.widget_type || 'voice' });
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(widgetId);
      toast.success('Embed code copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Embedded Widgets"
          description="Deploy AI voice widgets on your website"
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>New Widget</Button>}
        />

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : widgets.length === 0 ? (
          <EmptyState
            icon={<Code2 className="w-5 h-5" />}
            title="No widgets yet"
            description="Create an embeddable widget and add it to your website so customers can talk to your AI"
            action={{ label: 'Create Widget', onClick: openCreate }}
          />
        ) : (
          <div className="space-y-4">
            {widgets.map((widget) => (
              <div key={widget.id} className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{widget.name}</span>
                      <Badge variant={widget.widget_type === 'chat' ? 'blue' : 'green'}>
                        {widget.widget_type === 'chat' ? 'Chat' : 'Voice'}
                      </Badge>
                      <Badge variant={widget.is_active ? 'green' : 'gray'}>
                        {widget.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>
                      Position: {widget.position} · {widget.total_interactions} interactions
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => setPreviewWidget(widget)} />
                    <Button variant="ghost" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => openEdit(widget)} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" style={{ color: '#f87171' }} />} onClick={() => setDeleteId(widget.id)} />
                  </div>
                </div>

                <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#3d5060' }}>Embed Code</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={copiedId === widget.id ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={() => copyEmbed(widget.id)}
                    >
                      {copiedId === widget.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap break-all" style={{ color: '#4ade80' }}>
                    {buildEmbedCode(business?.id || '', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', { position: widget.position, mode: widget.widget_type || 'voice' })}
                  </pre>
                </div>

                <div className="flex items-center gap-4 text-[11px]" style={{ color: '#4b6070' }}>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: widget.primary_color }} />
                    {widget.primary_color}
                  </span>
                  <span>{widget.total_impressions} impressions</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingWidget ? 'Edit Widget' : 'Create Widget'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Widget Name" placeholder="Main Widget" error={errors.name?.message} required {...register('name')} />
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#94a3b8' }}>Widget Type</label>
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map((wt) => (
                <label
                  key={wt.value}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <input
                    type="radio"
                    value={wt.value}
                    {...register('widget_type')}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {wt.value === 'voice' ? <Phone className="w-4 h-4" style={{ color: '#94a3b8' }} /> : <MessageCircle className="w-4 h-4" style={{ color: '#94a3b8' }} />}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: '#e2e8f0' }}>{wt.label}</div>
                    <div className="text-[10px]" style={{ color: '#4b6070' }}>{wt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Select
            label="AI Agent"
            options={[{ value: '', label: 'Default (first active agent)' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
            {...register('agent_id')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Position" options={WIDGET_POSITIONS.map((p) => ({ value: p.value, label: p.label }))} {...register('position')} />
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#94a3b8' }}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" {...register('primary_color')} className="w-10 h-9 rounded-lg cursor-pointer p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <Input {...register('primary_color')} placeholder="#22c55e" className="flex-1" />
              </div>
            </div>
          </div>
          <Input label="Greeting Message" placeholder="Hi! How can I help you today?" {...register('greeting')} />
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Toggle label="Widget is active" checked={field.value} onChange={field.onChange} />
            )}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editingWidget ? 'Save' : 'Create Widget'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!previewWidget} onClose={() => setPreviewWidget(null)} title="Widget Preview" size="sm">
        {previewWidget && (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-64 h-80 rounded-xl flex items-center justify-center text-[13px]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#3d5060' }}>
                Your website here
              </div>
              <div
                className={`absolute bottom-3 ${previewWidget.position === 'bottom-right' ? 'right-3' : 'left-3'} w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg`}
                style={{ backgroundColor: previewWidget.primary_color, boxShadow: `0 4px 20px ${previewWidget.primary_color}66` }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Widget" size="sm">
        <p className="text-[13px] mb-5" style={{ color: '#94a3b8' }}>This widget will be deactivated and removed.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" loading={deletingId === deleteId} onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
