import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, getExecutiveData } from '../api/client';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2, ArrowRight, ShieldAlert, Bell, FileCheck } from 'lucide-react';

const features = [
  { icon: ShieldAlert, label: 'Penalty Exposure', desc: 'See total financial risk from all active violations at a glance.' },
  { icon: Bell,        label: 'Alert CA Directly', desc: 'Send high-priority alerts to your CA from any compliance item.' },
  { icon: FileCheck,   label: 'Filing Tracker', desc: 'Track every filing request and confirm when CA marks it done.' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const ExecutiveLanding = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCin, setSelectedCin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCompanies()
      .then(data => {
        setCompanies(data || []);
        if (data && data.length > 0) setSelectedCin(data[0].cin);
      })
      .catch(() => setError('Could not connect to backend. Is the server running?'));
  }, []);

  const handleOpen = async () => {
    if (!selectedCin) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getExecutiveData(selectedCin);
      sessionStorage.setItem('executiveCin', selectedCin);
      navigate(`/executive/dashboard/${selectedCin}`, { state: { executiveData: result } });
    } catch (err) {
      setError('Failed to load executive data. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[40vw] h-[40vw] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        className="z-10 w-full max-w-2xl flex flex-col items-center text-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-6">
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            👔 Executive Portal
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-500 mb-4 leading-tight pb-2"
        >
          Board-Ready<br />Compliance View
        </motion.h1>

        <motion.p variants={itemVariants} className="text-gray-400 text-lg max-w-xl mb-12">
          See your company's total financial exposure, sign-off requirements, and CA filing status — without wading through technical details.
        </motion.p>

        {/* Feature pills */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 w-full mb-12">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-emerald-500/30 transition-colors">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-white font-semibold text-sm">{label}</span>
              <span className="text-gray-500 text-xs text-center">{desc}</span>
            </div>
          ))}
        </motion.div>

        {/* Company Selector */}
        <motion.div variants={itemVariants} className="w-full space-y-4">
          <div className="w-full relative group">
            <select
              value={selectedCin}
              onChange={e => setSelectedCin(e.target.value)}
              disabled={loading || companies.length === 0}
              className="w-full bg-[#1A2332] border border-white/10 rounded-xl px-5 py-4 text-gray-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none text-base transition-all hover:border-white/20 cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>Select your company...</option>
              {companies.map(c => (
                <option key={c.cin} value={c.cin}>{c.name} ({c.cin})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-emerald-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          <button
            onClick={handleOpen}
            disabled={!selectedCin || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-semibold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-[1.01]"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Loading your dashboard...</>
            ) : (
              <><span>Open Executive Dashboard</span><ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 py-3 px-4 rounded-xl text-center">
              {error}
            </div>
          )}
        </motion.div>

        {/* Switch to CA */}
        <motion.div variants={itemVariants} className="mt-8 text-gray-500 text-sm">
          Are you the CA?{' '}
          <button onClick={() => navigate('/')} className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2">
            Switch to CA View →
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ExecutiveLanding;
