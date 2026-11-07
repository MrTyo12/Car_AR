import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Package,
  Wrench,
  CheckCircle2,
  Circle,
  DollarSign,
  Truck,
  PackageCheck,
  Clock as ClockIcon,
  ShoppingCart,
  Hammer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PartItem, ToolItem } from '@/types';
import { Modal } from '@/components/Modal';

const deliveryIcons: Record<string, React.ReactNode> = {
  Delivered: <PackageCheck size={12} />,
  'In Transit': <Truck size={12} />,
  Pending: <ClockIcon size={12} />,
};

const deliveryColors: Record<string, string> = {
  Delivered: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
  'In Transit': 'bg-steel-950 text-steel-300 border-steel-800/50',
  Pending: 'bg-amber-950 text-amber-300 border-amber-800/50',
};

const toolCategories = ['Hand Tools', 'Precision Tools', 'Specialty Tools', 'Lifting Equipment', 'Body Tools', 'Shop Equipment', 'Chemicals', 'General'];

export function PartsTools() {
  const [parts, setParts] = useState<PartItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'parts' | 'tools'>('parts');
  const [addPart, setAddPart] = useState(false);
  const [addTool, setAddTool] = useState(false);

  const loadData = useCallback(async () => {
    const [p, t] = await Promise.all([
      supabase.from('parts_inventory').select('*').order('created_at', { ascending: false }),
      supabase.from('tools_checklist').select('*').order('category', { ascending: true }),
    ]);
    setParts(p.data ?? []);
    setTools(t.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPartsCost = parts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const ownedTools = tools.filter((t) => t.owned).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-carbon-400">
        <div className="animate-pulse text-sm">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-carbon-50">
            Parts, Tools & Inventory
          </h1>
          <p className="mt-1 text-sm text-carbon-400">
            Track sourced parts, delivery status, and your tool collection.
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-carbon-900 p-1 border border-carbon-700/60">
        <button
          onClick={() => setTab('parts')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === 'parts' ? 'bg-scat-600 text-white shadow-lg shadow-scat-950/30' : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          <ShoppingCart size={16} /> Parts Inventory
          <span className="ml-1 rounded-full bg-carbon-800/50 px-2 py-0.5 text-xs">{parts.length}</span>
        </button>
        <button
          onClick={() => setTab('tools')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === 'tools' ? 'bg-scat-600 text-white shadow-lg shadow-scat-950/30' : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          <Hammer size={16} /> Tools Checklist
          <span className="ml-1 rounded-full bg-carbon-800/50 px-2 py-0.5 text-xs">{ownedTools}/{tools.length}</span>
        </button>
      </div>

      {tab === 'parts' ? (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-carbon-400">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Parts Value</span>
              </div>
              <p className="stat-value mt-1 text-emerald-400">${totalPartsCost.toFixed(2)}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-carbon-400">
                <PackageCheck size={16} className="text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Delivered</span>
              </div>
              <p className="stat-value mt-1">{parts.filter((p) => p.delivery_status === 'Delivered').length}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-carbon-400">
                <Truck size={16} className="text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">In Transit / Pending</span>
              </div>
              <p className="stat-value mt-1">{parts.filter((p) => p.delivery_status !== 'Delivered').length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="section-title">Sourced Parts</h2>
            <button onClick={() => setAddPart(true)} className="btn-primary">
              <Plus size={16} /> Add Part
            </button>
          </div>

          {/* Parts table - desktop */}
          <div className="card overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-carbon-700 bg-carbon-800/50 text-left text-xs font-semibold uppercase tracking-wider text-carbon-400">
                  <th className="px-4 py-3">Part Name</th>
                  <th className="px-4 py-3">Part #</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id} className="group border-b border-carbon-700/40 transition-colors hover:bg-carbon-800/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-carbon-100">{part.name}</p>
                      {part.notes && <p className="text-xs text-carbon-400">{part.notes}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-carbon-300">{part.part_number || '—'}</td>
                    <td className="px-4 py-3 text-carbon-300">{part.vendor || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">${part.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono text-carbon-300">{part.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={part.delivery_status}
                        onChange={async (e) => {
                          await supabase.from('parts_inventory').update({ delivery_status: e.target.value }).eq('id', part.id);
                          loadData();
                        }}
                        className={`badge border cursor-pointer ${deliveryColors[part.delivery_status] ?? deliveryColors.Pending}`}
                      >
                        {['Pending', 'In Transit', 'Delivered'].map((s) => (
                          <option key={s} value={s} className="bg-carbon-900 text-carbon-100">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => { await supabase.from('parts_inventory').delete().eq('id', part.id); loadData(); }}
                        className="text-carbon-600 transition-colors hover:text-scat-400 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parts cards - mobile */}
          <div className="space-y-3 sm:hidden">
            {parts.map((part) => (
              <div key={part.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-carbon-100">{part.name}</p>
                    <p className="font-mono text-xs text-carbon-400">{part.part_number}</p>
                  </div>
                  <span className={`badge border ${deliveryColors[part.delivery_status] ?? deliveryColors.Pending}`}>
                    {deliveryIcons[part.delivery_status]} {part.delivery_status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-carbon-300">{part.vendor}</span>
                  <span className="font-mono font-semibold text-emerald-400">${part.price.toFixed(2)} x{part.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Tool Checklist</h2>
            <button onClick={() => setAddTool(true)} className="btn-primary">
              <Plus size={16} /> Add Tool
            </button>
          </div>

          {/* Group by category */}
          {toolCategories.map((cat) => {
            const catTools = tools.filter((t) => t.category === cat);
            if (catTools.length === 0) return null;
            return (
              <div key={cat} className="card p-4">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-carbon-200">
                  <Wrench size={14} className="text-scat-500" /> {cat}
                  <span className="font-mono text-xs text-carbon-500">
                    ({catTools.filter((t) => t.owned).length}/{catTools.length} owned)
                  </span>
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {catTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="group flex items-center gap-3 rounded-xl border border-carbon-700/40 bg-carbon-800/40 p-3 transition-all hover:border-carbon-600"
                    >
                      <button
                        onClick={async () => {
                          await supabase.from('tools_checklist').update({ owned: !tool.owned }).eq('id', tool.id);
                          loadData();
                        }}
                        className="shrink-0"
                      >
                        {tool.owned ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : (
                          <Circle size={20} className="text-carbon-500 transition-colors hover:text-carbon-300" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${tool.owned ? 'text-carbon-100' : 'text-carbon-400'}`}>
                          {tool.name}
                        </p>
                        {tool.notes && <p className="truncate text-xs text-carbon-500">{tool.notes}</p>}
                      </div>
                      <button
                        onClick={async () => { await supabase.from('tools_checklist').delete().eq('id', tool.id); loadData(); }}
                        className="shrink-0 text-carbon-600 transition-colors hover:text-scat-400 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddPartModal open={addPart} onClose={() => setAddPart(false)} onSaved={loadData} />
      <AddToolModal open={addTool} onClose={() => setAddTool(false)} onSaved={loadData} />
    </div>
  );
}

function AddPartModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    vendor: '',
    price: 0,
    quantity: 1,
    delivery_status: 'Pending',
    notes: '',
  });

  const save = async () => {
    if (!form.name.trim()) return;
    await supabase.from('parts_inventory').insert(form);
    setForm({ name: '', part_number: '', vendor: '', price: 0, quantity: 1, delivery_status: 'Pending', notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Part to Inventory" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Part Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spark Plug Set" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Part Number</label>
            <input className="input font-mono" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} placeholder="e.g. NGK-1430" />
          </div>
          <div>
            <label className="label">Vendor</label>
            <input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. RockAuto" />
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" min={1} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
          </div>
          <div>
            <label className="label">Delivery Status</label>
            <select className="input" value={form.delivery_status} onChange={(e) => setForm({ ...form, delivery_status: e.target.value })}>
              {['Pending', 'In Transit', 'Delivered'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Add Part</button>
        </div>
      </div>
    </Modal>
  );
}

function AddToolModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Hand Tools',
    owned: false,
    notes: '',
  });

  const save = async () => {
    if (!form.name.trim()) return;
    await supabase.from('tools_checklist').insert(form);
    setForm({ name: '', category: 'Hand Tools', owned: false, notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Tool" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Tool Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Breaker Bar 24in" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {toolCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Owned?</label>
            <select className="input" value={form.owned ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, owned: e.target.value === 'yes' })}>
              <option value="no">Need to Buy</option>
              <option value="yes">Already Own</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Add Tool</button>
        </div>
      </div>
    </Modal>
  );
}
