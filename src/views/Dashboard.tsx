import { useEffect, useState, useCallback } from 'react';
import {
  Gauge,
  Fuel,
  Wrench,
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  Settings,
  Cpu,
  Zap,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  VehicleProfile,
  MaintenanceLog,
  ActiveUpgrade,
  UpcomingService,
} from '@/types';
import { Modal } from '@/components/Modal';

const priorityColors: Record<string, string> = {
  High: 'bg-scat-950 text-scat-300 border-scat-800/50',
  Medium: 'bg-amber-950 text-amber-300 border-amber-800/50',
  Low: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
};

const statusColors: Record<string, string> = {
  Installed: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
  'In Progress': 'bg-amber-950 text-amber-300 border-amber-800/50',
  Planned: 'bg-steel-950 text-steel-300 border-steel-800/50',
};

export function Dashboard() {
  const [vehicle, setVehicle] = useState<VehicleProfile | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [upgrades, setUpgrades] = useState<ActiveUpgrade[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editVehicle, setEditVehicle] = useState(false);
  const [addLog, setAddLog] = useState(false);
  const [addUpgrade, setAddUpgrade] = useState(false);

  const loadData = useCallback(async () => {
    const [v, l, u, us] = await Promise.all([
      supabase.from('vehicle_profile').select('*').maybeSingle(),
      supabase.from('maintenance_logs').select('*').order('log_date', { ascending: false }),
      supabase.from('active_upgrades').select('*').order('created_at', { ascending: false }),
      supabase.from('upcoming_services').select('*').order('due_mileage', { ascending: true }),
    ]);
    setVehicle(v.data);
    setLogs(l.data ?? []);
    setUpgrades(u.data ?? []);
    setUpcoming(us.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-carbon-400">
        <div className="animate-pulse text-sm">Loading vehicle data...</div>
      </div>
    );
  }

  const activeUpgrades = upgrades.filter(
    (u) => u.status === 'In Progress' || u.status === 'Planned'
  );
  const pendingServices = upcoming.filter((s) => !s.completed);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vehicle Profile Hero */}
      <div className="card card-hover overflow-hidden">
        <div className="relative bg-gradient-to-br from-carbon-800 via-carbon-900 to-scat-950/30 px-6 py-8 sm:px-8">
          <div className="absolute right-4 top-4 opacity-10">
            <Car size={120} strokeWidth={1} className="text-scat-500" />
          </div>
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="badge bg-scat-950 text-scat-300 border border-scat-800/50">
                  <Zap size={12} /> Active Build
                </span>
                <span className="badge bg-carbon-800 text-carbon-300 border border-carbon-700">
                  {vehicle?.color}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-carbon-50 sm:text-4xl">
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </h1>
              <p className="mt-1 font-display text-lg font-medium uppercase tracking-wider text-scat-400">
                {vehicle?.trim}
              </p>
            </div>
            <button
              onClick={() => setEditVehicle(true)}
              className="btn-secondary self-start"
            >
              <Settings size={16} /> Edit Profile
            </button>
          </div>

          {/* Spec grid */}
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <SpecCard icon={<Gauge size={16} />} label="Mileage" value={vehicle?.mileage.toLocaleString() ?? '0'} unit="mi" />
            <SpecCard icon={<Cpu size={16} />} label="Engine" value={vehicle?.engine ?? ''} />
            <SpecCard icon={<Settings size={16} />} label="Trans" value={vehicle?.transmission ?? ''} />
            <SpecCard icon={<Zap size={16} />} label="Horsepower" value={`${vehicle?.horsepower ?? 0}`} unit="hp" />
            <SpecCard icon={<TrendingUp size={16} />} label="Torque" value={`${vehicle?.torque_lbft ?? 0}`} unit="lb-ft" />
            <SpecCard icon={<Fuel size={16} />} label="Fuel" value="Premium" unit="91+ oct" />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Wrench size={20} />}
          label="Active Upgrades"
          value={activeUpgrades.length}
          sub={`${upgrades.filter((u) => u.status === 'Installed').length} installed`}
          accent="scat"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Upcoming Services"
          value={pendingServices.length}
          sub={`${pendingServices.filter((s) => s.priority === 'High').length} high priority`}
          accent="amber"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Maintenance Logs"
          value={logs.length}
          sub={logs[0] ? `Last: ${logs[0].service_type}` : 'No logs yet'}
          accent="steel"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Maintenance Logs */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Wrench size={18} className="text-scat-500" /> Recent Maintenance
            </h2>
            <button onClick={() => setAddLog(true)} className="btn-ghost">
              <Plus size={16} /> Add Log
            </button>
          </div>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-carbon-400">No maintenance logs yet.</p>
            ) : (
              logs.slice(0, 5).map((log) => (
                <MaintenanceLogRow key={log.id} log={log} onDelete={async () => {
                  await supabase.from('maintenance_logs').delete().eq('id', log.id);
                  loadData();
                }} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Services */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" /> Upcoming Services
            </h2>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-carbon-400">No upcoming services.</p>
            ) : (
              upcoming.map((svc) => (
                <UpcomingServiceRow
                  key={svc.id}
                  svc={svc}
                  onToggle={async () => {
                    await supabase
                      .from('upcoming_services')
                      .update({ completed: !svc.completed })
                      .eq('id', svc.id);
                    loadData();
                  }}
                  onDelete={async () => {
                    await supabase.from('upcoming_services').delete().eq('id', svc.id);
                    loadData();
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Upgrades */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2">
            <Zap size={18} className="text-scat-500" /> Active Upgrades & Modifications
          </h2>
          <button onClick={() => setAddUpgrade(true)} className="btn-ghost">
            <Plus size={16} /> Add Upgrade
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {upgrades.map((up) => (
            <div key={up.id} className="rounded-xl border border-carbon-700/60 bg-carbon-800/50 p-4 transition-all hover:border-carbon-600">
              <div className="mb-2 flex items-start justify-between">
                <span className={`badge border ${statusColors[up.status] ?? 'bg-carbon-800 text-carbon-300 border-carbon-700'}`}>
                  {up.status}
                </span>
                <button
                  onClick={async () => {
                    await supabase.from('active_upgrades').delete().eq('id', up.id);
                    loadData();
                  }}
                  className="text-carbon-500 transition-colors hover:text-scat-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="font-semibold text-carbon-100">{up.name}</p>
              <p className="mt-1 text-xs text-carbon-400">{up.category}</p>
              {up.notes && <p className="mt-2 text-sm text-carbon-400">{up.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {vehicle && (
        <EditVehicleModal
          open={editVehicle}
          onClose={() => setEditVehicle(false)}
          vehicle={vehicle}
          onSaved={loadData}
        />
      )}
      <AddLogModal open={addLog} onClose={() => setAddLog(false)} onSaved={loadData} />
      <AddUpgradeModal open={addUpgrade} onClose={() => setAddUpgrade(false)} onSaved={loadData} />
    </div>
  );
}

function SpecCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-carbon-700/50 bg-carbon-900/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-carbon-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-base font-bold text-carbon-50">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-carbon-400">{unit}</span>}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accent: 'scat' | 'amber' | 'steel';
}) {
  const accentColor =
    accent === 'scat' ? 'text-scat-400' : accent === 'amber' ? 'text-amber-400' : 'text-steel-400';
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-carbon-400">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          <p className={`mt-1 text-xs ${accentColor}`}>{sub}</p>
        </div>
        <div className={`rounded-xl bg-carbon-800 p-3 ${accentColor}`}>{icon}</div>
      </div>
    </div>
  );
}

function MaintenanceLogRow({ log, onDelete }: { log: MaintenanceLog; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-carbon-700/40 bg-carbon-800/40 p-3 transition-colors hover:border-carbon-600">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-carbon-700 text-scat-400">
        <Wrench size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-carbon-100">{log.service_type}</p>
        <p className="truncate text-xs text-carbon-400">{log.description}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs text-carbon-300">{new Date(log.log_date).toLocaleDateString()}</p>
        <p className="font-mono text-xs text-carbon-500">{log.mileage.toLocaleString()} mi</p>
      </div>
      {log.cost > 0 && (
        <span className="font-mono text-sm font-semibold text-emerald-400">${log.cost.toFixed(2)}</span>
      )}
      <button
        onClick={onDelete}
        className="text-carbon-600 transition-colors hover:text-scat-400 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function UpcomingServiceRow({
  svc,
  onToggle,
  onDelete,
}: {
  svc: UpcomingService;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-carbon-700/40 bg-carbon-800/40 p-3 transition-colors hover:border-carbon-600">
      <button onClick={onToggle} className="shrink-0">
        {svc.completed ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : (
          <Circle size={20} className="text-carbon-500 transition-colors hover:text-carbon-300" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm ${svc.completed ? 'text-carbon-500 line-through' : 'text-carbon-100'}`}>
          {svc.item}
        </p>
        {svc.notes && <p className="truncate text-xs text-carbon-400">{svc.notes}</p>}
      </div>
      {svc.due_mileage && (
        <span className="font-mono text-xs text-carbon-400">{svc.due_mileage.toLocaleString()} mi</span>
      )}
      <span className={`badge border ${priorityColors[svc.priority] ?? priorityColors.Medium}`}>
        {svc.priority === 'High' && <AlertTriangle size={10} />}
        {svc.priority}
      </span>
      <button
        onClick={onDelete}
        className="text-carbon-600 transition-colors hover:text-scat-400 opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EditVehicleModal({
  open,
  onClose,
  vehicle,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: VehicleProfile;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(vehicle);

  useEffect(() => {
    setForm(vehicle);
  }, [vehicle]);

  const save = async () => {
    await supabase.from('vehicle_profile').update({
      mileage: form.mileage,
      vin: form.vin,
      color: form.color,
      horsepower: form.horsepower,
      torque_lbft: form.torque_lbft,
      updated_at: new Date().toISOString(),
    }).eq('id', form.id);
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Vehicle Profile" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mileage (mi)</label>
            <input type="number" className="input" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: +e.target.value })} />
          </div>
          <div>
            <label className="label">Color</label>
            <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div>
            <label className="label">Horsepower</label>
            <input type="number" className="input" value={form.horsepower} onChange={(e) => setForm({ ...form, horsepower: +e.target.value })} />
          </div>
          <div>
            <label className="label">Torque (lb-ft)</label>
            <input type="number" className="input" value={form.torque_lbft} onChange={(e) => setForm({ ...form, torque_lbft: +e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">VIN</label>
            <input className="input font-mono" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Save Changes</button>
        </div>
      </div>
    </Modal>
  );
}

function AddLogModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    mileage: 0,
    service_type: 'Oil Change',
    description: '',
    cost: 0,
  });

  const save = async () => {
    await supabase.from('maintenance_logs').insert(form);
    setForm({ log_date: new Date().toISOString().split('T')[0], mileage: 0, service_type: 'Oil Change', description: '', cost: 0 });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Maintenance Log" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Mileage</label>
            <input type="number" className="input" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: +e.target.value })} />
          </div>
          <div>
            <label className="label">Service Type</label>
            <select className="input" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
              {['Oil Change', 'Tire Rotation', 'Brake Service', 'Fluid Change', 'Inspection', 'Filter Replacement', 'Other'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cost ($)</label>
            <input type="number" step="0.01" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was done?" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Add Log</button>
        </div>
      </div>
    </Modal>
  );
}

function AddUpgradeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Performance',
    status: 'Planned',
    notes: '',
  });

  const save = async () => {
    if (!form.name.trim()) return;
    await supabase.from('active_upgrades').insert(form);
    setForm({ name: '', category: 'Performance', status: 'Planned', notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Upgrade / Mod" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cold Air Intake" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Performance', 'Maintenance', 'Electrical', 'Exterior', 'Interior', 'Suspension', 'Brakes'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['Planned', 'In Progress', 'Installed'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Add Upgrade</button>
        </div>
      </div>
    </Modal>
  );
}
