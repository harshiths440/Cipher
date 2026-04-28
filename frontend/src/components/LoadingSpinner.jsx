import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-brand-bg)]/90 backdrop-blur-sm"
    >
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-t-4 border-[var(--color-brand-primary)] animate-spin opacity-80 glow-primary"></div>
        <div className="absolute inset-2 rounded-full border-r-4 border-b-4 border-indigo-400 opacity-30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-medium text-gray-200"
      >
        {message}
      </motion.p>
    </motion.div>
  );
};

export default LoadingSpinner;
