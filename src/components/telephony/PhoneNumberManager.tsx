'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CALL_DIRECTIONS } from '@/constants';
import type { PhoneNumber, TelephonyProvider } from '@/types';

interface PhoneNumberManagerProps {
  phoneNumbers: PhoneNumber[];
  providers: TelephonyProvider[];
  onAdd: (data: { number: string; friendly_name: string; provider_id: string; direction: string }) => Promise<void>;
  onUpdate: (id: string, data: Partial<PhoneNumber>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PhoneNumberManager({ phoneNumbers, providers, onAdd, onUpdate, onDelete }: PhoneNumberManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newNumber, setNewNumber] = useState({ number: '', friendly_name: '', provider_id: '', direction: 'both' });
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const getDirectionBadge = (direction: string) => {
    const config = CALL_DIRECTIONS.find(d => d.value === direction);
    const variant = direction === 'inbound' ? 'blue' : direction === 'outbound' ? 'purple' : 'green';
    return <Badge variant={variant as 'blue' | 'purple' | 'green'}>{config?.label || direction}</Badge>;
  };

  return (
    <div className="space-y-4">
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
              options={providers.filter(p => p.is_active).map(p => ({ value: p.id, label: `${p.name} (${p.provider_type})` }))}
              value={newNumber.provider_id}
              onChange={(e) => setNewNumber(prev => ({ ...prev, provider_id: e.target.value }))}
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
            <Button size="sm" loading={adding} disabled={!newNumber.number || !newNumber.provider_id} onClick={handleAdd}>
              Add Number
            </Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
          Add Phone Number
        </Button>
      )}

      {/* Phone number list */}
      {phoneNumbers.length === 0 ? (
        <div className="text-center py-8">
          <Phone className="w-8 h-8 mx-auto mb-2" style={{ color: '#3d5060' }} />
          <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>No phone numbers</div>
          <div className="text-[11px]" style={{ color: '#3d5060' }}>Add a phone number to get started</div>
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
