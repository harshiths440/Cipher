import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, IndianRupee, Clock, Send, Plus, X, Activity, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
const API = 'http://localhost:8000'
const fmt = (n) => `₹${(n ?? 0).toLocaleString('en-IN')}`

const Badge = ({ s }) => {
  const styles = {
    PENDING:     'background:rgba(107,114,128,0.15);color:#9ca3af;border:1px solid rgba(107,114,128,0.3)',
    IN_PROGRESS: 'background:rgba(234,179,8,0.15);color:#fbbf24;border:1px solid rgba(234,179,8,0.3)',
    FILED:       'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)',
    VERIFIED:    'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)',
    AT_RISK:     'background:rgba(234,179,8,0.15);color:#fbbf24;border:1px solid rgba(234,179,8,0.3)',
    OUTDATED:    'background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)',
  }
  return <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, textTransform:'uppercase', letterSpacing:'0.05em', ...(styles[s] ? Object.fromEntries(styles[s].split(';').map(x => { const [k,v]=x.split(':'); return [k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()), v?.trim()] })) : {}) }}>{s}</span>
}

const SEVERITY_COLORS = {
  HIGH:   { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444', border: 'rgba(239,68,68,0.4)' },
  MEDIUM: { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  LOW:    { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e', border: 'rgba(34,197,94,0.4)' },
};

const DotsLoader = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '60px 0' }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)' }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#818cf8' }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔍</div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Analyzing regulatory update{dots}</p>
    </div>
  );
};

const NewsDetailModal = ({ item, onClose, analysisCache }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const key = item.title;
    if (analysisCache.current.has(key)) {
      setAnalysis(analysisCache.current.get(key));
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetch(`${API}/news/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, link: item.link, source: item.source, category: item.category }),
    })
      .then(r => r.json())
      .then(data => {
        analysisCache.current.set(key, data);
        setAnalysis(data);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [item, analysisCache]);

  const sev = analysis?.severity || 'MEDIUM';
  const sc = SEVERITY_COLORS[sev] || SEVERITY_COLORS.MEDIUM;

  const SectionLabel = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 680,
            maxHeight: '90vh', overflowY: 'auto',
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '28px 28px 24px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#818cf8' }}>
              <span style={{ fontSize: 18 }}>{item.source_icon}</span>{item.source}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!loading && !fetchError && (
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 10px', borderRadius: 99,
                  background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                }}>{sev}</span>
              )}
              <button
                onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <DotsLoader />
          ) : fetchError ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontSize: 14, marginBottom: 20 }}>Couldn't analyze this article right now.</p>
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                style={{ color: '#818cf8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                🔗 Read original article →
              </a>
            </div>
          ) : analysis && (
            <>
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>📋 Rule Name</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{analysis.rule_name}</p>
              </div>

              <SectionLabel>What Changed</SectionLabel>
              <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.7 }}>{analysis.what_changed}</p>

              {analysis.compared_to_before && (
                <>
                  <SectionLabel>VS Before</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Before</p>
                      <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.6 }}>{analysis.compared_to_before}</p>
                    </div>
                    <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>After</p>
                      <p style={{ fontSize: 13, color: '#86efac', lineHeight: 1.6 }}>{analysis.what_changed}</p>
                    </div>
                  </div>
                </>
              )}

              <SectionLabel>Who It Hits</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>🎯</span>
                <p style={{ fontSize: 14, color: '#c7d2fe', lineHeight: 1.6 }}>{analysis.who_it_hits}</p>
              </div>

              {analysis.what_to_do?.length > 0 && (
                <>
                  <SectionLabel>What To Do</SectionLabel>
                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '16px 20px' }}>
                    <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {analysis.what_to_do.map((step, idx) => (
                        <li key={idx} style={{ display: 'flex', gap: 12, fontSize: 13, color: '#fef3c7', lineHeight: 1.6 }}>
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Deadline</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{analysis.deadline || 'None specified'}</p>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Penalty Risk</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>{analysis.penalty || 'Unknown'}</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function Dashboard() {
  const navigate = useNavigate()
  const session = JSON.parse(sessionStorage.getItem('exec_session') || '{}')
  const { cin, company_name } = session

  const [data, setData] = useState(null)
  const [filings, setFilings] = useState([])
  const [alertModal, setAlertModal] = useState({ open: false, item: null, urgency: 'HIGH', message: '' })
  const [filingModal, setFilingModal] = useState({ open: false, form: 'GSTR-3B', reg: '', deadline: '' })
  const [newsModal, setNewsModal] = useState(null)
  const [toast, setToast] = useState({ open: false, message: '', urgency: 'HIGH' })
  const [sent, setSent] = useState(false)
  const [auditData, setAuditData] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)
  const analysisCache = useRef(new Map())

  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading])

  const handleAskAI = async (questionText = null) => {
    const q = questionText || chatInput;
    if (!q.trim() || chatLoading) return;

    const newHistory = [...chatHistory, { role: 'user', content: q }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    const systemPrompt = `You are a compliance advisor for Indian companies. 
You are currently advising the executive of ${data.company.name}, 
a ${data.company.sector} company based in ${data.company.city}.

Current compliance status:
- Total ₹ Exposure: ${data.total_exposure}
- Active violations: ${JSON.stringify(data.signature_required)}
- CA Audit status: ${data.ca_summary.at_risk_count} filings at risk
- Relevant regulations: ${JSON.stringify((data.regulatory_impact || []).map(r => r.rule_name || r.title))}

Answer in plain English. Be direct and specific to this company's situation.
Keep answers under 150 words. Use ₹ amounts and section references where relevant.
Never say "I don't know" — always give your best assessment based on the data provided.`;

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, messages: newHistory })
      });
      const resData = await res.json();
      if (res.ok) {
        setChatHistory([...newHistory, { role: 'model', content: resData.reply }]);
      } else {
        setChatHistory([...newHistory, { role: 'model', content: 'Unable to reach AI — please try again.', error: true }]);
      }
    } catch (e) {
      setChatHistory([...newHistory, { role: 'model', content: 'Unable to reach AI — please try again.', error: true }]);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    if (!cin) { navigate('/login'); return }
    fetch(`${API}/executive/${cin}`).then(r => r.json()).then(res => {
      setData(res); setFilings(res.filing_requests || [])
    }).catch(console.error)
    fetch(`${API}/ca-verify/${cin}`).then(r => r.json()).then(setAuditData).catch(console.error)
  }, [cin, navigate])

  // Poll filings every 5s to reflect CA updates
  useEffect(() => {
    if (!cin) return
    const id = setInterval(() => {
      fetch(`${API}/filing-requests/${cin}`).then(r => r.json()).then(setFilings).catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [cin])

  const logout = () => { sessionStorage.removeItem('exec_session'); navigate('/login') }

  const sendAlert = async () => {
    await fetch(`${API}/alerts/${cin}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name, regulation_title: alertModal.item?.item,
        regulation_category: 'Corporate',
        message: alertModal.message, urgency: alertModal.urgency
      })
    })
    setSent(true)
    setToast({ open: true, message: '⚡ Alert sent to CA', urgency: alertModal.urgency })
    setTimeout(() => { 
      setSent(false)
      setAlertModal({ open:false, item:null, urgency:'HIGH', message:'' }) 
    }, 1500)
    setTimeout(() => setToast(t => ({ ...t, open: false })), 4000)
  }

  const sendFiling = async () => {
    await fetch(`${API}/filing-requests/${cin}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name, form_name: filingModal.form, regulation_ref: filingModal.reg, deadline: filingModal.deadline })
    })
    setFilingModal({ open:false, form:'GSTR-3B', reg:'', deadline:'' })
    fetch(`${API}/filing-requests/${cin}`).then(r=>r.json()).then(setFilings)
  }

  if (!data) return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spin" style={{ width:40, height:40, border:'3px solid rgba(16,185,129,0.2)', borderTopColor:'#10b981', borderRadius:'50%', margin:'0 auto 1rem' }} />
        <p style={{ color:'#6b7280' }}>Loading your dashboard...</p>
      </div>
    </div>
  )

  const { company, total_exposure, signature_required, regulatory_impact, ca_summary } = data

  return (
    <div style={{ minHeight:'100vh', background:'#0A0F1E', color:'#fff', padding:'1.5rem', fontFamily:'Inter,sans-serif' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }} className="animate-fade-in">

        {/* Top Bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:'1.25rem', marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
                <h1 style={{ fontSize:24, fontWeight:800 }}>{company.name}</h1>
                <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)', padding:'2px 12px', borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Executive View</span>
              </div>
              <p style={{ color:'#6b7280', fontSize:13 }}>{cin} · {company.sector}</p>
            </div>
          </div>
          <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 14px', color:'#9ca3af', cursor:'pointer', fontSize:13 }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* KPI Row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:'2rem' }}>
          {[
            { icon:<IndianRupee size={20} />, label:'Total ₹ Exposure', value:fmt(total_exposure), color:'#ef4444', border:'rgba(239,68,68,0.2)' },
            { icon:<AlertTriangle size={20} />, label:'Needs Your Signature', value:signature_required.length, color:'#f59e0b', border:'rgba(245,158,11,0.2)' },
            { icon:<Clock size={20} />, label:'Last CA Filing', value:ca_summary.last_filed_form || '—', sub: ca_summary.last_filed_date ? `${ca_summary.last_filed_date} · ${ca_summary.last_ca_name}` : null, color:'#818cf8', border:'rgba(129,140,248,0.2)' },
          ].map(({ icon, label, value, sub, color, border }) => (
            <div key={label} style={{ background:'#111827', border:`1px solid ${border}`, borderRadius:16, padding:'1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ padding:8, background:`${color}22`, color, borderRadius:10 }}>{icon}</div>
                <span style={{ fontSize:12, color:'#6b7280', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
              </div>
              <p style={{ fontSize:sub ? 18 : 36, fontWeight:900, color }}>{value}</p>
              {sub && <p style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Signature Panel */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, marginBottom:'2rem', overflow:'hidden' }}>
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontWeight:700, fontSize:17 }}>✍️ What Needs Your Signature</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, padding:'1.5rem' }}>
            {signature_required.length === 0
              ? <p style={{ color:'#6b7280' }}>No pending items. All clear!</p>
              : signature_required.map((sig, i) => (
                <div key={i} style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'1.25rem', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <h3 style={{ fontWeight:700, fontSize:15 }}>{sig.item}</h3>
                    {sig.deadline?.toLowerCase().includes('immediate') && <span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, whiteSpace:'nowrap' }}>URGENT</span>}
                  </div>
                  <p style={{ color:'#9ca3af', fontSize:13 }}>{sig.reason}</p>
                  <div style={{ fontSize:12, color:'#6b7280', display:'flex', flexDirection:'column', gap:4 }}>
                    <span>Deadline: <span style={{ color:'#f87171' }}>{sig.deadline}</span></span>
                    <span>Penalty: <span style={{ color:'#f87171' }}>{sig.penalty}</span></span>
                    <span style={{ color:'#818cf8', fontFamily:'monospace' }}>{sig.law_ref}</span>
                  </div>
                  <button onClick={() => setAlertModal({ open:true, item:sig, urgency:'HIGH', message:`Please confirm ${sig.item} has been filed. Deadline: ${sig.deadline}. Penalty: ${sig.penalty} if missed.` })}
                    style={{ marginTop:4, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', borderRadius:10, padding:'8px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <AlertTriangle size={14} /> Alert CA
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Filing Tracker */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, marginBottom:'2rem', overflow:'hidden' }}>
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontWeight:700, fontSize:17, display:'flex', alignItems:'center', gap:8 }}><Activity size={18} color="#818cf8" /> CA Filing Tracker</h2>
            <button onClick={() => setFilingModal({ open:true, form:'GSTR-3B', reg:'', deadline:'' })}
              style={{ background:'#4f46e5', border:'none', color:'#fff', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Plus size={14} /> Request Filing
            </button>
          </div>
          {filings.length === 0
            ? <p style={{ padding:'2rem', color:'#6b7280', textAlign:'center' }}>No filing requests yet.</p>
            : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr style={{ background:'rgba(0,0,0,0.2)', color:'#6b7280' }}>
                {['Form','Deadline','Requested','Status','ACK'].map(h => <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>)}
              </tr></thead>
              <tbody>{filings.map(f => (
                <tr key={f.id} style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding:'12px 20px', fontWeight:700 }}>{f.form_name}</td>
                  <td style={{ padding:'12px 20px', color:'#9ca3af' }}>{f.deadline}</td>
                  <td style={{ padding:'12px 20px', color:'#6b7280' }}>{new Date(f.requested_at).toLocaleDateString()}</td>
                  <td style={{ padding:'12px 20px' }}><Badge s={f.status} /></td>
                  <td style={{ padding:'12px 20px', fontFamily:'monospace', color: f.status==='FILED' ? '#4ade80' : '#374151' }}>{f.ack_number || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>

        {/* CA Audit Section */}
        {auditData && (
          <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, marginBottom:'2rem', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ fontWeight:700, fontSize:17, display:'flex', alignItems:'center', gap:8 }}>🛡️ CA Audit</h2>
            </div>
            
            <div style={{ padding:'1.5rem' }}>
              {/* Banner */}
              {(() => {
                const total = auditData.total_filings;
                const out = auditData.outdated_count;
                const risk = auditData.at_risk_count;
                const verified = total - out - risk;
                
                const needsVerif = out + risk;
                const isRed = out > 0;
                const isYellow = risk > 0 && !isRed;
                const isGreen = out === 0 && risk === 0;
                
                const bg = isRed ? 'rgba(239,68,68,0.1)' : isYellow ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)';
                const border = isRed ? 'rgba(239,68,68,0.3)' : isYellow ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)';
                const color = isRed ? '#ef4444' : isYellow ? '#eab308' : '#22c55e';
                const icon = isRed ? '🔴' : isYellow ? '⚠️' : '✅';
                
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem', background:bg, border:`1px solid ${border}`, borderRadius:12, marginBottom:'1.5rem' }}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <div>
                      <p style={{ color, fontWeight:700, fontSize:14 }}>{isGreen ? 'All filings verified' : `${needsVerif} of ${total} filings need CA verification`}</p>
                      <p style={{ color: isRed ? '#fca5a5' : isYellow ? '#fde047' : '#86efac', fontSize:12, marginTop:2 }}>
                        {out} outdated · {risk} at risk · {verified} verified
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Table */}
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ color:'#6b7280', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    {['Form','Filed Date','Filed By','Status','Flag','Action'].map(h => <th key={h} style={{ padding:'10px', textAlign:'left', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(auditData.verified_filings || []).map((f, i) => {
                    const isExpanded = expandedRow === i;
                    const canAlert = f.status === 'AT_RISK' || f.status === 'OUTDATED';
                    return (
                      <React.Fragment key={i}>
                        <tr onClick={() => setExpandedRow(isExpanded ? null : i)} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={{ padding:'12px 10px', fontWeight:700, color:'#a5b4fc' }}>{f.form}</td>
                          <td style={{ padding:'12px 10px', color:'#9ca3af' }}>{f.filed_date}</td>
                          <td style={{ padding:'12px 10px', color:'#6b7280' }}>{f.filed_by}</td>
                          <td style={{ padding:'12px 10px' }}><Badge s={f.status} /></td>
                          <td style={{ padding:'12px 10px', color:'#9ca3af', maxWidth:150 }}>
                            {f.flag_message ? (f.flag_message.length > 60 ? f.flag_message.substring(0, 60) + '...' : f.flag_message) : '—'}
                          </td>
                          <td style={{ padding:'12px 10px' }}>
                            {canAlert && (
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setAlertModal({
                                  open: true, item: { item: f.form },
                                  urgency: f.status === 'OUTDATED' ? 'EMERGENCY' : 'HIGH',
                                  message: f.flag_message
                                });
                              }} style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                                Alert CA
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && f.flag_message && (
                          <tr style={{ background:'rgba(99,102,241,0.05)' }}>
                            <td colSpan={6} style={{ padding:0 }}>
                              <div style={{ margin:'0 10px 10px', padding:'12px', border:'1px solid rgba(99,102,241,0.3)', borderRadius:12, borderTopLeftRadius:0, borderTopRightRadius:0 }}>
                                <p style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Finding</p>
                                <p style={{ fontSize:13, color:'#e2e8f0', marginBottom:8 }}>{f.flag_message}</p>
                                {f.recommendation && (
                                  <>
                                    <p style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>Recommendation</p>
                                    <p style={{ fontSize:13, color:'#a5b4fc' }}>{f.recommendation}</p>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Regulatory Impact */}
        {regulatory_impact?.length > 0 && (
          <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, marginBottom:'2rem', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ fontWeight:700, fontSize:17 }}>📰 Regulatory Impact Feed</h2>
              <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>Filtered for {company.sector}</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16, padding:'1.5rem' }}>
              {regulatory_impact.map((n, i) => (
                <div key={i} onClick={() => setNewsModal(n)} style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'1.25rem', cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999 }}>Affects You</span>
                    <span style={{ color:'#6b7280', fontSize:11 }}>{n.date}</span>
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:700, marginBottom:6, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.title}</h3>
                  <p style={{ fontSize:12, color:'#9ca3af', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom: 12 }}>{n.what_changed}</p>
                  {n.impact_on_company && (
                    <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, padding:'8px 12px', marginTop:'auto' }}>
                      <p style={{ fontSize:10, color:'#818cf8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Why this affects you</p>
                      <p style={{ fontSize:11, color:'#c7d2fe', lineHeight:1.5 }}>{n.impact_on_company}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask Compliance AI */}
        <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, marginBottom:'2rem', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h2 style={{ fontWeight:700, fontSize:17, display:'flex', alignItems:'center', gap:8 }}>🤖 Ask Compliance AI</h2>
              <p style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>Powered by Gemini — answers based on your live data</p>
            </div>
            {chatHistory.length > 0 && (
              <button onClick={() => setChatHistory([])} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#9ca3af', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }}>
                Clear Chat
              </button>
            )}
          </div>
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:16 }}>
            {chatHistory.length === 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
                {[
                  "Am I personally liable for the GST default?",
                  "What's my worst penalty exposure?",
                  "Which violation should I fix first?",
                  "Is my CA compliant with new SEBI rules?"
                ].map((q, i) => (
                  <button key={i} onClick={() => handleAskAI(q)} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:999, padding:'8px 16px', fontSize:13, color:'#cbd5e1', cursor:'pointer', transition:'background 0.2s' }} onMouseEnter={e => e.target.style.background='rgba(99,102,241,0.1)'} onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.03)'}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, minHeight:200, maxHeight:400, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:16 }}>
              {chatHistory.length === 0 ? (
                <p style={{ color:'#6b7280', fontSize:14, textAlign:'center', margin:'auto' }}>No messages yet. Ask a question to get started.</p>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                    {msg.role === 'user' ? (
                      <div style={{ background:'#4f46e5', color:'#fff', padding:'12px 16px', borderRadius:16, borderBottomRightRadius:4, fontSize:14, lineHeight:1.5 }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{ background: msg.error ? 'rgba(239,68,68,0.1)' : '#1f2937', color: msg.error ? '#f87171' : '#f3f4f6', border:`1px solid ${msg.error ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, padding:'12px 16px', borderRadius:16, borderBottomLeftRadius:4, fontSize:14, lineHeight:1.5 }}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div style={{ alignSelf:'flex-start', background:'#1f2937', color:'#9ca3af', border:'1px solid rgba(255,255,255,0.1)', padding:'12px 16px', borderRadius:16, borderBottomLeftRadius:4, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                  <span className="animate-pulse">Gemini is thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAskAI()} placeholder="Type your question..." style={{ flex:1, background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 16px', color:'#fff', outline:'none', fontSize:14 }} disabled={chatLoading} />
              <button onClick={() => handleAskAI()} disabled={!chatInput.trim() || chatLoading} style={{ background:'#4f46e5', color:'#fff', border:'none', borderRadius:12, padding:'0 20px', fontWeight:600, cursor:!chatInput.trim() || chatLoading ? 'not-allowed' : 'pointer', opacity:!chatInput.trim() || chatLoading ? 0.5 : 1, display:'flex', alignItems:'center', gap:6 }}>
                Ask <ArrowLeft size={16} style={{ transform:'rotate(180deg)' }} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Alert Modal */}
      {alertModal.open && (
        <div onClick={() => setAlertModal({ ...alertModal, open: false })} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:480, overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.03)' }}>
              <h3 style={{ fontWeight:700, display:'flex', alignItems:'center', gap:8 }}><AlertTriangle size={18} color="#f59e0b" /> Send Alert to CA</h3>
              <button onClick={() => setAlertModal({ ...alertModal, open:false })} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <p style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>Regarding</p>
                <p style={{ fontWeight:600 }}>{alertModal.item?.item}</p>
              </div>
              <div>
                <p style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>Urgency</p>
                <div style={{ display:'flex', gap:8 }}>
                  {['LOW','HIGH','EMERGENCY'].map(u => (
                    <button key={u} onClick={() => setAlertModal({ ...alertModal, urgency:u })}
                      style={{ flex:1, padding:'8px', borderRadius:10, fontWeight:700, fontSize:12, cursor:'pointer', border:`2px solid ${alertModal.urgency===u ? (u==='EMERGENCY'?'#ef4444':u==='HIGH'?'#f97316':'#eab308') : 'rgba(255,255,255,0.1)'}`, background: alertModal.urgency===u ? (u==='EMERGENCY'?'rgba(239,68,68,0.2)':u==='HIGH'?'rgba(249,115,22,0.2)':'rgba(234,179,8,0.2)') : 'transparent', color: alertModal.urgency===u ? '#fff' : '#6b7280' }}>
                      {u==='LOW'?'🟡':u==='HIGH'?'🟠':'🔴'} {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>Message</p>
                <textarea value={alertModal.message} onChange={e => setAlertModal({ ...alertModal, message:e.target.value })}
                  style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px', color:'#fff', fontSize:13, minHeight:100, outline:'none', resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setAlertModal({ ...alertModal, open:false })} style={{ padding:'10px 20px', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#9ca3af', cursor:'pointer' }}>Cancel</button>
                <button onClick={sendAlert} style={{ padding:'10px 20px', background: sent ? '#059669' : '#4f46e5', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  {sent ? '✓ Sent!' : <><Send size={14} /> Send Alert</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filing Modal */}
      {filingModal.open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:420, overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.03)' }}>
              <h3 style={{ fontWeight:700 }}>📋 Request CA Filing</h3>
              <button onClick={() => setFilingModal({ ...filingModal, open:false })} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:16 }}>
              {[
                { label:'Form', type:'select', value:filingModal.form, onChange:v=>setFilingModal({...filingModal,form:v}), options:['GSTR-3B','GSTR-1','MGT-7','AOC-4','DIR-3 KYC','ITR-6','Form 15CA'] },
                { label:'Regulation Reference (optional)', type:'text', value:filingModal.reg, onChange:v=>setFilingModal({...filingModal,reg:v}), placeholder:'e.g. GST Notification 14/2026' },
                { label:'Deadline', type:'date', value:filingModal.deadline, onChange:v=>setFilingModal({...filingModal,deadline:v}) },
              ].map(({ label, type, value, onChange, options, placeholder }) => (
                <div key={label}>
                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>{label}</p>
                  {type === 'select'
                    ? <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%', background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }}>
                        {options.map(o=><option key={o}>{o}</option>)}
                      </select>
                    : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
                        style={{ width:'100%', background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', color:'#fff', fontSize:13, outline:'none' }} />
                  }
                </div>
              ))}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
                <button onClick={() => setFilingModal({ ...filingModal, open:false })} style={{ padding:'10px 20px', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#9ca3af', cursor:'pointer' }}>Cancel</button>
                <button onClick={sendFiling} style={{ padding:'10px 20px', background:'#4f46e5', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  <Send size={14} /> Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News Detail Modal */}
      {newsModal && (
        <NewsDetailModal item={newsModal} onClose={() => setNewsModal(null)} analysisCache={analysisCache} />
      )}
      {/* Toast Notification */}
      {toast.open && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          background: '#111827', border: `1px solid ${toast.urgency === 'EMERGENCY' ? '#ef4444' : toast.urgency === 'HIGH' ? '#f97316' : '#eab308'}`,
          borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <span style={{ 
            background: toast.urgency === 'EMERGENCY' ? 'rgba(239,68,68,0.2)' : toast.urgency === 'HIGH' ? 'rgba(249,115,22,0.2)' : 'rgba(234,179,8,0.2)',
            color: toast.urgency === 'EMERGENCY' ? '#ef4444' : toast.urgency === 'HIGH' ? '#f97316' : '#eab308',
            padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
          }}>{toast.urgency}</span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
