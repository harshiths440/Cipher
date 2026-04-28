import React from 'react';

const severityConfig = {
  CRITICAL: { border: 'border-l-[var(--color-brand-critical)]', badge: 'bg-[var(--color-brand-critical)]/10 text-[var(--color-brand-critical)] border-[var(--color-brand-critical)]/20' },
  HIGH: { border: 'border-l-[var(--color-brand-high)]', badge: 'bg-[var(--color-brand-high)]/10 text-[var(--color-brand-high)] border-[var(--color-brand-high)]/20' },
  WARNING: { border: 'border-l-[var(--color-brand-warning)]', badge: 'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] border-[var(--color-brand-warning)]/20' },
  LOW: { border: 'border-l-[var(--color-brand-low)]', badge: 'bg-[var(--color-brand-low)]/10 text-[var(--color-brand-low)] border-[var(--color-brand-low)]/20' }
};

const ViolationCard = ({ ruleName, severity, description, penaltyReference, penaltyAmount }) => {
  const config = severityConfig[severity] || severityConfig.WARNING;

  return (
    <div className={`bg-[var(--color-brand-card)] border-y border-r border-y-white/5 border-r-white/5 border-l-4 ${config.border} p-5 rounded-r-lg mb-4 hover:bg-white/[0.02] transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-gray-100 text-lg leading-tight w-3/4">{ruleName}</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${config.badge}`}>
          {severity}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div className="text-xs text-gray-500 mb-2 sm:mb-0 max-w-[60%]">
          Ref: {penaltyReference}
        </div>
        <div className="font-mono font-bold text-[var(--color-brand-critical)]">
          Exposure: ₹{penaltyAmount.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};

export default ViolationCard;
