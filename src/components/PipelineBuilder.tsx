/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  PipelineStep,
  StepType,
  CropAnchor,
  AspectRatioType,
  CropStepConfig,
  ResizeStepConfig,
  ConvertStepConfig,
  CompressStepConfig,
  RotateStepConfig,
  RemoveBgStepConfig,
} from '../types';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Settings,
  Crop,
  Maximize2,
  FileImage,
  Percent,
  Play,
  RotateCcw,
  Check,
  Eye,
  ChevronsUpDown,
} from 'lucide-react';

interface PipelineBuilderProps {
  steps: PipelineStep[];
  setSteps: React.Dispatch<React.SetStateAction<PipelineStep[]>>;
  onProcessAll: () => void;
  processing: boolean;
  hasFiles: boolean;
}

const DEFAULT_CROP: CropStepConfig = {
  mode: 'ratio',
  aspectRatio: '1:1',
  customRatioX: 4,
  customRatioY: 3,
  width: 800,
  height: 600,
  percentage: 80,
  anchor: 'center',
};

const DEFAULT_RESIZE: ResizeStepConfig = {
  mode: 'percentage',
  percentage: 50,
  longestSide: 1200,
  width: 1920,
  height: 1080,
  keepAspectRatio: true,
};

const DEFAULT_CONVERT: ConvertStepConfig = {
  format: 'webp',
  webpQuality: 75,
  jpgQuality: 85,
};

const DEFAULT_COMPRESS: CompressStepConfig = {
  quality: 80,
  reduceResolutionPercentage: 0,
};

const DEFAULT_ROTATE: RotateStepConfig = {
  angle: 90,
};

const DEFAULT_REMOVE_BG: RemoveBgStepConfig = {
  method: 'ai-dominant',
  chromaColor: '#10b981', // emerald green chroma key defaults
  tolerance: 30,
  feather: 4,
  decontaminate: true,
  replacementType: 'transparent',
  replaceSolidColor: '#ffffff',
  replaceGradientStart: '#3b82f6',
  replaceGradientEnd: '#8b5cf6',
};

export default function PipelineBuilder({
  steps,
  setSteps,
  onProcessAll,
  processing,
  hasFiles,
}: PipelineBuilderProps) {
  const [activeStepId, setActiveStepId] = React.useState<string | null>(null);

  const addStep = (type: StepType) => {
    const id = `${type}_${Date.now()}`;
    const newStep: PipelineStep = {
      id,
      type,
      enabled: true,
      cropConfig: type === 'crop' ? { ...DEFAULT_CROP } : undefined,
      resizeConfig: type === 'resize' ? { ...DEFAULT_RESIZE } : undefined,
      convertConfig: type === 'convert' ? { ...DEFAULT_CONVERT } : undefined,
      compressConfig: type === 'compress' ? { ...DEFAULT_COMPRESS } : undefined,
      rotateConfig: type === 'rotate' ? { ...DEFAULT_ROTATE } : undefined,
      removeBgConfig: type === 'remove-bg' ? { ...DEFAULT_REMOVE_BG } : undefined,
    };
    setSteps((prev) => [...prev, newStep]);
    setActiveStepId(id);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (activeStepId === id) setActiveStepId(null);
  };

  const toggleStepEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;

    // Swap
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps);
  };

  const updateCropConfig = (id: string, updates: Partial<CropStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              cropConfig: { ...(s.cropConfig || DEFAULT_CROP), ...updates },
            }
          : s
      )
    );
  };

  const updateResizeConfig = (id: string, updates: Partial<ResizeStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              resizeConfig: { ...(s.resizeConfig || DEFAULT_RESIZE), ...updates },
            }
          : s
      )
    );
  };

  const updateConvertConfig = (id: string, updates: Partial<ConvertStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              convertConfig: { ...(s.convertConfig || DEFAULT_CONVERT), ...updates },
            }
          : s
      )
    );
  };

  const updateCompressConfig = (id: string, updates: Partial<CompressStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              compressConfig: { ...(s.compressConfig || DEFAULT_COMPRESS), ...updates },
            }
          : s
      )
    );
  };

  const updateRotateConfig = (id: string, updates: Partial<RotateStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              rotateConfig: { ...(s.rotateConfig || DEFAULT_ROTATE), ...updates },
            }
          : s
      )
    );
  };

  const updateRemoveBgConfig = (id: string, updates: Partial<RemoveBgStepConfig>) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              removeBgConfig: { ...(s.removeBgConfig || DEFAULT_REMOVE_BG), ...updates },
            }
          : s
      )
    );
  };

  const getStepIcon = (type: StepType) => {
    switch (type) {
      case 'crop':
        return <Crop className="h-5 w-5 text-amber-500" />;
      case 'resize':
        return <Maximize2 className="h-5 w-5 text-sky-500" />;
      case 'rotate':
        return <RotateCcw className="h-5 w-5 text-cyan-500" />;
      case 'convert':
        return <FileImage className="h-5 w-5 text-emerald-500" />;
      case 'compress':
        return <Percent className="h-5 w-5 text-fuchsia-500" />;
      case 'remove-bg':
        return <Eye className="h-5 w-5 text-purple-400 animate-pulse" />;
    }
  };

  const getStepTitle = (step: PipelineStep) => {
    switch (step.type) {
      case 'crop':
        return `Smart Crop (${step.cropConfig?.mode || 'Ratio'})`;
      case 'resize':
        return `Resize (${step.resizeConfig?.mode || 'Percentage'})`;
      case 'rotate':
        return `Orient / Rotate (${step.rotateConfig?.angle || 90}°)`;
      case 'convert':
        return `Convert to ${step.convertConfig?.format.toUpperCase() || 'WEBP'}`;
      case 'compress':
        return `Compress (${step.compressConfig?.quality || 80}% Quality)`;
      case 'remove-bg':
        return `Background Remover (${step.removeBgConfig?.method === 'ai-dominant' ? 'AI Dominant' : step.removeBgConfig?.method === 'chroma-key' ? 'Chroma Key' : step.removeBgConfig?.method === 'border-bleed' ? 'Border Bleed' : 'Luminance'})`;
    }
  };

  return (
    <div id="pipeline-builder-container" className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Settings className="h-4 w-4 text-cyan-400" />
            Processing Pipeline
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure step-by-step canvas operations applied in order
          </p>
        </div>
        {steps.length > 0 && (
          <button
            id="reset-pipeline-btn"
            onClick={() => setSteps([])}
            className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1 bg-slate-950 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* Grid of Add Step Buttons */}
      <div id="add-step-triggers" className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {[
          { type: 'crop', label: 'Crop', icon: <Crop className="h-4 w-4" />, bg: 'hover:bg-amber-955/20 text-amber-400 hover:border-amber-500/30' },
          { type: 'resize', label: 'Resize', icon: <Maximize2 className="h-4 w-4" />, bg: 'hover:bg-sky-955/20 text-sky-400 hover:border-sky-500/30' },
          { type: 'rotate', label: 'Orient', icon: <RotateCcw className="h-4 w-4 text-cyan-400" />, bg: 'hover:bg-cyan-955/20 text-cyan-400 hover:border-cyan-500/30' },
          { type: 'convert', label: 'Convert', icon: <FileImage className="h-4 w-4 animate-pulse-slow" />, bg: 'hover:bg-emerald-955/20 text-emerald-400 hover:border-emerald-500/30' },
          { type: 'compress', label: 'Compress', icon: <Percent className="h-4 w-4" />, bg: 'hover:bg-fuchsia-955/20 text-fuchsia-400 hover:border-fuchsia-500/30' },
          { type: 'remove-bg', label: 'BG Remove', icon: <Eye className="h-4 w-4 text-purple-400" />, bg: 'hover:bg-purple-955/20 text-purple-400 hover:border-purple-500/30' },
        ].map((item) => (
          <button
            key={item.type}
            id={`add-step-${item.type}`}
            onClick={() => addStep(item.type as StepType)}
            className={`flex flex-col items-center justify-center py-2.5 px-1 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 hover:bg-slate-900/80 text-[11px] font-semibold transition cursor-pointer gap-1.5 ${item.bg}`}
          >
            <div className="p-1 rounded-full bg-slate-900 shadow-xs border border-slate-800">
              {item.icon}
            </div>
            {item.label}
          </button>
        ))}
      </div>

      {/* Pipeline Steps List */}
      <div id="pipeline-list" className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px] max-h-[480px]">
        {steps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <Settings className="h-8 w-8 text-slate-705 text-slate-700 stroke-[1.5] mb-2 animate-pulse" />
            <p className="text-xs font-semibold text-slate-400">No steps in pipeline</p>
            <p className="text-[11px] text-slate-550 mt-1 max-w-[200px] text-slate-500 font-medium">
              Add a Crop, Resize, Rotation, Convert, Compress, or BG Remover step above.
            </p>
          </div>
        ) : (
          steps.map((step, idx) => {
            const isActive = activeStepId === step.id;
            return (
              <div
                key={step.id}
                id={`step-${step.id}`}
                className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'border-cyan-500/50 bg-slate-900 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : step.enabled
                    ? 'border-slate-800 bg-slate-950/45 hover:bg-slate-900 hover:border-slate-800'
                    : 'border-slate-850 bg-slate-950/10 opacity-50'
                }`}
              >
                {/* Header Row */}
                <div
                  id={`step-header-${step.id}`}
                  onClick={() => setActiveStepId(isActive ? null : step.id)}
                  className="flex items-center justify-between p-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <button
                      id={`toggle-step-btn-${step.id}`}
                      onClick={(e) => toggleStepEnabled(step.id, e)}
                      title={step.enabled ? 'Disable Step' : 'Enable Step'}
                      className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                        step.enabled
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold'
                          : 'bg-transparent border-slate-700 text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-2">
                      {getStepIcon(step.type)}
                      <span className={`text-xs font-semibold ${step.enabled ? 'text-slate-100' : 'text-slate-500 line-through'}`}>
                        {getStepTitle(step)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Navigation Buttons for Pipeline Reordering */}
                    <button
                      id={`move-up-btn-${step.id}`}
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, 'up')}
                      className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Step Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`move-down-btn-${step.id}`}
                      disabled={idx === steps.length - 1}
                      onClick={() => moveStep(idx, 'down')}
                      className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Step Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>
                    <button
                      id={`delete-step-btn-${step.id}`}
                      onClick={() => removeStep(step.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition duration-150 cursor-pointer"
                      title="Delete Step"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-550 ml-1 cursor-pointer font-bold" />
                  </div>
                </div>

                 {/* Sub-config body */}
                {isActive && (
                  <div id={`step-body-${step.id}`} className="p-3.5 border-t border-slate-800 bg-slate-900/40 space-y-4 text-xs">
                    {/* 1. CROP STEP CONFIGURATION */}
                    {step.type === 'crop' && step.cropConfig && (
                      <div className="space-y-3.5 animate-fade-in">
                        <div className="flex gap-2 bg-slate-950/60 p-1 rounded-lg border border-slate-850">
                          {['ratio', 'pixels', 'percentage'].map((m) => (
                            <button
                              key={m}
                              id={`crop-mode-${m}`}
                              onClick={() => updateCropConfig(step.id, { mode: m as any })}
                              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center capitalize transition cursor-pointer ${
                                step.cropConfig?.mode === m
                                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        {/* Ratio Mode */}
                        {step.cropConfig.mode === 'ratio' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aspect Ratio Selection</label>
                            <div className="grid grid-cols-3 gap-1">
                              {['1:1', '4:3', '16:9', '3:2', '2:3', 'custom'].map((r) => (
                                <button
                                  key={r}
                                  id={`crop-ratio-${r}`}
                                  onClick={() => updateCropConfig(step.id, { aspectRatio: r as AspectRatioType })}
                                  className={`py-1.5 border rounded-md transition font-semibold text-[11px] cursor-pointer ${
                                    step.cropConfig?.aspectRatio === r
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {r === 'custom' ? 'Custom' : r}
                                </button>
                              ))}
                            </div>

                            {step.cropConfig.aspectRatio === 'custom' && (
                              <div className="flex items-center gap-2 mt-1.5 bg-slate-950/80 p-2.5 rounded-lg border border-slate-850">
                                <span className="text-slate-500">Ratio X:</span>
                                <input
                                  type="number"
                                  id="crop-ratio-x"
                                  value={step.cropConfig.customRatioX}
                                  min={1}
                                  onChange={(e) => updateCropConfig(step.id, { customRatioX: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 text-slate-200 rounded text-center focus:outline-hidden focus:border-amber-500"
                                />
                                <span className="text-slate-550">:</span>
                                <span className="text-slate-500">Y:</span>
                                <input
                                  type="number"
                                  id="crop-ratio-y"
                                  value={step.cropConfig.customRatioY}
                                  min={1}
                                  onChange={(e) => updateCropConfig(step.id, { customRatioY: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 text-slate-200 rounded text-center focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pixel Mode */}
                        {step.cropConfig.mode === 'pixels' && (
                          <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-505 text-slate-500 font-semibold uppercase tracking-wider block">Width (px)</label>
                              <input
                                type="number"
                                id="crop-width"
                                value={step.cropConfig.width}
                                min={1}
                                onChange={(e) => updateCropConfig(step.id, { width: Math.max(1, parseInt(e.target.value) || 100) })}
                                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded focus:outline-hidden focus:border-amber-500 text-slate-250 font-mono mt-1"
                              />
                            </div>
                            <span className="text-amber-500 font-bold self-end mb-1 text-sm">×</span>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-505 text-slate-500 font-semibold uppercase tracking-wider block">Height (px)</label>
                              <input
                                type="number"
                                id="crop-height"
                                value={step.cropConfig.height}
                                min={1}
                                onChange={(e) => updateCropConfig(step.id, { height: Math.max(1, parseInt(e.target.value) || 100) })}
                                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded focus:outline-hidden focus:border-amber-500 text-slate-250 font-mono mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* Percentage Mode */}
                        {step.cropConfig.mode === 'percentage' && (
                          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold">% of original size</span>
                              <span className="text-amber-400 font-bold font-mono text-xs">{step.cropConfig.percentage}%</span>
                            </div>
                            <input
                              type="range"
                              id="crop-pct-slider"
                              min={10}
                              max={99}
                              value={step.cropConfig.percentage}
                              onChange={(e) => updateCropConfig(step.id, { percentage: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                        )}

                        {/* 3x3 Crop Anchor Grid */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Bulk Crop Origin (Anchor)
                          </label>
                          <div className="flex gap-4 items-center">
                            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-lg w-28 h-28 border border-slate-850 shrink-0">
                              {(
                                [
                                  ['top-left', '↖️'],
                                  ['top', '⬆️'],
                                  ['top-right', '↗️'],
                                  ['left', '⬅️'],
                                  ['center', '🟢'],
                                  ['right', '➡️'],
                                  ['bottom-left', '↙️'],
                                  ['bottom', '⬇️'],
                                  ['bottom-right', '↘️'],
                                ] as [CropAnchor, string][]
                              ).map(([pos, emoji]) => {
                                const selected = step.cropConfig?.anchor === pos;
                                return (
                                  <button
                                    key={pos}
                                    id={`anchor-${pos}`}
                                    title={`Anchor: ${pos}`}
                                    onClick={() => updateCropConfig(step.id, { anchor: pos })}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition border ${
                                      selected
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                                        : 'bg-transparent border-slate-800 hover:bg-slate-900 text-slate-600'
                                    }`}
                                  >
                                    <span className="text-[9px]">{selected ? '●' : '○'}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex-1 text-[11px] text-slate-400 space-y-1">
                              <p className="font-bold text-slate-200 capitalize text-xs">
                                Selected: {step.cropConfig.anchor.replace('-', ' ')}
                              </p>
                              <p className="leading-relaxed text-slate-500">
                                This anchor ensures consistent automated cropping position across all files in the batch.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. RESIZE STEP CONFIGURATION */}
                    {step.type === 'resize' && step.resizeConfig && (
                      <div className="space-y-3.5 animate-fade-in">
                        <div className="flex gap-2 bg-slate-950/60 p-1 rounded-lg border border-slate-850">
                          {['percentage', 'longest-side', 'pixels'].map((m) => (
                            <button
                              key={m}
                              id={`resize-mode-${m}`}
                              onClick={() => updateResizeConfig(step.id, { mode: m as any })}
                              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center capitalize transition cursor-pointer ${
                                step.resizeConfig?.mode === m
                                  ? 'bg-slate-800 text-sky-400'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {m === 'longest-side' ? 'Longest Side' : m}
                            </button>
                          ))}
                        </div>

                        {/* Mode Percentage */}
                        {step.resizeConfig.mode === 'percentage' && (
                          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold font-bold">Resize Scaling Factor</span>
                              <span className="text-sky-450 text-sky-400 font-semibold font-mono">{step.resizeConfig.percentage}%</span>
                            </div>
                            <input
                              type="range"
                              id="resize-pct-slider"
                              min={10}
                              max={200}
                              value={step.resizeConfig.percentage}
                              onChange={(e) => updateResizeConfig(step.id, { percentage: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-805 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                            />
                          </div>
                        )}

                        {/* Mode Longest Side */}
                        {step.resizeConfig.mode === 'longest-side' && (
                          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Max Longest Side (px)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                id="resize-longest"
                                value={step.resizeConfig.longestSide}
                                min={50}
                                max={10000}
                                onChange={(e) => updateResizeConfig(step.id, { longestSide: Math.max(50, parseInt(e.target.value) || 1200) })}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded font-mono text-xs focus:outline-hidden focus:border-sky-400"
                              />
                              <span className="text-[10px] text-slate-500 shrink-0 font-medium">Auto Ratio</span>
                            </div>
                          </div>
                        )}

                        {/* Mode Pixels */}
                        {step.resizeConfig.mode === 'pixels' && (
                          <div className="bg-slate-950/65 p-3 rounded-xl border border-slate-850 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Target Width (px)</label>
                                <input
                                  type="number"
                                  id="resize-width"
                                  value={step.resizeConfig.width}
                                  min={1}
                                  onChange={(e) => updateResizeConfig(step.id, { width: Math.max(1, parseInt(e.target.value) || 800) })}
                                  className="w-full px-2.5 py-1 mt-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono focus:outline-hidden focus:border-sky-400"
                                />
                              </div>
                              <span className="text-slate-650 font-bold self-end mb-1.5 text-xs">×</span>
                              <div className="flex-1">
                                <label className="text-[10px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider block">Target Height (px)</label>
                                <input
                                  type="number"
                                  id="resize-height"
                                  value={step.resizeConfig.height}
                                  min={1}
                                  onChange={(e) => updateResizeConfig(step.id, { height: Math.max(1, parseInt(e.target.value) || 600) })}
                                  className="w-full px-2.5 py-1 mt-1 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono focus:outline-hidden focus:border-sky-400"
                                />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                id="resize-lock-aspect"
                                checked={step.resizeConfig.keepAspectRatio}
                                onChange={(e) => updateResizeConfig(step.id, { keepAspectRatio: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-sky-505 text-sky-500 focus:ring-sky-505/30"
                              />
                              <span>Maintain original proportions (aspect ratio auto-scaled)</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. FORMAT CONVERT CONFIGURE */}
                    {step.type === 'convert' && step.convertConfig && (
                      <div className="space-y-3.5 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Export Format</label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                            {(['webp', 'png', 'jpeg', 'tiff', 'gif', 'bmp', 'avif'] as const).map((fmt) => (
                              <button
                                key={fmt}
                                id={`convert-format-${fmt}`}
                                onClick={() => updateConvertConfig(step.id, { format: fmt })}
                                className={`py-1.5 px-2 border rounded-md font-bold text-[10px] uppercase tracking-wider text-center transition cursor-pointer ${
                                  step.convertConfig?.format === fmt
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                    : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:bg-slate-900'
                                }`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {step.convertConfig.format === 'webp' && (
                          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                WebP Visual Compression
                              </span>
                              <span className="text-emerald-405 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                {step.convertConfig.webpQuality}%
                              </span>
                            </div>
                            <input
                              type="range"
                              id="convert-webp-slider"
                              min={10}
                              max={98}
                              value={step.convertConfig.webpQuality}
                              onChange={(e) => updateConvertConfig(step.id, { webpQuality: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[10px] text-emerald-500/85 mt-1 leading-relaxed italic font-medium">
                              {step.convertConfig.webpQuality <= 45
                                ? '⚠️ Hyper-aggressive (extremely small size, some detail degradation)'
                                : step.convertConfig.webpQuality <= 76
                                ? '✨ Recommended Sweetspot (visually identical to original, optimal compression)'
                                : '👑 Master Quality (near-original format density, lower savings)'}
                            </p>
                          </div>
                        )}

                        {step.convertConfig.format === 'jpeg' && (
                          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold">JPEG Export Quality</span>
                              <span className="text-slate-300 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono">
                                {step.convertConfig.jpgQuality}%
                              </span>
                            </div>
                            <input
                              type="range"
                              id="convert-jpg-slider"
                              min={10}
                              max={100}
                              value={step.convertConfig.jpgQuality}
                              onChange={(e) => updateConvertConfig(step.id, { jpgQuality: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                            />
                          </div>
                        )}

                        {step.convertConfig.format === 'png' && (
                          <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/30 text-emerald-400 leading-normal text-[11px] font-semibold font-semibold">
                            PNG is a lossless format. Dimensions and transparent pixel levels are perfectly preserved.
                          </div>
                        )}

                        {step.convertConfig.format === 'tiff' && (
                          <div className="bg-cyan-950/25 p-3 rounded-xl border border-cyan-500/20 text-cyan-400 leading-normal text-[11px] font-semibold space-y-1">
                            <p className="font-bold text-cyan-300 flex items-center gap-1.5">🖼️ TIFF: Archival High-Fidelity & Publishing</p>
                            <p className="text-slate-400 font-normal leading-relaxed">
                              Converts image to fully uncompressed 32-bit RGBA TIFF utilizing Squisher's custom high-optimized client-side encoder. Retains perfect master print quality with transparent alpha mapping. Recommended for professional publishers or original archiving.
                            </p>
                          </div>
                        )}

                        {step.convertConfig.format === 'gif' && (
                          <div className="bg-amber-950/25 p-3 rounded-xl border border-amber-500/20 text-amber-450 text-amber-400 leading-normal text-[11px] font-semibold space-y-1">
                            <p className="font-bold text-amber-305 text-amber-350 flex items-center gap-1.5">🎨 GIF: Graphics Interchange Format</p>
                            <p className="text-slate-400 font-normal leading-relaxed">
                              Generates lossless indexed color frames. Standard, highly portable image standard optimized for graphic designs, vector art, and simple pixel-perfect assets.
                            </p>
                          </div>
                        )}

                        {step.convertConfig.format === 'bmp' && (
                          <div className="bg-blue-950/25 p-3 rounded-xl border border-blue-500/20 text-blue-450 leading-normal text-[11px] font-semibold space-y-1">
                            <p className="font-bold text-blue-300 flex items-center gap-1.5">💽 BMP: Windows Bitmap Format</p>
                            <p className="text-slate-400 font-normal leading-relaxed">
                              Renders uncompressed pixel raster streams. Natively readable across all legacy and modern OS devices, offering zero compression artifacts and immediate rendering speeds.
                            </p>
                          </div>
                        )}

                        {step.convertConfig.format === 'avif' && (
                          <div className="bg-fuchsia-950/25 p-3 rounded-xl border border-fuchsia-500/20 text-fuchsia-400 leading-normal text-[11px] font-semibold space-y-1">
                            <p className="font-bold text-fuchsia-300 flex items-center gap-1.5">🚀 AVIF: Next-Gen Media Compression</p>
                            <p className="text-slate-400 font-normal leading-relaxed">
                              Employs cutting-edge AV1 video frame compression. Achieves up to 50% smaller sizes than standard JPEGs while keeping rich image fidelity, clean boundaries, and modern HDR range capabilities.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. COMPRESS STEP CONFIGURATION */}
                    {step.type === 'compress' && step.compressConfig && (
                      <div className="space-y-3.5 animate-fade-in">
                        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-450 text-slate-400 font-medium">Quality Tag Constraint</span>
                            <span className="text-fuchsia-400 font-semibold font-mono">{step.compressConfig.quality}%</span>
                          </div>
                          <input
                            type="range"
                            id="compress-quality-slider"
                            min={10}
                            max={98}
                            value={step.compressConfig.quality}
                            onChange={(e) => updateCompressConfig(step.id, { quality: parseInt(e.target.value) })}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                          />
                        </div>

                        <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-450 text-slate-400 font-semibold">Optional Resolution Down-scale</span>
                            <span className="text-fuchsia-400 font-bold font-mono">
                              {step.compressConfig.reduceResolutionPercentage === 0
                                ? 'No Change (Keep Resolution)'
                                : `-${step.compressConfig.reduceResolutionPercentage}%`}
                            </span>
                          </div>
                          <input
                            type="range"
                            id="compress-res-slider"
                            min={0}
                            max={80}
                            step={5}
                            value={step.compressConfig.reduceResolutionPercentage}
                            onChange={(e) => updateCompressConfig(step.id, { reduceResolutionPercentage: parseInt(e.target.value) })}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                          />
                          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                            Shrinks width and height coordinates proportionally to yield optimized web payloads.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 5. ROTATE STEP CONFIGURATION */}
                    {step.type === 'rotate' && step.rotateConfig && (
                      <div className="space-y-3.5 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relative Media Rotation</label>
                          <div className="flex gap-1.5">
                            {([90, 180, 270] as const).map((angle) => (
                              <button
                                key={angle}
                                id={`rotate-angle-${angle}`}
                                onClick={() => updateRotateConfig(step.id, { angle })}
                                className={`flex-1 py-1.5 px-2.5 border rounded-lg font-bold text-[11px] uppercase tracking-wider text-center transition cursor-pointer ${
                                  step.rotateConfig?.angle === angle
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                    : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:bg-slate-900'
                                }`}
                              >
                                Rotate {angle}°
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-505 leading-normal italic mt-2 text-slate-500 font-medium">
                            Rotates the canvas coordinates relative to orientation. Rotating by 90° or 270° swaps aspect width and height.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 6. BACKGROUND REMOVAL STEP CONFIGURATION */}
                    {step.type === 'remove-bg' && step.removeBgConfig && (
                      <div className="space-y-4 animate-fade-in text-xs">
                        {/* Method Selection */}
                        <div className="space-y-1.5 font-sans">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intelligent Keyer Method</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'ai-dominant', label: 'AI Dominant', desc: 'Auto-maps borders' },
                              { id: 'chroma-key', label: 'Chroma Studio', desc: 'Studio greenscreen' },
                              { id: 'border-bleed', label: 'Bleed Corner', desc: 'Top-left corner' },
                              { id: 'luminance', label: 'Luminance', desc: 'Hot-spots cutout' },
                            ].map((met) => (
                              <button
                                key={met.id}
                                id={`bg-method-${met.id}`}
                                onClick={() => updateRemoveBgConfig(step.id, { method: met.id as any })}
                                className={`py-2 px-2.5 border rounded-lg text-left transition cursor-pointer flex flex-col gap-0.5 ${
                                  step.removeBgConfig?.method === met.id
                                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                                    : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:bg-slate-900'
                                }`}
                              >
                                <span className="font-bold text-[11px] uppercase tracking-wide">{met.label}</span>
                                <span className="text-[9px] text-slate-500 font-medium leading-tight">{met.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Chroma Specific Options */}
                        {step.removeBgConfig.method === 'chroma-key' && (
                          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 space-y-2.5 animate-fade-in">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Studio color</label>
                            
                            {/* Color presets list */}
                            <div className="flex gap-1.5">
                              {[
                                { color: '#10b981', label: 'Green' },
                                { color: '#3b82f6', label: 'Blue' },
                                { color: '#000000', label: 'Black' },
                                { color: '#ffffff', label: 'White' },
                              ].map((item) => (
                                <button
                                  key={item.color}
                                  id={`chroma-preset-${item.label}`}
                                  onClick={() => updateRemoveBgConfig(step.id, { chromaColor: item.color })}
                                  className={`flex-1 py-1 px-1 border rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                                    step.removeBgConfig?.chromaColor === item.color
                                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="hidden sm:inline">{item.label}</span>
                                </button>
                              ))}
                            </div>

                            {/* Color Picker Input Row */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-550 font-bold">Custom Eye-Dropper:</span>
                              <input
                                type="color"
                                id="chroma-picker"
                                value={step.removeBgConfig.chromaColor}
                                onChange={(e) => updateRemoveBgConfig(step.id, { chromaColor: e.target.value })}
                                className="w-8 h-6 bg-transparent border border-slate-800 rounded cursor-pointer animate-pulse"
                              />
                              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">{step.removeBgConfig.chromaColor}</span>
                            </div>
                          </div>
                        )}

                        {/* Sensitivity Tolerances Controls */}
                        <div className="space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-850">
                          {/* Tolerance */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-bold">Matching Sensitivity</span>
                              <span className="text-purple-400 font-mono font-bold">{step.removeBgConfig.tolerance}</span>
                            </div>
                            <input
                              type="range"
                              id="bg-tolerance-slider"
                              min={5}
                              max={120}
                              value={step.removeBgConfig.tolerance}
                              onChange={(e) => updateRemoveBgConfig(step.id, { tolerance: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <p className="text-[9px] text-slate-500 leading-normal font-medium">
                              Lower values are strict, higher values match wider shade differences.
                            </p>
                          </div>

                          {/* Edge Feather */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-bold">Boundary Edge Feather</span>
                              <span className="text-purple-400 font-mono font-bold">{step.removeBgConfig.feather} px</span>
                            </div>
                            <input
                              type="range"
                              id="bg-feather-slider"
                              min={1}
                              max={25}
                              value={step.removeBgConfig.feather}
                              onChange={(e) => updateRemoveBgConfig(step.id, { feather: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <p className="text-[9px] text-slate-500 leading-normal font-medium">
                              Creates standard anti-aliased margins to smoothly blend foreground borders.
                            </p>
                          </div>

                          {/* Fringe Decontamination */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                            <div className="flex flex-col gap-0.5 max-w-[80%]">
                              <span className="text-slate-300 font-bold text-[11px]">Edge Decontamination</span>
                              <span className="text-[9px] text-slate-500 leading-snug font-medium">Reconstructs colors along transparent fringe borders to sweep away outline halos.</span>
                            </div>
                            <button
                              id="bg-decontaminate-toggle"
                              type="button"
                              onClick={() => updateRemoveBgConfig(step.id, { decontaminate: !step.removeBgConfig?.decontaminate })}
                              className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-hidden ${
                                step.removeBgConfig.decontaminate ? 'bg-purple-500' : 'bg-slate-800'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                                step.removeBgConfig.decontaminate ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>

                        {/* Background Replacements Panel */}
                        <div className="space-y-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-850">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Backdrop Replacement</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'transparent', label: 'Transparent' },
                              { id: 'solid', label: 'Solid Color' },
                              { id: 'gradient', label: 'AI Gradient' },
                            ].map((rep) => (
                              <button
                                key={rep.id}
                                id={`bg-replace-${rep.id}`}
                                type="button"
                                onClick={() => updateRemoveBgConfig(step.id, { replacementType: rep.id as any })}
                                className={`py-1.5 px-2 border rounded-md font-bold text-[10px] uppercase text-center tracking-wider transition cursor-pointer ${
                                  step.removeBgConfig?.replacementType === rep.id
                                    ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                                    : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:bg-slate-900'
                                }`}
                              >
                                {rep.label}
                              </button>
                            ))}
                          </div>

                          {/* Solid Replacement Panel */}
                          {step.removeBgConfig.replacementType === 'solid' && (
                            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-900 animate-slide-up">
                              <span className="text-[10px] text-slate-500 font-bold">Pick backdrop shade:</span>
                              <input
                                type="color"
                                id="backdrop-solidpicker"
                                value={step.removeBgConfig.replaceSolidColor}
                                onChange={(e) => updateRemoveBgConfig(step.id, { replaceSolidColor: e.target.value })}
                                className="w-8 h-6 bg-transparent border border-slate-850 rounded cursor-pointer"
                              />
                              <span className="font-mono text-[10.5px] text-purple-400 font-bold uppercase">{step.removeBgConfig.replaceSolidColor}</span>
                            </div>
                          )}

                          {/* Gradient Replacement Panel */}
                          {step.removeBgConfig.replacementType === 'gradient' && (
                            <div className="space-y-2.5 bg-slate-950 p-2.5 rounded-lg border border-slate-900 animate-slide-up">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-450 font-bold">Preset gradient nodes:</span>
                                <div className="flex gap-1" id="presets-gradient-row">
                                  {[
                                    { s: '#fbbf24', e: '#f59e0b' }, // Gold Honey
                                    { s: '#ec4899', e: '#8b5cf6' }, // Sunset Pink
                                    { s: '#3b82f6', e: '#1d4ed8' }, // Cobalt Deep
                                    { s: '#06b6d4', e: '#10b981' }, // Emerald Ice
                                  ].map((nd, ind) => (
                                    <button
                                      key={ind}
                                      id={`gradient-preset-${ind}`}
                                      type="button"
                                      onClick={() => updateRemoveBgConfig(step.id, { replaceGradientStart: nd.s, replaceGradientEnd: nd.e })}
                                      className="w-4 h-4 rounded-full border border-slate-800 transition transform hover:scale-110 cursor-pointer overflow-hidden flex"
                                    >
                                      <div className="w-1/2 h-full" style={{ backgroundColor: nd.s }} />
                                      <div className="w-1/2 h-full" style={{ backgroundColor: nd.e }} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-slate-500 font-medium">Start:</span>
                                  <input
                                    type="color"
                                    id="backdrop-gradstart"
                                    value={step.removeBgConfig.replaceGradientStart}
                                    onChange={(e) => updateRemoveBgConfig(step.id, { replaceGradientStart: e.target.value })}
                                    className="w-6 h-5 bg-transparent border border-slate-850 rounded cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-slate-500 font-medium">End:</span>
                                  <input
                                    type="color"
                                    id="backdrop-gradend"
                                    value={step.removeBgConfig.replaceGradientEnd}
                                    onChange={(e) => updateRemoveBgConfig(step.id, { replaceGradientEnd: e.target.value })}
                                    className="w-6 h-5 bg-transparent border border-slate-850 rounded cursor-pointer"
                                  />
                                </div>
                                <div className="h-4 w-12 rounded border border-slate-850 ml-auto shrink-0 animate-pulse" style={{ background: `linear-gradient(135deg, ${step.removeBgConfig.replaceGradientStart}, ${step.removeBgConfig.replaceGradientEnd})` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Main Process Button */}
      <div id="process-control-bar" className="mt-4 pt-4 border-t border-slate-800">
        <button
          id="execute-pipeline-btn"
          onClick={onProcessAll}
          disabled={!hasFiles || steps.length === 0 || processing}
          className={`w-full py-3 px-4 rounded-xl font-bold tracking-normal text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition shadow-[0_0_15px_rgba(0,0,0,0.3)] ${
            !hasFiles || steps.length === 0
              ? 'bg-slate-950 border border-slate-850 text-slate-605 text-slate-600 cursor-not-allowed'
              : processing
              ? 'bg-slate-900 border border-cyan-500/20 text-cyan-405 text-cyan-400 cursor-wait'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          }`}
        >
          {processing ? (
            <>
              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
              Processing Images...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white text-white" />
              Run Processing Pipeline
            </>
          )}
        </button>
        {!hasFiles && (
          <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">
            Stage images or folders on the left panel to execute.
          </p>
        )}
        {hasFiles && steps.length === 0 && (
          <p className="text-center text-[10px] text-cyan-405 text-cyan-405 mt-2 font-semibold">
            ⚠️ Add at least one processing step to configure your output pipeline.
          </p>
        )}
      </div>
    </div>
  );
}
