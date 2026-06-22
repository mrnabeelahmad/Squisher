import React, { useRef, useState, useEffect } from 'react';
import { 
  Video, 
  Scissors, 
  Type, 
  Sliders, 
  Download, 
  Trash2, 
  Play, 
  Pause, 
  Sparkles, 
  VideoOff, 
  RefreshCw, 
  Layers, 
  Check, 
  Info, 
  VolumeX, 
  Volume2,
  FileVideo,
  ChevronDown,
  Share2
} from 'lucide-react';

interface CompressedVideo {
  id: string;
  name: string;
  originalSize: number;
  processedSize: number;
  url: string;
  duration: number;
  width: number;
  height: number;
  filters: string;
  textOverlay: string;
  timestamp: string;
}

export default function VideoSquisher() {
  // Video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [videoMeta, setVideoMeta] = useState<{ width: number; height: number; duration: number } | null>(null);



  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Trim States (Times in seconds)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Resize & Compression Options
  const [cropPreset, setCropPreset] = useState<'none' | '1:1' | '16:9' | '9:16' | '4:3'>('none');
  const [resolutionScale, setResolutionScale] = useState<number>(0.75); // 0.25, 0.5, 0.75, 1.0
  const [videoBitrate, setVideoBitrate] = useState<number>(2.5); // Mbps
  const [targetFps, setTargetFps] = useState<number>(30); // 15, 24, 30
  const [stripAudio, setStripAudio] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<'webm' | 'mp4'>('webm');

  // Orientation & Crop Focus Area Options
  const [videoRotation, setVideoRotation] = useState<0 | 90 | 180 | 270>(0);
  const [cropFocus, setCropFocus] = useState<'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'bottom-right'>('center');

  // Text Overlay Options
  const [overlayText, setOverlayText] = useState<string>('');
  const [overlayColor, setOverlayColor] = useState<string>('#22d3ee'); // neon-cyan
  const [overlaySize, setOverlaySize] = useState<number>(24);
  const [overlayPos, setOverlayPos] = useState<'top' | 'center' | 'bottom'>('bottom');

  // Contrast Filters
  const [videoFilter, setVideoFilter] = useState<'normal' | 'winter' | 'warm' | 'noir' | 'cinema' | 'cyberpunk' | 'bw'>('normal');
  const [copiedId, setCopiedId] = useState<string>('');

  // Process / Transcoding States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState<string>('');
  
  // Hidden Processing Helpers
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  // History States
  const [processedVideos, setProcessedVideos] = useState<CompressedVideo[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      processedVideos.forEach(v => URL.revokeObjectURL(v.url));
    };
  }, [videoUrl, processedVideos]);

  // Handle Drag & Drop / File Input
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadVideo(file);
    }
  };

  const loadVideo = (file: File) => {
    setIsLoadingFile(true);
    setIsPlaying(false);
    setCurrentTime(0);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);

    // Temp element to fetch dimensions & metadata
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setVideoMeta({
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
        duration: tempVideo.duration || 0
      });
      setTrimStart(0);
      setTrimEnd(Math.min(tempVideo.duration || 0, 15)); // Default 15 sec max preview
      setIsLoadingFile(false);
    };
    tempVideo.onerror = () => {
      setIsLoadingFile(false);
    };
  };



  // Video playback listeners
  const togglePlay = () => {
    if (!videoPlayerRef.current) return;
    if (isPlaying) {
      videoPlayerRef.current.pause();
    } else {
      if (videoPlayerRef.current.currentTime >= trimEnd) {
        videoPlayerRef.current.currentTime = trimStart;
      }
      videoPlayerRef.current.play().catch(e => console.log('Play interrupted', e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoPlayerRef.current) return;
    const time = videoPlayerRef.current.currentTime;
    setCurrentTime(time);

    // Limit playback within trim bounds
    if (time >= trimEnd) {
      videoPlayerRef.current.pause();
      setIsPlaying(false);
      videoPlayerRef.current.currentTime = trimStart;
    }
    if (time < trimStart) {
      videoPlayerRef.current.currentTime = trimStart;
    }
  };

  const handleTimelineScrub = (val: number) => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.currentTime = val;
    setCurrentTime(val);
  };

  // Canvas context filter applying function
  const applyContextFilter = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.filter = 'none';
    switch (videoFilter) {
      case 'winter':
        // Cool blue color tones + slightly high contrast
        ctx.filter = 'contrast(1.2) saturate(0.85) hue-rotate(10deg)';
        break;
      case 'warm':
        // Rich warm sunny hues
        ctx.filter = 'contrast(1.1) sepia(40%) saturate(1.25)';
        break;
      case 'noir':
        // High contrast cinematic black and white
        ctx.filter = 'grayscale(100%) contrast(1.4)';
        break;
      case 'bw':
        // Standard clean black and white
        ctx.filter = 'grayscale(100%)';
        break;
      case 'cinema':
        // Cinematic mood, letterbox vignette style
        ctx.filter = 'contrast(1.25) saturate(0.9) brightness(0.95)';
        break;
      case 'cyberpunk':
        // Electric neon colors
        ctx.filter = 'hue-rotate(-45deg) saturate(1.6) contrast(1.1)';
        break;
      case 'normal':
      default:
        ctx.filter = 'none';
        break;
    }

    // Add overlay effect manually for specific filters like Winter (cool overlay)
    if (videoFilter === 'winter') {
      ctx.fillStyle = 'rgba(0, 100, 255, 0.08)';
      ctx.fillRect(0, 0, width, height);
    } else if (videoFilter === 'warm') {
      ctx.fillStyle = 'rgba(255, 120, 0, 0.06)';
      ctx.fillRect(0, 0, width, height);
    }
  };

  // Render text watermark helper
  const drawTextOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!overlayText) return;

    ctx.save();
    ctx.filter = 'none'; // Ensure text is exempt from the video contrast filters for crisp readability
    
    const size = Math.max(12, Math.round(overlaySize * (width / 600)));
    ctx.font = `bold ${size}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = overlayColor;
    ctx.textAlign = 'center';
    
    // Custom drop-shadow backing for excellent contrast
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    let x = width / 2;
    let y = height - 30; // base bottom coordinate

    if (overlayPos === 'top') {
      y = size + 20;
    } else if (overlayPos === 'center') {
      y = height / 2 + size / 3;
    }

    ctx.fillText(overlayText, x, y);
    ctx.restore();
  };

  // Perform server-side video squishing
  const handleSquishVideo = async () => {
    if (!videoFile || !videoMeta) return;

    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessStatus('Uploading media file to server compression queue...');

    try {
      // 1. Resolve output coordinates & crops
      let origWidth = videoMeta.width;
      let origHeight = videoMeta.height;

      // When rotating 90 or 270, the ffmpeg transpose runs first, swapping raw bounds.
      // So crop dimensions must refer to the swapped dimensions!
      if (videoRotation === 90 || videoRotation === 270) {
        origWidth = videoMeta.height;
        origHeight = videoMeta.width;
      }
      
      // Handle crop boundaries
      let cropWidth = origWidth;
      let cropHeight = origHeight;

      if (cropPreset === '1:1') {
        const side = Math.min(origWidth, origHeight);
        cropWidth = side;
        cropHeight = side;
      } else if (cropPreset === '16:9') {
        // Landscape
        const targetHeight = Math.round((origWidth * 9) / 16);
        if (targetHeight <= origHeight) {
          cropHeight = targetHeight;
        } else {
          const targetWidth = Math.round((origHeight * 16) / 9);
          cropWidth = targetWidth;
        }
      } else if (cropPreset === '9:16') {
        // Portrait / TikTok format
        const targetWidth = Math.round((origHeight * 9) / 16);
        if (targetWidth <= origWidth) {
          cropWidth = targetWidth;
        } else {
          const targetHeight = Math.round((origWidth * 16) / 9);
          cropHeight = targetHeight;
        }
      } else if (cropPreset === '4:3') {
        // Academy ratio
        const targetWidth = Math.round((origHeight * 4) / 3);
        if (targetWidth <= origWidth) {
          cropWidth = targetWidth;
        } else {
          const targetHeight = Math.round((origWidth * 3) / 4);
          cropHeight = targetHeight;
        }
      }

      // 2. Apply Custom focus area alignment
      let cropX = Math.round((origWidth - cropWidth) / 2);
      let cropY = Math.round((origHeight - cropHeight) / 2);

      if (cropFocus === 'top') {
        cropY = 0;
      } else if (cropFocus === 'bottom') {
        cropY = Math.max(0, origHeight - cropHeight);
      } else if (cropFocus === 'left') {
        cropX = 0;
      } else if (cropFocus === 'right') {
        cropX = Math.max(0, origWidth - cropWidth);
      } else if (cropFocus === 'top-left') {
        cropX = 0;
        cropY = 0;
      } else if (cropFocus === 'bottom-right') {
        cropX = Math.max(0, origWidth - cropWidth);
        cropY = Math.max(0, origHeight - cropHeight);
      }

      // Apply proportional scale down-scale (pixel reduction!)
      const destWidth = Math.round((cropWidth * resolutionScale) / 2) * 2; // Even coordinates for standard H264
      const destHeight = Math.round((cropHeight * resolutionScale) / 2) * 2;

      setProcessingProgress(35);
      setProcessStatus('Transcoding cinematic video server-side...');

      // Prepare FormData payload for upload
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cropPreset', cropPreset);
      formData.append('resolutionScale', String(resolutionScale));
      formData.append('videoBitrate', String(videoBitrate));
      formData.append('targetFps', String(targetFps));
      formData.append('stripAudio', String(stripAudio));
      formData.append('outputFormat', outputFormat);
      formData.append('overlayText', overlayText);
      formData.append('overlayColor', overlayColor);
      formData.append('overlaySize', String(overlaySize));
      formData.append('overlayPos', overlayPos);
      formData.append('videoFilter', videoFilter);
      formData.append('trimStart', String(trimStart));
      formData.append('trimEnd', String(trimEnd));
      formData.append('cropWidth', String(cropWidth));
      formData.append('cropHeight', String(cropHeight));
      formData.append('cropX', String(cropX));
      formData.append('cropY', String(cropY));
      formData.append('destWidth', String(destWidth));
      formData.append('destHeight', String(destHeight));
      formData.append('videoRotation', String(videoRotation));
      formData.append('cropFocus', cropFocus);

      const response = await fetch('/api/process-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Server compression encountered a fault');
      }

      setProcessingProgress(85);
      setProcessStatus('Retrieving finished binary headers...');

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Server transcoding rejected pipeline parameters.');
      }

      const totalDuration = trimEnd - trimStart;

      const newRes: CompressedVideo = {
        id: result.id || `vid_${Date.now()}`,
        name: result.filename || `squished_${videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || 'video'}.${outputFormat}`,
        originalSize: result.originalSize || videoFile.size || 15 * 1024 * 1024,
        processedSize: result.processedSize,
        url: result.url,
        duration: totalDuration,
        width: result.width || destWidth,
        height: result.height || destHeight,
        filters: videoFilter === 'normal' ? 'Original' : videoFilter.toUpperCase(),
        textOverlay: overlayText ? `"${overlayText}"` : 'None',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setProcessedVideos(prev => [newRes, ...prev]);
      setIsProcessing(false);
      setProcessingProgress(0);

    } catch (err: any) {
      console.error('Server-side processing error:', err);
      setProcessStatus(`Transcode error: ${err.message || 'Server is offline.'}`);
      setIsProcessing(false);
    }
  };

  const handleRemoveHistoryItem = (id: string, url: string) => {
    URL.revokeObjectURL(url);
    setProcessedVideos(prev => prev.filter(v => v.id !== id));
  };

  // Human file sizes formatting
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id="video-squisher-container" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch w-full">
      {/* LEFT COLUMN: Input File & Preview Controls */}
      <section className="xl:col-span-7 flex flex-col gap-6">
        {/* Upload Container */}
        <div id="video-source-box" className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileVideo className="h-5 w-5 text-cyan-400" />
              Video Source Upload
             </h2>
            {videoFile && (
              <button 
                onClick={() => {
                  setVideoFile(null);
                  setVideoUrl('');
                  setVideoMeta(null);
                  setVideoRotation(0);
                  setCropFocus('center');
                }}
                className="text-[11px] font-semibold text-rose-450 hover:text-rose-400 bg-rose-950/20 px-2.5 py-1.5 rounded-lg border border-rose-900/45 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Clear Source
              </button>
            )}
          </div>

          {!videoFile ? (
            <label id="video-dropzone" className="border-2 border-dashed border-slate-800 hover:border-cyan-500/30 transition bg-slate-950/40 rounded-2xl p-8 py-10 flex flex-col items-center justify-center text-center cursor-pointer group">
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoSelect} 
                className="hidden" 
              />
              <div className="p-3.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 group-hover:scale-105 transition shadow-sm mb-3.5">
                <Video className="h-6 w-6 text-cyan-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Drag-and-Drop Video File Or Browse
              </p>
              <p className="text-[11px] text-slate-500 mt-2 max-w-[280px]">
                Supported formats: MP4, WebM, QuickTime. Processed securely inside your offline sandboxed browser workspace.
              </p>
            </label>
          ) : (
            <div className="space-y-4">
              {/* Loaded File Info Card */}
              <div className="flex items-center gap-3 bg-slate-950/90 p-3 rounded-xl border border-slate-850">
                <div className="h-10 w-10 rounded-lg bg-cyan-950/50 border border-cyan-800/20 flex items-center justify-center text-cyan-400">
                  <Video className="h-5 w-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{videoFile.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 flex gap-2 font-mono">
                    <span>Size: {formatBytes(videoFile.size)}</span>
                    <span className="text-slate-700">|</span>
                    {videoMeta && (
                      <span>Res: {videoMeta.width}x{videoMeta.height} ({Math.round(videoMeta.duration)}s)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Player Canvas Frame */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-850 flex items-center justify-center group select-none">
                <video
                  ref={videoPlayerRef}
                  src={videoUrl}
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  className="max-h-full max-w-full cursor-pointer h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `rotate(${videoRotation}deg)`,
                    filter: videoFilter === 'winter' ? 'contrast(1.2) saturate(0.85) hue-rotate(10deg)' : 
                            videoFilter === 'warm' ? 'contrast(1.1) sepia(40%) saturate(1.25)' : 
                            videoFilter === 'noir' ? 'grayscale(100%) contrast(1.4)' : 
                            videoFilter === 'bw' ? 'grayscale(100%)' : 
                            videoFilter === 'cinema' ? 'contrast(1.25) saturate(0.9) brightness(0.95)' : 
                            videoFilter === 'cyberpunk' ? 'hue-rotate(-45deg) saturate(1.6) contrast(1.1)' : 'none'
                  }}
                />
                
                {/* Visual Watermark Overlay Simulator */}
                {overlayText && (
                  <div 
                    className={`absolute left-0 right-0 text-center pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-4 font-bold select-none`}
                    style={{
                      color: overlayColor,
                      fontSize: `${Math.round(overlaySize * 0.7)}px`,
                      top: overlayPos === 'top' ? '15px' : overlayPos === 'center' ? '50%' : 'auto',
                      bottom: overlayPos === 'bottom' ? '15px' : 'auto',
                      transform: overlayPos === 'center' ? 'translateY(-50%)' : 'none'
                    }}
                  >
                    {overlayText}
                  </div>
                )}

                {/* Sub-cover for Cool / warm manual overlays on player */}
                {videoFilter === 'winter' && (
                  <div className="absolute inset-0 pointer-events-none bg-cyan-500/5 mix-blend-overlay" />
                )}
                {videoFilter === 'warm' && (
                  <div className="absolute inset-0 pointer-events-none bg-orange-500/5 mix-blend-overlay" />
                )}

                {/* Transcode processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="relative flex items-center justify-center h-16 w-16 mb-4">
                      {/* Spin Circle */}
                      <div className="absolute inset-0 border-3 border-cyan-500/10 rounded-full"></div>
                      <div className="absolute inset-0 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <RefreshCw className="h-6 w-6 text-cyan-400 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{processStatus}</h4>
                    
                    {/* Rendered frame capture monitor */}
                    <div className="w-56 bg-slate-900 border border-slate-800 rounded-lg p-1.5 mt-4 space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-505 font-mono px-1">
                        <span>RENDER STREAM</span>
                        <span className="text-cyan-400 font-bold">{processingProgress}%</span>
                      </div>
                      <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline control block */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3.5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={togglePlay}
                    className="h-8 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-cyan-400 fill-cyan-400" /> Play Preview
                      </>
                    )}
                  </button>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">{currentTime.toFixed(1)}s</span>
                    <span className="text-slate-700">/</span>
                    <span>{videoMeta ? videoMeta.duration.toFixed(1) : '0'}s</span>
                  </div>
                </div>

                {/* Dual-trim Slider Bar */}
                {videoMeta && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>TRIM ZONE: (From {trimStart.toFixed(1)}s to {trimEnd.toFixed(1)}s)</span>
                      <span className="text-cyan-455 text-cyan-400">Span: {(trimEnd - trimStart).toFixed(1)}s</span>
                    </div>

                    <div className="relative pt-4 pb-2 px-1">
                      {/* Base Track */}
                      <div className="h-1.5 bg-slate-850 rounded-lg w-full relative">
                        {/* Trim highlight range */}
                        <div 
                          className="absolute h-full bg-cyan-400/25 border-y border-cyan-400/40"
                          style={{
                            left: `${(trimStart / videoMeta.duration) * 100}%`,
                            right: `${100 - (trimEnd / videoMeta.duration) * 100}%`
                          }}
                        />

                        {/* Current Player Line indicator */}
                        <div 
                          className="absolute h-6 w-[2px] bg-amber-400 -top-2"
                          style={{ left: `${(currentTime / videoMeta.duration) * 100}%` }}
                        />
                      </div>

                      {/* Native sliders overlays */}
                      <input
                        type="range"
                        min={0}
                        max={videoMeta.duration}
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val < trimEnd) {
                            setTrimStart(val);
                            if (videoPlayerRef.current) videoPlayerRef.current.currentTime = val;
                          }
                        }}
                        className="absolute inset-x-0 top-2 h-4 opacity-0 cursor-pointer pointer-events-auto"
                      />
                      <input
                        type="range"
                        min={0}
                        max={videoMeta.duration}
                        step={0.1}
                        value={trimEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > trimStart) {
                            setTrimEnd(val);
                          }
                        }}
                        className="absolute inset-x-0 top-6 h-4 opacity-0 cursor-pointer pointer-events-auto"
                      />

                      <div className="flex justify-between text-[9px] text-slate-600 font-mono pt-3">
                        <span>0.0s</span>
                        <span>{videoMeta.duration.toFixed(1)}s</span>
                      </div>
                    </div>

                    {/* Manual entry time inputs */}
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">TRIM START (SECONDS)</label>
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={trimEnd - 0.1}
                          value={trimStart}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            if (val < trimEnd) setTrimStart(val);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs font-mono focus:outline-hidden focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">TRIM END (SECONDS)</label>
                        <input
                          type="number"
                          step={0.1}
                          min={trimStart + 0.1}
                          max={videoMeta.duration}
                          value={trimEnd}
                          onChange={(e) => {
                            const val = Math.min(videoMeta.duration, parseFloat(e.target.value) || videoMeta.duration);
                            if (val > trimStart) setTrimEnd(val);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs font-mono focus:outline-hidden focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Settings Panel */}
      <section className="xl:col-span-5 flex flex-col gap-6">
        <div id="video-settings-card" className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col h-full justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Sliders className="h-4 w-4 text-cyan-400" />
              Squish Configurator
            </h3>

            <div className="space-y-4 text-xs">
              {/* Option: Format Converter */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Export Format</label>
                  <span className="text-[9px] text-slate-500 italic">WebM/VP9 is recommended offline</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    onClick={() => setOutputFormat('webm')}
                    className={`py-1.5 rounded-md font-bold text-center text-[11px] uppercase transition cursor-pointer ${
                      outputFormat === 'webm'
                        ? 'bg-slate-800 text-cyan-400 py-2'
                        : 'text-slate-450 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    webm (VP9 Lossless)
                  </button>
                  <button
                    onClick={() => setOutputFormat('mp4')}
                    className={`py-1.5 rounded-md font-bold text-center text-[11px] uppercase transition cursor-pointer ${
                      outputFormat === 'mp4'
                        ? 'bg-slate-800 text-cyan-400 py-2'
                        : 'text-slate-450 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    mp4 (H264 Base)
                  </button>
                </div>
              </div>

              {/* Option: Cropping Preset */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Compress Crop Layout</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['none', '1:1', '16:9', '9:16', '4:3'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCropPreset(preset)}
                      className={`py-1.5 border rounded-md transition text-[10px] font-bold cursor-pointer uppercase ${
                        cropPreset === preset
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-450 text-slate-400'
                      }`}
                    >
                      {preset === 'none' ? 'None' : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option: Crop Focus Area */}
              {cropPreset !== 'none' && (
                <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Crop Focus Area</label>
                    <span className="text-[9px] text-zinc-500 italic">Target crop priorities</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['center', 'top', 'bottom', 'left', 'right', 'top-left', 'bottom-right'] as const).map((focus) => (
                      <button
                        key={focus}
                        type="button"
                        onClick={() => setCropFocus(focus)}
                        className={`py-1.5 text-[10px] border rounded transition font-bold cursor-pointer capitalize text-center ${
                          cropFocus === focus
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            : 'bg-slate-950 border-zinc-850 text-slate-450 hover:bg-slate-900 border-slate-850 text-slate-400'
                        }`}
                      >
                        {focus.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 leading-normal italic mt-1 font-medium">
                    Prioritizes top, bottom, center, left, or right regions of the original frame during automatic cropping.
                  </p>
                </div>
              )}

              {/* Option: Video Rotation */}
              <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Video Orientation (Rotate)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([0, 90, 180, 270] as const).map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setVideoRotation(angle)}
                      className={`py-1.5 border rounded-md transition text-[10px] font-bold cursor-pointer uppercase ${
                        videoRotation === angle
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {angle === 0 ? '0° (Orig)' : `${angle}°`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option: Down-Scale (Pixel reduction!) */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider block">Resolution Downscaling</label>
                  <span className="text-[11px] font-mono font-bold text-cyan-400">
                    {resolutionScale === 1.0 ? 'Original (100%)' : `-${(1.0 - resolutionScale) * 100}% (${resolutionScale * 100}%)`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {[0.25, 0.5, 0.75, 1.0].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setResolutionScale(scale)}
                      className={`flex-1 py-1 border rounded font-semibold text-[10px] transition cursor-pointer ${
                        resolutionScale === scale
                          ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-400'
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500'
                      }`}
                    >
                      {scale * 100}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Option: Bitrate / Compression factor */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider">Target Video Bitrate (Squeezing)</label>
                  <span className="text-xs font-mono font-extrabold text-cyan-400">{videoBitrate} Mbps</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                  <span>0.5 Mbps (Hyper-compressed)</span>
                  <span>12 Mbps (High HD)</span>
                </div>
              </div>

              {/* Option: Frame-rate and Audio stripping */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Rate (FPS)</label>
                  <div className="flex gap-1.5">
                    {[15, 24, 30].map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setTargetFps(fps)}
                        className={`flex-1 py-1 border rounded text-[10px] font-bold transition cursor-pointer ${
                          targetFps === fps
                            ? 'bg-cyan-505/20 border-cyan-500 text-cyan-400'
                            : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStripAudio(!stripAudio)}
                  className={`flex items-center gap-2 justify-center border p-3 rounded-xl transition cursor-pointer text-[11px] font-bold ${
                    stripAudio
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-400 shadow-sm'
                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {stripAudio ? (
                    <>
                      <VolumeX className="h-4 w-4" /> Muted (No Audio)
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 text-cyan-400" /> Keep Audio Track
                    </>
                  )}
                </button>
              </div>

              {/* Option: Custom Watermark Overlay */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Type className="h-3.5 w-3.5 text-cyan-400" />
                    Overlay Text Watermark
                  </label>
                  {overlayText && (
                    <button 
                      onClick={() => setOverlayText('')}
                      className="text-[9px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear Text
                    </button>
                  )}
                </div>
                
                <input
                  type="text"
                  placeholder="Enter watermark overlay text..."
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs focus:outline-hidden focus:border-cyan-400"
                />

                {overlayText && (
                  <div className="grid grid-cols-3 gap-2 pt-1 animate-fade-in text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">POSITION</span>
                      <select
                        value={overlayPos}
                        onChange={(e: any) => setOverlayPos(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-bold text-slate-350 cursor-pointer focus:outline-hidden text-[10px]"
                      >
                        <option value="top">Top Center</option>
                        <option value="center">Center</option>
                        <option value="bottom">Bottom Center</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">COLOR</span>
                      <select
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded font-bold text-slate-350 cursor-pointer focus:outline-hidden text-[10px]"
                      >
                        <option value="#22d3ee">Cyan</option>
                        <option value="#ffffff">White</option>
                        <option value="#facc15">Yellow</option>
                        <option value="#ec4899">Magenta</option>
                        <option value="#000000">Black</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">FONT SIZE ({overlaySize}px)</span>
                      <input
                        type="range"
                        min={12}
                        max={42}
                        value={overlaySize}
                        onChange={(e) => setOverlaySize(parseInt(e.target.value))}
                        className="w-full h-1 mt-2.5 cursor-pointer accent-cyan-400 appearance-none bg-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Option: Contrast Theme/Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contrast Presets / Filters</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['normal', 'winter', 'warm', 'noir', 'bw', 'cinema', 'cyberpunk'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setVideoFilter(filter)}
                      className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold transition capitalize cursor-pointer ${
                        videoFilter === filter
                          ? 'bg-slate-800 text-cyan-400 border-cyan-500'
                          : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-450 hover:text-slate-300'
                      }`}
                    >
                      {filter === 'normal' ? 'Original' : filter === 'bw' ? 'B&W' : filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trigger Squish Button */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <button
              onClick={handleSquishVideo}
              disabled={!videoFile || isProcessing}
              className={`w-full py-3 px-4 rounded-xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition shadow-[0_0_15px_rgba(0,0,0,0.3)] ${
                !videoFile
                  ? 'bg-slate-955 bg-slate-950 border border-slate-850 text-slate-600 cursor-not-allowed'
                  : isProcessing
                  ? 'bg-slate-900 border border-cyan-500/20 text-cyan-400 cursor-wait'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  Squishing Video...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  SQUISH VIDEO (COMPILE OFFLINE)
                </>
              )}
            </button>
            {!videoFile && (
              <p className="text-center text-[10px] text-slate-500 mt-2">
                Upload a video to enable squishing controls.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* HIDDEN CODES PROCESSING STORES */}
      <canvas ref={processingCanvasRef} className="hidden" />
      <video ref={hiddenVideoRef} className="hidden" muted crossOrigin="anonymous" />

      {/* BOTTOM SEGMENT: History processed list */}
      {processedVideos.length > 0 && (
        <section className="xl:col-span-12 shrink-0 animate-fade-in mt-2">
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400" />
                Squished Output Queue ({processedVideos.length})
              </h3>
              <button
                onClick={() => {
                  processedVideos.forEach(v => URL.revokeObjectURL(v.url));
                  setProcessedVideos([]);
                }}
                className="text-[10px] font-bold text-rose-455 hover:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                Clear Queue History
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {processedVideos.map((video) => {
                const savings = Math.round(((video.originalSize - video.processedSize) / video.originalSize) * 100);
                return (
                  <div key={video.id} className="p-4 bg-slate-950/70 border border-slate-850 hover:border-emerald-500/20 rounded-xl transition flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="overflow-hidden flex-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{video.name}</h4>
                        <span className="text-[9px] text-slate-500 font-mono">Exported at {video.timestamp}</span>
                      </div>
                      
                      {/* Savings tag badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${savings > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-505/20' : 'bg-slate-800 text-slate-400'}`}>
                        {savings > 0 ? `-${savings}% smaller` : '0% change'}
                      </span>
                    </div>

                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-slate-900 flex items-center justify-center relative group">
                      <video 
                        src={video.url} 
                        controls 
                        className="max-h-full max-w-full h-full object-contain" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 bg-slate-900/40 p-2 rounded-lg border border-slate-850/60">
                      <div>
                        <span className="text-[9px] text-slate-600 block">RESOLUTION</span>
                        <span className="text-slate-200">{video.width} × {video.height}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-600 block">SQUISHED SIZE</span>
                        <span className="text-emerald-400 font-bold">{formatBytes(video.processedSize)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-600 block">DURATION</span>
                        <span className="text-slate-200">{video.duration.toFixed(1)}s</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-600 block">FILTERS / TXT</span>
                        <span className="text-slate-200 truncate block">{video.filters} | {video.textOverlay}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={video.url}
                        download={video.name}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-white transition flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer text-center"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const shareUrl = window.location.origin + video.url;
                          if (navigator.share) {
                            navigator.share({
                              title: video.name,
                              text: 'Processed video via Squisher server-side API builder.',
                              url: shareUrl,
                            }).catch(() => {
                              // If cancelled or rejected, copy to clipboard
                              navigator.clipboard.writeText(shareUrl);
                              setCopiedId(video.id);
                              setTimeout(() => setCopiedId(''), 2500);
                            });
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedId(video.id);
                            setTimeout(() => setCopiedId(''), 2500);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-lg border transition flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer ${
                          copiedId === video.id
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-400 hover:text-white'
                        }`}
                        title="Copy direct share link / Share video"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {copiedId === video.id ? 'Copied Link!' : 'Direct Share'}
                      </button>
                      <button
                        onClick={() => handleRemoveHistoryItem(video.id, video.url)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-950/20 hover:border-rose-900/40 hover:text-rose-450 transition cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
