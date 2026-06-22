/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SourceFile, PipelineStep, ProcessedResult, CollisionSettings } from './types';
import ImageUploader from './components/ImageUploader';
import PipelineBuilder from './components/PipelineBuilder';
import ProcessingQueue from './components/ProcessingQueue';
import VisualComparison from './components/VisualComparison';
import VideoSquisher from './components/VideoSquisher';
import { loadImage, processPipeline } from './components/ImageProcessingEngine';
import squisherLogo from './assets/images/squisher_logo_1781852280538.jpg';
import {
  Sparkles,
  Zap,
  Image as ImageIcon,
  FolderLock,
  Layers,
  HelpCircle,
  Video,
} from 'lucide-react';

export default function App() {
  const [files, setFiles] = React.useState<SourceFile[]>([]);
  const [steps, setSteps] = React.useState<PipelineStep[]>([]);
  const [results, setResults] = React.useState<ProcessedResult[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [selectedCompare, setSelectedCompare] = React.useState<ProcessedResult | null>(null);
  const [activeMode, setActiveMode] = React.useState<'image' | 'video'>('image');

  const [collisionSettings, setCollisionSettings] = React.useState<CollisionSettings>({
    behavior: 'auto-number',
    outputFolderName: 'Processed Images',
  });

  // Clean memory on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.originalUrl));
      results.forEach((r) => {
        if (r.processedUrl) {
          URL.revokeObjectURL(r.processedUrl);
        }
      });
    };
  }, []);

  const handleClearQueue = () => {
    results.forEach((r) => {
      if (r.processedUrl) {
        URL.revokeObjectURL(r.processedUrl);
      }
    });
    setResults([]);
  };

  // Main high-concurrency canvas pipeline executor
  const handleProcessAll = async () => {
    if (files.length === 0 || steps.length === 0 || processing) return;

    setProcessing(true);
    handleClearQueue(); // Clean up preceding runs

    // 1. Setup initial pending state array
    const initialResults = files.map((file) => {
      // Pre-compute modified name if conversion is active
      let targetName = file.name;
      const convertStep = steps.find((s) => s.enabled && s.type === 'convert');
      if (convertStep && convertStep.convertConfig) {
        const ext = convertStep.convertConfig.format; // 'webp' | 'png' | 'jpeg'
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        targetName = `${baseName}.${ext}`;
      }

      return {
        id: `res_${file.id}`,
        sourceId: file.id,
        name: targetName,
        originalSize: file.size,
        processedSize: 0,
        status: 'pending' as const,
      };
    });

    setResults(initialResults);

    // 2. Sequential execution to prevent canvas heap pressure & keep progressive progress UI smooth
    for (let i = 0; i < files.length; i++) {
      const source = files[i];

      // Mark file as active 'processing'
      setResults((prev) =>
        prev.map((r) => (r.sourceId === source.id ? { ...r, status: 'processing' } : r))
      );

      try {
        // Step A: Load source file bitmap
        const img = await loadImage(source.originalUrl);

        // Step B: Trigger custom sequential canvas matrix
        const outcome = await processPipeline(img, steps, source.type);

        // Step C: Form final resource URL
        const processedUrl = URL.createObjectURL(outcome.blob);

        let finalExtension = '';
        if (outcome.mimeType === 'image/webp') finalExtension = '.webp';
        else if (outcome.mimeType === 'image/jpeg') finalExtension = '.jpg';
        else if (outcome.mimeType === 'image/png') finalExtension = '.png';
        else if (outcome.mimeType === 'image/tiff') finalExtension = '.tiff';
        else if (outcome.mimeType === 'image/gif') finalExtension = '.gif';
        else if (outcome.mimeType === 'image/bmp') finalExtension = '.bmp';
        else if (outcome.mimeType === 'image/avif') finalExtension = '.avif';

        setResults((prev) =>
          prev.map((r) => {
            if (r.sourceId === source.id) {
              let finalName = r.name;
              if (finalExtension) {
                const lastDot = r.name.lastIndexOf('.');
                const baseName = lastDot !== -1 ? r.name.substring(0, lastDot) : r.name;
                finalName = `${baseName}${finalExtension}`;
              }

              return {
                ...r,
                name: finalName,
                processedSize: outcome.blob.size,
                status: 'success',
                processedUrl,
                blob: outcome.blob,
                mimeType: outcome.mimeType,
                width: outcome.width,
                height: outcome.height,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
              };
            }
            return r;
          })
        );
      } catch (err: any) {
        console.error(`Pipeline failure on file index ${i} (${source.name}):`, err);
        setResults((prev) =>
          prev.map((r) =>
            r.sourceId === source.id
              ? {
                  ...r,
                  status: 'failed',
                  error: err?.message || 'Encoding pipeline crashed',
                }
              : r
          )
        );
      }
    }

    setProcessing(false);
  };

  const handleRenameResult = (id: string, newName: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName } : r))
    );
  };

  const handleBulkRenameResults = (updates: { id: string; newName: string }[]) => {
    setResults((prev) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.newName]));
      return prev.map((r) => {
        if (updateMap.has(r.id)) {
          return { ...r, name: updateMap.get(r.id)! };
        }
        return r;
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 antialiased font-sans pb-12">
      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-850 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.25)] overflow-hidden shrink-0">
              <img 
                src={squisherLogo} 
                alt="Squisher Icon" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                Squisher
                <span className="text-[9px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                  Media Engine
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Slick offline client-side batch media squeezing, custom cropping, filters & optimization
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 text-xs font-semibold text-slate-400 w-full md:w-auto">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
              <span>Offline Sandboxed Engine</span>
            </div>
            <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Unlimited Bulk Squeezing</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        
        {/* Futuristic Mode Selector */}
        <div id="mode-selector-bar" className="flex items-center justify-center p-1.5 bg-slate-950 border border-slate-850/80 rounded-2xl max-w-xs sm:max-w-sm mx-auto mb-8 shadow-xl">
          <button
            id="toggle-image-mode-btn"
            onClick={() => setActiveMode('image')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMode === 'image'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 shadow-inner'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Images
          </button>
          <button
            id="toggle-video-mode-btn"
            onClick={() => setActiveMode('video')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMode === 'video'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 shadow-inner'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Video className="h-4 w-4" />
            Videos
          </button>
        </div>

        {activeMode === 'image' ? (
          <>
            {/* Intro Tip banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 flex gap-3.5 text-xs leading-relaxed text-slate-300 shadow-xl">
              <HelpCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Sleek Pipeline Blueprint:</span> Load one or many images/folders below, add sequential canvas nodes (such as Center-Anchor crop, percentage scale, and hyper-optimized WebP translation), hit <span className="text-cyan-400 font-bold">Run Pipeline</span>, then inspect comparing side-by-side!
              </div>
            </div>

            {/* 3 Column Desktop Layout, Stacked mobile */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              {/* Column 1: Upload (4 cols) */}
              <section className="xl:col-span-4 flex flex-col h-full min-h-[500px]">
                <ImageUploader
                  files={files}
                  setFiles={setFiles}
                  collisionSettings={collisionSettings}
                  setCollisionSettings={setCollisionSettings}
                />
              </section>

              {/* Column 2: Pipeline Configurer (4 cols) */}
              <section className="xl:col-span-4 flex flex-col h-full min-h-[500px]">
                <PipelineBuilder
                  steps={steps}
                  setSteps={setSteps}
                  onProcessAll={handleProcessAll}
                  processing={processing}
                  hasFiles={files.length > 0}
                />
              </section>

              {/* Column 3: Processing & Downloads Console (4 cols) */}
              <section className="xl:col-span-4 flex flex-col h-full min-h-[500px]">
                <ProcessingQueue
                  results={results}
                  totalCount={files.length}
                  processing={processing}
                  onClearQueue={handleClearQueue}
                  collisionSettings={collisionSettings}
                  files={files}
                  onSelectResultForCompare={setSelectedCompare}
                  onRenameResult={handleRenameResult}
                  onBulkRename={handleBulkRenameResults}
                />
              </section>
            </div>
          </>
        ) : (
          <div className="animate-fade-in w-full">
            {/* Intro Tip banner for Video */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 flex gap-3.5 text-xs leading-relaxed text-slate-300 shadow-xl">
              <HelpCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Instantly Squeeze Cinematic Videos:</span> Upload a video clip, trim timeline handles, adjust target bitrate or frame rates, customize crop formats or text overlays, apply contrast presets, and squish completely offline!
              </div>
            </div>

            <VideoSquisher />
          </div>
        )}
      </main>

      {/* Dynamic Slide comparison container */}
      <VisualComparison
        result={selectedCompare}
        files={files}
        onClose={() => setSelectedCompare(null)}
      />
    </div>
  );
}
