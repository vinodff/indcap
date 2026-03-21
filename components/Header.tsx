import React from 'react';
import { ChevronLeft, Video, Key, Share2, UploadCloud, Download } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface HeaderProps {
  activeFeature: string | null;
  setActiveFeature: (feature: string | null) => void;
  status: ProcessingStatus;
  resetApiKey: () => void;
  setIsSeoModalOpen: (isOpen: boolean) => void;
  setIsPublisherOpen: (isOpen: boolean) => void;
  handleExport: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeFeature,
  setActiveFeature,
  status,
  resetApiKey,
  setIsSeoModalOpen,
  setIsPublisherOpen,
  handleExport
}) => {
  return (
    <header className="border-b border-gray-800 p-4 flex justify-between items-center bg-[#1a1a1a] z-50 shadow-lg">
      <div className="flex items-center gap-4">
        {activeFeature && (
          <button 
            onClick={() => setActiveFeature(null)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
            title="Back to Home"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="relative flex items-center">
          {/* Logo Image */}
          <img 
            src="https://createrin.com/wp-content/uploads/2025/03/createrin_logo.jpg" 
            alt="Createrin" 
            className="h-10 w-auto rounded-lg object-contain bg-white"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              // Show text fallback when image fails
              const fallback = document.getElementById('logo-fallback-text');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          {/* Text Fallback (Hidden by default, shown via onError) */}
          <h1 id="logo-fallback-text" className="hidden text-3xl font-black tracking-tight text-[#009ca6] leading-none">
            createrin
          </h1>
        </div>
        <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 ml-4">
          <button 
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-blue-600 text-white shadow-lg`}
          >
            <Video size={14} /> Video
          </button>
        </div>
        <button 
          onClick={resetApiKey}
          className="p-1.5 bg-gray-800 hover:bg-red-900/50 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
          title="Reset API Key"
        >
          <Key size={12} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {status === 'READY' && (
          <>
            <button 
              onClick={() => setIsSeoModalOpen(true)}
              className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 px-4 py-2.5 rounded-full font-bold transition-all text-xs border border-gray-700"
            >
              <Share2 size={16} /> <span className="hidden sm:inline">SEO</span>
            </button>
            <button 
              onClick={() => setIsPublisherOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-4 py-2.5 rounded-full font-bold transition-all text-xs border border-blue-500 shadow-lg shadow-blue-600/20"
            >
              <UploadCloud size={16} /> <span className="hidden sm:inline">Publish</span>
            </button>
            <button 
              onClick={handleExport} 
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full font-black transition-all text-sm shadow-xl active:scale-95"
            >
              <Download size={18} /> <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
