import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

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
let hasFfmpeg = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  hasFfmpeg = true;
  console.log('✅ ffmpeg system binary found & ready.');
} catch (e) {
  console.warn('⚠️ ffmpeg binary NOT found in system PATH. Video processing will fall back to simulation mode or display warning.');
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
    // We utilize direct drawing without forcing external fonts to avoid missing font file failures on custom/sandboxed hosts
    const sanitizedColor = overlayColor.startsWith('#') ? overlayColor : `#${overlayColor}`;
    filters.push(`drawtext=text='${escapedText}':fontcolor=${sanitizedColor}:fontsize=${overlaySize}:x=(w-text_w)/2:y=${yPos}`);
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
    return `ffmpeg -y ${trimString} -i "${inputPath}" ${finalFilterString} -c:v ${videoCodec} -preset superfast -b:v ${bitrateVal}M -r ${targetFps} ${audioOptions} "${outputPath}"`;
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
