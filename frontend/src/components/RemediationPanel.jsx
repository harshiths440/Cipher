import React from 'react';
import { useNavigate } from 'react-router-dom';

const RemediationPanel = ({ text, cin }) => {
  const navigate = useNavigate();

  // Basic parser for numbered lists (e.g. "1. Do this\n2. Do that")
  const parseRemediation = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const steps = [];
    const stepRegex = /^(\d+)\.\s+(.*)/;

    lines.forEach(line => {
      const match = line.trim().match(stepRegex);
      if (match) {
        steps.push({ num: match[1], content: match[2] });
      } else if (line.trim().length > 0 && steps.length > 0) {
        // Append to last step if it's a continuation
        steps[steps.length - 1].content += ' ' + line.trim();
      } else if (line.trim().length > 0) {
          // If the text doesn't start with numbers, treat each paragraph as a step
          steps.push({ num: steps.length + 1, content: line.trim() });
      }
    });

    return steps;
  };

  const steps = parseRemediation(text);

  return (
    <div className="bg-[var(--color-brand-card)] border-glass rounded-xl p-6 h-full flex flex-col">
      <div className="flex-grow">
        {steps.length > 0 ? (
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-brand-primary)]/20 border border-[var(--color-brand-primary)]/50 text-[var(--color-brand-primary)] flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-[var(--color-brand-primary)] group-hover:text-white transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                  {step.num}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed pt-0.5 group-hover:text-gray-100 transition-colors">
                  {step.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">No specific remediation steps provided.</p>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <button 
          onClick={() => navigate(`/calendar/${cin}`)}
          className="w-full py-3 px-4 bg-[var(--color-brand-primary)] hover:bg-indigo-500 text-white font-medium rounded-lg transition-all glow-primary hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.6)] flex items-center justify-center space-x-2"
        >
          <span>View Compliance Calendar</span>
          <span className="text-xl leading-none">→</span>
        </button>
      </div>
    </div>
  );
};

export default RemediationPanel;
