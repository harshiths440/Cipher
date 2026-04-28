import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

const API = 'http://localhost:8000';
const POLL_INTERVAL = 5000;   // 5 s  — fetch cadence
const SCAN_CYCLE    = 60;     // 60 s — matches scheduler interval

// ─── severity → visual style map ────────────────────────────────────────────

const SEVERITY_STYLE = {
  CRITICAL: {
    border: 'border-l-4 border-l-red-500',
    bg:     'bg-red-500/5',
    ts:     'text-red-400/60',
  },
  WARNING: {
    border: 'border-l-4 border-l-orange-500',
    bg:     '',
    ts:     'text-orange-400/60',
  },
  INFO: {
    border: '',
    bg:     '',
    ts:     'text-gray-500',
  },
};

// ─── single log row ──────────────────────────────────────────────────────────

const LogRow = ({ entry }) => {
  const style = SEVERITY_STYLE[entry.severity] || SEVERITY_STYLE.INFO;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -8,  scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 px-4 py-2.5 rounded-lg ${style.border} ${style.bg} transition-colors`}
    >
      {/* Timestamp */}
      <span
        className={`shrink-0 font-mono text-[11px] leading-5 tracking-tight mt-0.5 ${style.ts} w-[54px]`}
      >
        {entry.timestamp}
      </span>

      {/* Icon */}
      <span className="shrink-0 text-base leading-5 mt-0.5">{entry.icon}</span>

      {/* Message + company */}
      <span className="text-[13px] text-gray-300 leading-snug">
        {entry.message}
        {entry.company && (
          <>
            {' — '}
            <span className="text-indigo-400 font-semibold">{entry.company}</span>
          </>
        )}
      </span>
    </motion.div>
  );
};

// ─── countdown row ───────────────────────────────────────────────────────────

const CountdownRow = ({ seconds }) => (
  <div className="flex gap-3 px-4 py-2 opacity-50">
    <span className="shrink-0 font-mono text-[11px] text-gray-600 w-[54px] mt-0.5">
      {new Date().toLocaleTimeString('en-GB', { hour12: false }).slice(0, 8)}
    </span>
    <span className="shrink-0 text-base leading-5 mt-0.5">🔄</span>
    <span className="text-[13px] text-gray-500 leading-snug">
      Next scan in{' '}
      <span className="font-mono text-indigo-400">{seconds}s</span>
      …
    </span>
  </div>
);

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   cin  (string | undefined)  — when provided, shows only entries whose
 *                                 company field matches the company name.
 *                                 When absent shows ALL entries (global view).
 *   companyName (string | undefined) — used for filtering; pass the company's
 *                                      display name alongside cin.
 *   maxVisible  (number, default 8)  — max rows visible before scroll.
 */
const ActivityFeed = ({ cin, companyName, maxVisible = 8 }) => {
  const [entries,    setEntries]    = useState([]);
  const [seenIds,    setSeenIds]    = useState(new Set());
  const [countdown,  setCountdown]  = useState(SCAN_CYCLE);
  const [liveStatus, setLiveStatus] = useState('connecting'); // 'connecting' | 'live' | 'error'
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  // ── Fetch activity log ───────────────────────────────────────────────────
  const fetchLog = async () => {
    try {
      const res  = await fetch(`${API}/activity-log`);
      if (!res.ok) throw new Error('non-2xx');
      const data = await res.json();

      let raw = data.entries || [];

      // Filter to this company when cin is supplied
      if (cin && companyName) {
        raw = raw.filter(e =>
          !e.company || // always show global entries (e.g. scan start)
          e.company.toLowerCase().includes(companyName.toLowerCase())
        );
      }

      // Merge-in only new entries (avoid full re-render flicker)
      setEntries(prev => {
        const prevIds = new Set(prev.map(e => e.id));
        const fresh   = raw.filter(e => !prevIds.has(e.id));
        if (fresh.length === 0) return prev;
        // Prepend new entries, keep max 50
        return [...fresh, ...prev].slice(0, 50);
      });

      setLiveStatus('live');
      setCountdown(SCAN_CYCLE); // reset countdown on every successful poll
    } catch {
      setLiveStatus('error');
    }
  };

  // ── Poll every 5 s ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchLog();
    pollRef.current = setInterval(fetchLog, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [cin, companyName]);

  // ── Countdown tick every 1 s ─────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? SCAN_CYCLE : c - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Visible entries (capped) ─────────────────────────────────────────────
  const visible = entries.slice(0, maxVisible);

  // ── Status dot ──────────────────────────────────────────────────────────
  const dot = {
    live:        'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]',
    connecting:  'bg-yellow-400 animate-pulse',
    error:       'bg-red-500',
  }[liveStatus];

  const statusLabel = {
    live:       '🟢 Live',
    connecting: '🟡 Connecting',
    error:      '🔴 Offline',
  }[liveStatus];

  return (
    <div
      className="bg-[#0A0F1E] border border-indigo-500/20 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 4px 32px rgba(0,0,0,0.4)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-500/15 bg-indigo-950/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <Zap className="w-4 h-4 text-indigo-400" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">System Activity</p>
            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
              Automation engine running
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
          <span className="text-xs font-semibold text-gray-400">{statusLabel}</span>
        </div>
      </div>

      {/* ── Feed ── */}
      <div
        className="overflow-y-auto py-2 space-y-0.5"
        style={{ maxHeight: `${maxVisible * 44}px` }}
      >
        {entries.length === 0 && liveStatus !== 'error' && (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">
            Waiting for automation engine activity…
          </div>
        )}

        {liveStatus === 'error' && entries.length === 0 && (
          <div className="px-5 py-8 text-center text-red-500/60 text-sm">
            Could not reach activity log endpoint.
          </div>
        )}

        <AnimatePresence initial={false}>
          {visible.map(entry => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </AnimatePresence>

        {/* Countdown always last */}
        <CountdownRow seconds={countdown} />
      </div>

      {/* ── Footer — overflow hint ── */}
      {entries.length > maxVisible && (
        <div className="border-t border-white/5 px-5 py-2 flex justify-between items-center">
          <span className="text-[11px] text-gray-600">
            Showing {maxVisible} of {entries.length} entries
          </span>
          <span className="text-[11px] text-indigo-500/60">scroll ↑ for more</span>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
