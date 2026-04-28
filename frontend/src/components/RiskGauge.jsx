import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

const getScoreColor = (score) => {
  if (score < 30) return 'var(--color-brand-low)';
  if (score < 60) return 'var(--color-brand-warning)';
  if (score < 80) return 'var(--color-brand-high)';
  return 'var(--color-brand-critical)';
};

const RiskGauge = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const controls = useAnimation();
  
  const radius = 80;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  useEffect(() => {
    controls.start({
      strokeDashoffset,
      transition: { duration: 1.5, ease: "easeOut" }
    });

    let start = 0;
    const duration = 1500;
    const increment = score / (duration / 16); // 60fps frame rate
    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score, strokeDashoffset, controls]);

  const color = getScoreColor(score);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Foreground Arc */}
        <motion.path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="transparent"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={controls}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute top-[45px] flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>{displayScore}</span>
        <span className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Risk Score</span>
      </div>
    </div>
  );
};

export default RiskGauge;
