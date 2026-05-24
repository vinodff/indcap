import React from 'react';
import { CheckCircle } from 'lucide-react';

interface TemplateCardProps {
  id: string;
  name: string;
  layout: string;
  accentColor: string;
  isActive: boolean;
  onSelect: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ id, name, layout, accentColor, isActive, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`relative flex-shrink-0 min-w-[180px] p-4 text-left rounded-xl border transition-all ${
        isActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-[#121212] hover:border-gray-600'
      }`}
    >
      {isActive && (
        <div className="absolute top-3 right-3 text-blue-500">
          <CheckCircle size={18} fill="currentColor" className="text-[#0a0a0a]" />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: accentColor }}></div>
        <span className="font-bold text-white text-sm">{name}</span>
      </div>
      <p className="text-xs text-gray-500 font-medium">{layout}</p>
    </button>
  );
};
