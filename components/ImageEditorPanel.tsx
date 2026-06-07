import React from 'react';
import { X, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import type { TypographyReelImageIntegration } from '../services/imageAssets';

interface ImageEditorPanelProps {
  images: TypographyReelImageIntegration[];
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  onUpdateImage: (id: string, updates: Partial<TypographyReelImageIntegration>) => void;
  onDeleteImage: (id: string) => void;
  totalDuration: number;
}

export const ImageEditorPanel: React.FC<ImageEditorPanelProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onUpdateImage,
  onDeleteImage,
  totalDuration,
}) => {
  if (images.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No images yet. Generate a reel to extract images.
      </div>
    );
  }

  const selectedImage = selectedImageId
    ? images.find(img => img.assetId === selectedImageId)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-800/50">
        <h3 className="text-sm font-semibold text-white mb-2">Image Assets ({images.length})</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• Click image to select</div>
          <div>• Drag on canvas to move</div>
          <div>• ↑↓←→ to nudge (Shift for 1px)</div>
          <div>• Delete to remove</div>
        </div>
      </div>

      {/* Image List */}
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {images.map((img) => (
          <div
            key={img.assetId}
            onClick={() => onSelectImage(img.assetId)}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              selectedImageId === img.assetId
                ? 'bg-violet-600/30 border border-violet-500'
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-750'
            }`}
          >
            {/* Thumbnail */}
            <div className="mb-2 w-full aspect-video rounded bg-black/50 overflow-hidden flex items-center justify-center">
              {img.blobUrl ? (
                <img
                  src={img.blobUrl}
                  alt={img.keyword}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="text-xs text-gray-500">No preview</div>
              )}
            </div>

            {/* Info */}
            <div className="text-xs space-y-1">
              <div className="font-medium text-white truncate">{img.keyword}</div>
              <div className="text-gray-400">
                {img.startTime.toFixed(2)}s – {img.endTime.toFixed(2)}s
              </div>
              <div className="text-gray-400">
                {img.width} × {img.height}px
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status indicator */}
      {selectedImage && (
        <div className="px-4 py-2 bg-violet-900/30 border-b border-violet-700/50 text-xs text-violet-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Selected: {selectedImage.keyword}
        </div>
      )}

      {/* Help text when no image selected */}
      {!selectedImage && images.length > 0 && (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-400 text-xs space-y-3">
          <div className="space-y-2">
            <div>👇 Select an image above</div>
            <div className="text-gray-500">or click on canvas to edit</div>
          </div>
        </div>
      )}

      {/* Property Editor (shown when image selected) */}
      {selectedImage && (
        <div className="border-t border-gray-800 p-4 space-y-4 bg-gray-800/50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-300">PROPERTIES</h4>
            <button
              onClick={() => onSelectImage(null)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          {/* Timing */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Start Time</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.1"
                value={selectedImage.startTime}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    startTime: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-12 text-right">
                {selectedImage.startTime.toFixed(2)}s
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">End Time</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.1"
                value={selectedImage.endTime}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    endTime: parseFloat(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-12 text-right">
                {selectedImage.endTime.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Opacity</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={(selectedImage as any).opacity ?? 100}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    ...(selectedImage as any),
                    opacity: parseInt(e.target.value),
                  })
                }
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-12 text-right">
                {((selectedImage as any).opacity ?? 100)}%
              </span>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Rotation</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={(selectedImage.rotation ?? 0) * (180 / Math.PI)}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    rotation: (parseFloat(e.target.value) * Math.PI) / 180,
                  })
                }
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-12 text-right">
                {(((selectedImage.rotation ?? 0) * 180) / Math.PI).toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Blend Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Blend Mode</label>
            <select
              value={selectedImage.blendMode || 'normal'}
              onChange={(e) =>
                onUpdateImage(selectedImage.assetId, {
                  blendMode: e.target.value as any,
                })
              }
              className="w-full px-2 py-1.5 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-violet-500"
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
            </select>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-300">Width</label>
              <input
                type="number"
                value={selectedImage.width}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    width: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-300">Height</label>
              <input
                type="number"
                value={selectedImage.height}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    height: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-300">X Position</label>
              <input
                type="number"
                value={selectedImage.x}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    x: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-300">Y Position</label>
              <input
                type="number"
                value={selectedImage.y}
                onChange={(e) =>
                  onUpdateImage(selectedImage.assetId, {
                    y: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-700">
            <button
              onClick={() => onDeleteImage(selectedImage.assetId)}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
