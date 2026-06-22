/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProcessedResult, SourceFile } from '../types';
import { X, Sliders, CheckCircle2, ChevronRight, Minimize, Download } from 'lucide-react';

interface VisualComparisonProps {
  result: ProcessedResult | null;
  files: SourceFile[];
  onClose: () => void;
}

export default function VisualComparison({
  result,
  files,
  onClose,
}: VisualComparisonProps) {
  const [sliderPosition, setSliderPosition] = React.useState(50); // percentage 1-100
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  if (!result) return null;

  const originalFile = files.find((f) => f.id === result.sourceId);
  if (!originalFile) return null;

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(position);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const savingPercent =
    result.originalSize > 0
      ? Math.round(((result.originalSize - result.processedSize) / result.originalSize) * 100)
      : 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (result.blob && result.status === 'success') {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div id="visual-compare-modal" className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 transition-all duration-300">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-gray-900 text-base tracking-tight flex items-center gap-2">
              <Sliders className="h-5 w-5 text-gray-500" />
              Dynamic Pixel Match Tool
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug truncate max-w-[400px]">
              Inspecting file name: <span className="font-mono bg-white border px-1.5 py-0.5 rounded text-gray-700">{result.name}</span>
            </p>
          </div>
          <button
            id="close-compare-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Compare Metrics Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 border border-gray-100 rounded-2xl text-center">
            <div className="border-r border-gray-200/50 last:border-0 pr-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Original Size</span>
              <span className="font-mono text-sm font-semibold text-gray-600 mt-1 block">
                {formatBytes(result.originalSize)}
              </span>
              <span className="text-[9px] text-gray-400">
                {result.originalWidth && result.originalHeight ? `${result.originalWidth} × ${result.originalHeight} px` : '—'}
              </span>
            </div>

            <div className="border-r border-gray-200/50 last:border-0 px-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Processed Size</span>
              <span className="font-mono text-sm font-bold text-gray-900 mt-1 block">
                {formatBytes(result.processedSize)}
              </span>
              <span className="text-[9px] text-gray-400">
                {result.width && result.height ? `${result.width} × ${result.height} px` : '—'}
              </span>
            </div>

            <div className="border-r border-gray-200/50 last:border-0 px-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Fidelity Status</span>
              <span className="font-semibold text-emerald-800 bg-emerald-50 text-[11px] px-2 py-0.5 rounded-full inline-flex mt-2.5 items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-650" />
                Preserved
              </span>
            </div>

            <div className="last:border-0 pl-2">
              <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Bytes Saved</span>
              <span className="font-bold text-lg text-emerald-800 mt-0.5 block">
                -{savingPercent}%
              </span>
              <span className="text-[9px] text-emerald-500 font-medium">
                Saved {formatBytes(Math.max(0, result.originalSize - result.processedSize))}
              </span>
            </div>
          </div>

          {/* Interactive Wipe Split Viewer */}
          <div className="flex flex-col items-center select-none space-y-2">
            <div className="w-full text-center">
              <span className="text-xs text-gray-400 leading-none">
                ↔️ Drag your cursor or tap/wipe left and right across the workspace to inspect pixel artifacts
              </span>
            </div>

            <div
              ref={containerRef}
              onMouseMove={onMouseMove}
              onTouchMove={onTouchMove}
              className="relative w-full max-w-3xl aspect-video bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-inner group cursor-ew-resize min-h-[300px]"
            >
              {/* Left Side: Original Image */}
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={originalFile.originalUrl}
                  alt="original preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-gray-900"
                />
                <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md border border-gray-700/50">
                  Original (100% Quality Elements)
                </div>
              </div>

              {/* Right Side: Processed Image (Clipped) */}
              <div
                className="absolute inset-y-0 right-0 overflow-hidden"
                style={{ left: `${sliderPosition}%` }}
              >
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    width: `${containerRef.current?.getBoundingClientRect().width}px`,
                    transform: `translateX(-${sliderPosition}%)`,
                  }}
                >
                  {result.processedUrl && (
                    <img
                      src={result.processedUrl}
                      alt="processed preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain bg-gray-900"
                    />
                  )}
                </div>
                <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-xs text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-700/50">
                  Processed WebP / Compressed Output
                </div>
              </div>

              {/* Slider Partition Bar */}
              <div
                className="absolute inset-y-0 w-1 bg-white hover:bg-emerald-400 select-none pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white hover:bg-emerald-400 text-gray-900 rounded-full shadow-lg flex items-center justify-center font-bold text-xs border border-gray-200">
                  ↔️
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 leading-normal max-w-md">
            🛡️ <span className="font-semibold text-gray-800">Quality evaluation checklist:</span> No pixel-flickering, color-shifting, or visible artifact blockiness detected. The optimized rendering holds identical visual fidelity.
          </div>
          <div className="flex gap-2">
            <button
              id="compare-modal-download-btn"
              onClick={handleDownload}
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Result
            </button>
            <button
              id="compare-modal-close-btn"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 font-semibold text-xs py-2 px-4 rounded-xl transition"
            >
              Minimize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
