/**
 * App — main layout with sidebar, chat area, dev panel, and benchmark.
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import DevPanel from './components/DevPanel';
import BenchmarkPanel from './components/BenchmarkPanel';
import { getHealth } from './services/api';
import type { ActiveView, HealthStatus } from './types';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch {
        setHealth({ status: 'error', ollama_available: false, model: '', timestamp: '' });
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-12 px-4 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <h1 className="text-sm font-semibold text-surface-300">
              {activeView === 'chat' ? 'Ollama Chat' : '⚡ Benchmark'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Health indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${health?.ollama_available ? 'bg-emerald-400' : 'bg-red-400'} ${health?.ollama_available ? 'animate-pulse-slow' : ''}`} />
              <span className="text-[10px] text-surface-500">
                {health?.ollama_available ? `${health.model} ready` : 'Ollama offline'}
              </span>
            </div>

            {/* Dev panel toggle */}
            <button onClick={() => setDevPanelOpen(!devPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${devPanelOpen ? 'bg-accent-500/20 text-accent-400' : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
              Monitor
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'chat' ? <ChatArea /> : <BenchmarkPanel />}
        </main>
      </div>

      {/* Dev panel overlay */}
      <DevPanel isOpen={devPanelOpen} onClose={() => setDevPanelOpen(false)} />
    </div>
  );
};

export default App;
