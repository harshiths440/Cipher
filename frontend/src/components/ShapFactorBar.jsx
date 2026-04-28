import React from 'react';
import { motion } from 'framer-motion';

// Accepts a plain string like "Sector risk index 0.3 × 10 (+3 pts)"
// Parses the points value from the parenthesized suffix and uses the full string as label.
const ShapFactorBar = ({ factorString }) => {
  // Extract the number before " pts)" — handles both "+3 pts)" and "-3 pts)"
  const match = factorString?.match(/\(([+-]?\d+(?:\.\d+)?)\s+pts\)/);
  const points = match ? parseFloat(match[1]) : 0;
  const label = factorString || '';

  // Max points assumed for scaling logic is 40 based on requirements
  const maxPoints = 40;
  const percentage = Math.min((Math.abs(points) / maxPoints) * 100, 100);

  return (
    <div className="flex items-center w-full mb-3 text-sm">
      <div className="w-1/3 truncate pr-4 text-gray-300" title={label}>
        {label}
      </div>
      <div className="w-1/2 bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="h-full bg-[var(--color-brand-primary)] rounded-full glow-primary"
        ></motion.div>
      </div>
      <div className="w-1/6 text-right font-medium pl-2">
        <span className={points >= 0 ? 'text-[var(--color-brand-critical)]' : 'text-[var(--color-brand-low)]'}>
          {points >= 0 ? '+' : ''}{points} pts
        </span>
      </div>
    </div>
  );
};

export default ShapFactorBar;
