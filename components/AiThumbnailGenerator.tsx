import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Type,
  Layout,
  Sparkles,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Wand2,
  Zap,
  RefreshCw,
  AlertCircle,
  X,
  Star,
  ArrowLeft,
  Clock,
  Share2,
} from 'lucide-react';
import { ThumbnailTemplateId, ThumbnailOutput, ThumbnailGenerationStatus, AspectRatio } from '../types';
import { THUMBNAIL_TEMPLATES, TEMPLATE_CATEGORIES } from '../constants/thumbnailTemplates';
import { generateThumbnail, generateVariations, generateHooks, downloadThumbnail, buildPrompt, analyzeImage } from '../services/thumbnailService';

type Step = 'upload' | 'text' | 'template' | 'generate' | 'result';

interface AiThumbnailGeneratorProps {
  onBack: () => void;
}

export const AiThumbnailGenerator: React.FC<AiThumbnailGeneratorProps> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('upload');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [titleText, setTitleText] = useState('');
  const [hookText, setHookText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ThumbnailTemplateId>('viral-reaction');
  const [customPrompt, setCustomPrompt] = useState('');
  const [status, setStatus] = useState<ThumbnailGenerationStatus>({ stage: 'done', progress: 0 });
  const [result, setResult] = useState<ThumbnailOutput | null>(null);
  const [variations, setVariations] = useState<ThumbnailOutput[]>([]);
  const [hooks, setHooks] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('16:9');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target!.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const loadSampleImage = useCallback(async () => {
    try {
      const res = await fetch('https://picsum.photos/1280/720');
      const blob = await res.blob();
      const file = new File([blob], 'sample-image.jpg', { type: 'image/jpeg' });
      handleImageUpload(file);
    } catch {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;
      const grd = ctx.createLinearGradient(0, 0, 640, 360);
      grd.addColorStop(0, '#3b82f6');
      grd.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sample Image', 320, 180);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'sample.png', { type: 'image/png' });
          handleImageUpload(file);
        }
      });
    }
  }, [handleImageUpload]);

  const generateHookSuggestions = useCallback(async () => {
    if (!titleText && !hookText) return;
    const topic = titleText || hookText || 'video';
    try {
      const generatedHooks = await generateHooks(topic);
      setHooks(generatedHooks);
    } catch {
      setHooks([]);
    }
  }, [titleText, hookText]);

  const handleGenerate = useCallback(async () => {
    if (!imageDataUrl) return;

    setStatus({ stage: 'analyzing', progress: 10, message: 'Analyzing your image...' });
    setStep('generate');

    try {
      const input = {
        imageDataUrl,
        titleText: titleText || 'Amazing Video',
        hookText: hookText || 'YOU WON\'T BELIEVE THIS',
        templateId: selectedTemplate,
        customPrompt: customPrompt || undefined,
        aspectRatio: selectedAspectRatio,
      };

      setStatus({ stage: 'analyzing', progress: 30, message: 'Building AI prompt...' });
      await new Promise((r) => setTimeout(r, 300));

      setStatus({ stage: 'generating', progress: 50, message: 'AI is creating your thumbnail...' });

      const genResult = await generateThumbnail(input);

      setStatus({ stage: 'enhancing', progress: 85, message: 'Enhancing quality...' });
      await new Promise((r) => setTimeout(r, 200));

      setResult(genResult);
      setStatus({ stage: 'done', progress: 100, message: 'Thumbnail ready!' });
      setStep('result');
    } catch (err: any) {
      setStatus({
        stage: 'error',
        progress: 0,
        error: err.message || 'Generation failed. Try again.',
      });
    }
  }, [imageDataUrl, titleText, hookText, selectedTemplate, customPrompt]);

  const handleRegenerate = useCallback(async () => {
    setResult(null);
    setVariations([]);
    handleGenerate();
  }, [handleGenerate]);

  const handleGenerateVariations = useCallback(async () => {
    if (!imageDataUrl) return;
    setStatus({ stage: 'generating', progress: 0, message: 'Generating variations...' });
    try {
      const input = {
        imageDataUrl,
        titleText: titleText || 'Amazing Video',
        hookText: hookText || 'YOU WON\'T BELIEVE THIS',
        templateId: selectedTemplate,
        customPrompt: customPrompt || undefined,
      };
      const vars = await generateVariations(input, 2);
      setVariations(vars);
      setStatus({ stage: 'done', progress: 100, message: 'Variations ready!' });
    } catch (err: any) {
      setStatus({ stage: 'error', progress: 0, error: err.message });
    }
  }, [imageDataUrl, titleText, hookText, selectedTemplate, customPrompt]);

  const resetAll = useCallback(() => {
    setStep('upload');
    setImageDataUrl(null);
    setImageFile(null);
    setTitleText('');
    setHookText('');
    setCustomPrompt('');
    setStatus({ stage: 'done', progress: 0 });
    setResult(null);
    setVariations([]);
    setHooks([]);
  }, []);

  const goToStep = useCallback((s: Step) => {
    setStep(s);
    setStatus({ stage: 'done', progress: 0 });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <header className="cc-header">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="cc-btn cc-btn-ghost !px-2 !py-2">
            <ChevronLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
            <ImageIcon size={16} className="text-white" />
          </div>
          <h1 className="font-black text-sm">AI Thumbnail Generator</h1>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.25)', color: '#d946ef' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            v2
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step !== 'upload' && (
            <button onClick={resetAll} className="cc-btn cc-btn-ghost">
              <RotateCcw size={13} /> New
            </button>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 px-4 py-3 bg-[#0d0d0d] border-b border-white/5">
        {(['upload', 'text', 'template', 'generate', 'result'] as Step[]).map((s, i) => {
          const stepIndex = ['upload', 'text', 'template', 'generate', 'result'];
          const currentIndex = stepIndex.indexOf(step);
          const thisIndex = stepIndex.indexOf(s);
          const isActive = step === s;
          const isDone = thisIndex < currentIndex;

          return (
            <React.Fragment key={s}>
              {i > 0 && (
                <div
                  className={`h-px flex-1 max-w-12 transition-colors ${
                    isDone || isActive ? 'bg-fuchsia-500' : 'bg-white/10'
                  }`}
                />
              )}
              <button
                onClick={() => isDone && goToStep(s)}
                disabled={!isDone && step !== s}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                    : isDone
                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 cursor-pointer hover:bg-fuchsia-500/20'
                    : 'text-gray-600 border border-transparent'
                }`}
              >
                {isDone ? <Check size={10} /> : isActive ? <Sparkles size={10} /> : null}
                {s === 'upload' ? 'Image' : s === 'text' ? 'Text' : s === 'template' ? 'Style' : s === 'generate' ? 'Generate' : 'Result'}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {step === 'upload' && (
          <div className="flex items-center justify-center p-8 min-h-full">
            <div className="w-full max-w-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Upload Your Image</h2>
                <p className="text-gray-500 text-sm">A face photo, product shot, or any image you want as the thumbnail subject</p>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-700 hover:border-fuchsia-500/50 rounded-3xl p-12 text-center cursor-pointer transition-all group bg-[#121212]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {imageDataUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={imageDataUrl}
                        alt="Uploaded"
                        className="max-h-64 rounded-2xl mx-auto shadow-2xl"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setImageFile(null); }}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 font-medium">{imageName}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="text-fuchsia-400 text-xs hover:underline font-semibold"
                    >
                      Change image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto">
                      <Upload size={32} className="text-fuchsia-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg mb-1">
                        Drop your image here
                      </p>
                      <p className="text-gray-500 text-sm">or click to browse — PNG, JPG, WebP</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={loadSampleImage} className="cc-btn cc-btn-ghost text-xs">
                  <ImageIcon size={12} /> Try sample image
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => imageDataUrl && goToStep('text')}
                  disabled={!imageDataUrl}
                  className="cc-btn cc-btn-primary !px-6 disabled:opacity-25"
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'text' && (
          <div className="flex items-center justify-center p-8 min-h-full">
            <div className="w-full max-w-2xl space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Add Your Text</h2>
                <p className="text-gray-500 text-sm">The AI will optimize placement, font, and size automatically</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Hook Text <span className="text-fuchsia-400">(primary — will be largest)</span>
                  </label>
                  <input
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                    placeholder="e.g. I Made ₹1,00,000 with AI"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-gray-800 text-white text-lg font-bold placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                    maxLength={80}
                  />
                  <p className="text-right text-[10px] text-gray-600 mt-1">{hookText.length}/80</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Title Text <span className="text-gray-600">(secondary)</span>
                  </label>
                  <input
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    placeholder="e.g. This Trick Changed Everything"
                    className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-gray-800 text-white font-medium placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                    maxLength={120}
                  />
                </div>

                {hooks.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      AI-Suggested Hooks
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {hooks.map((h, i) => (
                        <button
                          key={i}
                          onClick={() => setHookText(h)}
                          className="px-3 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-semibold hover:bg-fuchsia-500/20 transition-colors"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={generateHookSuggestions} className="cc-btn cc-btn-ghost text-xs">
                  <Wand2 size={12} /> Generate hook ideas
                </button>
              </div>

              <div className="flex justify-between">
                <button onClick={() => goToStep('upload')} className="cc-btn cc-btn-ghost">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={() => goToStep('template')}
                  className="cc-btn cc-btn-primary !px-6"
                >
                  Choose Style <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'template' && (
          <div className="p-8 min-h-full">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Choose a Template</h2>
                <p className="text-gray-500 text-sm">Each template has unique AI styling, colors, and composition rules</p>
              </div>

              {TEMPLATE_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cat.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cat.ids.map((tid) => {
                      const t = THUMBNAIL_TEMPLATES[tid];
                      const isSelected = selectedTemplate === tid;
                      return (
                        <button
                          key={tid}
                          onClick={() => setSelectedTemplate(tid)}
                          className={`template-card ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black"
                                style={{ background: `linear-gradient(135deg, ${t.colorPalette[0]}, ${t.colorPalette[1]})` }}
                              >
                                <Layout size={16} className="text-white" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-bold text-sm text-white">{t.name}</h4>
                                <p className="text-gray-500 text-[11px]">{t.niche}</p>
                              </div>
                              {isSelected && (
                                <div className="ml-auto w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Check size={12} />
                                </div>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">{t.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Aspect Ratio */}
              <div className="pt-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layout size={12} /> Aspect Ratio
                </div>
                <div className="flex gap-2">
                  {(['16:9', '9:16', '1:1', '4:5', 'ORIGINAL'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setSelectedAspectRatio(ratio)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        selectedAspectRatio === ratio
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                          : 'bg-[#121212] text-gray-500 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {ratio === 'ORIGINAL' ? 'Original' : ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced: Custom Prompt */}
              <div className="pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 hover:text-gray-400 transition-colors"
                >
                  <Zap size={12} /> Advanced — Custom Prompt
                </button>
                {showAdvanced && (
                  <div className="mt-3">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add specific instructions for the AI... e.g. 'Make the background deep purple with gold sparkles'"
                      className="w-full px-4 py-3 rounded-xl bg-[#121212] border border-gray-800 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors resize-none h-24"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => goToStep('text')} className="cc-btn cc-btn-ghost">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="cc-btn cc-btn-primary !px-6"
                >
                  Generate <Sparkles size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'generate' && (
          <div className="flex items-center justify-center p-8 min-h-full">
            <div className="w-full max-w-md text-center space-y-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center mx-auto animate-pulse">
                  <Sparkles size={40} className="text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-black">{status.message || 'Processing...'}</h2>

                {status.stage !== 'error' && (
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  {status.stage === 'analyzing' && <>Analyzing composition & lighting</>}
                  {status.stage === 'generating' && <><Loader2 size={14} className="animate-spin" /> AI is generating</>}
                  {status.stage === 'enhancing' && <>Applying quality enhancements</>}
                  {status.stage === 'error' && (
                    <span className="text-red-400 flex items-center gap-2">
                      <AlertCircle size={14} /> {status.error}
                    </span>
                  )}
                </div>
              </div>

              {status.stage === 'error' && (
                <div className="flex gap-3 justify-center">
                  <button onClick={handleGenerate} className="cc-btn cc-btn-primary">
                    <RefreshCw size={13} /> Retry
                  </button>
                  <button onClick={() => goToStep('template')} className="cc-btn cc-btn-ghost">
                    Change Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="p-8 min-h-full">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Your Thumbnail</h2>
                <p className="text-gray-500 text-sm">AI generated using {THUMBNAIL_TEMPLATES[result.templateId]?.name || result.templateId} style</p>
              </div>

              {/* Main Result */}
              <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#121212] shadow-2xl">
                <div className="relative aspect-video bg-black">
                  <img src={result.imageDataUrl} alt="Generated thumbnail" className="w-full h-full object-contain" />
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 text-[10px] text-gray-400 font-mono border border-white/10">
                    {result.templateId}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    downloadThumbnail(result.imageDataUrl, `thumbnail-${result.templateId}-${Date.now()}.png`);
                  }}
                  className="cc-btn cc-btn-white !px-6"
                >
                  <Download size={14} /> Download
                </button>
                <button onClick={handleRegenerate} className="cc-btn cc-btn-primary">
                  <RefreshCw size={13} /> Regenerate
                </button>
                <button onClick={handleGenerateVariations} className="cc-btn cc-btn-ghost">
                  <Star size={13} /> Generate Variations
                </button>
                <button onClick={resetAll} className="cc-btn cc-btn-ghost">
                  <ArrowLeft size={13} /> Start Over
                </button>
              </div>

              {/* Mobile & Search Previews */}
              {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Desktop Feed</p>
                    <div className="rounded-lg overflow-hidden border border-gray-800" style={{ width: 320, height: 180 }}>
                      <img src={result.imageDataUrl} alt="Desktop preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Mobile Feed</p>
                    <div className="rounded-lg overflow-hidden border border-gray-800" style={{ width: 150, height: 84 }}>
                      <img src={result.imageDataUrl} alt="Mobile preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Search Result</p>
                    <div className="rounded-lg overflow-hidden border border-gray-800" style={{ width: 246, height: 138 }}>
                      <img src={result.imageDataUrl} alt="Search preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              )}

              {/* Variations */}
              {variations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400">Variations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {variations.map((v, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-gray-800 bg-[#121212]">
                        <div className="aspect-video bg-black">
                          <img src={v.imageDataUrl} alt={`Variation ${i + 1}`} className="w-full h-full object-contain" />
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Variation {i + 1}</span>
                          <button
                            onClick={() => downloadThumbnail(v.imageDataUrl, `thumbnail-v${i + 1}-${Date.now()}.png`)}
                            className="cc-btn cc-btn-ghost !px-2 !py-1 text-[10px]"
                          >
                            <Download size={10} /> Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt used */}
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer hover:text-gray-400 font-medium">Show prompt used</summary>
                <pre className="mt-2 p-4 rounded-xl bg-[#121212] border border-gray-800 text-gray-500 text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {result.promptUsed}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiThumbnailGenerator;
