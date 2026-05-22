/**
 * BenchmarkPanel — concurrent request performance testing.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStatsStore } from '../store/statsStore';
import { generateId, formatDuration } from '../utils/helpers';
import type { BenchmarkResult } from '../types';

const BenchmarkPanel: React.FC = () => {
  const [prompt, setPrompt] = useState('Explain what a linked list is in 2 sentences.');
  const [userCount, setUserCount] = useState(3);
  const { benchmarkResults, isBenchmarkRunning, clearBenchmarks, setBenchmarkRunning, addBenchmarkResult, updateBenchmarkResult } = useStatsStore();

  const runBenchmark = async () => {
    clearBenchmarks();
    setBenchmarkRunning(true);

    // Create results placeholders
    const users: BenchmarkResult[] = [];
    for (let i = 1; i <= userCount; i++) {
      const result: BenchmarkResult = {
        userId: i,
        sessionId: generateId(),
        startTime: 0,
        endTime: null,
        duration: null,
        tokenCount: 0,
        status: 'pending',
        response: '',
      };
      users.push(result);
      addBenchmarkResult(result);
    }

    // Fire all requests concurrently
    const promises = users.map(async (user) => {
      updateBenchmarkResult(user.userId, { status: 'running', startTime: Date.now() });

      try {
        const start = Date.now();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: user.sessionId,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          updateBenchmarkResult(user.userId, {
            status: 'error',
            endTime: Date.now(),
            duration: Date.now() - start,
            errorMessage: `HTTP ${response.status}`,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let tokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.content) { fullText += data.content; tokens = data.tokens || tokens + 1; }
              if (data.done) { tokens = data.tokens || tokens; }
              if (data.error) { throw new Error(data.error); }
            } catch { /* skip parse errors */ }
          }
        }

        const end = Date.now();
        updateBenchmarkResult(user.userId, {
          status: 'completed',
          endTime: end,
          duration: end - start,
          tokenCount: tokens,
          response: fullText.slice(0, 200),
        });
      } catch (err: unknown) {
        updateBenchmarkResult(user.userId, {
          status: 'error',
          endTime: Date.now(),
          duration: Date.now() - (user.startTime || Date.now()),
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });

    await Promise.all(promises);
    setBenchmarkRunning(false);
  };

  // Calculate summary
  const completed = benchmarkResults.filter((r) => r.status === 'completed');
  const totalDuration = completed.length > 0 ? Math.max(...completed.map((r) => r.duration || 0)) : 0;
  const avgDuration = completed.length > 0 ? completed.reduce((a, r) => a + (r.duration || 0), 0) / completed.length : 0;

  // Determine concurrency — if total time < sum of all durations, requests overlapped
  const sumDurations = completed.reduce((a, r) => a + (r.duration || 0), 0);
  const concurrencyRatio = totalDuration > 0 ? sumDurations / totalDuration : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto w-full p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-surface-200 flex items-center gap-2">
            <span>⚡</span> Concurrency Benchmark
          </h2>
          <p className="text-sm text-surface-500 mt-1">Fire simultaneous requests to test LLM concurrency.</p>
        </div>

        {/* Controls */}
        <div className="bg-surface-800/40 rounded-2xl border border-surface-700/30 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
              className="w-full bg-surface-900/50 text-sm text-surface-200 rounded-xl px-4 py-3 border border-surface-700/30 focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 focus:outline-none resize-none" />
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Users</label>
              <select value={userCount} onChange={(e) => setUserCount(Number(e.target.value))}
                className="bg-surface-900/50 text-sm text-surface-200 rounded-xl px-4 py-2.5 border border-surface-700/30 focus:outline-none">
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={runBenchmark} disabled={isBenchmarkRunning}
              className="px-6 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 disabled:opacity-50 transition-all">
              {isBenchmarkRunning ? '⏳ Running...' : '🚀 Run Benchmark'}
            </motion.button>
            {benchmarkResults.length > 0 && (
              <button onClick={clearBenchmarks} className="px-4 py-2.5 text-sm text-surface-500 hover:text-surface-300 transition-colors">Clear</button>
            )}
          </div>
        </div>

        {/* Results */}
        {benchmarkResults.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            {completed.length > 0 && !isBenchmarkRunning && (
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Wall Time" value={formatDuration(totalDuration)} />
                <SummaryCard label="Avg Per Request" value={formatDuration(avgDuration)} />
                <SummaryCard label="Concurrency Ratio" value={`${concurrencyRatio.toFixed(1)}x`}
                  sub={concurrencyRatio > 1.3 ? '✅ Concurrent' : '⚠️ Sequential'} />
              </div>
            )}

            {/* Individual results */}
            <div className="bg-surface-800/40 rounded-2xl border border-surface-700/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/30">
                    <th className="text-left text-[10px] text-surface-500 uppercase tracking-wider px-4 py-2.5">User</th>
                    <th className="text-left text-[10px] text-surface-500 uppercase tracking-wider px-4 py-2.5">Status</th>
                    <th className="text-left text-[10px] text-surface-500 uppercase tracking-wider px-4 py-2.5">Duration</th>
                    <th className="text-left text-[10px] text-surface-500 uppercase tracking-wider px-4 py-2.5">Tokens</th>
                    <th className="text-left text-[10px] text-surface-500 uppercase tracking-wider px-4 py-2.5">Tok/s</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkResults.map((r) => (
                    <tr key={r.userId} className="border-b border-surface-800/50 last:border-0">
                      <td className="px-4 py-2.5 text-surface-300 font-mono text-xs">User {r.userId}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                      <td className="px-4 py-2.5 text-surface-400 text-xs font-mono">{r.duration ? formatDuration(r.duration) : '—'}</td>
                      <td className="px-4 py-2.5 text-surface-400 text-xs">{r.tokenCount || '—'}</td>
                      <td className="px-4 py-2.5 text-surface-400 text-xs">{r.duration && r.tokenCount ? (r.tokenCount / (r.duration / 1000)).toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-800/40 rounded-xl border border-surface-700/30 px-4 py-3 text-center">
      <p className="text-[10px] text-surface-500 mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-surface-200">{value}</p>
      {sub && <p className="text-[10px] text-surface-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-surface-700/50 text-surface-400',
    running: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

export default BenchmarkPanel;
