import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, IndianRupee, Clock, Send, Plus, X, Activity, LogOut } from 'lucide-react'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const session = JSON.parse(sessionStorage.getItem('exec_session') || '{}')
  const { cin, company_name } = session

  const [data, setData] = useState(null)
  const [filings, setFilings] = useState([])
  const [alertModal, setAlertModal] = useState({ open: false, item: null, urgency: 'HIGH', message: '' })
  const [filingModal, setFilingModal] = useState({ open: false, form: 'GSTR-3B', reg: '', deadline: '' })
  const [newsModal, setNewsModal] = useState(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!cin) { navigate('/login'); return }
    fetch(`${API}/executive/${cin}`).then(r => r.json()).then(res => {
      setData(res); setFilings(res.filing_requests || [])
    }).catch(console.error)
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
        regulation_category: 'Compliance Action',
        message: alertModal.message, urgency: alertModal.urgency
      })
    })
    setSent(true)
    setTimeout(() => { setSent(false); setAlertModal({ open:false, item:null, urgency:'HIGH', message:'' }) }, 1500)
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
                  <button onClick={() => setAlertModal({ open:true, item:sig, urgency:'HIGH', message:`Please confirm ${sig.item} has been actioned per ${sig.law_ref}. Deadline: ${sig.deadline}. Penalty: ${sig.penalty}` })}
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
                  <p style={{ fontSize:12, color:'#9ca3af', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.what_changed}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Alert Modal */}
      {alertModal.open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:480, overflow:'hidden' }}>
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

      {/* News Modal */}
      {newsModal && (
        <div onClick={() => setNewsModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'85vh', overflow:'auto' }}>
            <div style={{ padding:'1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div><span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, display:'block', marginBottom:8 }}>REGULATORY IMPACT</span>
              <h3 style={{ fontWeight:700, fontSize:18 }}>{newsModal.title}</h3></div>
              <button onClick={()=>setNewsModal(null)} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', marginLeft:16, flexShrink:0 }}><X size={20} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'1rem' }}>
                <p style={{ fontSize:11, color:'#6366f1', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>What Changed</p>
                <p style={{ fontSize:13, color:'#d1d5db', lineHeight:1.6 }}>{newsModal.what_changed}</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:'1rem' }}>
                  <p style={{ fontSize:11, color:'#6b7280', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>Who It Hits</p>
                  <p style={{ fontSize:13, fontWeight:600 }}>{newsModal.who_it_hits}</p>
                </div>
                <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'1rem' }}>
                  <p style={{ fontSize:11, color:'#f87171', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>Penalty</p>
                  <p style={{ fontSize:13, fontWeight:600, color:'#fca5a5' }}>{newsModal.penalty}</p>
                </div>
              </div>
              {newsModal.what_to_do?.length > 0 && (
                <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'1rem' }}>
                  <p style={{ fontSize:11, color:'#f59e0b', fontWeight:700, marginBottom:8, textTransform:'uppercase' }}>Action Required</p>
                  <ul style={{ paddingLeft:'1.25rem', display:'flex', flexDirection:'column', gap:4 }}>
                    {newsModal.what_to_do.map((a,i)=><li key={i} style={{ fontSize:13, color:'#d1d5db' }}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
