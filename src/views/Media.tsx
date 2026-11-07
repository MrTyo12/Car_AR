import { useEffect, useState, useCallback } from 'react';
import {
  Play,
  Plus,
  Trash2,
  ExternalLink,
  Video,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MediaTutorial } from '@/types';
import { Modal } from '@/components/Modal';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function Media() {
  const [tutorials, setTutorials] = useState<MediaTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<MediaTutorial | null>(null);

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('media_tutorials').select('*').order('created_at', { ascending: false });
    setTutorials(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-carbon-400">
        <div className="animate-pulse text-sm">Loading tutorials...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-carbon-50">
            Media & Tutorials
          </h1>
          <p className="mt-1 text-sm text-carbon-400">
            Video guides and quick-reference notes for your DIY installs.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Resource
        </button>
      </div>

      {tutorials.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Video size={48} className="mb-3 text-carbon-600" />
          <p className="text-carbon-400">No tutorials yet. Add a video link or reference note.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tut) => {
            const ytId = extractYouTubeId(tut.url);
            return (
              <div key={tut.id} className="card card-hover group overflow-hidden">
                {/* Thumbnail */}
                <div
                  className="relative aspect-video cursor-pointer overflow-hidden bg-carbon-800"
                  onClick={() => ytId && setActiveVideo(tut)}
                >
                  {ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={tut.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FileText size={40} className="text-carbon-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/30 transition-opacity">
                    {ytId && (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-scat-600/90 shadow-lg transition-all group-hover:scale-110 group-hover:bg-scat-500">
                        <Play size={24} className="ml-1 text-white" fill="white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute left-2 top-2">
                    <span className="badge bg-carbon-950/80 text-carbon-200 border border-carbon-700/80 backdrop-blur-sm">
                      {tut.type === 'Video' ? <Video size={10} /> : <FileText size={10} />}
                      {tut.type}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm text-carbon-100 leading-snug">{tut.title}</h3>
                  {tut.description && (
                    <p className="mt-1.5 text-xs text-carbon-400 line-clamp-2">{tut.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <a
                      href={tut.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-steel-400 transition-colors hover:text-steel-300"
                    >
                      <ExternalLink size={12} /> Open Link
                    </a>
                    <button
                      onClick={async () => { await supabase.from('media_tutorials').delete().eq('id', tut.id); loadData(); }}
                      className="text-carbon-600 transition-colors hover:text-scat-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick reference tips card */}
      <div className="card p-5">
        <h2 className="section-title mb-3 flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-500" /> Quick Reference Tips
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TipItem
            title="6.4L HEMI Oil Capacity"
            body="7 quarts of 5W-20 full synthetic. Mopar MO-899 filter. Change every 5,000 miles or 6 months."
          />
          <TipItem
            title="Header Bolt Torque Sequence"
            body="Start from center, work outward in 3 passes: 10 lb-ft, 18 lb-ft, final 25 lb-ft. Use thread locker."
          />
          <TipItem
            title="O2 Sensor Torque"
            body="30 lb-ft with high-temp anti-seize on threads. Do not over-tighten — can damage sensor."
          />
          <TipItem
            title="R134a AC System Capacity"
            body="Scat Pack system holds ~22 oz R134a. Low side target: 30-40 psi. Vent temp: 40-48F."
          />
          <TipItem
            title="ZF 8HP70 Transmission Fluid"
            body="Use ZF Lifeguard 8 fluid. Filter integrated with pan — replace together. ~10 quarts for full change."
          />
          <TipItem
            title="Spark Plug Gap (6.4L)"
            body="NGK 1430 (ZPFR5F-11). Gap: 0.043 inch. Replace at 45,000 miles. Use anti-seize on threads."
          />
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && extractYouTubeId(activeVideo.url) && (
        <Modal open={!!activeVideo} onClose={() => setActiveVideo(null)} title={activeVideo.title} size="lg">
          <div className="space-y-3">
            <div className="aspect-video overflow-hidden rounded-xl border border-carbon-700">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${extractYouTubeId(activeVideo.url)}`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {activeVideo.description && (
              <p className="text-sm text-carbon-300">{activeVideo.description}</p>
            )}
          </div>
        </Modal>
      )}

      <AddMediaModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadData} />
    </div>
  );
}

function TipItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-carbon-700/40 bg-carbon-800/40 p-3">
      <p className="font-semibold text-sm text-amber-300">{title}</p>
      <p className="mt-1 text-xs text-carbon-400">{body}</p>
    </div>
  );
}

function AddMediaModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: '',
    url: '',
    type: 'Video',
    description: '',
  });

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    await supabase.from('media_tutorials').insert(form);
    setForm({ title: '', url: '', type: 'Video', description: '' });
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Tutorial / Reference" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Header Install Tutorial" autoFocus />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="Video">Video</option>
              <option value="Article">Article</option>
              <option value="Note">Note</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">URL</label>
            <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary">Add Resource</button>
        </div>
      </div>
    </Modal>
  );
}
