import { useState } from 'react';
import { Gauge, Wrench, Package, Video, Car, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { WorkspaceGate, WorkspaceBadge } from '@/components/WorkspaceGate';
import { ARReturn } from '@/components/ARReturn';
import { Dashboard } from '@/views/Dashboard';
import { Projects } from '@/views/Projects';
import { PartsTools } from '@/views/PartsTools';
import { Media } from '@/views/Media';

type Tab = 'dashboard' | 'projects' | 'parts' | 'media';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Gauge size={18} /> },
  { id: 'projects', label: 'Projects', icon: <Wrench size={18} /> },
  { id: 'parts', label: 'Parts & Tools', icon: <Package size={18} /> },
  { id: 'media', label: 'Tutorials', icon: <Video size={18} /> },
];

function AppContent() {
  const { user, signOut } = useAuth();
  const [active, setActive] = useState<Tab>('dashboard');

  const email = user?.email ?? '';

  return (
    <div className="min-h-screen bg-carbon-950">
      <ARReturn />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-carbon-800 bg-carbon-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-scat-600 shadow-lg shadow-scat-950/40">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold uppercase leading-none tracking-tight text-carbon-50">
                Scat Pack DIY
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-500">
                2020 Charger Widebody Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-carbon-900 p-1 border border-carbon-800">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    active === t.id
                      ? 'bg-scat-600 text-white shadow-lg shadow-scat-950/30'
                      : 'text-carbon-400 hover:text-carbon-200'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>

            <WorkspaceBadge />

            {/* User + sign out */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium text-carbon-400 max-w-[160px] truncate" title={email}>
                {email}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 rounded-lg bg-carbon-800 px-3 py-2 text-sm font-medium text-carbon-300 transition-all hover:bg-carbon-700 hover:text-carbon-100"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile user bar */}
        <div className="flex sm:hidden items-center justify-between border-t border-carbon-800 px-4 py-2">
          <span className="text-xs font-medium text-carbon-400 truncate" title={email}>
            {email}
          </span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-carbon-300 transition-all hover:text-carbon-100"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 pb-24 md:pb-8">
        {active === 'dashboard' && <Dashboard />}
        {active === 'projects' && <Projects />}
        {active === 'parts' && <PartsTools />}
        {active === 'media' && <Media />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-carbon-800 bg-carbon-950/95 backdrop-blur-lg md:hidden">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-all ${
                active === t.id ? 'text-scat-500' : 'text-carbon-500'
              }`}
            >
              <div className={`transition-transform ${active === t.id ? 'scale-110' : ''}`}>
                {t.icon}
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceGate>
        <AppContent />
      </WorkspaceGate>
    </AuthProvider>
  );
}
