import React from 'react';
import { Type, Smile, Sparkles, Music, Grid, Settings, Wand2, Layers } from 'lucide-react';

export type ActiveTool = 'TEXT' | 'STICKERS' | 'EFFECTS' | 'AUDIO' | 'TEMPLATES' | 'ADJUST' | null;

interface ToolsPanelProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  hasVideo: boolean;
  hasCaptions: boolean;
}

const TOOLS: {
  id: ActiveTool;
  icon: React.ElementType;
  label: string;
  requiresCaptions: boolean;
}[] = [
  { id: 'TEXT',      icon: Type,     label: 'Text',     requiresCaptions: true  },
  { id: 'TEMPLATES', icon: Grid,     label: 'Styles',   requiresCaptions: true  },
  { id: 'EFFECTS',   icon: Sparkles, label: 'Effects',  requiresCaptions: true  },
  { id: 'STICKERS',  icon: Smile,    label: 'Stickers', requiresCaptions: false },
  { id: 'AUDIO',     icon: Music,    label: 'Audio',    requiresCaptions: false },
  { id: 'ADJUST',    icon: Settings, label: 'Settings', requiresCaptions: false },
];

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  activeTool, setActiveTool, hasVideo, hasCaptions,
}) => {
  const toggle = (id: ActiveTool) =>
    setActiveTool(activeTool === id ? null : id);

  return (
    <div
      className="cc-panel flex-shrink-0 z-30 flex"
      style={{
        /* Desktop: narrow vertical strip | Mobile: horizontal bottom bar */
        flexDirection: 'column',
        width: 'var(--tool-width)',
        height: '100%',
        padding: '10px 5px',
        gap: '2px',
        alignItems: 'center',
      }}
    >
      {/* Brand / logo mark */}
      <div
        style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: 'var(--cc-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12, flexShrink: 0,
        }}
      >
        <Layers size={14} color="#fff" />
      </div>

      {/* Tool buttons */}
      {TOOLS.map(tool => {
        const Icon = tool.icon;
        const disabled  = !hasVideo || (tool.requiresCaptions && !hasCaptions);
        const isActive  = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => !disabled && toggle(tool.id)}
            disabled={disabled}
            className={`cc-tool-btn ${isActive ? 'active' : ''}`}
            data-tooltip={tool.label}
          >
            <Icon size={17} />
            <span className="tool-label">{tool.label}</span>
          </button>
        );
      })}

      {/* Spacer pushes AI button to bottom */}
      <div style={{ flex: 1 }} />

      {/* AI Magic — bottom anchor */}
      <button
        disabled={!hasCaptions}
        className="cc-tool-btn"
        data-tooltip="AI Magic"
        style={hasCaptions ? {
          background: 'linear-gradient(160deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))',
          borderColor: 'rgba(139,92,246,0.35)',
          color: '#c4b5fd',
        } : undefined}
      >
        <Wand2 size={17} />
        <span className="tool-label">AI</span>
      </button>
    </div>
  );
};

export default ToolsPanel;
