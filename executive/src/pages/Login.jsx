import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Lock, Loader2, ShieldCheck } from 'lucide-react'

const API = 'http://localhost:8000'

const COMPANIES = [
  { cin: 'U72900KA2018PTC123456', name: 'Technova Solutions Pvt Ltd' },
  { cin: 'U51909MH2015PTC987654', name: 'Redstone Retail Ventures Pvt Ltd' },
  { cin: 'U26100DL2020PTC456789', name: 'Greenfield Manufacturing Pvt Ltd' },
  { cin: 'U74140TN2017PTC654321', name: 'Clearpath Legal Consulting Pvt Ltd' },
  { cin: 'U45201GJ2019PTC321098', name: 'Swiftline Logistics Pvt Ltd' },
  { cin: 'U85110RJ2021PTC112233', name: 'Arogya Health Tech Pvt Ltd' },
  { cin: 'U65910MH2013PTC445566', name: 'Pinnacle Capital Advisors Pvt Ltd' },
  { cin: 'U01100AP2022PTC778899', name: 'Haritha Agro Foods Pvt Ltd' },
  { cin: 'U74999PB2016PTC334455', name: 'Infracore Builders Pvt Ltd' },
  { cin: 'U40100WB2014PTC556677', name: 'Voltex Energy Solutions Pvt Ltd' },
  { cin: 'U63090KL2012PTC889900', name: 'Seaways Maritime Pvt Ltd' },
  { cin: 'U80301HR2023PTC001122', name: 'EduBridge EdTech Pvt Ltd' },
]

export default function Login() {
  const [cin, setCin] = useState(COMPANIES[0].cin)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (sessionStorage.getItem('exec_session')) navigate('/dashboard')
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!cin || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin, password })
      })
      if (!res.ok) {
        setError('Invalid credentials. Please check your company and password.')
        setLoading(false)
        return
      }
      const data = await res.json()
      sessionStorage.setItem('exec_session', JSON.stringify(data))
      navigate('/dashboard')
    } catch (err) {
      setError('Cannot reach backend. Make sure the server is running.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position:'absolute', top:'-15%', left:'-10%', width:'50vw', height:'50vw', background:'rgba(16,185,129,0.06)', borderRadius:'50%', filter:'blur(120px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-15%', right:'-10%', width:'40vw', height:'40vw', background:'rgba(99,102,241,0.06)', borderRadius:'50%', filter:'blur(100px)', pointerEvents:'none' }} />

      <div className="animate-fade-in" style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:999, padding:'6px 16px', marginBottom:'1.5rem' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span style={{ color:'#10b981', fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Executive Portal</span>
          </div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:8 }}>
            Board-Level<br />Compliance Access
          </h1>
          <p style={{ color:'#6b7280', fontSize:14 }}>Sign in to view your company's compliance status</p>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} style={{
          background:'#111827',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:20,
          padding:'2rem',
          boxShadow:'0 25px 60px rgba(0,0,0,0.5)',
        }}>

          {/* Company Select */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ display:'block', fontSize:13, color:'#9ca3af', marginBottom:6, fontWeight:500 }}>Your Company</label>
            <div style={{ position:'relative' }}>
              <select
                value={cin}
                onChange={e => setCin(e.target.value)}
                disabled={loading}
                style={{
                  width:'100%',
                  background:'#1f2937',
                  border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:12,
                  padding:'12px 16px',
                  color:'#f1f5f9',
                  fontSize:14,
                  outline:'none',
                  appearance:'none',
                  cursor:'pointer',
                  paddingRight:40,
                }}
              >
                {COMPANIES.map(c => (
                  <option key={c.cin} value={c.cin}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} color="#6b7280" style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'block', fontSize:13, color:'#9ca3af', marginBottom:6, fontWeight:500 }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your company password"
                disabled={loading}
                required
                style={{
                  width:'100%',
                  background:'#1f2937',
                  border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:12,
                  padding:'12px 16px 12px 42px',
                  color:'#f1f5f9',
                  fontSize:14,
                  outline:'none',
                }}
                onFocus={e => e.target.style.borderColor='#10b981'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
              />
              <Lock size={16} color="#6b7280" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:'1.25rem', color:'#f87171', fontSize:13 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !password}
            className="glow-emerald"
            style={{
              width:'100%',
              background: loading ? '#064e3b' : '#059669',
              color:'#fff',
              border:'none',
              borderRadius:12,
              padding:'14px',
              fontSize:15,
              fontWeight:700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:8,
              transition:'background 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <><Loader2 size={18} className="spin" /> Signing in...</> : 'Sign In to Executive View'}
          </button>

          {/* Hint */}
          <p style={{ textAlign:'center', marginTop:'1.25rem', color:'#4b5563', fontSize:12 }}>
            Password format: <span style={{ color:'#6b7280', fontFamily:'monospace' }}>companyname2024</span><br />
            e.g. for Technova → <span style={{ color:'#6b7280', fontFamily:'monospace' }}>technova2024</span>
          </p>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', color:'#4b5563', fontSize:13 }}>
          Are you a CA?{' '}
          <a href="http://localhost:5173" style={{ color:'#6366f1', textDecoration:'underline' }}>
            Switch to CA Portal →
          </a>
        </p>
      </div>
    </div>
  )
}
