import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Wrench,
  CheckCircle2,
  Circle,
  Pencil,
  Package,
  Timer,
  Calculator,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectStep, ProjectWithSteps } from '@/types';
import { Modal } from '@/components/Modal';
import { DifficultyMeter } from '@/components/DifficultyMeter';
import { ProgressBar } from '@/components/ProgressBar';

const statusColors: Record<string, string> = {
  'Not Started': 'bg-carbon-700 text-carbon-200 border-carbon-600',
  'In Progress': 'bg-amber-950 text-amber-300 border-amber-800/50',
  Completed: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
};

const categories: string[] = ['Performance', 'Maintenance', 'Electrical', 'Suspension', 'Brakes', 'Exterior', 'Interior'];

export function Projects() {
  const [projects, setProjects] = useState<ProjectWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadData = useCallback(async () => {
    const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (!projs) {
      setLoading(false);
      return;
    }
    const withSteps = await Promise.all(
      projs.map(async (p: Project) => {
        const { data: steps } = await supabase
          .from('project_steps')
          .select('*')
          .eq('project_id', p.id)
          .order('step_order', { ascending: true });
        return { ...p, steps: steps ?? [] };
      })
    );
    setProjects(withSteps);
    if (withSteps.length > 0 && !expanded) setExpanded(withSteps[0].id);
    setLoading(false);
  }, [expanded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStep = async (step: ProjectStep) => {
    await supabase.from('project_steps').update({ completed: !step.completed }).eq('id', step.id);

    // Auto-update project status based on step completion
    const project = projects.find((p) => p.id === step.project_id);
    if (project) {
      const updatedSteps = project.steps.map((s) =>
        s.id === step.id ? { ...s, completed: !s.completed } : s
      );
      const allDone = updatedSteps.length > 0 && updatedSteps.every((s) => s.completed);
      const anyDone = updatedSteps.some((s) => s.completed);
      const newStatus = allDone ? 'Completed' : anyDone ? 'In Progress' : 'Not Started';
      if (newStatus !== project.status) {
        await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
      }
    }
    loadData();
  };

  const deleteProject = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-carbon-400">
        <div className="animate-pulse text-sm">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-carbon-50">
            DIY Project Wizard
          </h1>
          <p className="mt-1 text-sm text-carbon-400">
            Track repairs and modifications with step-by-step procedures, torque specs, and cost analysis.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Wrench size={48} className="mb-3 text-carbon-600" />
          <p className="text-carbon-400">No projects yet. Create your first DIY project to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              expanded={expanded === project.id}
              onToggle={() => setExpanded(expanded === project.id ? null : project.id)}
              onStepToggle={toggleStep}
              onDelete={() => deleteProject(project.id)}
              onStepChanged={loadData}
            />
          ))}
        </div>
      )}

      <AddProjectModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadData} />
    </div>
  );
}

function ProjectCard({
  project,
  expanded,
  onToggle,
  onStepToggle,
  onDelete,
  onStepChanged,
}: {
  project: ProjectWithSteps;
  expanded: boolean;
  onToggle: () => void;
  onStepToggle: (step: ProjectStep) => void;
  onDelete: () => void;
  onStepChanged: () => void;
}) {
  const completedSteps = project.steps.filter((s) => s.completed).length;
  const totalSteps = project.steps.length;
  const laborSavings = project.shop_labor_cost;
  const totalProjectCost = project.parts_cost + project.shop_labor_cost;
  const diyCost = project.parts_cost;
  const savingsPct = totalProjectCost > 0 ? Math.round((laborSavings / totalProjectCost) * 100) : 0;

  return (
    <div className="card card-hover overflow-hidden">
      {/* Project Header */}
      <button onClick={onToggle} className="w-full px-5 py-4 text-left">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 shrink-0 text-carbon-400">
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-carbon-50">
                {project.title}
              </h3>
              <span className={`badge border ${statusColors[project.status] ?? statusColors['Not Started']}`}>
                {project.status}
              </span>
              <span className="badge bg-carbon-800 text-carbon-300 border border-carbon-700">{project.category}</span>
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-carbon-400">{project.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-carbon-500">Difficulty</span>
                <div className="w-24">
                  <DifficultyMeter score={project.difficulty} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-carbon-300">
                <Clock size={14} className="text-carbon-400" />
                <span className="font-mono">{project.est_hours}h est.</span>
              </div>
              {totalSteps > 0 && (
                <div className="flex items-center gap-2 min-w-[120px]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-carbon-500">Progress</span>
                  <div className="w-24">
                    <ProgressBar completed={completedSteps} total={totalSteps} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1.5 text-sm">
              <DollarSign size={14} className="text-emerald-400" />
              <span className="font-mono font-semibold text-emerald-400">{savingsPct}%</span>
              <span className="text-xs text-carbon-400">saved</span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-carbon-500">
              DIY ${diyCost.toFixed(0)} vs Shop ${totalProjectCost.toFixed(0)}
            </p>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-carbon-700/60 animate-slide-up">
          {/* Cost Calculator */}
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-4">
            <CostCell icon={<Package size={16} />} label="Parts Cost" value={project.parts_cost} color="text-steel-400" />
            <CostCell icon={<Wrench size={16} />} label="Shop Labor" value={project.shop_labor_cost} color="text-scat-400" />
            <CostCell icon={<Calculator size={16} />} label="Total at Shop" value={totalProjectCost} color="text-carbon-200" />
            <CostCell icon={<DollarSign size={16} />} label="DIY Savings" value={laborSavings} color="text-emerald-400" highlight />
          </div>

          {/* Steps */}
          <div className="border-t border-carbon-700/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="section-title text-sm">Step-by-Step Procedure</h4>
              <span className="font-mono text-xs text-carbon-400">
                {completedSteps}/{totalSteps} completed
              </span>
            </div>
            {totalSteps === 0 ? (
              <p className="py-4 text-center text-sm text-carbon-400">No steps added yet.</p>
            ) : (
              <div className="space-y-2">
                {project.steps.map((step, idx) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    index={idx + 1}
                    onToggle={() => onStepToggle(step)}
                    onEdit={onStepChanged}
                  />
                ))}
              </div>
            )}
            <AddStepRow projectId={project.id} order={totalSteps + 1} onAdded={onStepChanged} />
          </div>

          {/* Delete */}
          <div className="border-t border-carbon-700/60 px-5 py-3">
            <button
              onClick={onDelete}
              className="btn-ghost text-scat-400 hover:bg-scat-950/40 hover:text-scat-300"
            >
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CostCell({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border-b border-carbon-700/40 p-4 sm:border-b-0 sm:border-r ${highlight ? 'bg-emerald-950/20' : ''}`}>
      <div className={`mb-1 flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-display text-xl font-bold ${color}`}>
        ${value.toFixed(2)}
      </p>
    </div>
  );
}

function StepRow({
  step,
  index,
  onToggle,
  onEdit,
}: {
  step: ProjectStep;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(step);

  const save = async () => {
    await supabase.from('project_steps').update({
      description: form.description,
      fastener_info: form.fastener_info,
      torque_spec: form.torque_spec,
      tools_required: form.tools_required,
    }).eq('id', step.id);
    setEditing(false);
    onEdit();
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-scat-800/40 bg-scat-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-scat-400">EDITING STEP {index}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost"><X size={14} /> Cancel</button>
            <button onClick={save} className="btn-primary text-xs px-3 py-1.5">Save</button>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Fastener Info</label>
            <input className="input" value={form.fastener_info} onChange={(e) => setForm({ ...form, fastener_info: e.target.value })} placeholder="e.g. M10 x 1.5" />
          </div>
          <div>
            <label className="label">Torque Spec</label>
            <input className="input" value={form.torque_spec} onChange={(e) => setForm({ ...form, torque_spec: e.target.value })} placeholder="e.g. 25 lb-ft" />
          </div>
          <div>
            <label className="label">Tools Required</label>
            <input className="input" value={form.tools_required} onChange={(e) => setForm({ ...form, tools_required: e.target.value })} placeholder="e.g. 10mm socket" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-3 rounded-xl border p-3 transition-all ${
      step.completed
        ? 'border-emerald-800/30 bg-emerald-950/10'
        : 'border-carbon-700/40 bg-carbon-800/40 hover:border-carbon-600'
    }`}>
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {step.completed ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : (
          <Circle size={20} className="text-carbon-500 transition-colors hover:text-carbon-300" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="font-mono text-xs font-bold text-carbon-500 mt-0.5">#{index}</span>
          <p className={`text-sm ${step.completed ? 'text-carbon-500 line-through' : 'text-carbon-100'}`}>
            {step.description}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {step.fastener_info && step.fastener_info !== 'N/A' && (
            <span className="badge bg-steel-950 text-steel-300 border border-steel-800/50">
              <Wrench size={10} /> {step.fastener_info}
            </span>
          )}
          {step.torque_spec && step.torque_spec !== 'N/A' && (
            <span className="badge bg-amber-950 text-amber-300 border border-amber-800/50">
              <Timer size={10} /> {step.torque_spec}
            </span>
          )}
          {step.tools_required && step.tools_required !== 'N/A' && (
            <span className="badge bg-carbon-700 text-carbon-300 border border-carbon-600">
              {step.tools_required}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => { setForm(step); setEditing(true); }}
        className="shrink-0 text-carbon-600 transition-colors hover:text-carbon-300 opacity-0 group-hover:opacity-100"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

function AddStepRow({ projectId, order, onAdded }: { projectId: string; order: number; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    fastener_info: '',
    torque_spec: '',
    tools_required: '',
  });

  const save = async () => {
    if (!form.description.trim()) return;
    await supabase.from('project_steps').insert({
      project_id: projectId,
      description: form.description,
      fastener_info: form.fastener_info || 'N/A',
      torque_spec: form.torque_spec || 'N/A',
      tools_required: form.tools_required || 'N/A',
      step_order: order,
    });
    setForm({ description: '', fastener_info: '', torque_spec: '', tools_required: '' });
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-carbon-700 py-2.5 text-sm text-carbon-400 transition-all hover:border-scat-700 hover:text-scat-400">
        <Plus size={14} /> Add Step
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-scat-800/40 bg-scat-950/10 p-4 space-y-3 animate-slide-up">
      <div>
        <label className="label">Step Description</label>
        <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the step..." autoFocus />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Fastener Info</label>
          <input className="input" value={form.fastener_info} onChange={(e) => setForm({ ...form, fastener_info: e.target.value })} placeholder="e.g. M10 x 1.5" />
        </div>
        <div>
          <label className="label">Torque Spec</label>
          <input className="input" value={form.torque_spec} onChange={(e) => setForm({ ...form, torque_spec: e.target.value })} placeholder="e.g. 25 lb-ft" />
        </div>
        <div>
          <label className="label">Tools Required</label>
          <input className="input" value={form.tools_required} onChange={(e) => setForm({ ...form, tools_required: e.target.value })} placeholder="e.g. 10mm socket" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
        <button onClick={save} className="btn-primary text-xs px-3 py-1.5">Add Step</button>
      </div>
    </div>
  );
}

function AddProjectModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '',
    category: 'Performance',
    difficulty: 5,
    est_hours: 4,
    parts_cost: 0,
    shop_labor_cost: 0,
    status: 'Not Started',
    description: '',
  });

  const save = async () => {
    if (!form.title.trim()) return;
    await supabase.from('projects').insert(form);
    setForm({ title: '', category: 'Performance', difficulty: 5, est_hours: 4, parts_cost: 0, shop_labor_cost: 0, status: 'Not Started', description: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New DIY Project" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Project Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Installing Cold Air Intake" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['Not Started', 'In Progress', 'Completed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Difficulty (1-10)</label>
            <input type="number" min={1} max={10} className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: +e.target.value })} />
          </div>
          <div>
            <label className="label">Est. Hours</label>
            <input type="number" step="0.5" className="input" value={form.est_hours} onChange={(e) => setForm({ ...form, est_hours: +e.target.value })} />
          </div>
          <div>
            <label className="label">Parts Cost ($)</label>
            <input type="number" step="0.01" className="input" value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: +e.target.value })} />
          </div>
          <div>
            <label className="label">Shop Labor Cost ($)</label>
            <input type="number" step="0.01" className="input" value={form.shop_labor_cost} onChange={(e) => setForm({ ...form, shop_labor_cost: +e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief project description..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Create Project</button>
        </div>
      </div>
    </Modal>
  );
}
