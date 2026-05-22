/**
 * DevPanel — live concurrency monitoring dashboard.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStatsStore } from '../store/statsStore';
import { formatDuration } from '../utils/helpers';

interface DevPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DevPanel: React.FC<DevPanelProps> = ({ isOpen, onClose }) => {
  const { stats, fetchStats } = useStatsStore();

  useEffect(() => {
    if (!isOpen) return;
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [isOpen, fetchStats]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-[360px] bg-surface-900/95 backdrop-blur-xl border-l border-surface-800/50 z-50 flex flex-col shadow-2xl shadow-black/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-surface-200">Live Monitor</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Metrics grid */}
          <div className="p-4 grid grid-cols-2 gap-2">
            <MetricCard label="Active Requests" value={stats?.active_requests ?? 0} color="blue" />
            <MetricCard label="Concurrent Users" value={stats?.concurrent_users ?? 0} color="purple" />
            <MetricCard label="Total Requests" value={stats?.total_requests ?? 0} color="green" />
            <MetricCard label="Avg Response" value={stats?.avg_response_time_ms ? formatDuration(stats.avg_response_time_ms) : '—'} color="orange" />
            <MetricCard label="Active Sessions" value={stats?.active_sessions ?? 0} color="cyan" />
            <MetricCard label="Model" value={stats?.model ?? '—'} color="pink" small />
          </div>

          {/* Request log */}
          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
            <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Request Log</h4>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
              {stats?.requests_history?.map((req) => (
                <div key={req.request_id + req.start_time} className="bg-surface-800/40 rounded-lg px-3 py-2 border border-surface-700/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-surface-500">#{req.request_id}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-surface-500">
                    <span>Session: {req.session_id}</span>
                    <span>{req.duration_ms ? formatDuration(req.duration_ms) : 'running...'}</span>
                  </div>
                  {req.tokens > 0 && (
                    <div className="flex items-center justify-between text-[10px] text-surface-600 mt-0.5">
                      <span>{req.tokens} tokens</span>
                      <span>{req.tokens_per_sec} tok/s</span>
                    </div>
                  )}
                </div>
              ))}
              {(!stats?.requests_history || stats.requests_history.length === 0) && (
                <p className="text-xs text-surface-600 text-center py-6">No requests yet</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function MetricCard({ label, value, color, small }: { label: string; value: string | number; color: string; small?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    pink: 'from-pink-500/10 to-pink-600/5 border-pink-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl px-3 py-2.5`}>
      <p className="text-[10px] text-surface-500 mb-0.5">{label}</p>
      <p className={`font-semibold text-surface-200 ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    processing: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${styles[status] || styles.processing}`}>
      {status}
    </span>
  );
}

export default DevPanel;
