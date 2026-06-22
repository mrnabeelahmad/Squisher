/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SourceFile, CollisionSettings } from '../types';
import {
  Upload,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  FileCode,
  ShieldAlert,
  Sliders,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface ImageUploaderProps {
  files: SourceFile[];
  setFiles: React.Dispatch<React.SetStateAction<SourceFile[]>>;
  collisionSettings: CollisionSettings;
  setCollisionSettings: React.Dispatch<React.SetStateAction<CollisionSettings>>;
}

export default function ImageUploader({
  files,
  setFiles,
  collisionSettings,
  setCollisionSettings,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showSettings, setShowSettings] = React.useState(false);

  const imagesInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  // Helper to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Convert FileList into SourceFile[]
  const handleFilesArray = (fileList: FileList) => {
    const validImages: SourceFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Filter out non-images
      if (file.type.startsWith('image/')) {
        validImages.push({
          id: `${file.name}_${file.size}_${Date.now()}_${i}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          relativePath: file.webkitRelativePath || undefined,
          originalUrl: URL.createObjectURL(file),
        });
      }
    }

    if (validImages.length > 0) {
      setFiles((prev) => {
        // Prevent duplicate loads of same names
        const existingNames = new Set(prev.map((f) => f.name));
        const filteredNew = validImages.filter((f) => !existingNames.has(f.name));
        return [...prev, ...filteredNew];
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesArray(e.dataTransfer.files);
    }
  };

  const onImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesArray(e.target.files);
    }
  };

  const onFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesArray(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    files.forEach((f) => URL.revokeObjectURL(f.originalUrl));
    setFiles([]);
  };

  const totalPayloadSize = files.reduce((acc, f) => acc + f.size, 0);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="image-uploader-container" className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-cyan-400" />
            Upload Sources
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Stage images or folders for batch pipeline execution
          </p>
        </div>
        <button
          id="toggle-collision-settings"
          onClick={() => setShowSettings(!showSettings)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
            showSettings
              ? 'bg-slate-800 border-cyan-500/50 text-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>

      {/* Collision & Output Folder settings */}
      {showSettings && (
        <div id="collision-settings-panel" className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-4 text-xs space-y-3.5 animate-slide-down">
          <div>
            <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
              Filename & Path Collision Handling
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5 leading-normal">
              Determines how the exporter behaves when output files or folder names match existing paths in storage.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['auto-number', 'Auto-Number', 'e.g., photo_1.webp'],
                ['overwrite', 'Overwrite', 'Replaces active file'],
                ['ask', 'Confirm Prompt', 'Prompt choice dynamically'],
              ] as const
            ).map(([val, label, subtitle]) => (
              <button
                key={val}
                id={`collision-opt-${val}`}
                onClick={() => setCollisionSettings((prev) => ({ ...prev, behavior: val }))}
                className={`py-2 px-2 border rounded-lg text-left transition font-medium cursor-pointer ${
                  collisionSettings.behavior === val
                    ? 'bg-slate-900 border-cyan-500/80 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className={`font-semibold text-[11px] ${collisionSettings.behavior === val ? 'text-cyan-400' : 'text-slate-250'}`}>{label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">{subtitle}</div>
              </button>
            ))}
          </div>

          <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
            <label className="text-[10px] text-slate-400 font-semibold block">
              Default Output Target Folder Name
            </label>
            <input
              type="text"
              id="output-folder-input"
              value={collisionSettings.outputFolderName}
              onChange={(e) => setCollisionSettings((prev) => ({ ...prev, outputFolderName: e.target.value }))}
              placeholder="Processed Images"
              className="w-full px-2.5 py-1.5 border border-slate-800 bg-slate-950 rounded-md focus:outline-hidden focus:border-cyan-500/50 font-mono text-[11px] text-slate-300"
            />
          </div>
        </div>
      )}

      {/* Inputs (Hidden standard controllers) */}
      <input
        ref={imagesInputRef}
        id="images-fallback-input"
        type="file"
        multiple
        accept="image/*"
        onChange={onImagesChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        id="folder-fallback-input"
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        onChange={onFolderChange}
        className="hidden"
      />

      {/* Main Drag-And-Drop Zone */}
      <div
        id="dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => imagesInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
          dragActive
            ? 'border-cyan-500 bg-slate-900/80 scale-[0.99] shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
        }`}
      >
        <Upload className={`h-8 w-8 text-slate-500 stroke-[1.5] mb-2.5 ${dragActive ? 'animate-bounce text-cyan-400' : ''}`} />
        <span className="text-sm font-semibold text-slate-200 leading-tight">
          Drag and drop images here, or click to browse
        </span>
        <span className="text-[11px] text-slate-450 mt-1 max-w-[280px]">
          Supports PNG, JPG, JPEG, WEBP, GIF, and other common image formats.
        </span>

        {/* Separate Buttons to split multi-files from Directory selector */}
        <div id="dropzone-triggers" className="flex items-center gap-2.5 mt-4" onClick={(e) => e.stopPropagation()}>
          <button
            id="browse-files-btn"
            onClick={() => imagesInputRef.current?.click()}
            className="text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-850 hover:text-white active:scale-[0.97] transition flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
            Select Files
          </button>
          <span className="text-slate-500 text-xs font-medium">or</span>
          <button
            id="browse-folder-btn"
            onClick={() => folderInputRef.current?.click()}
            className="text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-850 hover:text-white active:scale-[0.97] transition flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
            Select Folder
          </button>
        </div>
      </div>

      {/* Files List Display */}
      <div id="files-list-section" className="flex-1 flex flex-col mt-4 min-h-[220px] max-h-[440px]">
        {files.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 fill-emerald-950/20" />
              Staged Files ({files.length})
              <span className="text-slate-500 font-normal">({formatBytes(totalPayloadSize)})</span>
            </span>
            <button
              id="clear-all-staged-btn"
              onClick={clearAllFiles}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors hover:bg-rose-950/20 px-2 py-1 rounded"
            >
              Clear Staged
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div id="file-search-bar" className="relative mb-2">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              id="staged-file-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter staged images..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-800 bg-slate-950 rounded-lg focus:outline-hidden focus:border-cyan-500/30 text-slate-200 placeholder-slate-550"
            />
          </div>
        )}

        <div id="staged-images-scroll" className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800/80">
              <ImageIcon className="h-7 w-7 text-slate-600 stroke-[1.5] mb-1.5" />
              <p className="text-xs font-medium text-slate-400">No images staged yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Staged images will show up here before processing.
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <span className="text-xs text-slate-500 font-mono">No matching files found.</span>
            </div>
          ) : (
            filteredFiles.map((f) => (
              <div
                key={f.id}
                id={`staged-item-${f.id}`}
                className="group flex items-center justify-between p-2 rounded-lg bg-slate-950/50 hover:bg-slate-900 border border-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="relative w-9 h-9 rounded-md overflow-hidden border border-slate-850 shrink-0 bg-slate-950">
                    <img
                      src={f.originalUrl}
                      alt={f.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="truncate flex flex-col">
                    <span className="text-xs font-medium text-slate-200 truncate" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{formatBytes(f.size)}</span>
                      {f.relativePath && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                          <span className="text-cyan-400/80 truncate max-w-[120px]" title={f.relativePath}>
                            📁 {f.relativePath.substring(0, f.relativePath.lastIndexOf('/') || 10)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  id={`remove-staged-btn-${f.id}`}
                  onClick={() => removeFile(f.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-all duration-150 shrink-0"
                  title="Remove Image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
