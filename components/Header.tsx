import React from 'react';
import { ChevronLeft, Key, Share2, UploadCloud, Download, Sparkles } from 'lucide-react';
import { ProcessingStatus } from '../types';

interface HeaderProps {
  activeFeature: string | null;
  setActiveFeature: (feature: string | null) => void;
  status: ProcessingStatus;
  resetApiKey: () => void;
  setIsSeoModalOpen: (isOpen: boolean) => void;
  setIsPublisherOpen: (isOpen: boolean) => void;
  setIsGrowthHubOpen: (isOpen: boolean) => void;
  handleExport: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeFeature,
  setActiveFeature,
  status,
  resetApiKey,
  setIsSeoModalOpen,
  setIsPublisherOpen,
  setIsGrowthHubOpen,
  handleExport
}) => {
  return (
    <header className="cc-header">
      {/* Left — logo + back */}
      <div className="flex items-center gap-3">
        {activeFeature && (
          <button
            onClick={() => setActiveFeature(null)}
            className="cc-btn cc-btn-ghost !px-2.5 !py-2"
            title="Back"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="https://createrin.com/wp-content/uploads/2025/03/createrin_logo.jpg"
            alt="Createrin"
            className="h-7 w-auto rounded-md object-contain bg-white"
            onError={e => {
              e.currentTarget.style.display = 'none';
              const fb = document.getElementById('logo-fallback-text');
              if (fb) fb.classList.remove('hidden');
            }}
          />
          <h1
            id="logo-fallback-text"
            className="hidden text-lg font-black tracking-tight"
            style={{ color: '#009ca6' }}
          >
            createrin
          </h1>
        </div>

        {/* Project mode pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: 'rgba(59,130,246,0.1)',
            borderColor: 'rgba(59,130,246,0.25)',
            color: '#60a5fa'
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Video Captions
        </div>

        {/* API Key reset */}
        <button
          onClick={resetApiKey}
          className="cc-btn cc-btn-ghost !px-2 !py-1.5"
          title="Reset API Key"
        >
          <Key size={11} style={{ color: 'var(--cc-text-3)' }} />
        </button>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {status === 'READY' && (
          <>
            <button
              onClick={() => setIsSeoModalOpen(true)}
              className="cc-btn cc-btn-ghost hidden sm:inline-flex"
            >
              <Share2 size={13} />
              <span>SEO</span>
            </button>

            <button
              onClick={() => setIsGrowthHubOpen(true)}
              className="cc-btn hidden sm:inline-flex"
              style={{
                background: 'rgba(139,92,246,0.15)',
                color: '#a78bfa',
                borderColor: 'rgba(139,92,246,0.3)'
              }}
            >
              <Sparkles size={13} />
              <span>Growth</span>
            </button>

            <button
              onClick={() => setIsPublisherOpen(true)}
              className="cc-btn cc-btn-primary hidden sm:inline-flex"
            >
              <UploadCloud size={13} />
              <span>Publish</span>
            </button>

            <button
              onClick={handleExport}
              className="cc-btn cc-btn-white"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
