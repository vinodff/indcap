import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

const ProjectSpecs: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div 
        className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Info size={16} className="text-blue-400" />
          <span>Product Definition & Engineering Scope</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </div>
      
      {isOpen && (
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-gray-400 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-900">
          <div>
            <h3 className="text-blue-400 font-bold mb-2 uppercase text-xs">Product Scope</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>MVP:</strong> Upload, Transcribe (Hindi/Telugu/English), Style, Export.</li>
              <li><strong>Future:</strong> Multi-speaker detection, auto-emoji insertion, AI dubbing.</li>
              <li><strong>Not Included:</strong> Trimming, music, filters.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-green-400 font-bold mb-2 uppercase text-xs">Non-Functional Reqs</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Speed:</strong> Processing under 30s for 1min clips.</li>
              <li><strong>Quality:</strong> 95%+ accuracy for Indian languages.</li>
              <li><strong>Limits:</strong> Max 20MB file size (Browser/API constraints).</li>
            </ul>
          </div>
          <div>
            <h3 className="text-red-400 font-bold mb-2 uppercase text-xs">Risks & Challenges</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Sync:</strong> Browser frame timing vs audio can drift.</li>
              <li><strong>Fonts:</strong> Rendering complex Indic scripts in Canvas.</li>
              <li><strong>Consistency:</strong> Ensuring Preview matches Export exactly.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-purple-400 font-bold mb-2 uppercase text-xs">Success Metrics</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Accuracy:</strong> User edit rate (lower is better).</li>
              <li><strong>Retention:</strong> Exports per upload.</li>
              <li><strong>Render Time:</strong> Time to export final mp4.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSpecs;
