/**
 * CapCut-Style Professional Editor
 *
 * Professional video editor layout inspired by CapCut:
 * - Large central preview canvas
 * - Left tools panel
 * - Right properties panel
 * - Bottom horizontal timeline
 *
 * Features:
 * - Unified editing experience
 * - Click to select any element
 * - Properties update instantly
 * - Timeline shows all elements
 * - Keyboard shortcuts for power users
 */

import React, { useState } from 'react';
import { ArrowLeft, Play, Pause, Download } from 'lucide-react';
import { EditorLayout } from './EditorLayout';
import { ToolsPanel } from './ToolsPanel';
import { TimelineEditor } from './TimelineEditor';
import { PropertiesPanel, PropertyInput } from './PropertiesPanel';
import { TextEditorPanel } from './TextEditorPanel';
import { ImageEditorPanel } from './ImageEditorPanel';
import type { WordAnimation } from '../services/typography/types';

interface CapCutStyleEditorProps {
  canvas: React.ReactNode;
  animations: WordAnimation[];
  images: any[];
  selectedWordId: string | null;
  selectedImageId: string | null;
  playing: boolean;
  currentTime: number;
  totalDuration: number;
  onSelectWord: (id: string | null) => void;
  onSelectImage: (id: string | null) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
  onUpdateWord: (id: string, text: string) => void;
  onDeleteWord: (id: string) => void;
  onDuplicateWord?: (id: string) => void;
  onUpdateImage: (id: string, updates: any) => void;
  onDeleteImage: (id: string) => void;
  onBack?: () => void;
  onExport?: () => void;
  onOpenFindReplace?: () => void;
}

export const CapCutStyleEditor: React.FC<CapCutStyleEditorProps> = ({
  canvas,
  animations,
  images,
  selectedWordId,
  selectedImageId,
  playing,
  currentTime,
  totalDuration,
  onSelectWord,
  onSelectImage,
  onPlayPause,
  onSeek,
  onRestart,
  onUpdateWord,
  onDeleteWord,
  onDuplicateWord,
  onUpdateImage,
  onDeleteImage,
  onBack,
  onExport,
  onOpenFindReplace,
}) => {
  const [activeTool, setActiveTool] = useState<'text' | 'images'>('text');

  // Prepare timeline items from both words and images
  const timelineItems = [
    ...animations.map((anim) => ({
      id: anim.wordId,
      type: 'text' as const,
      text: anim.text,
      // WordAnimation times are already in seconds — no /1000
      startTime: anim.startTime,
      duration: anim.duration,
    })),
    ...images.map((img) => ({
      id: img.assetId,
      type: 'image' as const,
      text: img.keyword || 'Image',
      startTime: img.startTime || 0,
      duration: (img.endTime || 0) - (img.startTime || 0),
    })),
  ].sort((a, b) => a.startTime - b.startTime);

  // Get selected item for properties panel
  const selectedItem = selectedWordId
    ? animations.find((a) => a.wordId === selectedWordId)
    : selectedImageId
      ? images.find((i) => i.assetId === selectedImageId)
      : null;

  // Render properties panel based on selection
  const renderPropertiesPanel = () => {
    if (!selectedItem) {
      return (
        <div className="p-6 text-center text-gray-500 text-sm space-y-3">
          <div className="text-4xl">👇</div>
          <p>Click an element on the timeline or canvas to edit</p>
        </div>
      );
    }

    if (selectedWordId && selectedItem) {
      return (
        <TextEditorPanel
          animations={animations}
          selectedWordId={selectedWordId}
          onSelectWord={onSelectWord}
          onUpdateWord={onUpdateWord}
          onDeleteWord={onDeleteWord}
          onDuplicateWord={onDuplicateWord}
          onOpenFindReplace={onOpenFindReplace}
          totalDuration={totalDuration}
          currentTime={currentTime * 1000} // panel expects ms; prop is seconds
        />
      );
    }

    if (selectedImageId && selectedItem) {
      return (
        <div className="p-4 space-y-4 h-full overflow-y-auto">
          <PropertiesPanel
            title="Image Properties"
            icon="🖼️"
            selected={true}
            onDelete={() => onDeleteImage(selectedImageId)}
          >
            <PropertyInput
              label="X Position"
              value={selectedItem.x || 0}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { x: val as number })
              }
              type="number"
              icon="⬅️➡️"
            />
            <PropertyInput
              label="Y Position"
              value={selectedItem.y || 0}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { y: val as number })
              }
              type="number"
              icon="⬆️⬇️"
            />
            <PropertyInput
              label="Width"
              value={selectedItem.width || 100}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { width: val as number })
              }
              type="number"
              icon="↔️"
            />
            <PropertyInput
              label="Height"
              value={selectedItem.height || 100}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { height: val as number })
              }
              type="number"
              icon="↕️"
            />
            <PropertyInput
              label="Opacity"
              value={selectedItem.opacity || 100}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { opacity: val as number })
              }
              type="range"
              min={0}
              max={100}
              step={5}
              icon="👁️"
            />
            <PropertyInput
              label="Rotation"
              value={((selectedItem.rotation || 0) * 180) / Math.PI}
              onChange={(val) =>
                onUpdateImage(selectedImageId, {
                  rotation: ((val as number) * Math.PI) / 180,
                })
              }
              type="range"
              min={0}
              max={360}
              step={5}
              icon="🔄"
            />
            <PropertyInput
              label="Blend Mode"
              value={selectedItem.blendMode || 'normal'}
              onChange={(val) =>
                onUpdateImage(selectedImageId, { blendMode: val })
              }
              type="select"
              options={[
                { label: 'Normal', value: 'normal' },
                { label: 'Multiply', value: 'multiply' },
                { label: 'Screen', value: 'screen' },
                { label: 'Overlay', value: 'overlay' },
              ]}
              icon="🎨"
            />
          </PropertiesPanel>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-400" />
            </button>
          )}
          <h1 className="text-sm font-bold text-white">Typography Reel Studio</h1>
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-1.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Tools */}
        <div className="w-56 border-r border-gray-800 bg-gray-900 overflow-hidden">
          <ToolsPanel selectedTool={activeTool} onSelectTool={(t) => setActiveTool(t as any)} />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">{canvas}</div>

        {/* Right Panel - Properties */}
        <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-hidden flex flex-col">
          {renderPropertiesPanel()}
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-40 border-t border-gray-800 bg-gray-900/50 overflow-hidden">
        <TimelineEditor
          items={timelineItems}
          totalDuration={totalDuration}
          currentTime={currentTime * 1000}
          selectedId={selectedWordId || selectedImageId}
          playing={playing}
          onSelectItem={(id) => {
            const isImage = images.some((i) => i.assetId === id);
            if (isImage) {
              onSelectImage(id);
              setActiveTool('images');
            } else {
              onSelectWord(id);
              setActiveTool('text');
            }
          }}
          onSeek={(time) => onSeek(time * 1000)}
          onPlayPause={onPlayPause}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
};
