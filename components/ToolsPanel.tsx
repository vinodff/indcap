import React, { useState } from 'react';
import {
  Type,
  Image as ImageIcon,
  Sparkles,
  Settings,
  ChevronRight,
  Layers,
  Zap,
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface ToolsPanelProps {
  onSelectTool?: (toolId: string) => void;
  selectedTool?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'text',
    name: 'Text',
    icon: <Type size={20} />,
    description: 'Edit words & text',
  },
  {
    id: 'images',
    name: 'Images',
    icon: <ImageIcon size={20} />,
    description: 'Add & position images',
  },
  {
    id: 'effects',
    name: 'Effects',
    icon: <Sparkles size={20} />,
    description: 'Animation effects',
  },
  {
    id: 'layers',
    name: 'Layers',
    icon: <Layers size={20} />,
    description: 'Layer management',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: <Settings size={20} />,
    description: 'Project settings',
  },
];

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  onSelectTool,
  selectedTool = 'text',
}) => {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-white text-sm mb-1">Tools</h3>
        <p className="text-xs text-gray-500">Select a tool to start editing</p>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool?.(tool.id)}
            className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 group ${
              selectedTool === tool.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className={selectedTool === tool.id ? 'text-white' : 'text-gray-400'}>
              {tool.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{tool.name}</div>
              <div className="text-xs text-opacity-75 opacity-75">{tool.description}</div>
            </div>
            {selectedTool === tool.id && (
              <ChevronRight size={16} className="flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Quick Info */}
      <div className="p-4 border-t border-gray-800 bg-gray-800/50 flex-shrink-0">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-900/20 border border-blue-900/50">
          <Zap size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-300 mb-0.5">Pro Tip</p>
            <p className="text-xs text-blue-200/80">
              Use keyboard shortcuts for faster editing. Press H for help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
