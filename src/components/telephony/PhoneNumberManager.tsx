'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Plus, Trash2, ToggleLeft, ToggleRight, Radio } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CALL_DIRECTIONS, TELEPHONY_PROVIDERS } from '@/constants';
import type { PhoneNumber, TelephonyProvider } from '@/types';

interface PhoneNumberManagerProps {
  phoneNumbers: PhoneNumber[];
  providers: TelephonyProvider[];
  onAdd: (data: { number: string; friendly_name: string; provider_id: string; direction: string }) => Promise<void>;
  onUpdate: (id: string, data: Partial<PhoneNumber>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Called when user wants to create a new provider inline from this tab */
  onAddProvider?: () => void;
}

const NEW_PROVIDER_VALUE = '__new_provider__';

export function PhoneNumberManager({ phoneNumbers, providers, onAdd, onUpdate, onDelete, onAddProvider }: PhoneNumberManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState({ number: '', friendly_name: '', provider_id: '', direction: 'both' });
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeProviders = providers.filter(p => p.is_active);
  const hasProviders = activeProviders.length > 0;

  const handleAdd = async () => {
    if (!newNumber.number || !newNumber.provider_id) return;
    setAdding(true);
    try {
      await onAdd(newNumber);
      setNewNumber({ number: '', friendly_name: '', provider_id: '', direction: 'both' });
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (pn: PhoneNumber) => {
    await onUpdate(pn.id, { is_active: !pn.is_active });
  };

  const handleProviderSelect = (value: string) => {
    if (value === NEW_PROVIDER_VALUE) {
      onAddProvider?.();
    } else {
      setNewNumber(prev => ({ ...prev, provider_id: value }));
    }
  };

  const getDirectionBadge = (direction: string) => {
    const config = CALL_DIRECTIONS.find(d => d.value === direction);
    const variant = direction === 'inbound' ? 'blue' : direction === 'outbound' ? 'purple' : 'green';
    return <Badge variant={variant as 'blue' | 'purple' | 'green'}>{config?.label || direction}</Badge>;
  };

  // Build provider options with a "+ New Provider" action item
  const providerOptions = [
    ...activeProviders.map(p => ({
      value: p.id,
      label: `${p.name} (${TELEPHONY_PROVIDERS.find(tp => tp.value === p.provider_type)?.label || p.provider_type})`,
    })),
    ...(onAddProvider
      ? [{ value: NEW_PROVIDER_VALUE, label: '+ Set up new provider...' }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* No providers - actionable prompt to create one */}
      {!hasProviders && onAddProvider && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
            <div className="flex-1">
              <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>Set up a provider first</div>
              <div className="text-[12px] mt-1" style={{ color: '#3d5060' }}>
                Choose any provider type — Twilio, Vapi, Vobiz, or SIP Trunk — and configure it to start adding phone numbers.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TELEPHONY_PROVIDERS.map(p => (
                  <span
                    key={p.value}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={onAddProvider}
              >
                Add Provider
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add new number form */}
      {showAdd ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="text-[13px] font-semibold mb-2" style={{ color: '#e2e8f0' }}>Add Phone Number</div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+1234567890"
              value={newNumber.number}
              onChange={(e) => setNewNumber(prev => ({ ...prev, number: e.target.value }))}
              required
            />
            <Input
              label="Friendly Name"
              placeholder="Main Office Line"
              value={newNumber.friendly_name}
              onChange={(e) => setNewNumber(prev => ({ ...prev, friendly_name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Provider"
              options={providerOptions}
              value={newNumber.provider_id}
              onChange={(e) => handleProviderSelect(e.target.value)}
              required
            />
            <Select
              label="Direction"
              options={CALL_DIRECTIONS.map(d => ({ value: d.value, label: d.label }))}
              value={newNumber.direction}
              onChange={(e) => setNewNumber(prev => ({ ...prev, direction: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" loading={adding} disabled={!newNumber.number || !newNumber.provider_id || newNumber.provider_id === NEW_PROVIDER_VALUE} onClick={handleAdd}>
              Add Number
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              if (!hasProviders && onAddProvider) {
                onAddProvider();
              } else {
                setShowAdd(true);
              }
            }}
          >
            Add Phone Number
          </Button>
          {!hasProviders && onAddProvider && (
            <span className="text-[11px]" style={{ color: '#3d5060' }}>You&apos;ll be prompted to set up a provider first</span>
          )}
        </div>
      )}

      {/* Phone number list */}
      {phoneNumbers.length === 0 ? (
        <div className="text-center py-8">
          <Phone className="w-8 h-8 mx-auto mb-2" style={{ color: '#3d5060' }} />
          <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>No phone numbers</div>
          <div className="text-[11px]" style={{ color: '#3d5060' }}>
            {hasProviders
              ? 'Add a phone number to get started'
              : 'Configure a provider first, then add phone numbers'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {phoneNumbers.map((pn, i) => (
            <motion.div
              key={pn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-3 rounded-xl transition-all duration-150"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{pn.number}</span>
                  {getDirectionBadge(pn.direction)}
                  <Badge variant={pn.is_active ? 'green' : 'gray'}>{pn.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: '#3d5060' }}>
                  {pn.friendly_name || 'No name'} · {pn.provider?.name || 'Unknown provider'}
                  {pn.provider?.provider_type && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                      {TELEPHONY_PROVIDERS.find(tp => tp.value === pn.provider?.provider_type)?.label || pn.provider.provider_type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button variant="ghost" size="sm"
                  icon={pn.is_active
                    ? <ToggleRight className="w-4 h-4" style={{ color: '#4ade80' }} />
                    : <ToggleLeft className="w-4 h-4" style={{ color: '#3d5060' }} />
                  }
                  onClick={() => handleToggle(pn)}
                />
                {deleteId === pn.id ? (
                  <div className="flex items-center gap-1">
                    <Button variant="danger" size="sm" onClick={() => { onDelete(pn.id); setDeleteId(null); }}>Confirm</Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" style={{ color: '#f87171' }} />} onClick={() => setDeleteId(pn.id)} />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
