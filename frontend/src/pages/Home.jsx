import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCompanies, analyzeCompany } from '../api/client'
import { motion } from 'framer-motion'
import { ChevronDown, Building2, ShieldCheck, Activity, Loader2, ArrowRight } from 'lucide-react'
import RegulatoryNews from '../components/RegulatoryNews'

const doctors = [
  { emoji: '📡', name: 'The News Reader',   desc: 'Monitors every new regulation from MCA, SEBI, GST, Income Tax' },
  { emoji: '⚖️', name: 'The Rule Checker',  desc: 'Checks your company against every active compliance rule' },
  { emoji: '🧮', name: 'The Tax Expert',    desc: 'Calculates tax liability and identifies savings opportunities' },
  { emoji: '📊', name: 'The Risk Detector', desc: 'Scores your company 0–100 and explains every risk factor' },
  { emoji: '🏛️', name: 'The Secretary',     desc: 'Manages your compliance calendar and never misses a deadline' },
]

const container = { hidden: { opacity:0 }, visible: { opacity:1, transition:{ staggerChildren:0.1 } } }
const item      = { hidden: { opacity:0, y:20 }, visible: { opacity:1, y:0, transition:{ duration:0.5, ease:'easeOut' } } }

export default function Home() {
  const [companies,   setCompanies]   = useState([])
  const [selectedCin, setSelectedCin] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getCompanies()
      .then(data => { setCompanies(data||[]); if(data?.length) setSelectedCin(data[0].cin) })
      .catch(() => {
        const mock = [
          { cin:'U72900KA2018PTC123456', name:'Technova Solutions Pvt Ltd' },
          { cin:'U65910MH2013PTC445566', name:'Pinnacle Capital Advisors Pvt Ltd' },
        ]
        setCompanies(mock); setSelectedCin(mock[0].cin)
      })
  }, [])

  const handleAnalyze = async () => {
    if (!selectedCin) return
    setLoading(true); setError(null)
    try {
      const result = await analyzeCompany(selectedCin)
      navigate(`/dashboard/${selectedCin}`, { state:{ analysisResult:result } })
    } catch {
      setError('Failed to analyze. Is the backend running?')
      setLoading(false)
    }
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 py-12 relative min-h-screen bg-[#0A0F1E] overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[100px]" style={{ animationDelay:'2s' }} />
      </div>

      <div className="z-10 w-full max-w-7xl flex flex-col items-center">

        {/* Hero */}
        <motion.div className="text-center max-w-4xl w-full mb-16" initial="hidden" animate="visible" variants={container}>
          <motion.div variants={item} className="mb-4">
            <span className="bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
              ⚖️ CA Portal
            </span>
          </motion.div>
          <motion.h1 variants={item}
            className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-500 mb-6 tracking-tight leading-tight pb-2">
            Your Company's AI Compliance Doctor
          </motion.h1>
          <motion.p variants={item} className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Powered by 5 specialist AI agents monitoring MCA, SEBI, GST, and Income Tax in real time.
          </motion.p>

          <motion.div variants={item} className="flex flex-col items-center max-w-xl mx-auto space-y-4 w-full">
            <div className="w-full relative group">
              <select value={selectedCin} onChange={e => setSelectedCin(e.target.value)} disabled={loading}
                className="w-full bg-[#1F2937] border border-white/10 rounded-xl px-5 py-4 text-gray-200 outline-none focus:border-indigo-500 appearance-none text-lg transition-all cursor-pointer disabled:opacity-50">
                <option value="" disabled>Select a company...</option>
                {companies.map(c => <option key={c.cin} value={c.cin}>{c.name} ({c.cin})</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
            </div>

            <button onClick={handleAnalyze} disabled={!selectedCin || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(99,102,241,0.35)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]">
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                : <><span>Analyze Compliance</span><ArrowRight className="w-5 h-5" /></>
              }
            </button>

            {error && <div className="text-red-400 text-sm bg-red-400/10 py-2 px-4 rounded-xl w-full text-center">{error}</div>}

            <p className="text-gray-600 text-sm pt-2">
              Executive?{' '}
              <a href="http://localhost:5174" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2">
                Switch to Executive Portal →
              </a>
            </p>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div className="w-full max-w-4xl grid grid-cols-3 gap-6 mb-20 border-y border-white/5 py-8" initial="hidden" animate="visible" variants={container}>
          {[
            { Icon:Building2,    value:'1.5M+',     label:'Companies Monitored' },
            { Icon:ShieldCheck,  value:'6',          label:'Regulatory Bodies Tracked' },
            { Icon:Activity,     value:'Real-time',  label:'Risk Detection' },
          ].map(({ Icon, value, label }) => (
            <motion.div key={label} variants={item} className="flex flex-col items-center space-y-2">
              <Icon className="w-8 h-8 text-indigo-400 mb-1" />
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-sm text-gray-400">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Doctor Cards */}
        <motion.div className="w-full" initial="hidden" animate="visible" variants={container}>
          <motion.h3 variants={item} className="text-center text-sm font-semibold tracking-widest text-indigo-400 uppercase mb-8">
            Meet Your Specialist Agents
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {doctors.map((doc, idx) => (
              <motion.div key={idx} variants={item}
                className="relative bg-[#111827] border-l-[3px] border-indigo-500 rounded-xl p-5 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all group">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <div className="text-[2rem] mb-4 group-hover:scale-110 transition-transform origin-left">{doc.emoji}</div>
                <h4 className="font-bold text-white mb-2 text-sm">{doc.name}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{doc.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <RegulatoryNews />
      </div>
    </div>
  )
}
