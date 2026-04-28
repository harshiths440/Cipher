import React from 'react';

const CalendarRow = ({ obligationName, dueDate, status, daysText, onAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Overdue': return 'bg-[var(--color-brand-critical)]';
      case 'Due Soon': return 'bg-[var(--color-brand-warning)]';
      case 'Filed': return 'bg-[var(--color-brand-low)]';
      case 'In Progress': return 'bg-indigo-500';
      case 'Upcoming':
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColors = (status) => {
    switch (status) {
      case 'Overdue': return 'bg-[var(--color-brand-critical)]/10 text-[var(--color-brand-critical)] border-[var(--color-brand-critical)]/20';
      case 'Due Soon': return 'bg-[var(--color-brand-warning)]/10 text-[var(--color-brand-warning)] border-[var(--color-brand-warning)]/20';
      case 'Filed': return 'bg-[var(--color-brand-low)]/10 text-[var(--color-brand-low)] border-[var(--color-brand-low)]/20';
      case 'In Progress': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Upcoming':
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center w-5/12">
        <div className={`w-2.5 h-2.5 rounded-full mr-4 ${getStatusColor(status)} shadow-[0_0_8px_currentColor] opacity-80 group-hover:opacity-100 transition-opacity`}></div>
        <div>
          <h4 className="font-medium text-gray-200">{obligationName}</h4>
        </div>
      </div>
      
      <div className="w-2/12 text-gray-400 text-sm">
        {dueDate}
      </div>

      <div className="w-2/12">
        <span className={`text-xs font-bold px-2 py-1 rounded border uppercase tracking-wider ${getStatusBadgeColors(status)}`}>
          {status}
        </span>
      </div>

      <div className="w-2/12 text-sm text-gray-400">
        {daysText}
      </div>

      <div className="w-1/12 text-right">
        <button 
          onClick={() => onAction && onAction(obligationName)}
          className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Take Action
        </button>
      </div>
    </div>
  );
};

export default CalendarRow;
