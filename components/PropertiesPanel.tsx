import React, { ReactNode } from 'react';
import { ChevronDown, Trash2, Copy } from 'lucide-react';

interface PropertiesPanelProps {
  title: string;
  icon: ReactNode;
  selected: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  children?: React.ReactNode;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  title,
  icon,
  selected,
  onDelete,
  onDuplicate,
  children,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-800/50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-lg">{icon}</div>
          <h3 className="font-semibold text-white flex-1">{title}</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          </button>
        </div>

        {selected && (
          <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}

          {/* Action Buttons */}
          {(onDelete || onDuplicate) && (
            <div className="pt-4 border-t border-gray-700 space-y-2 flex gap-2">
              {onDuplicate && (
                <button
                  onClick={onDuplicate}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Copy size={12} />
                  Duplicate
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Property input component for consistent styling
interface PropertyInputProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'range' | 'select' | 'color';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  icon?: React.ReactNode;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  options,
  icon,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-xs text-gray-400">{icon}</span>}
        <label className="text-xs font-medium text-gray-300">{label}</label>
        {type === 'range' && (
          <span className="text-xs text-gray-500 ml-auto">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
        )}
      </div>

      {type === 'range' && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      )}

      {type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'color' && (
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded border border-gray-600 cursor-pointer"
        />
      )}

      {(type === 'text' || type === 'number') && (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          className="w-full px-3 py-2 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
};
