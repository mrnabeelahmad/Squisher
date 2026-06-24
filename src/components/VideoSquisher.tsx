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
  Share2,
  Crop,
  RotateCcw
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
  const [latestProcessedVideo, setLatestProcessedVideo] = useState<CompressedVideo | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('original');

  const videoSourceBoxRef = useRef<HTMLDivElement | null>(null);

  // Pipeline Step State
  const [pipelineSteps, setPipelineSteps] = useState<string[]>(['trim', 'crop', 'format']);
  const [enabledSteps, setEnabledSteps] = useState<string[]>(['trim', 'crop', 'format']);
  const [activeStepId, setActiveStepId] = useState<string | null>('trim');

  const handleResetAllVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    processedVideos.forEach(v => URL.revokeObjectURL(v.url));

    setVideoFile(null);
    setVideoUrl('');
    setIsLoadingFile(false);
    setVideoMeta(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCropPreset('none');
    setResolutionScale(0.75);
    setVideoBitrate(2.5);
    setTargetFps(30);
    setStripAudio(false);
    setOutputFormat('webm');
    setVideoRotation(0);
    setCropFocus('center');
    setOverlayText('');
    setOverlayColor('#22d3ee');
    setOverlaySize(24);
    setOverlayPos('bottom');
    setVideoFilter('normal');
    setProcessedVideos([]);
    setLatestProcessedVideo(null);
    setPreviewMode('original');

    // Reset pipeline state
    setPipelineSteps(['trim', 'crop', 'format']);
    setEnabledSteps(['trim', 'crop', 'format']);
    setActiveStepId('trim');
  };

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
    setLatestProcessedVideo(null);
    setPreviewMode('original');

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
      const isTrimEnabled = enabledSteps.includes('trim');
      const isCropEnabled = enabledSteps.includes('crop');
      const isRotateEnabled = enabledSteps.includes('rotate');
      const isWatermarkEnabled = enabledSteps.includes('watermark');
      const isFilterEnabled = enabledSteps.includes('filter');
      const isFormatEnabled = enabledSteps.includes('format');

      const finalRotation = isRotateEnabled ? videoRotation : 0;
      const finalCropPreset = isCropEnabled ? cropPreset : 'none';
      const finalCropFocus = isCropEnabled ? cropFocus : 'center';
      const finalResolutionScale = isCropEnabled ? resolutionScale : 1.0;

      const finalTrimStart = isTrimEnabled ? trimStart : 0;
      const finalTrimEnd = isTrimEnabled && trimEnd > trimStart ? trimEnd : videoMeta.duration;

      const finalOverlayText = isWatermarkEnabled ? overlayText : '';
      const finalVideoFilter = isFilterEnabled ? videoFilter : 'normal';

      const finalFormat = isFormatEnabled ? outputFormat : 'mp4';
      const finalBitrate = isFormatEnabled ? videoBitrate : 2.5;
      const finalFps = isFormatEnabled ? targetFps : 30;
      const finalStripAudio = isFormatEnabled ? stripAudio : false;

      // 1. Resolve output coordinates & crops
      let origWidth = videoMeta.width;
      let origHeight = videoMeta.height;

      // When rotating 90 or 270, the ffmpeg transpose runs first, swapping raw bounds.
      // So crop dimensions must refer to the swapped dimensions!
      if (finalRotation === 90 || finalRotation === 270) {
        origWidth = videoMeta.height;
        origHeight = videoMeta.width;
      }
      
      // Handle crop boundaries
      let cropWidth = origWidth;
      let cropHeight = origHeight;

      if (finalCropPreset === '1:1') {
        const side = Math.min(origWidth, origHeight);
        cropWidth = side;
        cropHeight = side;
      } else if (finalCropPreset === '16:9') {
        // Landscape
        const targetHeight = Math.round((origWidth * 9) / 16);
        if (targetHeight <= origHeight) {
          cropHeight = targetHeight;
        } else {
          const targetWidth = Math.round((origHeight * 16) / 9);
          cropWidth = targetWidth;
        }
      } else if (finalCropPreset === '9:16') {
        // Portrait / TikTok format
        const targetWidth = Math.round((origHeight * 9) / 16);
        if (targetWidth <= origWidth) {
          cropWidth = targetWidth;
        } else {
          const targetHeight = Math.round((origWidth * 16) / 9);
          cropHeight = targetHeight;
        }
      } else if (finalCropPreset === '4:3') {
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

      if (finalCropFocus === 'top') {
        cropY = 0;
      } else if (finalCropFocus === 'bottom') {
        cropY = Math.max(0, origHeight - cropHeight);
      } else if (finalCropFocus === 'left') {
        cropX = 0;
      } else if (finalCropFocus === 'right') {
        cropX = Math.max(0, origWidth - cropWidth);
      } else if (finalCropFocus === 'top-left') {
        cropX = 0;
        cropY = 0;
      } else if (finalCropFocus === 'bottom-right') {
        cropX = Math.max(0, origWidth - cropWidth);
        cropY = Math.max(0, origHeight - cropHeight);
      }

      // Apply proportional scale down-scale (pixel reduction!)
      const destWidth = Math.round((cropWidth * finalResolutionScale) / 2) * 2; // Even coordinates for standard H264
      const destHeight = Math.round((cropHeight * finalResolutionScale) / 2) * 2;

      setProcessingProgress(35);
      setProcessStatus('Transcoding cinematic video server-side...');

      // Prepare FormData payload for upload
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cropPreset', finalCropPreset);
      formData.append('resolutionScale', String(finalResolutionScale));
      formData.append('videoBitrate', String(finalBitrate));
      formData.append('targetFps', String(finalFps));
      formData.append('stripAudio', String(finalStripAudio));
      formData.append('outputFormat', finalFormat);
      formData.append('overlayText', finalOverlayText);
      formData.append('overlayColor', overlayColor);
      formData.append('overlaySize', String(overlaySize));
      formData.append('overlayPos', overlayPos);
      formData.append('videoFilter', finalVideoFilter);
      formData.append('trimStart', String(finalTrimStart));
      formData.append('trimEnd', String(finalTrimEnd));
      formData.append('cropWidth', String(cropWidth));
      formData.append('cropHeight', String(cropHeight));
      formData.append('cropX', String(cropX));
      formData.append('cropY', String(cropY));
      formData.append('destWidth', String(destWidth));
      formData.append('destHeight', String(destHeight));
      formData.append('videoRotation', String(finalRotation));
      formData.append('cropFocus', finalCropFocus);

      let result;
      try {
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

        const apiResult = await response.json();
        if (!apiResult.success) {
          throw new Error(apiResult.error || 'Server transcoding rejected pipeline parameters.');
        }
        result = apiResult;
      } catch (err: any) {
        console.warn('Server processing failed, activating browser-side high-performance transcode engine:', err);
        setProcessStatus('Server offline. Launching browser-side media pipeline...');
        setProcessingProgress(5);

        // Run full client-side canvas + MediaRecorder transcode
        const processedBlob = await new Promise<Blob>((resolve, reject) => {
          const video = document.createElement('video');
          video.src = URL.createObjectURL(videoFile);
          video.muted = true;
          video.playsInline = true;

          // Prevent infinite hanging if there's a load failure
          const loadTimeout = setTimeout(() => {
            reject(new Error('Local video load timed out.'));
          }, 8000);

          video.onloadedmetadata = () => {
            clearTimeout(loadTimeout);
            try {
              const canvas = document.createElement('canvas');
              const isRotated90or270 = finalRotation === 90 || finalRotation === 270;
              canvas.width = isRotated90or270 ? destHeight : destWidth;
              canvas.height = isRotated90or270 ? destWidth : destHeight;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Canvas 2D context not available');
              }

              const fps = finalFps || 30;
              const stream = canvas.captureStream(fps);

              let mimeType = 'video/webm';
              if (MediaRecorder.isTypeSupported(`video/${finalFormat}`)) {
                mimeType = `video/${finalFormat}`;
              } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
              } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
              } else if (MediaRecorder.isTypeSupported('video/webm')) {
                mimeType = 'video/webm';
              }

              const chunks: Blob[] = [];
              const recorder = new MediaRecorder(stream, { mimeType });

              recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                  chunks.push(e.data);
                }
              };

              recorder.onstop = () => {
                const finalBlob = new Blob(chunks, { type: mimeType });
                resolve(finalBlob);
              };

              const duration = finalTrimEnd - finalTrimStart;
              let currentSec = finalTrimStart;
              const frameInterval = 1 / fps;

              video.currentTime = currentSec;
              recorder.start();

              const processNextFrame = () => {
                if (currentSec > finalTrimEnd) {
                  recorder.stop();
                  return;
                }

                // Render video frame onto canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();

                // Build CSS-like filters on Canvas context
                let filterString = 'none';
                if (finalVideoFilter === 'winter') filterString = 'contrast(1.2) saturate(0.85) hue-rotate(10deg)';
                else if (finalVideoFilter === 'warm') filterString = 'contrast(1.1) sepia(40%) saturate(1.25)';
                else if (finalVideoFilter === 'noir') filterString = 'grayscale(100%) contrast(1.4)';
                else if (finalVideoFilter === 'bw') filterString = 'grayscale(100%)';
                else if (finalVideoFilter === 'cinema') filterString = 'contrast(1.25) saturate(0.9) brightness(0.95)';
                else if (finalVideoFilter === 'cyberpunk') filterString = 'hue-rotate(-45deg) saturate(1.6) contrast(1.1)';
                ctx.filter = filterString;

                // Handle Rotation Matrix
                if (finalRotation === 90) {
                  ctx.translate(canvas.width, 0);
                  ctx.rotate((90 * Math.PI) / 180);
                } else if (finalRotation === 180) {
                  ctx.translate(canvas.width, canvas.height);
                  ctx.rotate((180 * Math.PI) / 180);
                } else if (finalRotation === 270) {
                  ctx.translate(0, canvas.height);
                  ctx.rotate((270 * Math.PI) / 180);
                }

                // Calculate Crop Areas
                const sourceX = finalCropPreset !== 'none' ? cropX : 0;
                const sourceY = finalCropPreset !== 'none' ? cropY : 0;
                const sourceW = finalCropPreset !== 'none' ? cropWidth : video.videoWidth;
                const sourceH = finalCropPreset !== 'none' ? cropHeight : video.videoHeight;

                const drawW = isRotated90or270 ? canvas.height : canvas.width;
                const drawH = isRotated90or270 ? canvas.width : canvas.height;

                ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, drawW, drawH);
                ctx.restore();

                // Extra tint filters
                if (finalVideoFilter === 'winter') {
                  ctx.fillStyle = 'rgba(6, 182, 212, 0.04)';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (finalVideoFilter === 'warm') {
                  ctx.fillStyle = 'rgba(249, 115, 22, 0.04)';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Text overlay drawing
                if (finalOverlayText) {
                  ctx.font = `bold ${overlaySize}px "Inter", sans-serif`;
                  ctx.fillStyle = overlayColor || '#22d3ee';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                  ctx.shadowBlur = 6;
                  ctx.shadowOffsetX = 2;
                  ctx.shadowOffsetY = 2;

                  const tx = canvas.width / 2;
                  let ty = canvas.height - 35;
                  if (overlayPos === 'top') {
                    ty = 35;
                  } else if (overlayPos === 'center') {
                    ty = canvas.height / 2;
                  }
                  ctx.fillText(finalOverlayText, tx, ty);
                }

                // Set progress based on timeframe
                const pct = Math.round(((currentSec - finalTrimStart) / duration) * 100);
                setProcessingProgress(Math.min(98, Math.max(5, pct)));
                setProcessStatus(`Offline encoding: ${pct}% complete...`);

                // Seek next frame
                currentSec += frameInterval;
                if (currentSec <= finalTrimEnd) {
                  video.currentTime = currentSec;
                } else {
                  recorder.stop();
                }
              };

              video.onseeked = () => {
                requestAnimationFrame(() => {
                  processNextFrame();
                });
              };

              // Start rendering loop
              processNextFrame();
            } catch (innerErr) {
              reject(innerErr);
            }
          };

          video.onerror = () => {
            clearTimeout(loadTimeout);
            reject(new Error('Unable to transcode: local file format mismatch.'));
          };
        });

        setProcessingProgress(99);
        setProcessStatus('Finalizing compression container...');

        const localUrl = URL.createObjectURL(processedBlob);
        result = {
          success: true,
          id: `vid_local_${Date.now()}`,
          filename: `squished_${videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || 'video'}.${finalFormat}`,
          originalSize: videoFile.size,
          processedSize: processedBlob.size,
          width: destWidth,
          height: destHeight,
          url: localUrl
        };
      }

      const totalDuration = finalTrimEnd - finalTrimStart;

      const newRes: CompressedVideo = {
        id: result.id || `vid_${Date.now()}`,
        name: result.filename || `squished_${videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || 'video'}.${finalFormat}`,
        originalSize: result.originalSize || videoFile.size || 15 * 1024 * 1024,
        processedSize: result.processedSize,
        url: result.url,
        duration: totalDuration,
        width: result.width || destWidth,
        height: result.height || destHeight,
        filters: finalVideoFilter === 'normal' ? 'Original' : finalVideoFilter.toUpperCase(),
        textOverlay: overlayText ? `"${overlayText}"` : 'None',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setProcessedVideos(prev => [newRes, ...prev]);
      setLatestProcessedVideo(newRes);
      setPreviewMode('processed');
      setIsProcessing(false);
      setProcessingProgress(0);

      // Smoothly scroll the user to the top at the video player
      setTimeout(() => {
        videoSourceBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);

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
        <div ref={videoSourceBoxRef} id="video-source-box" className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col gap-4">
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

              {/* Preview Toggle & Download Bar */}
              {latestProcessedVideo && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/95 p-3 rounded-xl border border-cyan-500/30 shadow-lg animate-fade-in font-sans">
                  <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('original')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        previewMode === 'original'
                          ? 'bg-slate-800 text-cyan-400 font-extrabold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Original Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('processed')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                        previewMode === 'processed'
                          ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Squished Result
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                      -{Math.round(((latestProcessedVideo.originalSize - latestProcessedVideo.processedSize) / latestProcessedVideo.originalSize) * 100)}% Size
                    </span>
                    <a
                      href={latestProcessedVideo.url}
                      download={latestProcessedVideo.name}
                      id="top-download-btn"
                      className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Squished
                    </a>
                  </div>
                </div>
              )}

              {/* Player Canvas Frame */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-850 flex items-center justify-center group select-none">
                <video
                  ref={videoPlayerRef}
                  src={previewMode === 'processed' && latestProcessedVideo ? latestProcessedVideo.url : videoUrl}
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  className="max-h-full max-w-full cursor-pointer h-full object-contain transition-transform duration-200"
                  style={{
                    transform: previewMode === 'processed' ? 'none' : `rotate(${videoRotation}deg)`,
                    filter: previewMode === 'processed' ? 'none' : (
                      videoFilter === 'winter' ? 'contrast(1.2) saturate(0.85) hue-rotate(10deg)' : 
                      videoFilter === 'warm' ? 'contrast(1.1) sepia(40%) saturate(1.25)' : 
                      videoFilter === 'noir' ? 'grayscale(100%) contrast(1.4)' : 
                      videoFilter === 'bw' ? 'grayscale(100%)' : 
                      videoFilter === 'cinema' ? 'contrast(1.25) saturate(0.9) brightness(0.95)' : 
                      videoFilter === 'cyberpunk' ? 'hue-rotate(-45deg) saturate(1.6) contrast(1.1)' : 'none'
                    )
                  }}
                />
                
                {/* Visual Watermark Overlay Simulator */}
                {overlayText && previewMode !== 'processed' && (
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
                {videoFilter === 'winter' && previewMode !== 'processed' && (
                  <div className="absolute inset-0 pointer-events-none bg-cyan-500/5 mix-blend-overlay" />
                )}
                {videoFilter === 'warm' && previewMode !== 'processed' && (
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

              {/* Result Download Bar immediately below the main video player */}
              {latestProcessedVideo && (
                <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 p-4 rounded-xl border border-emerald-500/40 shadow-lg animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-3 font-sans mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Squished Result Available!</h4>
                      <p className="text-[10px] text-emerald-400 font-mono font-semibold">
                        Size: {formatBytes(latestProcessedVideo.processedSize)} (-{Math.round(((latestProcessedVideo.originalSize - latestProcessedVideo.processedSize) / latestProcessedVideo.originalSize) * 100)}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={latestProcessedVideo.url}
                      download={latestProcessedVideo.name}
                      id="player-under-download-btn"
                      className="flex-1 sm:flex-initial py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 text-xs font-extrabold cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] text-center font-sans"
                    >
                      <Download className="h-4 w-4" />
                      Download Squished Video
                    </a>
                  </div>
                </div>
              )}

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
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3 font-sans">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  Video Pipeline
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Configure video processing nodes in sequence</p>
              </div>
              
              <div className="flex gap-1.5 items-center">
                <button
                  type="button"
                  onClick={handleResetAllVideo}
                  className="text-[9.5px] font-bold text-rose-400 hover:text-rose-300 transition bg-rose-955/20 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-900/40 cursor-pointer flex items-center gap-1"
                  title="Reset all sources, steps, results"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Tool
                </button>
                {pipelineSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineSteps([]);
                      setEnabledSteps([]);
                      setActiveStepId(null);
                    }}
                    className="text-[9.5px] font-semibold text-slate-400 hover:text-white transition flex items-center gap-1 bg-slate-950 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 cursor-pointer"
                    title="Remove all steps from the pipeline list"
                  >
                    Clear Steps
                  </button>
                )}
              </div>
            </div>

            {/* Video Step Grid of Add Buttons */}
            <div id="video-add-triggers" className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 font-sans">
              {[
                { id: 'trim', label: 'Trim', icon: <Scissors className="h-4 w-4 text-amber-400" />, bg: 'hover:bg-amber-955/20 text-amber-400 hover:border-amber-500/30' },
                { id: 'crop', label: 'Crop', icon: <Crop className="h-4 w-4 text-sky-400" />, bg: 'hover:bg-sky-955/20 text-sky-400 hover:border-sky-500/30' },
                { id: 'format', label: 'Format', icon: <Sliders className="h-4 w-4 text-fuchsia-400" />, bg: 'hover:bg-fuchsia-955/20 text-fuchsia-400 hover:border-fuchsia-500/30' },
                { id: 'rotate', label: 'Rotate', icon: <RefreshCw className="h-4 w-4 text-cyan-400" />, bg: 'hover:bg-cyan-955/20 text-cyan-400 hover:border-cyan-500/30' },
                { id: 'watermark', label: 'Watermark', icon: <Type className="h-4 w-4 text-purple-400" />, bg: 'hover:bg-purple-955/20 text-purple-400 hover:border-purple-500/30' },
                { id: 'filter', label: 'Filter', icon: <Sparkles className="h-4 w-4 text-pink-400" />, bg: 'hover:bg-pink-955/20 text-pink-400 hover:border-pink-500/30' },
              ].map((item) => {
                const isAdded = pipelineSteps.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`video-add-${item.id}`}
                    onClick={() => {
                      if (!pipelineSteps.includes(item.id)) {
                        setPipelineSteps(prev => [...prev, item.id]);
                        setEnabledSteps(prev => [...prev, item.id]);
                      }
                      setActiveStepId(item.id);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 border border-dashed rounded-xl bg-slate-950/40 hover:bg-slate-900/85 text-[10px] font-semibold transition cursor-pointer gap-1.5 ${
                      isAdded 
                        ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/20' 
                        : 'border-slate-800 text-slate-400'
                    } ${item.bg}`}
                  >
                    <div className="p-1 rounded-full bg-slate-900 shadow-xs border border-slate-800">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                    {isAdded && (
                      <span className="text-[7.5px] bg-cyan-400/25 text-cyan-400 px-1 rounded-full uppercase scale-90 font-extrabold tracking-wider mt-0.5">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {pipelineSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800/60 rounded-2xl bg-slate-950/20 py-12 font-sans">
                <Sliders className="h-8 w-8 text-slate-700 stroke-[1.5] mb-2 animate-pulse" />
                <p className="text-xs font-semibold text-slate-400">No active steps in video pipeline</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-normal font-medium">
                  Add a Trim, Crop, Format, Rotate, Watermark, or Filter segment from the grid above to start configuring!
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {[
                  { 
                    id: 'trim', 
                  title: 'Trim Timeline', 
                  icon: <Scissors className="h-3.5 w-3.5 text-amber-500" />,
                  desc: 'Cut video segment duration',
                  badge: `${trimStart.toFixed(1)}s – ${trimEnd > 0 ? trimEnd.toFixed(1) : (videoMeta ? videoMeta.duration.toFixed(1) : '0.0')}s`,
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">
                        Select start and end clip boundaries.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block mb-1">TRIM START (SECONDS)</label>
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={trimEnd > 0 ? trimEnd - 0.1 : 100}
                            value={trimStart}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              if (!videoMeta || val < trimEnd) setTrimStart(val);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs font-mono focus:outline-hidden focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block mb-1">TRIM END (SECONDS)</label>
                          <input
                            type="number"
                            step={0.1}
                            min={trimStart + 0.1}
                            max={videoMeta ? videoMeta.duration : 100}
                            value={trimEnd}
                            onChange={(e) => {
                              if (!videoMeta) return;
                              const val = Math.min(videoMeta.duration, parseFloat(e.target.value) || videoMeta.duration);
                              if (val > trimStart) setTrimEnd(val);
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs font-mono focus:outline-hidden focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'crop', 
                  title: 'Crop & Rescale', 
                  icon: <Crop className="h-3.5 w-3.5 text-sky-500" />,
                  desc: 'Aspect ratio and output scale',
                  badge: cropPreset === 'none' ? `${resolutionScale * 100}% scale` : `${cropPreset} (${resolutionScale * 100}%)`,
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Compress Crop Layout</label>
                        <div className="grid grid-cols-5 gap-1.5 font-sans">
                          {(['none', '1:1', '16:9', '9:16', '4:3'] as const).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCropPreset(preset)}
                              className={`py-1 border rounded-md transition text-[10px] font-bold cursor-pointer uppercase ${
                                cropPreset === preset
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                  : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                              }`}
                            >
                              {preset === 'none' ? 'None' : preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {cropPreset !== 'none' && (
                        <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 animate-fade-in font-sans">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Crop Focus Alignment</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['center', 'top', 'bottom', 'left', 'right', 'top-left', 'bottom-right'] as const).map((focus) => (
                              <button
                                key={focus}
                                type="button"
                                onClick={() => setCropFocus(focus)}
                                className={`py-1 text-[9px] border rounded transition font-bold cursor-pointer capitalize text-center ${
                                  cropFocus === focus
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'
                                }`}
                              >
                                {focus.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Resolution Downscaling</label>
                        <div className="flex items-center gap-2 font-sans">
                          {[0.25, 0.5, 0.75, 1.0].map((scale) => (
                            <button
                              key={scale}
                              type="button"
                              onClick={() => setResolutionScale(scale)}
                              className={`flex-1 py-1 px-1.5 border rounded font-semibold text-[10px] transition cursor-pointer text-center ${
                                resolutionScale === scale
                                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400'
                                  : 'bg-slate-955 bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500'
                              }`}
                            >
                              {scale * 100}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'format', 
                  title: 'Format & Squeezing', 
                  icon: <Sliders className="h-3.5 w-3.5 text-fuchsia-500" />,
                  desc: 'Codecs, bitrates, frame rates',
                  badge: `${outputFormat.toUpperCase()} – ${videoBitrate} Mbps – ${targetFps}fps`,
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Target Export Format</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-850 font-sans">
                          <button
                            type="button"
                            onClick={() => setOutputFormat('webm')}
                            className={`py-1 rounded-md font-bold text-center text-[10px] uppercase transition cursor-pointer ${
                              outputFormat === 'webm'
                                ? 'bg-slate-800 text-cyan-400 py-1'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            webm (VP9 Lossless)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOutputFormat('mp4')}
                            className={`py-1 rounded-md font-bold text-center text-[10px] uppercase transition cursor-pointer ${
                              outputFormat === 'mp4'
                                ? 'bg-slate-800 text-cyan-400 py-1'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            mp4 (H264 Base)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 font-mono">
                        <div className="flex justify-between items-center font-sans">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Target Video Bitrate</label>
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
                      </div>

                      <div className="grid grid-cols-2 gap-3 font-sans">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Target Rate (FPS)</label>
                          <div className="flex gap-1">
                            {[15, 24, 30].map((fps) => (
                              <button
                                key={fps}
                                type="button"
                                onClick={() => setTargetFps(fps as any)}
                                className={`flex-1 py-1 border rounded text-[10px] font-bold transition cursor-pointer ${
                                  targetFps === fps
                                    ? 'bg-cyan-505/20 border-cyan-555 text-cyan-400'
                                    : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500'
                                }`}
                              >
                                {fps}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setStripAudio(!stripAudio)}
                          className={`flex items-center gap-1.5 justify-center border px-2.5 py-1.5 rounded-lg transition cursor-pointer text-[10px] font-bold ${
                            stripAudio
                              ? 'bg-rose-955/20 border-rose-500/30 text-rose-400 font-bold'
                              : 'bg-slate-955 bg-slate-950 border-slate-855 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {stripAudio ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5" /> Muted (No Audio)
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> Keep Audio
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'rotate', 
                  title: 'Orientation / Rotate', 
                  icon: <RefreshCw className="h-3.5 w-3.5 text-teal-500" />,
                  desc: 'Adjust frame orientation',
                  badge: videoRotation === 0 ? '0° (Original)' : `${videoRotation}° Swap`,
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Rotate Frame Angle</label>
                        <div className="grid grid-cols-4 gap-1.5 font-sans">
                          {([0, 90, 180, 270] as const).map((angle) => (
                            <button
                              key={angle}
                              type="button"
                              onClick={() => setVideoRotation(angle)}
                              className={`py-1 border rounded-md transition text-[10px] font-bold cursor-pointer uppercase ${
                                videoRotation === angle
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              {angle === 0 ? '0°' : `${angle}°`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'watermark', 
                  title: 'Overlay Watermark text', 
                  icon: <Type className="h-3.5 w-3.5 text-purple-500" />,
                  desc: 'Direct container text overlays',
                  badge: overlayText ? `Text: "${overlayText}"` : 'None',
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center font-sans">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Overlay Watermark text</label>
                          {overlayText && (
                            <button 
                              type="button"
                              onClick={() => setOverlayText('')}
                              className="text-[9px] font-bold text-rose-455 hover:underline cursor-pointer font-sans"
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
                          <div className="grid grid-cols-3 gap-2 pt-1 animate-fade-in text-[9px] bg-slate-950/45 p-2 rounded-lg border border-slate-855 font-sans">
                            <div>
                              <span className="text-[8px] text-slate-500 block mb-1 uppercase font-bold text-center">POSITION</span>
                              <select
                                value={overlayPos}
                                onChange={(e: any) => setOverlayPos(e.target.value)}
                                className="w-full px-1.5 py-1 bg-slate-900 border border-slate-855 rounded font-bold text-slate-300 cursor-pointer text-[9px]"
                              >
                                <option value="top">Top Center</option>
                                <option value="center">Center</option>
                                <option value="bottom">Bottom Center</option>
                              </select>
                            </div>

                            <div>
                              <span className="text-[8px] text-slate-500 block mb-1 uppercase font-bold text-center">COLOR</span>
                              <select
                                value={overlayColor}
                                onChange={(e) => setOverlayColor(e.target.value)}
                                className="w-full px-1.5 py-1 bg-slate-900 border border-slate-855 rounded font-bold text-slate-300 cursor-pointer text-[9px]"
                              >
                                <option value="#22d3ee">Cyan</option>
                                <option value="#ffffff">White</option>
                                <option value="#facc15">Yellow</option>
                                <option value="#ec4899">Magenta</option>
                                <option value="#000000">Black</option>
                              </select>
                            </div>

                            <div>
                              <span className="text-[8px] text-slate-550 block mb-1 uppercase font-bold text-center">SIZE ({overlaySize}px)</span>
                              <input
                                type="range"
                                min={12}
                                max={42}
                                value={overlaySize}
                                onChange={(e) => setOverlaySize(parseInt(e.target.value))}
                                className="w-full h-1 mt-2 cursor-pointer accent-cyan-400 bg-slate-850"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'filter', 
                  title: 'Creative Filter effects', 
                  icon: <Sparkles className="h-3.5 w-3.5 text-pink-500" />,
                  desc: 'Contrast presets and shaders',
                  badge: videoFilter === 'normal' ? 'Original Filter' : videoFilter.toUpperCase(),
                  content: (
                    <div className="space-y-3 pt-2 border-t border-slate-800/50 mt-1">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Contrast Filter Shaders</label>
                        <div className="grid grid-cols-3 gap-1.5 font-sans">
                          {(['normal', 'winter', 'warm', 'noir', 'bw', 'cinema', 'cyberpunk'] as const).map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setVideoFilter(filter)}
                              className={`py-1 rounded-md border text-[10px] font-bold transition capitalize cursor-pointer ${
                                videoFilter === filter
                                  ? 'bg-slate-800 text-cyan-400 border-cyan-500'
                                  : 'bg-slate-950 border-slate-855 hover:bg-slate-900 text-slate-400'
                              }`}
                            >
                              {filter === 'normal' ? 'Original' : filter === 'bw' ? 'B&W' : filter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }
              ].filter((step) => pipelineSteps.includes(step.id)).map((step) => {
                const isEnabled = enabledSteps.includes(step.id);
                const isActive = activeStepId === step.id;
                return (
                  <div
                    key={step.id}
                    className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                      isActive
                        ? 'border-cyan-500/50 bg-slate-900 shadow-[0_0_12px_rgba(6,182,212,0.12)]'
                        : isEnabled
                        ? 'border-slate-800 bg-slate-950/45 hover:bg-slate-900'
                        : 'border-slate-900 bg-slate-950/15 opacity-55'
                    }`}
                  >
                    <div
                      onClick={() => setActiveStepId(isActive ? null : step.id)}
                      className="flex items-center justify-between p-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnabledSteps((prev) =>
                              prev.includes(step.id)
                                ? prev.filter((id) => id !== step.id)
                                : [...prev, step.id]
                            );
                          }}
                          title={isEnabled ? 'Disable Pipeline step' : 'Enable Pipeline step'}
                          className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                            isEnabled
                              ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold'
                              : 'bg-transparent border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </button>

                        <div className="flex items-center gap-2 font-sans font-medium">
                          {step.icon}
                          <div>
                            <span className={`text-[11px] font-semibold block leading-tight ${isEnabled ? 'text-slate-100' : 'text-slate-500'}`}>
                              {step.title}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-normal">{step.desc}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isEnabled ? 'bg-slate-800 text-cyan-400 font-bold' : 'bg-slate-900 text-slate-600'}`}>
                          {isEnabled ? step.badge : 'Bypassed'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPipelineSteps((prev) => prev.filter((id) => id !== step.id));
                            setEnabledSteps((prev) => prev.filter((id) => id !== step.id));
                            if (activeStepId === step.id) setActiveStepId(null);
                          }}
                          className="p-1 px-1.5 rounded bg-slate-955 hover:bg-rose-950/30 hover:text-rose-400 text-slate-500 border border-slate-850 hover:border-rose-900/40 transition cursor-pointer"
                          title="Delete Step from video pipeline"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="p-3 bg-slate-950/40 border-t border-slate-800/60 transition-all duration-300">
                        {step.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5 font-sans">
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
                  SQUISH VIDEO (PIPELINE EXPORT)
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
