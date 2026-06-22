/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProcessedResult, CollisionSettings, SourceFile } from '../types';
import {
  Download,
  CheckCircle,
  XCircle,
  FileArchive,
  BarChart2,
  Info,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderOpen,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import JSZip from 'jszip';

interface ProcessingQueueProps {
  results: ProcessedResult[];
  totalCount: number;
  processing: boolean;
  onClearQueue: () => void;
  collisionSettings: CollisionSettings;
  files: SourceFile[];
  onSelectResultForCompare: (result: ProcessedResult) => void;
  onRenameResult: (id: string, newName: string) => void;
}

export default function ProcessingQueue({
  results,
  totalCount,
  processing,
  onClearQueue,
  collisionSettings,
  files,
  onSelectResultForCompare,
  onRenameResult,
}: ProcessingQueueProps) {
  const [zipFolderName, setZipFolderName] = React.useState('');
  const [folderIncrementList, setFolderIncrementList] = React.useState<string[]>([]);
  const [selectedFolderVersion, setSelectedFolderVersion] = React.useState('');
  const [showPromptOverlay, setShowPromptOverlay] = React.useState(false);
  const [zipStatus, setZipStatus] = React.useState<'idle' | 'generating' | 'done'>('idle');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState<string>('');

  // Compute total processed files, successes, failures
  const processedCount = results.length;
  const successes = results.filter((r) => r.status === 'success');
  const failures = results.filter((r) => r.status === 'failed');

  const pending = totalCount - processedCount;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  // Sizing metrics
  const originalBytesTotal = successes.reduce((acc, r) => acc + r.originalSize, 0);
  const processedBytesTotal = successes.reduce((acc, r) => acc + r.processedSize, 0);
  const bytesSaved = Math.max(0, originalBytesTotal - processedBytesTotal);
  const savingsPercent = originalBytesTotal > 0 ? Math.round((bytesSaved / originalBytesTotal) * 100) : 0;

  // Initialize output folder list on results load
  React.useEffect(() => {
    if (results.length > 0) {
      // Determine if a folder was uploaded
      const folderUploaded = files.some((f) => !!f.relativePath);
      if (folderUploaded) {
        // Find first parent folder name
        const representativePath = files.find((f) => !!f.relativePath)?.relativePath || '';
        const parentFolder = representativePath.split('/')[0] || 'MyFolder';
        const defaultFolder = `${parentFolder}_Processed`;
        setZipFolderName(defaultFolder);
        setFolderIncrementList([defaultFolder, `${parentFolder}_Processed_1`, `${parentFolder}_Processed_2`]);
        setSelectedFolderVersion(defaultFolder);
      } else {
        const defaultColFolder = collisionSettings.outputFolderName || 'Processed Images';
        setZipFolderName(defaultColFolder);
        setFolderIncrementList([defaultColFolder, `${defaultColFolder} 1`, `${defaultColFolder} 2`]);
        setSelectedFolderVersion(defaultColFolder);
      }
    }
  }, [results, files, collisionSettings]);

  // Formatter for Bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes/Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Triggers browser download of a blob
  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download single item individually
  const downloadSingle = (res: ProcessedResult) => {
    if (res.blob && res.status === 'success') {
      triggerDownload(res.blob, res.name);
    }
  };

  // Triggers folder behavior/checks on ZIP compile
  const handleZipDownloadClicked = () => {
    if (collisionSettings.behavior === 'ask') {
      setShowPromptOverlay(true);
    } else {
      compileAndSaveZip(selectedFolderVersion);
    }
  };

  // Compile processed results into Zip
  const compileAndSaveZip = async (targetDirectoryName: string) => {
    setZipStatus('generating');
    try {
      const zip = new JSZip();
      const folderRef = zip.folder(targetDirectoryName);

      const nameCounts = new Map<string, number>();

      for (const res of successes) {
        if (!res.blob) continue;

        let filename = res.name;

        // Auto-number resolving if collision settings demand and there are duplicate names in the batch
        if (collisionSettings.behavior === 'auto-number') {
          const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
          const ext = filename.substring(filename.lastIndexOf('.')) || '';

          if (nameCounts.has(filename)) {
            const currentCount = nameCounts.get(filename)! + 1;
            nameCounts.set(filename, currentCount);
            filename = `${baseName}_${currentCount}${ext}`;
          } else {
            nameCounts.set(filename, 0);
          }
        }

        // Keep directory hierarchies if uploaded files had paths
        const originalFile = files.find((f) => f.id === res.sourceId);
        if (originalFile && originalFile.relativePath) {
          // Recreate subdirectory underneath our target parent ZIP folder
          const parts = originalFile.relativePath.split('/');
          parts.shift(); // remove original uploaded container directory name
          parts.pop(); // remove original filename
          if (parts.length > 0) {
            const nestedDir = folderRef?.folder(parts.join('/'));
            nestedDir?.file(filename, res.blob);
          } else {
            folderRef?.file(filename, res.blob);
          }
        } else {
          folderRef?.file(filename, res.blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      triggerDownload(content, `${targetDirectoryName}.zip`);
      setZipStatus('done');
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('Failed to generate ZIP archive.');
      setZipStatus('idle');
    }
  };

  const handlePromptResolve = (action: 'overwrite' | 're-version' | 'custom', customName?: string) => {
    setShowPromptOverlay(false);
    if (action === 'overwrite') {
      compileAndSaveZip(selectedFolderVersion);
    } else if (action === 're-version') {
      // Step to next increment
      const nextVersion = folderIncrementList[2] || `${selectedFolderVersion}_Processed_New`;
      compileAndSaveZip(nextVersion);
    } else if (customName) {
      compileAndSaveZip(customName);
    }
  };

  return (
    <div id="processing-queue-container" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full relative">
      {/* Title */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-gray-500" />
            Execution Queue
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor real-time progress and compress ratios of your batch job
          </p>
        </div>
        {results.length > 0 && !processing && (
          <button
            id="clear-results-queue-btn"
            onClick={onClearQueue}
            className="text-xs text-gray-500 hover:text-gray-900 transition bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg font-medium"
          >
            Reset Job
          </button>
        )}
      </div>

      {/* Progress Bars */}
      {totalCount > 0 && (
        <div id="queue-progress-bar-card" className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
              {processing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-800" />
                  Processing Batch ({processedCount}/{totalCount})
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Processing Complete ({successes.length} Saved, {failures.length} Failed)
                </>
              )}
            </span>
            <span className="font-mono text-gray-900 font-bold bg-white text-[11px] px-2 py-0.5 rounded-md border border-gray-100">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                failures.length > 0 ? 'bg-amber-500' : 'bg-gray-900'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Stats Bar (if successes present) */}
          {successes.length > 0 && (
            <div id="compression-metrics-row" className="grid grid-cols-3 gap-2.5 pt-2 mt-1 border-t border-gray-200/50 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-gray-100">
                <div className="text-[10px] text-gray-400 font-medium">Original Weight</div>
                <div className="font-semibold text-gray-700 mt-0.5">{formatBytes(originalBytesTotal)}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-gray-100">
                <div className="text-[10px] text-gray-400 font-medium">Output Weight</div>
                <div className="font-semibold text-gray-800 mt-0.5">{formatBytes(processedBytesTotal)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Bytes Shrunk</div>
                <div className="font-bold text-emerald-800 mt-0.5">
                  -{savingsPercent}% <span className="font-normal text-[9px]">({formatBytes(bytesSaved)})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Directory naming & Exporter selectors */}
      {successes.length > 0 && !processing && (
        <div id="export-actions-card" className="bg-white p-4 border border-gray-200 rounded-2xl shadow-2xs space-y-3 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-gray-800">Sensible Destination Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-[10px] text-gray-400 font-medium block mb-1">Target Subdirectory inside ZIP</label>
              <select
                id="zip-target-select"
                value={selectedFolderVersion}
                onChange={(e) => setSelectedFolderVersion(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-1.5 bg-gray-50 focus:outline-hidden focus:border-gray-900"
              >
                {folderIncrementList.map((folder, idx) => (
                  <option key={folder} value={folder}>
                    📁 {folder} {idx === 0 ? '(Default)' : `(Increment ${idx})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 self-end">
              <button
                id="zip-pack-download-btn"
                onClick={handleZipDownloadClicked}
                disabled={zipStatus === 'generating'}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition disabled:opacity-50"
              >
                <FileArchive className="h-3.5 w-3.5" />
                {zipStatus === 'generating' ? 'Zipping...' : 'Download ZIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Itemized Results List */}
      <div id="results-itemized-list" className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px]">
        {results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/10 rounded-2xl border border-dashed border-gray-50">
            <Info className="h-7 w-7 text-gray-300 stroke-[1.5] mb-2 animate-bounce" />
            <p className="text-xs font-semibold text-gray-500">Queue is empty</p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px]">
              Files will stream success ratios or failed diagnostics as the pipeline runs.
            </p>
          </div>
        ) : (
          results.map((res) => {
            const savingPercent = res.originalSize > 0 ? Math.round(((res.originalSize - res.processedSize) / res.originalSize) * 100) : 0;
            const isSuccess = res.status === 'success';
            const isFailed = res.status === 'failed';
            const isProcessing = res.status === 'processing';

            return (
              <div
                key={res.id}
                id={`result-item-${res.id}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition duration-150 ${
                  isFailed
                    ? 'bg-red-50/50 border-red-100 hover:bg-red-50'
                    : isProcessing
                    ? 'bg-gray-50 border-gray-100 animate-pulse'
                    : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1">
                  {/* Image Thumbnails if ready */}
                  {res.processedUrl && isSuccess ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden border border-gray-200 shrink-0 bg-white">
                      <img
                        src={res.processedUrl}
                        alt="output preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center text-gray-400 font-mono text-[9px]">
                      {isProcessing ? '⏳' : isFailed ? '❌' : '🖼️'}
                    </div>
                  )}

                  <div className="truncate flex flex-col gap-0.5">
                    {editingId === res.id ? (
                      <div className="flex items-center gap-1 py-0.5">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingValue.trim()) {
                                onRenameResult(res.id, editingValue.trim());
                              }
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="border border-cyan-400 bg-white px-2 py-0.5 rounded text-[11px] text-gray-800 focus:outline-hidden w-40 font-semibold"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingValue.trim()) {
                              onRenameResult(res.id, editingValue.trim());
                            }
                            setEditingId(null);
                          }}
                          className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer shrink-0"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/name max-w-full">
                        <span className="font-semibold text-gray-800 truncate" title={res.name}>
                          {res.name}
                        </span>
                        {(isSuccess || isFailed) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(res.id);
                              setEditingValue(res.name);
                            }}
                            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 cursor-pointer opacity-100 sm:opacity-0 group-hover/name:opacity-100 focus:opacity-100 shrink-0"
                            title="Rename output image"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                      {isSuccess && (
                        <>
                          <span>{formatBytes(res.originalSize)}</span>
                          <ChevronRight className="h-3 w-3 shrink-0" />
                          <span className="text-gray-700 font-bold">{formatBytes(res.processedSize)}</span>
                        </>
                      )}
                      {isFailed && <span className="text-red-500 font-semibold truncate max-w-[220px]">Error: {res.error}</span>}
                      {isProcessing && <span className="text-gray-500 animate-pulse">Encoding canvas pipeline...</span>}
                    </div>
                  </div>
                </div>

                {/* Badges / Download Controls */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isSuccess && (
                    <>
                      {savingPercent > 0 && (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 text-[10px] px-1.5 py-0.5 rounded-md">
                          -{savingPercent}% size
                        </span>
                      )}
                      <button
                        id={`compare-ratio-btn-${res.id}`}
                        onClick={() => onSelectResultForCompare(res)}
                        className="p-1 px-2 rounded-lg bg-white hover:bg-gray-100 text-gray-500 border border-gray-250 transition-all text-[11px] flex items-center gap-1"
                        title="Inspect Side-By-Side Canvas Comparison"
                      >
                        <Eye className="h-3 w-3" />
                        Compare
                      </button>
                      <button
                        id={`download-single-btn-${res.id}`}
                        onClick={() => downloadSingle(res)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-250 transition-all duration-150"
                        title="Download Individual File"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  {isFailed && (
                    <span className="text-[10px] text-red-500 font-bold bg-white px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 shrink-0">
                      <XCircle className="h-3 w-3" />
                      Fail
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Collision confirmation Modal / Prompt overlay */}
      {showPromptOverlay && (
        <div id="collision-prompt-overlay" className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in z-50 rounded-2xl">
          <div className="max-w-[320px] space-y-4">
            <div className="p-3 bg-amber-50 rounded-full w-fit mx-auto border border-amber-200 animate-pulse">
              <FolderOpen className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Target Location Exists</h3>
              <p className="text-gray-500 text-xs mt-1 leading-normal">
                An export folder named <span className="font-mono text-gray-900 font-semibold">"{selectedFolderVersion}"</span> already exists in simulated memory. How would you like to handle this collision?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                id="collision-resolve-autonumber"
                onClick={() => handlePromptResolve('re-version')}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 rounded-lg text-xs"
              >
                Auto-Increment (Recommended)
              </button>
              <button
                id="collision-resolve-overwrite"
                onClick={() => handlePromptResolve('overwrite')}
                className="w-full bg-white hover:bg-gray-50 text-red-600 border border-red-200 font-semibold py-2 rounded-lg text-xs"
              >
                Force Overwrite File(s)
              </button>
              <button
                id="collision-resolve-cancel"
                onClick={() => setShowPromptOverlay(false)}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
