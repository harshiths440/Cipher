import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { analyzeCompany } from '../api/client';
import RiskGauge from '../components/RiskGauge';
import ShapFactorBar from '../components/ShapFactorBar';
import ViolationCard from '../components/ViolationCard';
import RemediationPanel from '../components/RemediationPanel';
import LoadingSpinner from '../components/LoadingSpinner';

const API = 'http://localhost:8000';

// ─── helpers ────────────────────────────────────────────────────────────────

const getBucketStyle = (bucket) => {
  switch (bucket) {
    case 'LOW':      return 'text-[#22C55E] border-[#22C55E]/20 bg-[#22C55E]/10';
    case 'MEDIUM':   return 'text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/10';
    case 'HIGH':     return 'text-[#F97316] border-[#F97316]/20 bg-[#F97316]/10';
    case 'CRITICAL': return 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/10';
    default:         return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
  }
};

const fmt = (n) => n >= 1e5
  ? `₹${(n / 1e5).toFixed(1)}L`
  : `₹${n?.toLocaleString('en-IN') ?? 0}`;

const StatusBadge = ({ s }) => {
  const map = {
    COMPLIANT: 'bg-green-500/15 text-green-400 border-green-500/30',
    VERIFIED:  'bg-green-500/15 text-green-400 border-green-500/30',
    AT_RISK:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    OUTDATED:  'bg-red-500/15 text-red-400 border-red-500/30',
    DEFAULTING:'bg-red-500/15 text-red-400 border-red-500/30',
    PAID:      'bg-green-500/15 text-green-400 border-green-500/30',
    MISSED:    'bg-red-500/15 text-red-400 border-red-500/30',
    UPCOMING:  'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${map[s] ?? 'text-gray-400'}`}>
      {s}
    </span>
  );
};

// ─── Tax Analysis Tab ────────────────────────────────────────────────────────

const TaxTab = ({ cin }) => {
  const [tax, setTax] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`${API}/tax/${cin}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setTax)
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [cin]);

  if (loading) return <LoadingSpinner message="Running Tax Expert analysis…" />;
  if (err)     return <div className="p-6 text-red-400 text-sm">Failed: {err}</div>;
  if (!tax)    return null;

  const at = tax.advance_tax;
  const dotColor = { PAID:'bg-green-400', MISSED:'bg-red-500', UPCOMING:'bg-gray-500' };

  return (
    <div className="space-y-8 pb-16">

      {/* ── Header row ── */}
      <div className="bg-[var(--color-brand-card)] border border-white/10 rounded-2xl p-6 flex flex-wrap gap-6 items-center">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Tax Liability</p>
          <p className="text-4xl font-black text-white">{fmt(tax.total_tax_liability)}</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Effective Rate</span>
          <span className="text-lg font-bold text-indigo-400">{(tax.effective_rate * 100).toFixed(1)}%</span>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          {(tax.risk_flags || []).slice(0, 3).map((f, i) => (
            <span key={i} className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1 rounded-full max-w-xs truncate" title={f}>
              ⚠ {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Advance Tax Timeline ── */}
      <div className="bg-[var(--color-brand-card)] border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-6">Advance Tax Timeline</h3>
        <div className="relative flex justify-between items-start">
          {/* connector line */}
          <div className="absolute top-3 left-0 right-0 h-px bg-white/10 z-0" />
          {at.installments.map((inst, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2 w-1/4 px-2">
              <div className={`w-6 h-6 rounded-full border-2 border-[var(--color-brand-card)] ${dotColor[inst.status] ?? 'bg-gray-500'}`} />
              <span className="text-xs font-semibold text-gray-300">{inst.due}</span>
              <span className="text-xs text-gray-500">{inst.percent}%</span>
              <span className="text-xs font-bold text-white">{fmt(inst.amount)}</span>
              <StatusBadge s={inst.status} />
            </div>
          ))}
        </div>
        {at.shortfall > 0 && (
          <div className="mt-6 flex gap-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Shortfall</p>
              <p className="text-red-400 font-bold">{fmt(at.shortfall)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Interest Liability (§234B/C)</p>
              <p className="text-red-400 font-bold">{fmt(at.interest_liability)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── TDS Table ── */}
      <div className="bg-[var(--color-brand-card)] border border-white/10 rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">TDS Obligations</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
              <th className="text-left pb-3 pr-4">Type</th>
              <th className="text-left pb-3 pr-4">Section</th>
              <th className="text-right pb-3 pr-4">Est. Volume</th>
              <th className="text-right pb-3 pr-4">Rate</th>
              <th className="text-right pb-3 pr-4">TDS Due</th>
              <th className="text-left pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(tax.tds_obligations || []).map((t, i) => (
              <tr key={i} className="hover:bg-white/3 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{t.type}</td>
                <td className="py-3 pr-4 text-indigo-400 font-mono text-xs">{t.section}</td>
                <td className="py-3 pr-4 text-right text-gray-300">{fmt(t.estimated_annual)}</td>
                <td className="py-3 pr-4 text-right text-gray-300">{(t.tds_rate * 100).toFixed(0)}%</td>
                <td className="py-3 pr-4 text-right font-semibold text-white">{fmt(t.tds_due)}</td>
                <td className="py-3"><StatusBadge s={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MAT Check ── */}
      <div className="bg-[var(--color-brand-card)] border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">MAT Check — Section 115JB</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: 'Regular Tax', val: tax.mat_check.regular_tax, active: !tax.mat_check.mat_applies },
            { label: 'MAT Liability', val: tax.mat_check.mat_liability, active: tax.mat_check.mat_applies },
          ].map(({ label, val, active }) => (
            <div key={label} className={`p-4 rounded-xl border-2 transition-all ${active ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/3'}`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-black ${active ? 'text-indigo-300' : 'text-gray-400'}`}>{fmt(val)}</p>
              {active && <span className="text-xs text-indigo-400 font-semibold mt-1 block">▲ Applies</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-sm">
          <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${tax.mat_check.mat_applies ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}>
            {tax.mat_check.mat_applies ? 'MAT Applies' : 'Regular Tax Applies'}
          </span>
          {tax.mat_check.tax_credit_available > 0 && (
            <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              MAT Credit: {fmt(tax.mat_check.tax_credit_available)}
            </span>
          )}
        </div>
      </div>

      {/* ── Savings Opportunities ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Savings Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(tax.savings_opportunities || []).map((s, i) => (
            <div key={i} className={`p-5 rounded-xl border transition-all ${s.applicable ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-white/2 opacity-40'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold text-indigo-400">§ {s.section}</span>
                {s.applicable && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Applicable</span>}
              </div>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">{s.description}</p>
              {s.applicable && (
                <p className="text-lg font-black text-green-400">Save {fmt(s.estimated_saving)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CA Audit Tab ────────────────────────────────────────────────────────────

const CAAuditTab = ({ cin }) => {
  const [ca, setCa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${API}/ca-verify/${cin}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setCa)
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [cin]);

  if (loading) return <LoadingSpinner message="Running CA Audit verification…" />;
  if (err)     return <div className="p-6 text-red-400 text-sm">Failed: {err}</div>;
  if (!ca)     return null;

  const allVerified = ca.at_risk_count === 0 && ca.outdated_count === 0;

  return (
    <div className="space-y-6 pb-16">

      {/* ── Summary banner ── */}
      {allVerified ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <span className="text-2xl">✅</span>
          <p className="text-green-400 font-semibold">{ca.summary}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-yellow-300 font-semibold">{ca.summary}</p>
            <p className="text-yellow-400/60 text-xs mt-0.5">
              {ca.outdated_count} outdated &nbsp;·&nbsp; {ca.at_risk_count} at risk &nbsp;·&nbsp; {ca.total_filings - ca.at_risk_count - ca.outdated_count} verified
            </p>
          </div>
        </div>
      )}

      {/* ── Filings table ── */}
      <div className="bg-[var(--color-brand-card)] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Filing Verification</h3>
        </div>
        <div className="divide-y divide-white/5">
          {(ca.verified_filings || []).map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full text-left px-6 py-4 hover:bg-white/3 transition-colors flex items-center gap-4"
              >
                {/* Form */}
                <span className="font-mono font-bold text-indigo-300 w-20 shrink-0">{f.form}</span>
                {/* Date */}
                <span className="text-gray-400 text-sm w-28 shrink-0">{f.filed_date}</span>
                {/* CA */}
                <span className="text-gray-500 text-sm flex-1 truncate">{f.filed_by}</span>
                {/* Status */}
                <StatusBadge s={f.status} />
                {/* Flag snippet */}
                {f.flag_message && (
                  <span className="text-xs text-gray-600 hidden md:block flex-1 truncate ml-2">
                    {f.flag_message}
                  </span>
                )}
                {/* Chevron */}
                {f.flag_message && (
                  <span className={`text-gray-600 transition-transform ${expanded === i ? 'rotate-180' : ''}`}>▾</span>
                )}
              </button>

              {/* Expanded detail */}
              {expanded === i && f.flag_message && (
                <div className="mx-6 mb-4 p-4 border border-indigo-500/30 bg-indigo-500/5 rounded-xl space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Finding</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{f.flag_message}</p>
                  </div>
                  {f.recommendation && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recommendation</p>
                      <p className="text-sm text-indigo-300 leading-relaxed">→ {f.recommendation}</p>
                    </div>
                  )}
                  {f.regulation_date && (
                    <div className="text-xs text-gray-600">
                      Regulation effective: <span className="text-gray-400">{f.regulation_date}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab (existing content) ────────────────────────────────────────

const OverviewTab = ({ data, cin }) => {
  const bucket = getBucketStyle(data.risk_bucket || 'LOW');
  return (
    <div className="space-y-8 pb-16">
      {/* Risk Score Hero */}
      <div className="bg-[var(--color-brand-card)] border-glass rounded-2xl p-8 flex flex-col md:flex-row items-center gap-12 shadow-lg">
        <div className="w-full md:w-1/3 flex justify-center">
          <RiskGauge score={data.risk_score || 0} />
        </div>
        <div className="w-full md:w-2/3">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/5">
            <span className={`text-5xl font-black ${bucket.split(' ')[0]}`}>{data.risk_score || 0}</span>
            <span className={`text-sm font-bold px-3 py-1 rounded border uppercase tracking-widest ${bucket}`}>
              {data.risk_bucket || 'LOW'} Risk
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Score driven by:</h3>
            <div className="space-y-1">
              {(data.top_factors || []).slice(0, 3).map((f, i) => <ShapFactorBar key={i} factorString={f} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Violations + Remediation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
            <span className="w-1.5 h-6 bg-[var(--color-brand-critical)] rounded mr-3" />
            Active Violations
          </h2>
          <div className="flex-grow space-y-4">
            {(data.violations || []).map((v, i) => (
              <ViolationCard key={i} ruleName={v.rule} severity={v.severity} description={v.description}
                penaltyReference={v.penalty_reference} penaltyAmount={v.penalty_amount_inr} />
            ))}
            {(!data.violations || data.violations.length === 0) && (
              <div className="text-gray-500 italic p-4 bg-white/5 rounded border border-white/5">No active violations detected.</div>
            )}
          </div>
        </div>
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
            <span className="w-1.5 h-6 bg-[var(--color-brand-primary)] rounded mr-3" />
            AI Remediation Plan
          </h2>
          <RemediationPanel text={data.remediation_steps} cin={cin} />
        </div>
      </div>

      {/* Regulations */}
      <div className="pt-4 border-t border-white/5">
        <h2 className="text-xl font-bold text-gray-200 mb-6 font-mono text-sm uppercase tracking-wider">Relevant Regulations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.relevant_regulations || []).map((reg, i) => (
            <div key={i} className="p-4 border border-white/10 rounded-lg bg-gray-900/50 hover:border-white/20 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-indigo-300 text-sm">{reg.act}</h4>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{reg.section}</span>
              </div>
              <p className="text-gray-400 text-xs italic border-l-2 border-indigo-500/30 pl-3 py-1">"{reg.text}"</p>
              {reg.penalty && <div className="mt-2 text-xs font-medium text-orange-400">Penalty: {reg.penalty}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Alert Inbox Tab ─────────────────────────────────────────────────────────

const AlertInboxTab = ({ alerts, refreshAlerts }) => {
  const [replyText, setReplyText] = useState({});
  const [replyModal, setReplyModal] = useState({ open: false, alertId: null });

  const handleAck = async () => {
    const responseText = replyText[replyModal.alertId] || 'Acknowledged and processing.';
    try {
      const res = await fetch(`${API}/alerts/${replyModal.alertId}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ca_response: responseText })
      });
      if (res.ok) {
        setReplyModal({ open: false, alertId: null });
        refreshAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRead = async (id) => {
    try {
      await fetch(`${API}/alerts/${id}/read`, { method: 'PUT' });
      refreshAlerts();
    } catch (e) { console.error(e); }
  };

  if (!alerts.length) return <div className="p-8 text-center text-gray-400 border border-white/5 rounded-xl bg-white/2">No alerts from Executive.</div>;

  return (
    <div className="space-y-4 pb-16">
      {alerts.map(a => {
        const isEmergency = a.urgency === 'EMERGENCY';
        const isHigh = a.urgency === 'HIGH';
        const urgencyClass = isEmergency 
          ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
          : isHigh ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black';
        
        return (
          <div key={a.id} className={`p-5 rounded-xl border ${a.status === 'UNREAD' ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 bg-[var(--color-brand-card)]'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${urgencyClass}`}>
                  {a.urgency}
                </span>
                <span className="text-sm text-gray-400">{new Date(a.sent_at).toLocaleString()}</span>
              </div>
              <StatusBadge s={a.status} />
            </div>
            
            <p className="text-sm text-gray-400 mb-1">Re: <span className="font-bold text-white">{a.regulation_title}</span></p>
            <p className="text-gray-300 text-sm mb-6 bg-black/30 p-4 rounded-xl border-l-4 border-indigo-500">{a.message}</p>
            
            {a.status !== 'ACKNOWLEDGED' ? (
              <div className="flex gap-3 mt-4 border-t border-white/10 pt-4">
                {a.status === 'UNREAD' && (
                  <button onClick={() => handleRead(a.id)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors">
                    Mark as Read
                  </button>
                )}
                <button onClick={() => setReplyModal({ open: true, alertId: a.id })} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Acknowledge + Reply
                </button>
              </div>
            ) : (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                  <p className="text-xs text-green-400 mb-2 font-bold uppercase tracking-wider">Your response ({new Date(a.acknowledged_at).toLocaleString()}):</p>
                  <p className="text-sm text-gray-200">{a.ca_response}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {replyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Reply to Executive</h3>
            <textarea 
              className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[120px] mb-4"
              placeholder="E.g. I have reviewed this and will file it by EOD."
              value={replyText[replyModal.alertId] || ''}
              onChange={e => setReplyText({...replyText, [replyModal.alertId]: e.target.value})}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setReplyModal({ open: false, alertId: null })} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleAck} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Filing Requests Tab ─────────────────────────────────────────────────────

const FilingRequestsTab = ({ requests, refreshRequests }) => {
  const [filingModal, setFilingModal] = useState({ open: false, request: null, caName: '', portal: 'GST Portal' });

  const getPortal = (form) => {
    if (form.includes('GST')) return 'GST Portal';
    if (form.includes('ITR') || form.includes('15CA')) return 'Income Tax Portal';
    if (form.includes('MGT') || form.includes('AOC') || form.includes('DIR')) return 'MCA21';
    return 'Other';
  };

  const handleProgress = async (id) => {
    await fetch(`${API}/filing-requests/${id}/progress`, { method: 'PUT' });
    refreshRequests();
  };

  const handleConfirmFiled = async () => {
    const { request, caName, portal } = filingModal;
    await fetch(`${API}/filing-requests/${request.id}/file`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ca_name: caName || 'CA', form_name: request.form_name, portal })
    });
    setFilingModal({ open: false, request: null, caName: '', portal: '' });
    refreshRequests();
  };

  const openModal = (r) => {
    setFilingModal({ open: true, request: r, caName: '', portal: getPortal(r.form_name) });
  };

  if (!requests.length) return <div className="p-8 text-center text-gray-400 border border-white/5 rounded-xl bg-white/2">No pending filing requests.</div>;

  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden pb-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-black/20 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Form</th>
              <th className="px-6 py-4">Requested</th>
              <th className="px-6 py-4">Deadline</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{r.form_name}</td>
                <td className="px-6 py-4 text-gray-400">{new Date(r.requested_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">{r.deadline}</td>
                <td className="px-6 py-4"><StatusBadge s={r.status} /></td>
                <td className="px-6 py-4 text-right">
                  {r.status === 'PENDING' && (
                    <button onClick={() => handleProgress(r.id)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors">
                      Start Filing
                    </button>
                  )}
                  {r.status === 'IN_PROGRESS' && (
                    <button onClick={() => openModal(r)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors shadow-lg shadow-indigo-500/20">
                      Mark as Filed
                    </button>
                  )}
                  {r.status === 'FILED' && (
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-green-400 text-xs">{r.ack_number}</span>
                      <span className="text-gray-500 text-[10px]">{r.ack_portal}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 bg-white/5">
              <h3 className="text-lg font-bold flex items-center gap-2">✅ Confirm Filing</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Form</label>
                <div className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-gray-300 text-sm">
                  {filingModal.request.form_name}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Your Name</label>
                <input 
                  type="text" 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Rahul Sharma"
                  value={filingModal.caName}
                  onChange={e => setFilingModal({...filingModal, caName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Portal</label>
                <select 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  value={filingModal.portal}
                  onChange={e => setFilingModal({...filingModal, portal: e.target.value})}
                >
                  <option value="GST Portal">GST Portal</option>
                  <option value="MCA21">MCA21</option>
                  <option value="Income Tax Portal">Income Tax Portal</option>
                  <option value="TRACES">TRACES</option>
                  <option value="SEBI SCORES">SEBI SCORES</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setFilingModal({ open: false, request: null })} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleConfirmFiled} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg">Confirm Filed →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const location = useLocation();
  const { cin }  = useParams();
  const [data, setData]       = useState(location.state?.analysisResult || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError]     = useState(null);
  const [activeTab, setTab]   = useState('overview');

  // Polled data
  const [alerts, setAlerts] = useState([]);
  const [requests, setRequests] = useState([]);

  const fetchDynamicData = () => {
    if (!cin) return;
    fetch(`${API}/alerts/${cin}`).then(r => r.ok && r.json()).then(setAlerts).catch(() => {});
    fetch(`${API}/filing-requests/${cin}`).then(r => r.ok && r.json()).then(setRequests).catch(() => {});
  };

  useEffect(() => {
    fetchDynamicData(); // Initial fetch
    const interval = setInterval(fetchDynamicData, 5000);
    return () => clearInterval(interval);
  }, [cin]);

  useEffect(() => {
    if (!data && cin) {
      analyzeCompany(cin)
        .then(setData)
        .catch(err => {
          console.error(err);
          setData({
            company_name: 'Example Corp Ltd', cin, city: 'Mumbai', sector: 'Manufacturing',
            risk_score: 78, risk_bucket: 'HIGH',
            top_factors: ['GST Filings Pending (3 months) × 1 (+18 pts)', 'Late Annual Return (MGT-7) × 1 (+15 pts)'],
            violations: [{ rule: 'Failure to file MGT-7', severity: 'HIGH', description: 'Annual return for FY 2023-24 not filed.', penalty_reference: 'Sec 92(4)', penalty_amount_inr: 50000 }],
            remediation_steps: '1. File pending GSTR-3B returns.\n2. File MGT-7 with MCA.',
            relevant_regulations: [],
            compliance_summary: { annual_returns_filed: false, overdue_filings: 2, filing_delay_days_avg: 45, violations_last_12m: 2, penalty_paid_inr: 65000, gst_pending_months: 3 },
          });
          setError('Backend unavailable. Showing demo data.');
        })
        .finally(() => setLoading(false));
    }
  }, [cin, data]);

  if (loading) return <LoadingSpinner message="Fetching analysis results…" />;
  if (!data)   return <div className="p-8 text-center text-red-400">Failed to load data.</div>;

  const unreadAlerts = alerts.filter(a => a.status === 'UNREAD').length;
  
  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'tax',       label: 'Tax Analysis' },
    { id: 'ca_audit',  label: 'CA Audit' },
    { id: 'alerts',    label: `🔴 Alerts ${unreadAlerts > 0 ? `(${unreadAlerts})` : ''}` },
    { id: 'filings',   label: 'Filing Requests' },
  ];

  return (
    <div className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-6 animate-fade-in">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded text-sm">{error}</div>
      )}

      {/* Company header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{data.company_name || 'Company'}</h1>
          <div className="text-gray-400 flex items-center space-x-3 text-sm">
            <span>{data.cin || cin}</span>
            <span>·</span>
            <span>{data.city || '—'}</span>
            <span>·</span>
            <span>{data.sector || 'General'}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end">
          <span className="text-xs text-gray-500 mb-1">
            Annual Returns: {data.compliance_summary?.annual_returns_filed ? '✓ Filed' : '✗ Pending'}
          </span>
          <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
            {data.compliance_summary?.overdue_filings ?? 0} Overdue Filings
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`relative px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.id === 'alerts' && unreadAlerts > 0 && activeTab !== 'alerts' && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab data={data} cin={cin} />}
      {activeTab === 'tax'      && <TaxTab cin={cin} />}
      {activeTab === 'ca_audit' && <CAAuditTab cin={cin} />}
      {activeTab === 'alerts'   && <AlertInboxTab alerts={alerts} refreshAlerts={fetchDynamicData} />}
      {activeTab === 'filings'  && <FilingRequestsTab requests={requests} refreshRequests={fetchDynamicData} />}
    </div>
  );
};

export default Dashboard;
