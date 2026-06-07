/**
 * Professional CapCut-style editor layout
 *
 * Layout:
 *   [Left Panel]  [Canvas - Center]      [Right Panel]
 *   Effects       Video Preview          Properties
 *   Transitions   + Playback Controls    + Timeline
 *
 *   [Timeline Scrubber - Bottom Full Width]
 */

import React, { ReactNode } from 'react';

interface EditorLayoutProps {
  // Main preview canvas
  canvas: ReactNode;

  // Left sidebar - effects/tools
  leftPanel?: ReactNode;

  // Right sidebar - properties
  rightPanel?: ReactNode;

  // Bottom timeline scrubber
  timeline?: ReactNode;

  // Top header
  header?: ReactNode;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  canvas,
  leftPanel,
  rightPanel,
  timeline,
  header,
}) => {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      {header && (
        <div className="h-14 border-b border-gray-800 flex items-center px-4 bg-gray-900/50">
          {header}
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Effects/Tools */}
        {leftPanel && (
          <div className="w-64 border-r border-gray-800 bg-gray-900 overflow-hidden flex flex-col">
            {leftPanel}
          </div>
        )}

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
          {canvas}
        </div>

        {/* Right Panel - Properties */}
        {rightPanel && (
          <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-hidden flex flex-col">
            {rightPanel}
          </div>
        )}
      </div>

      {/* Timeline - Bottom */}
      {timeline && (
        <div className="h-32 border-t border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col">
          {timeline}
        </div>
      )}
    </div>
  );
};
