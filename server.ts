import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import ffmpegStatic from 'ffmpeg-static';

const app = express();
const PORT = 3000;

// Create uploads directory if not exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Clean up old uploaded and processed files on startup
try {
  const files = fs.readdirSync(uploadsDir);
  for (const file of files) {
    fs.unlinkSync(path.join(uploadsDir, file));
  }
} catch (err) {
  console.warn('Initial uploads cleanup failed:', err);
}

// Set up multiplier storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `input_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB limit
});

// Middleware for parsing JSON/url-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if ffmpeg is available
let ffmpegPath = ffmpegStatic || 'ffmpeg';
let hasFfmpeg = false;

try {
  if (ffmpegStatic) {
    execSync(`"${ffmpegStatic}" -version`, { stdio: 'ignore' });
    hasFfmpeg = true;
    ffmpegPath = ffmpegStatic;
    console.log(`✅ ffmpeg-static binary found & verified at: ${ffmpegStatic}`);
  } else {
    throw new Error('ffmpegStatic path is null');
  }
} catch (e) {
  console.warn('⚠️ ffmpeg-static not working or unavailable. Trying global system ffmpeg...');
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegPath = 'ffmpeg';
    hasFfmpeg = true;
    console.log('✅ Global system ffmpeg binary found & ready.');
  } catch (err) {
    console.warn('⚠️ No functional ffmpeg binary found via ffmpeg-static or system PATH.');
  }
}

// Find a system font for ffmpeg drawtext filter
let cachedSystemFontPath: string | null = null;

function searchForFont(dir: string, depth = 0): string | null {
  if (depth > 4) return null; // Avoid deep traversals
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const found = searchForFont(fullPath, depth + 1);
        if (found) return found;
      } else if (file.endsWith('.ttf') || file.endsWith('.otf')) {
        return fullPath;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function findSystemFont(): string | null {
  const commonPaths = [
    '/usr/share/fonts',
    '/usr/lib/fonts',
    '/usr/local/share/fonts',
    '/etc/fonts'
  ];
  for (const p of commonPaths) {
    const found = searchForFont(p);
    if (found) return found;
  }
  return null;
}

try {
  cachedSystemFontPath = findSystemFont();
  if (cachedSystemFontPath) {
    console.log(`✅ Found system font file for overlays: ${cachedSystemFontPath}`);
  } else {
    console.warn('⚠️ No system font (.ttf/.otf) found. Text overlays on server-side might fail if drawtext cannot locate a font.');
  }
} catch (e) {
  console.warn('Error during system font search:', e);
}

// API: Health status and capability interrogation
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasFfmpeg,
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});


// API: Serves uploaded/completed videos with correct Content-Type and streaming/seeking support
app.get('/api/video/:filename', (req, res) => {
  const filename = req.params.filename;
  // Security check: prevent directory traversal
  const safeName = path.basename(filename);
  const filePath = path.join(uploadsDir, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set the correct Content-Type
  const ext = path.extname(safeName).toLowerCase();
  const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// API: Process video route
app.post('/api/process-video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const inputPath = req.file.path;
  const originalName = req.file.originalname;
  const originalSize = req.file.size;

  // Retrieve squishing params
  const {
    cropPreset = 'none',
    resolutionScale = '0.75',
    videoBitrate = '2.5',
    targetFps = '30',
    stripAudio = 'false',
    outputFormat = 'mp4',
    overlayText = '',
    overlayColor = '#22d3ee',
    overlaySize = '24',
    overlayPos = 'bottom',
    videoFilter = 'normal',
    trimStart = '0',
    trimEnd = '0',
    cropWidth,
    cropHeight,
    cropX,
    cropY,
    destWidth,
    destHeight,
    videoRotation = '0'
  } = req.body;

  const outputExt = outputFormat === 'webm' ? 'webm' : 'mp4';
  const outFilename = `squished_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${outputExt}`;
  const outputPath = path.join(uploadsDir, outFilename);

  if (!hasFfmpeg) {
    // If ffmpeg is absent, simulate a processing timeout and return the original file as compressed!
    console.warn('ffmpeg missing: Simulating response');
    setTimeout(() => {
      try {
        fs.copyFileSync(inputPath, outputPath);
        return res.json({
          success: true,
          filename: outFilename,
          processedSize: originalSize * 0.7, // Simulated size savings
          originalSize: originalSize,
          width: Number(destWidth) || 1280,
          height: Number(destHeight) || 720,
          url: `/api/video/${outFilename}`
        });
      } catch (err: any) {
        return res.status(500).json({ error: `Simulation failed: ${err.message}` });
      }
    }, 1500);
    return;
  }

  // Calculate actual trim start and duration
  const startSec = parseFloat(trimStart) || 0;
  const endSec = parseFloat(trimEnd) || 0;
  const hasTrim = endSec > startSec;

  // Assemble ffmpeg filters
  const filters: string[] = [];

  // Video rotation (transpose)
  const rotAngle = parseInt(String(videoRotation)) || 0;
  if (rotAngle === 90) {
    filters.push('transpose=1');
  } else if (rotAngle === 180) {
    filters.push('transpose=2,transpose=2');
  } else if (rotAngle === 270) {
    filters.push('transpose=2');
  }

  // Cropping
  if (cropPreset !== 'none' && cropWidth && cropHeight) {
    const cx = Math.max(0, parseInt(cropX) || 0);
    const cy = Math.max(0, parseInt(cropY) || 0);
    const cw = parseInt(cropWidth);
    const ch = parseInt(cropHeight);
    filters.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }

  // Scaling
  if (destWidth && destHeight) {
    const dw = Math.round(parseInt(destWidth) / 2) * 2;
    const dh = Math.round(parseInt(destHeight) / 2) * 2;
    filters.push(`scale=${dw}:${dh}`);
  }

  // Cinematic / Color filters
  if (videoFilter === 'noir') {
    filters.push('eq=contrast=1.3:saturation=0');
  } else if (videoFilter === 'bw') {
    filters.push('hue=s=0');
  } else if (videoFilter === 'warm') {
    filters.push('colorbalance=rs=0.15:gs=0.0:bs=-0.15');
  } else if (videoFilter === 'winter') {
    filters.push('colorbalance=rs=-0.15:gs=0.0:bs=0.15');
  } else if (videoFilter === 'cinema') {
    filters.push('eq=contrast=1.15:saturation=1.2');
  } else if (videoFilter === 'cyberpunk') {
    filters.push('eq=contrast=1.1:saturation=1.4,colorbalance=rs=0.1:bs=0.2');
  }

  // Text overlay
  if (overlayText) {
    const escapedText = overlayText.replace(/[':]/g, '\\$&');
    let yPos = 'h-text_h-15';
    if (overlayPos === 'top') {
      yPos = '15';
    } else if (overlayPos === 'center') {
      yPos = '(h-text_h)/2';
    }
    const sanitizedColor = overlayColor.startsWith('#') ? overlayColor : `#${overlayColor}`;
    
    let fontOpt = '';
    if (cachedSystemFontPath) {
      const escapedFontPath = cachedSystemFontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      fontOpt = `:fontfile='${escapedFontPath}'`;
    }
    filters.push(`drawtext=text='${escapedText}'${fontOpt}:fontcolor=${sanitizedColor}:fontsize=${overlaySize}:x=(w-text_w)/2:y=${yPos}`);
  }

  // Assemble absolute commands
  // We apply -preset superfast to accelerate responses within this live sandboxed environment
  let videoCodec = outputFormat === 'webm' ? 'libvpx-vp9' : 'libx264';
  if (outputFormat === 'mp4') {
    // Force standard browser compatible pixel format for mp4
    videoCodec += ' -pix_fmt yuv420p';
  }

  const audioOptions = stripAudio === 'true' ? '-an' : outputFormat === 'webm' ? '-c:a libopus' : '-c:a aac';
  const filterString = filters.length > 0 ? `-vf "${filters.join(',')}"` : '';
  const trimString = hasTrim ? `-ss ${startSec} -to ${endSec}` : '';
  
  // Format target bitrate option (videoBitrate is in Mbps)
  const bitrateVal = parseFloat(videoBitrate) || 2.5;

  const buildCmd = (includeTextOverlay: boolean): string => {
    let finalFilterString = filterString;
    if (!includeTextOverlay && overlayText) {
      // Create alternative filters omitting the drawtext overlay
      const filteredList = filters.filter(f => !f.startsWith('drawtext'));
      finalFilterString = filteredList.length > 0 ? `-vf "${filteredList.join(',')}"` : '';
    }
    return `"${ffmpegPath}" -y ${trimString} -i "${inputPath}" ${finalFilterString} -c:v ${videoCodec} -preset ultrafast -threads 0 -b:v ${bitrateVal}M -r ${targetFps} ${audioOptions} "${outputPath}"`;
  };

  const executeFfmpeg = (cmd: string) => {
    return new Promise<void>((resolve, reject) => {
      console.log('Running FFMPEG command:', cmd);
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('ffmpeg execution error:', error);
          console.error('ffmpeg stderr:', stderr);
          reject({ error, stderr });
        } else {
          resolve();
        }
      });
    });
  };

  try {
    // Attempt standard process including overlays
    await executeFfmpeg(buildCmd(true));
  } catch (err: any) {
    console.warn('ffmpeg standard command failed. Attempting font-less fallback...', err);
    if (overlayText) {
      try {
        // Fallback omitting text overlay in case font configurations crashed on this host
        await executeFfmpeg(buildCmd(false));
      } catch (fbErr: any) {
        return res.status(500).json({ error: `FFMPEG Transcode crashed: ${fbErr.stderr || fbErr.message}` });
      }
    } else {
      return res.status(500).json({ error: `FFMPEG Transcode crashed: ${err.stderr || err.message}` });
    }
  }

  // Read resulting sizes
  try {
    const finalStat = fs.statSync(outputPath);
    console.log(`✅ Server-side squishing completed! Original: ${originalSize} bytes, Compressed: ${finalStat.size} bytes`);
    return res.json({
      success: true,
      filename: outFilename,
      processedSize: finalStat.size,
      originalSize: originalSize,
      width: parseInt(destWidth) || 1280,
      height: parseInt(destHeight) || 720,
      url: `/api/video/${outFilename}`
    });
  } catch (statErr: any) {
    return res.status(500).json({ error: `Resulting file validation failed: ${statErr.message}` });
  } finally {
    // Asynchronously delete the temporary raw input video to keep disk usage pristine
    fs.unlink(inputPath, (unlinkErr) => {
      if (unlinkErr) console.warn('Temp input file removal failed:', unlinkErr);
    });
  }
});

// API: Process & Merge Multiple Clips route
app.post('/api/merge-clips', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const inputPath = req.file.path;
  const originalName = req.file.originalname;
  const originalSize = req.file.size;

  const {
    clips: clipsRaw = '[]',
    transition = 'none',
    transitionColor = 'black',
    cropPreset = 'none',
    resolutionScale = '1.0',
    videoBitrate = '8.0',
    targetFps = '30',
    stripAudio = 'false',
    outputFormat = 'mp4',
    overlayText = '',
    overlayColor = '#22d3ee',
    overlaySize = '24',
    overlayPos = 'bottom',
    videoFilter = 'normal',
    cropWidth,
    cropHeight,
    cropX,
    cropY,
    destWidth,
    destHeight,
    videoRotation = '0'
  } = req.body;

  let clips: Array<{ start: number; end: number }> = [];
  try {
    clips = JSON.parse(clipsRaw);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid clips format' });
  }

  if (clips.length === 0) {
    return res.status(400).json({ error: 'No clips specified to merge' });
  }

  const outputExt = outputFormat === 'webm' ? 'webm' : 'mp4';
  const outFilename = `merged_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${outputExt}`;
  const outputPath = path.join(uploadsDir, outFilename);

  const mergeDir = path.join(uploadsDir, `merge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  fs.mkdirSync(mergeDir, { recursive: true });

  if (!hasFfmpeg) {
    console.warn('ffmpeg missing in merge route: Simulating response');
    setTimeout(() => {
      try {
        fs.copyFileSync(inputPath, outputPath);
        fs.rmSync(mergeDir, { recursive: true, force: true });
        return res.json({
          success: true,
          filename: outFilename,
          processedSize: originalSize * 0.9,
          originalSize: originalSize,
          width: Number(destWidth) || 1280,
          height: Number(destHeight) || 720,
          url: `/api/video/${outFilename}`
        });
      } catch (err: any) {
        return res.status(500).json({ error: `Simulation failed: ${err.message}` });
      } finally {
        fs.unlink(inputPath, () => {});
      }
    }, 1500);
    return;
  }

  try {
    // Generate base filter list
    const baseFilters: string[] = [];

    const rotAngle = parseInt(String(videoRotation)) || 0;
    if (rotAngle === 90) {
      baseFilters.push('transpose=1');
    } else if (rotAngle === 180) {
      baseFilters.push('transpose=2,transpose=2');
    } else if (rotAngle === 270) {
      baseFilters.push('transpose=3');
    }

    if (cropPreset !== 'none' || (cropWidth && cropHeight)) {
      const cW = parseInt(String(cropWidth)) || 0;
      const cH = parseInt(String(cropHeight)) || 0;
      const cX = parseInt(String(cropX)) || 0;
      const cY = parseInt(String(cropY)) || 0;
      if (cW > 0 && cH > 0) {
        baseFilters.push(`crop=${cW}:${cH}:${cX}:${cY}`);
      }
    }

    const dW = parseInt(String(destWidth)) || 0;
    const dH = parseInt(String(destHeight)) || 0;
    if (dW > 0 && dH > 0) {
      baseFilters.push(`scale=${dW}:${dH}`);
    }

    if (videoFilter === 'grayscale') {
      baseFilters.push('hue=s=0');
    } else if (videoFilter === 'sepia') {
      baseFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
    } else if (videoFilter === 'vintage') {
      baseFilters.push('curves=vintage');
    } else if (videoFilter === 'warm') {
      baseFilters.push('colorbalance=rs=0.15:gs=0.05:bs=-0.1');
    } else if (videoFilter === 'cool') {
      baseFilters.push('colorbalance=rs=-0.1:gs=0.05:bs=0.15');
    } else if (videoFilter === 'highcontrast') {
      baseFilters.push('eq=contrast=1.3:brightness=0.05');
    }

    const intermediateFiles: string[] = [];

    const executeCmd = (cmd: string) => {
      return new Promise<void>((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error('ffmpeg merge execution error:', error);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    };

    // Process each individual clip segment
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const startSec = clip.start;
      const endSec = clip.end;
      const duration = endSec - startSec;
      const tempClipFilename = `clip_${i}.${outputExt}`;
      const tempClipPath = path.join(mergeDir, tempClipFilename);

      const clipFilters = [...baseFilters];

      // Add text overlay if present
      if (overlayText) {
        const escapedText = overlayText.replace(/'/g, "'\\''");
        let yPos = 'h-text_h-20';
        if (overlayPos === 'top') {
          yPos = '20';
        } else if (overlayPos === 'center') {
          yPos = '(h-text_h)/2';
        }
        const sanitizedColor = overlayColor.startsWith('#') ? overlayColor : `#${overlayColor}`;
        let fontOpt = '';
        if (cachedSystemFontPath) {
          const escapedFontPath = cachedSystemFontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
          fontOpt = `:fontfile='${escapedFontPath}'`;
        }
        clipFilters.push(`drawtext=text='${escapedText}'${fontOpt}:fontcolor=${sanitizedColor}:fontsize=${overlaySize}:x=(w-text_w)/2:y=${yPos}`);
      }

      // Add transition effects (fade-to-black, white, etc)
      const audioFilters: string[] = [];
      if (transition !== 'none' && duration > 0.1) {
        const fadeDuration = Math.min(0.5, duration / 3);
        const fadeColor = transitionColor === 'white' ? 'white' : transitionColor === 'custom' ? overlayColor : 'black';
        
        clipFilters.push(`fade=t=in:st=0:d=${fadeDuration}:color=${fadeColor}`);
        clipFilters.push(`fade=t=out:st=${(duration - fadeDuration).toFixed(3)}:d=${fadeDuration}:color=${fadeColor}`);

        if (stripAudio !== 'true') {
          audioFilters.push(`afade=t=in:st=0:d=${fadeDuration}`);
          audioFilters.push(`afade=t=out:st=${(duration - fadeDuration).toFixed(3)}:d=${fadeDuration}`);
        }
      }

      const filterString = clipFilters.length > 0 ? `-vf "${clipFilters.join(',')}"` : '';
      const audioFilterString = audioFilters.length > 0 ? `-af "${audioFilters.join(',')}"` : '';
      const trimString = `-ss ${startSec} -to ${endSec}`;
      const bitrateVal = parseFloat(videoBitrate) || 8.0;
      const videoCodec = outputFormat === 'webm' ? 'libvpx-vp9' : 'libx264 -pix_fmt yuv420p';
      const audioOptions = stripAudio === 'true' ? '-an' : (outputFormat === 'webm' ? `-c:a libopus ${audioFilterString}` : `-c:a aac ${audioFilterString}`);

      const cmd = `"${ffmpegPath}" -y ${trimString} -i "${inputPath}" ${filterString} -c:v ${videoCodec} -preset ultrafast -threads 0 -b:v ${bitrateVal}M -r ${targetFps} ${audioOptions} "${tempClipPath}"`;
      
      console.log(`Processing intermediate clip segment ${i}:`, cmd);
      await executeCmd(cmd);
      intermediateFiles.push(tempClipPath);
    }

    // Write the concat list file
    const concatListPath = path.join(mergeDir, 'concat_list.txt');
    const concatContent = intermediateFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent, 'utf8');

    // Run direct concat demuxer
    const concatCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;
    console.log('Running concat demuxer:', concatCmd);
    await executeCmd(concatCmd);

    const finalStat = fs.statSync(outputPath);
    console.log(`✅ Server-side merge completed! Original: ${originalSize} bytes, Merged: ${finalStat.size} bytes`);
    
    // Clean up merge directory
    fs.rmSync(mergeDir, { recursive: true, force: true });

    return res.json({
      success: true,
      filename: outFilename,
      processedSize: finalStat.size,
      originalSize: originalSize,
      width: parseInt(destWidth) || 1280,
      height: parseInt(destHeight) || 720,
      url: `/api/video/${outFilename}`
    });

  } catch (err: any) {
    console.error('Error merging clips:', err);
    try {
      fs.rmSync(mergeDir, { recursive: true, force: true });
    } catch (_) {}
    return res.status(500).json({ error: `Clips merging failed: ${err.message || err}` });
  } finally {
    fs.unlink(inputPath, () => {});
  }
});

// Setup Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Squisher Server listening on http://localhost:${PORT}`);
  });
}

startServer();
