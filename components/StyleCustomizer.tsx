import React, { useState, useEffect } from 'react';
import {
  Type, Palette, Square, MousePointer2, AlignLeft, AlignCenter, AlignRight,
  ToggleLeft, ToggleRight, Play, ChevronRight
} from 'lucide-react';
import TranscriptEditor from './TranscriptEditor';
import { STYLES_CONFIG } from '../constants';
import { CaptionStyle, Caption, Platform } from '../types';
import { GRADIENT_PRESETS } from '../services/GradientTextPresets';
import { STYLE_LABELS, LABEL_META, getStylesForLabel, type StyleLabel } from '../services/captionStyleLabels';

interface StyleCustomizerProps {
  activeTab: 'PRESETS' | 'DESIGN' | 'TRANSCRIPT';
  setActiveTab: (tab: 'PRESETS' | 'DESIGN' | 'TRANSCRIPT') => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  currentStyle: string;
  selectPreset: (key: CaptionStyle) => void;
  fontFamily: string;
  setFontFamily: (val: string) => void;
  fontScale: number;
  setFontScale: (val: number) => void;
  fontWeight: string | number;
  setFontWeight: (val: string | number) => void;
  uppercase: boolean;
  setUppercase: (val: boolean) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (val: 'left' | 'center' | 'right') => void;
  textColor: string;
  setTextColor: (val: string) => void;
  strokeWidth: number;
  setStrokeWidth: (val: number) => void;
  strokeColor: string;
  setStrokeColor: (val: string) => void;
  bgEnabled: boolean;
  setBgEnabled: (val: boolean) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  bgPadding: number;
  setBgPadding: (val: number) => void;
  bgRadius: number;
  setBgRadius: (val: number) => void;
  verticalPos: number;
  setVerticalPos: (val: number) => void;
  horizontalPos: number;
  setHorizontalPos: (val: number) => void;
  captions?: Caption[];
  updateCaption?: (id: string, updates: Partial<Caption>) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onPreviewMode?: () => void;
  autoAdjustEnabled?: boolean;
  setAutoAdjustEnabled?: (val: boolean) => void;
  smartCompressionEnabled?: boolean;
  setSmartCompressionEnabled?: (val: boolean) => void;
  iconCaptionsEnabled?: boolean;
  setIconCaptionsEnabled?: (val: boolean) => void;
}

/* ─── category filter labels ─── */
// The 13 user-facing labels live in services/captionStyleLabels.ts (single
// source of truth). 'ALL' is prepended here for the filter rail.
const LABEL_FILTERS: (StyleLabel | 'ALL')[] = ['ALL', ...STYLE_LABELS];

const PLATFORMS: { key: Platform | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL',       label: 'All',       icon: '◉' },
  { key: 'TIKTOK',    label: 'TikTok',    icon: '♪' },
  { key: 'INSTAGRAM', label: 'Instagram', icon: '◈' },
  { key: 'YOUTUBE',   label: 'YouTube',   icon: '▶' },
  { key: 'SHORTS',    label: 'Shorts',    icon: '⟳' },
  { key: 'LINKEDIN',  label: 'LinkedIn',  icon: 'in' },
];

const NEW_KEYS = new Set([
  'BOLD_SHADOW', 'STORYTIME', 'CHROME_3D', 'AUTO_HIGHLIGHT',
  'GLITCH_RGB', 'RETRO_WAVE', 'GHOST_FADE', 'CINEMATIC_TITLES',
  'DUAL_COLOR', 'SHAKE_CAM', 'MINIMAL_BAR', 'LIQUID_CHROME',
  'TYPO_SIZE_HIERARCHY',
]);

/* ─── tiny helpers ─── */
const RowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--cc-text-3)',
  }}>{children}</span>
);

const RowValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cc-text-2)', fontFamily: 'monospace' }}>
    {children}
  </span>
);

const Row: React.FC<{ label: React.ReactNode; value?: React.ReactNode; children: React.ReactNode }> = ({
  label, value, children,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <RowLabel>{label}</RowLabel>
      {value && <RowValue>{value}</RowValue>}
    </div>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: 'var(--cc-border)', margin: '4px 0' }} />
);

/* ─── main component ─── */
const StyleCustomizer: React.FC<StyleCustomizerProps> = ({
  activeTab, setActiveTab, filterCategory, setFilterCategory,
  currentStyle, selectPreset,
  fontFamily, setFontFamily, fontScale, setFontScale,
  fontWeight, setFontWeight, uppercase, setUppercase,
  textAlign, setTextAlign, textColor, setTextColor,
  strokeWidth, setStrokeWidth, strokeColor, setStrokeColor,
  bgEnabled, setBgEnabled, bgColor, setBgColor,
  bgPadding, setBgPadding, bgRadius, setBgRadius,
  verticalPos, setVerticalPos, horizontalPos, setHorizontalPos,
  captions = [], updateCaption, videoRef, onPreviewMode,
  autoAdjustEnabled = true, setAutoAdjustEnabled,
  smartCompressionEnabled = false, setSmartCompressionEnabled,
  iconCaptionsEnabled = false, setIconCaptionsEnabled,
}) => {
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'ALL'>('ALL');

  // Local view state — decoupled from the App-level tab. Previously the internal
  // TabBar called setActiveTab('PRESETS'), which made App route to ThemePresetsPanel
  // instead, so this component's own Templates grid was unreachable. Now the
  // internal TabBar drives this local state, and we re-sync only when the
  // App-level tab actually changes (e.g. user clicks the App "Transcript" tab).
  const [view, setView] = useState<'PRESETS' | 'DESIGN' | 'TRANSCRIPT'>(
    activeTab === 'TRANSCRIPT' ? 'TRANSCRIPT' : 'PRESETS'
  );
  useEffect(() => {
    setView(activeTab === 'TRANSCRIPT' ? 'TRANSCRIPT' : 'PRESETS');
  }, [activeTab]);

  /* ─── TAB BAR ─── */
  // Internal Styles/Customize toggle. "Styles" opens the 75-style label browser;
  // "Customize" opens the manual font/colour/position controls. Transcript is
  // owned by the App-level tab, so it isn't duplicated here.
  const TabBar = () => (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--cc-border)',
      background: 'var(--cc-surface)',
      flexShrink: 0,
    }}>
      {([['PRESETS', 'Styles'], ['DESIGN', 'Customize']] as const).map(([t, label]) => (
        <button
          key={t}
          onClick={() => setView(t)}
          className={`cc-tab ${view === t ? 'active' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  /* ─── PRESETS TAB ─── */
  if (view === 'TRANSCRIPT') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TabBar />
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {updateCaption && videoRef
            ? <TranscriptEditor captions={captions} updateCaption={updateCaption} videoRef={videoRef} />
            : <p style={{ color: 'var(--cc-text-3)', fontSize: 12, textAlign: 'center', padding: 20 }}>Transcript unavailable.</p>
          }
        </div>
      </div>
    );
  }

  if (view === 'PRESETS') {
    // Which label sections to show: all 13, or just the one the user filtered to.
    const displayLabels = STYLE_LABELS.filter(l =>
      filterCategory === 'ALL' || filterCategory === l
    );

    const platformMatch = (config: typeof STYLES_CONFIG[keyof typeof STYLES_CONFIG]) => {
      if (filterPlatform === 'ALL') return true;
      if (!config.platforms || config.platforms.length === 0) return true; // untagged = universal
      return config.platforms.includes(filterPlatform as Platform);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TabBar />

        {/* Live Preview button */}
        <div style={{ padding: '10px 14px 0' }}>
          <button
            onClick={onPreviewMode}
            className="cc-btn cc-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '9px 0', borderRadius: 10, fontSize: 12 }}
          >
            <Play size={13} className="fill-white" />
            Live Preview Mode
          </button>
        </div>

        {/* Category pills */}
        <div
          className="scrollbar-hide"
          style={{
            display: 'flex', gap: 6, padding: '10px 14px',
            overflowX: 'auto', flexShrink: 0,
          }}
        >
          {LABEL_FILTERS.map(label => {
            const meta = label === 'ALL' ? null : LABEL_META[label];
            return (
              <button
                key={label}
                onClick={() => setFilterCategory(label)}
                className={`cc-pill ${filterCategory === label ? 'active' : ''}`}
                style={{ gap: 4 }}
              >
                {meta && <span>{meta.icon}</span>}
                {label}
              </button>
            );
          })}
        </div>

        {/* Platform filter pills */}
        <div
          className="scrollbar-hide"
          style={{
            display: 'flex', gap: 5, padding: '0 14px 8px',
            overflowX: 'auto', flexShrink: 0,
            borderBottom: '1px solid var(--cc-border)',
          }}
        >
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => setFilterPlatform(p.key)}
              className={`cc-pill ${filterPlatform === p.key ? 'active' : ''}`}
              style={{ fontSize: 9, gap: 3 }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 14px 20px' }}>
          {displayLabels.map(cat => {
            const items = getStylesForLabel(cat)
              .map(key => [key, STYLES_CONFIG[key]] as [CaptionStyle, typeof STYLES_CONFIG[CaptionStyle]])
              .filter(([, c]) => platformMatch(c));
            if (!items.length) return null;
            const accent = LABEL_META[cat].accent;
            return (
              <div key={cat} style={{ marginBottom: 24 }}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 10, paddingBottom: 8,
                  borderBottom: '1px solid var(--cc-border)',
                }}>
                  <span style={{
                    width: 3, height: 12, borderRadius: 2,
                    background: accent, display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: accent,
                  }}>{cat}</span>
                  <span style={{
                    fontSize: 9, color: 'var(--cc-text-3)', fontWeight: 600,
                    marginLeft: 'auto',
                  }}>{items.length}</span>
                </div>

                {/* 2-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {items.map(([key, config]) => {
                    const isActive = currentStyle === key;
                    const isNew = NEW_KEYS.has(key);
                    const isTopPick = filterPlatform !== 'ALL' && config.platforms?.includes(filterPlatform as Platform);
                    const sampleWord = config.displayMode === 'WORD' ? 'FIRE' : 'CAPTION';
                    const isTypography = !!config.typographyLayout;
                    const gradBg = config.gradientColors && config.gradientColors.length >= 2
                      ? `linear-gradient(135deg, ${config.gradientColors.join(',')})`
                      : isTypography
                        ? (config.backgroundColor && config.backgroundColor !== 'rgba(0,0,0,0.0)'
                          ? config.backgroundColor
                          : 'linear-gradient(135deg, #111 0%, #1e1e1e 100%)')
                        : 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 100%)';

                    return (
                      <button
                        key={key}
                        onClick={() => selectPreset(key as CaptionStyle)}
                        className={`template-card ${isActive ? 'selected' : ''}`}
                        style={{ textAlign: 'left' }}
                      >
                        {/* NEW badge */}
                        {isNew && <span className="cc-badge-new">NEW</span>}
                        {/* TOP PICK badge when platform filter matches */}
                        {isTopPick && !isNew && (
                          <span style={{
                            position: 'absolute', top: 6, right: 6, zIndex: 5,
                            fontSize: 7, fontWeight: 800, letterSpacing: '0.06em',
                            padding: '2px 5px', borderRadius: 4,
                            background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                            color: '#fff', textTransform: 'uppercase',
                          }}>★ Top Pick</span>
                        )}

                        {/* Preview area */}
                        <div style={{
                          aspectRatio: '2/1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: gradBg,
                          borderRadius: '10px 10px 0 0',
                          overflow: 'hidden',
                          position: 'relative',
                        }}>
                          {/* Background dim overlay if active */}
                          {isActive && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(59,130,246,0.08)',
                            }} />
                          )}

                          {/* Typography preview */}
                          {isTypography && config.typographyLayout ? (
                            <div style={{
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              gap: 2, padding: '4px 8px',
                              position: 'relative', zIndex: 1,
                            }}>
                              {config.typographyLayout.layers.map((layer, li) => {
                                const PREVIEW_WORDS = ['small', 'BIG', 'text'];
                                const previewText = li === 1
                                  ? (layer.uppercase ? 'WORD' : 'Word')
                                  : li === 0
                                    ? (layer.uppercase ? 'SMALL' : 'small')
                                    : (layer.uppercase ? 'TEXT' : 'text');
                                const previewSize = layer.fontSize > 70
                                  ? 19
                                  : layer.fontSize > 40
                                    ? 12
                                    : 8;
                                const previewColor = layer.gradientColors && layer.gradientColors.length >= 2
                                  ? layer.gradientColors[0]
                                  : layer.color;
                                return (
                                  <span key={li} style={{
                                    fontFamily: layer.fontFamily,
                                    fontSize: previewSize,
                                    fontWeight: layer.fontWeight,
                                    color: previewColor,
                                    textTransform: layer.uppercase ? 'uppercase' : 'none',
                                    fontStyle: layer.italic ? 'italic' : 'normal',
                                    letterSpacing: li === 1 ? '0.05em' : '0.08em',
                                    lineHeight: 1.1,
                                    textShadow: layer.shadowColor
                                      ? `0 0 ${Math.min((layer.shadowBlur || 8), 12)}px ${layer.shadowColor}`
                                      : 'none',
                                    WebkitTextStroke: layer.strokeColor && (layer.strokeWidth || 0) > 0
                                      ? `${Math.min((layer.strokeWidth || 1) / 3, 1.5)}px ${layer.strokeColor}`
                                      : 'none',
                                  }}>
                                    {previewText}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span
                              className="template-preview-span"
                              data-animation={config.animation}
                              style={{
                                fontFamily: config.fontFamily,
                                fontSize: 21,
                                fontWeight: config.fontWeight || 900,
                                color: config.activeTextColor || config.textColor,
                                textShadow: config.shadowBlur
                                  ? `0 0 ${Math.min(config.shadowBlur, 18)}px ${config.shadowColor}`
                                  : 'none',
                                WebkitTextStroke: config.strokeWidth && config.strokeWidth > 0
                                  ? `${Math.min(config.strokeWidth / 3, 2)}px ${config.strokeColor || '#000'}`
                                  : 'none',
                                textTransform: config.uppercase ? 'uppercase' : 'none',
                                letterSpacing: '0.01em',
                                position: 'relative', zIndex: 1,
                              }}
                            >
                              {sampleWord}
                            </span>
                          )}
                        </div>

                        {/* Info row */}
                        <div style={{ padding: '8px 10px 10px' }}>
                          <p style={{
                            fontSize: 10, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: isActive ? 'var(--cc-text-1)' : 'var(--cc-text-2)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            marginBottom: 5,
                          }}>{config.name}</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 7, fontWeight: 800, textTransform: 'uppercase',
                              padding: '2px 6px', borderRadius: 4,
                              background: `${accent}18`,
                              color: accent,
                              border: `1px solid ${accent}33`,
                              letterSpacing: '0.06em',
                            }}>{config.category}</span>
                            <span style={{
                              fontSize: 7, fontWeight: 700, textTransform: 'uppercase',
                              padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--cc-text-3)',
                              letterSpacing: '0.06em',
                            }}>{config.displayMode}</span>
                            {/* Platform icons */}
                            {config.platforms && config.platforms.map((plat: Platform) => {
                              const platDef = PLATFORMS.find(p => p.key === plat);
                              if (!platDef) return null;
                              return (
                                <span
                                  key={plat}
                                  title={platDef.label}
                                  style={{
                                    fontSize: 7, fontWeight: 900,
                                    padding: '2px 5px', borderRadius: 4,
                                    background: filterPlatform === plat ? `${accent}25` : 'rgba(255,255,255,0.04)',
                                    color: filterPlatform === plat ? accent : 'var(--cc-text-3)',
                                    letterSpacing: '0.02em', fontFamily: 'monospace',
                                  }}
                                >
                                  {platDef.icon}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── DESIGN TAB ─── */
  const GroupHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14, paddingBottom: 10,
      borderBottom: '1px solid var(--cc-border)',
    }}>
      <span style={{ color: 'var(--cc-blue-light)', display: 'flex' }}>{icon}</span>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--cc-text-2)',
      }}>{label}</span>
    </div>
  );

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--cc-surface-3)',
    border: '1px solid var(--cc-border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--cc-text-1)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabBar />

      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '18px 14px 32px' }}>
        {/* ── Typography ── */}
        <section style={{ marginBottom: 24 }}>
          <GroupHeader icon={<Type size={13} />} label="Typography" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Row label="Font Family">
              <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={selectStyle}>
                <optgroup label="Sans Serif">
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Poppins, sans-serif">Poppins</option>
                  <option value="Nunito, sans-serif">Nunito</option>
                  <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                  <option value="'Archivo Black', sans-serif">Archivo Black</option>
                  <option value="Oswald, sans-serif">Oswald</option>
                  <option value="Fredoka, sans-serif">Fredoka</option>
                </optgroup>
                <optgroup label="Display">
                  <option value="Bangers, cursive">Bangers</option>
                  <option value="'Bebas Neue', display">Bebas Neue</option>
                  <option value="Anton, sans-serif">Anton</option>
                  <option value="'Titan One', cursive">Titan One</option>
                  <option value="'Luckiest Guy', cursive">Luckiest Guy</option>
                  <option value="Righteous, sans-serif">Righteous</option>
                  <option value="'Rubik Mono One', sans-serif">Rubik Mono One</option>
                  <option value="Bungee, sans-serif">Bungee</option>
                  <option value="'Black Ops One', display">Black Ops One</option>
                </optgroup>
                <optgroup label="Serif">
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="'DM Serif Display', serif">DM Serif Display</option>
                </optgroup>
                <optgroup label="Script">
                  <option value="Caveat, cursive">Caveat</option>
                  <option value="Satisfy, cursive">Satisfy</option>
                  <option value="Pacifico, cursive">Pacifico</option>
                  <option value="'Permanent Marker', cursive">Permanent Marker</option>
                </optgroup>
                <optgroup label="Sci-Fi / Tech">
                  <option value="Orbitron, sans-serif">Orbitron</option>
                  <option value="'Press Start 2P', monospace">Press Start 2P</option>
                  <option value="'Rubik Glitch', system-ui">Rubik Glitch</option>
                </optgroup>
              </select>
            </Row>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Row label="Size" value={`${Math.round(fontScale * 100)}%`}>
                <input
                  type="range" min="0.5" max="2.5" step="0.1"
                  value={fontScale}
                  onChange={e => setFontScale(parseFloat(e.target.value))}
                  className="cc-range"
                />
              </Row>
              <Row label="Weight">
                <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} style={{ ...selectStyle, padding: '7px 8px', fontSize: 11 }}>
                  {[300, 400, 600, 700, 800, 900].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </Row>
            </div>

            {/* Case + Align */}
            <Row label="Format">
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setUppercase(!uppercase)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8,
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                    border: '1px solid',
                    background: uppercase ? 'var(--cc-blue)' : 'transparent',
                    borderColor: uppercase ? 'var(--cc-blue)' : 'var(--cc-border)',
                    color: uppercase ? '#fff' : 'var(--cc-text-3)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  ABC
                </button>
                <div style={{
                  flex: 2, display: 'flex', borderRadius: 8, overflow: 'hidden',
                  border: '1px solid var(--cc-border)',
                  background: 'var(--cc-surface-2)',
                }}>
                  {(['left', 'center', 'right'] as const).map((a, i) => {
                    const icons = [<AlignLeft size={13} />, <AlignCenter size={13} />, <AlignRight size={13} />];
                    return (
                      <button
                        key={a}
                        onClick={() => setTextAlign(a)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '7px 0', cursor: 'pointer', border: 'none',
                          background: textAlign === a ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: textAlign === a ? 'var(--cc-text-1)' : 'var(--cc-text-3)',
                          transition: 'all 0.12s',
                          borderRight: i < 2 ? '1px solid var(--cc-border)' : 'none',
                        }}
                      >
                        {icons[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Row>
          </div>
        </section>

        <Divider />

        {/* ── Appearance ── */}
        <section style={{ marginTop: 20, marginBottom: 24 }}>
          <GroupHeader icon={<Palette size={13} />} label="Appearance" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Text color */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <RowLabel>Text Color</RowLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--cc-border-mid)',
                  overflow: 'hidden', position: 'relative', cursor: 'pointer',
                }}>
                  <input
                    type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                    style={{ position: 'absolute', inset: 0, width: '150%', height: '150%', top: '-25%', left: '-25%', cursor: 'pointer', border: 'none', padding: 0 }}
                  />
                </div>
                <RowValue>{textColor.toUpperCase()}</RowValue>
              </div>
            </div>

            {/* Stroke */}
            <Row label="Stroke Width" value={`${strokeWidth}px`}>
              <input
                type="range" min="0" max="15" step="1"
                value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))}
                className="cc-range"
              />
            </Row>

            {strokeWidth > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4 }}>
                <RowLabel>Stroke Color</RowLabel>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: '1px solid var(--cc-border-mid)', overflow: 'hidden', position: 'relative',
                }}>
                  <input
                    type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                    style={{ position: 'absolute', inset: 0, width: '150%', height: '150%', top: '-25%', left: '-25%', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <Divider />

        {/* ── Background ── */}
        <section style={{ marginTop: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--cc-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--cc-green)', display: 'flex' }}><Square size={13} /></span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cc-text-2)' }}>Background</span>
            </div>
            <button
              onClick={() => setBgEnabled(!bgEnabled)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: bgEnabled ? 'var(--cc-green)' : 'var(--cc-text-4)', display: 'flex' }}
            >
              {bgEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>

          {bgEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <RowLabel>BG Color</RowLabel>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: '1px solid var(--cc-border-mid)', overflow: 'hidden', position: 'relative',
                }}>
                  <input
                    type="color"
                    value={bgColor.startsWith('rgba') ? '#000000' : bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    style={{ position: 'absolute', inset: 0, width: '150%', height: '150%', top: '-25%', left: '-25%', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
              <Row label="Padding" value={`${bgPadding}px`}>
                <input type="range" min="0" max="40" step="1" value={bgPadding} onChange={e => setBgPadding(parseInt(e.target.value))} className="cc-range" />
              </Row>
              <Row label="Radius" value={`${bgRadius}px`}>
                <input type="range" min="0" max="50" step="1" value={bgRadius} onChange={e => setBgRadius(parseInt(e.target.value))} className="cc-range" />
              </Row>
            </div>
          )}
        </section>

        <Divider />

        {/* ── Layout / Position ── */}
        <section style={{ marginTop: 20 }}>
          <GroupHeader icon={<MousePointer2 size={13} />} label="Layout" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row label="Vertical Position" value={`${verticalPos}%`}>
              <input type="range" min="10" max="90" step="1" value={verticalPos} onChange={e => setVerticalPos(parseInt(e.target.value))} className="cc-range" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {['Top', 'Center', 'Bottom'].map(l => (
                  <span key={l} style={{ fontSize: 8, color: 'var(--cc-text-4)', fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            </Row>
            <Row label="Horizontal Offset" value={`${horizontalPos}%`}>
              <input type="range" min="10" max="90" step="1" value={horizontalPos} onChange={e => setHorizontalPos(parseInt(e.target.value))} className="cc-range" />
            </Row>
          </div>
        </section>

        <Divider />

        {/* ── AI Enhancements ── */}
        <section style={{ marginTop: 20 }}>
          <GroupHeader icon={<Play size={13} />} label="AI Enhancements" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Auto Framing Toggle */}
            {setAutoAdjustEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc-text-2)' }}>Auto Framing</span>
                  <span style={{ fontSize: 8, color: 'var(--cc-text-4)' }}>Avoids speaker faces</span>
                </div>
                <button
                  onClick={() => setAutoAdjustEnabled(!autoAdjustEnabled)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: autoAdjustEnabled ? 'var(--cc-blue-light)' : 'var(--cc-text-4)', display: 'flex' }}
                >
                  {autoAdjustEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            )}

            {/* Smart Brevity Toggle */}
            {setSmartCompressionEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc-text-2)' }}>Smart Brevity</span>
                  <span style={{ fontSize: 8, color: 'var(--cc-text-4)' }}>Fast-paced punchy cuts</span>
                </div>
                <button
                  onClick={() => setSmartCompressionEnabled(!smartCompressionEnabled)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: smartCompressionEnabled ? 'var(--cc-blue-light)' : 'var(--cc-text-4)', display: 'flex' }}
                >
                  {smartCompressionEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            )}

            {/* Icon Captions Toggle */}
            {setIconCaptionsEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cc-text-2)' }}>Icon Captions</span>
                  <span style={{ fontSize: 8, color: 'var(--cc-text-4)' }}>Replaces keywords with premium PNGs</span>
                </div>
                <button
                  onClick={() => setIconCaptionsEnabled(!iconCaptionsEnabled)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: iconCaptionsEnabled ? 'var(--cc-blue-light)' : 'var(--cc-text-4)', display: 'flex' }}
                >
                  {iconCaptionsEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StyleCustomizer;
