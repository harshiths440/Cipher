import React from 'react';
import { ShieldAlert } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="w-full bg-[var(--color-brand-bg)] border-b border-[rgba(99,102,241,0.2)] pb-px relative z-50">
      <div className="absolute bottom-0 w-full h-[1px] glow-primary"></div>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="text-[var(--color-brand-primary)] h-6 w-6" />
          <span className="font-bold text-xl text-[var(--color-brand-primary)] tracking-wide">
            ComplianceX
          </span>
        </div>
        <div className="text-sm text-gray-400 hidden md:block">
          5 AI Doctors monitoring your compliance
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
