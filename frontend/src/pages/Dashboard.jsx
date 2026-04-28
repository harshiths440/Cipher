import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { analyzeCompany } from '../api/client';
import RiskGauge from '../components/RiskGauge';
import ShapFactorBar from '../components/ShapFactorBar';
import ViolationCard from '../components/ViolationCard';
import RemediationPanel from '../components/RemediationPanel';
import LoadingSpinner from '../components/LoadingSpinner';

// Maps risk_bucket string from backend ("LOW"|"MEDIUM"|"HIGH"|"CRITICAL") to display styles
const getBucketStyle = (bucket) => {
  switch (bucket) {
    case 'LOW':      return { colorClass: 'text-[#22C55E] border-[#22C55E]/20 bg-[#22C55E]/10' };
    case 'MEDIUM':   return { colorClass: 'text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/10' };
    case 'HIGH':     return { colorClass: 'text-[#F97316] border-[#F97316]/20 bg-[#F97316]/10' };
    case 'CRITICAL': return { colorClass: 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/10' };
    default:         return { colorClass: 'text-gray-400 border-gray-400/20 bg-gray-400/10' };
  }
};

const Dashboard = () => {
  const location = useLocation();
  const { cin } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(location.state?.analysisResult || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data && cin) {
      const fetchData = async () => {
        try {
          const result = await analyzeCompany(cin);
          setData(result);
        } catch (err) {
          console.error(err);
          // Fallback mocked data if backend fails, strictly for UI demonstration
          setData({
            company_name: 'Example Corp Ltd',
            cin: cin,
            city: 'Mumbai',
            sector: 'Manufacturing',
            risk_score: 78,
            risk_bucket: 'HIGH',
            top_factors: [
              'GST Filings Pending (3 months) × 1 (+18 pts)',
              'Late Annual Return (MGT-7) × 1 (+15 pts)',
              'High Director Penalty History × 1 (+12 pts)'
            ],
            violations: [
              { rule: 'Failure to file MGT-7', severity: 'HIGH', description: 'Annual return for FY 2023-24 not filed within 60 days of AGM.', penalty_reference: 'Sec 92(4) of Companies Act 2013', penalty_amount_inr: 50000 },
              { rule: 'Pending GSTR-3B', severity: 'CRITICAL', description: 'Consecutive failure to file GSTR-3B for 3 tax periods.', penalty_reference: 'Sec 47 of CGST Act 2017', penalty_amount_inr: 15000 }
            ],
            remediation_steps: "1. Immediately file pending GSTR-3B returns with late fees.\n2. Convene board meeting to approve draft annual return.\n3. File MGT-7 with MCA along with applicable additional fees.",
            relevant_regulations: [
              { act: 'Companies Act, 2013', section: 'Section 92(4)', text: 'Every company shall file with the Registrar a copy of the annual return, within sixty days from the date on which the annual general meeting is held...', penalty: '₹50,000 to ₹5,00,000' },
              { act: 'CGST Act, 2017', section: 'Section 47', text: 'Any registered person who fails to furnish the details of outward or inward supplies required... shall pay a late fee...', penalty: '₹200/day' }
            ],
            compliance_summary: { annual_returns_filed: false, overdue_filings: 2, filing_delay_days_avg: 45, violations_last_12m: 2, penalty_paid_inr: 65000, gst_pending_months: 3 }
          });
          setError('Backend unavailable. Showing demo data.');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [cin, data]);

  if (loading) return <LoadingSpinner message="Fetching analysis results..." />;
  if (!data) return <div className="p-8 text-center text-red-400">Failed to load data.</div>;

  const bucket = getBucketStyle(data.risk_bucket || 'LOW');

  return (
    <div className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-8 animate-fade-in">
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded text-sm">{error}</div>}
      
      {/* Section 1: Company Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{data.company_name || 'Company Name'}</h1>
          <div className="text-gray-400 flex items-center space-x-3 text-sm">
            <span>{data.cin || cin}</span>
            <span>•</span>
            <span>{data.city || 'Unknown City'}</span>
            <span>•</span>
            <span>{data.sector || 'General'}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end">
          <span className="text-xs text-gray-500 mb-1">
            Annual Returns: {data.compliance_summary?.annual_returns_filed ? '✓ Filed' : '✗ Pending'}
          </span>
          <span className="text-xs font-semibold bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)] px-3 py-1 rounded-full border border-[var(--color-brand-primary)]/30">
            {data.compliance_summary?.overdue_filings ?? 0} Overdue Filings
          </span>
        </div>
      </div>

      {/* Section 2: Risk Score Hero */}
      <div className="bg-[var(--color-brand-card)] border-glass rounded-2xl p-8 flex flex-col md:flex-row items-center gap-12 shadow-lg">
        <div className="w-full md:w-1/3 flex justify-center">
          <RiskGauge score={data.risk_score || 0} />
        </div>
        <div className="w-full md:w-2/3">
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/5">
            <span className={`text-5xl font-black ${bucket.colorClass.split(' ')[0]}`}>{data.risk_score || 0}</span>
            <span className={`text-sm font-bold px-3 py-1 rounded border uppercase tracking-widest ${bucket.colorClass}`}>
              {data.risk_bucket || 'LOW'} Risk
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Score driven by:</h3>
            <div className="space-y-1">
              {(data.top_factors || []).slice(0, 3).map((factorStr, idx) => (
                <ShapFactorBar key={idx} factorString={factorStr} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Violations Column */}
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
            <span className="w-1.5 h-6 bg-[var(--color-brand-critical)] rounded mr-3"></span>
            Active Violations
          </h2>
          <div className="flex-grow space-y-4">
            {(data.violations || []).map((v, idx) => (
              <ViolationCard
                key={idx}
                ruleName={v.rule}
                severity={v.severity}
                description={v.description}
                penaltyReference={v.penalty_reference}
                penaltyAmount={v.penalty_amount_inr}
              />
            ))}
            {(!data.violations || data.violations.length === 0) && (
              <div className="text-gray-500 italic p-4 bg-white/5 rounded border border-white/5">No active violations detected.</div>
            )}
          </div>
        </div>

        {/* Remediation Column */}
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
            <span className="w-1.5 h-6 bg-[var(--color-brand-primary)] rounded mr-3"></span>
            AI Remediation Plan
          </h2>
          <RemediationPanel text={data.remediation_steps} cin={cin} />
        </div>
      </div>

      {/* Section 4: Regulations */}
      <div className="pt-4 border-t border-white/5 pb-12">
        <h2 className="text-xl font-bold text-gray-200 mb-6 font-mono text-sm uppercase tracking-wider">Relevant Regulations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.relevant_regulations || []).map((reg, idx) => (
            <div key={idx} className="p-4 border border-white/10 rounded-lg bg-gray-900/50 hover:border-white/20 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-indigo-300 text-sm">{reg.act}</h4>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{reg.section}</span>
              </div>
              <p className="text-gray-400 text-xs italic border-l-2 border-indigo-500/30 pl-3 py-1">
                "{reg.text}"
              </p>
              {reg.penalty && (
                <div className="mt-2 text-xs font-medium text-orange-400">Penalty: {reg.penalty}</div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
