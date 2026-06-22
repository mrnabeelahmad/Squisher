/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PipelineStep, CropAnchor, AspectRatioType } from '../types';

/**
 * Loads an image URL into an HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image file. Please check if the file is a valid image.'));
    img.src = url;
  });
}

/**
 * Calculates anchor coordinates for cropping
 */
export function getAnchorCoordinates(
  W: number,
  H: number,
  CW: number,
  CH: number,
  anchor: CropAnchor
): { sx: number; sy: number } {
  let sx = 0;
  let sy = 0;

  switch (anchor) {
    case 'center':
      sx = (W - CW) / 2;
      sy = (H - CH) / 2;
      break;
    case 'top-left':
      sx = 0;
      sy = 0;
      break;
    case 'top':
      sx = (W - CW) / 2;
      sy = 0;
      break;
    case 'top-right':
      sx = W - CW;
      sy = 0;
      break;
    case 'left':
      sx = 0;
      sy = (H - CH) / 2;
      break;
    case 'right':
      sx = W - CW;
      sy = (H - CH) / 2;
      break;
    case 'bottom-left':
      sx = 0;
      sy = H - CH;
      break;
    case 'bottom':
      sx = (W - CW) / 2;
      sy = H - CH;
      break;
    case 'bottom-right':
      sx = W - CW;
      sy = H - CH;
      break;
  }

  // Clamping to avoid drawing outside bounds
  return {
    sx: Math.max(0, Math.min(W - CW, Math.round(sx))),
    sy: Math.max(0, Math.min(H - CH, Math.round(sy))),
  };
}

/**
 * Resolves width and height for aspect ratios
 */
export function getRatioDimensions(
  W: number,
  H: number,
  ratioType: AspectRatioType,
  customX: number,
  customY: number
): { cw: number; ch: number } {
  let ratio = 1;

  switch (ratioType) {
    case '1:1':
      ratio = 1;
      break;
    case '4:3':
      ratio = 4 / 3;
      break;
    case '16:9':
      ratio = 16 / 9;
      break;
    case '3:2':
      ratio = 3 / 2;
      break;
    case '2:3':
      ratio = 2 / 3;
      break;
    case 'custom':
      ratio = (customX > 0 && customY > 0) ? customX / customY : 1;
      break;
  }

  let cw = W;
  let ch = H;

  // Fit maximal bounding crop region with given ratio
  if (W / H > ratio) {
    // Current aspect is wider than target aspect, height is the constraint
    ch = H;
    cw = H * ratio;
  } else {
    // Current aspect is taller than target aspect, width is the constraint
    cw = W;
    ch = W / ratio;
  }

  return { cw: Math.round(cw), ch: Math.round(ch) };
}

/**
 * Executes the series of pipeline steps on an image
 */
export async function processPipeline(
  img: HTMLImageElement,
  steps: PipelineStep[],
  originalMimeType: string
): Promise<{
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}> {
  // We initialize the canvas with the loaded image dimensions
  let currentWidth = img.naturalWidth;
  let currentHeight = img.naturalHeight;

  let canvas = document.createElement('canvas');
  canvas.width = currentWidth;
  canvas.height = currentHeight;

  let ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create Canvas 2D Context');
  }

  // Draw initial image
  ctx.drawImage(img, 0, 0);

  // Default formats and qualities
  let targetMimeType = originalMimeType;
  // If original mime-type is unrecognized, default to image/png or webp
  if (!targetMimeType || !targetMimeType.startsWith('image/')) {
    targetMimeType = 'image/png';
  }

  let webpQuality = 0.75; // Default sweet spot for quality / size ratio
  let jpgQuality = 0.85;
  let compressQuality: number | null = null;
  let compressReduceResolutionPattern = 0; // percentage

  // Run each pipeline step sequentially
  for (const step of steps) {
    if (!step.enabled) continue;

    switch (step.type) {
      case 'crop': {
        const cfg = step.cropConfig;
        if (!cfg) break;

        let cw = currentWidth;
        let ch = currentHeight;

        if (cfg.mode === 'ratio') {
          const dims = getRatioDimensions(currentWidth, currentHeight, cfg.aspectRatio, cfg.customRatioX, cfg.customRatioY);
          cw = dims.cw;
          ch = dims.ch;
        } else if (cfg.mode === 'pixels') {
          // Absolute pixels, clamped to bounds
          cw = Math.min(currentWidth, cfg.width > 0 ? cfg.width : currentWidth);
          ch = Math.min(currentHeight, cfg.height > 0 ? cfg.height : currentHeight);
        } else if (cfg.mode === 'percentage') {
          const pct = Math.max(1, Math.min(100, cfg.percentage));
          cw = Math.round(currentWidth * (pct / 100));
          ch = Math.round(currentHeight * (pct / 100));
        }

        const { sx, sy } = getAnchorCoordinates(currentWidth, currentHeight, cw, ch, cfg.anchor);

        // Create new cropped surface
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(canvas, sx, sy, cw, ch, 0, 0, cw, ch);
          canvas = cropCanvas;
          ctx = cropCtx;
          currentWidth = cw;
          currentHeight = ch;
        }
        break;
      }

      case 'resize': {
        const cfg = step.resizeConfig;
        if (!cfg) break;

        let rw = currentWidth;
        let rh = currentHeight;

        if (cfg.mode === 'percentage') {
          const pct = Math.max(1, cfg.percentage);
          rw = Math.round(currentWidth * (pct / 100));
          rh = Math.round(currentHeight * (pct / 100));
        } else if (cfg.mode === 'longest-side') {
          const target = cfg.longestSide;
          if (target > 0) {
            if (currentWidth >= currentHeight) {
              rw = target;
              rh = Math.round(currentHeight * (target / currentWidth));
            } else {
              rh = target;
              rw = Math.round(currentWidth * (target / currentHeight));
            }
          }
        } else if (cfg.mode === 'pixels') {
          const tw = cfg.width > 0 ? cfg.width : currentWidth;
          const th = cfg.height > 0 ? cfg.height : currentHeight;

          if (cfg.keepAspectRatio) {
            const ratio = currentWidth / currentHeight;
            const targetRatio = tw / th;
            if (ratio > targetRatio) {
              rw = tw;
              rh = Math.round(tw / ratio);
            } else {
              rh = th;
              rw = Math.round(th * ratio);
            }
          } else {
            rw = tw;
            rh = th;
          }
        }

        // Avoid zero dimensions
        rw = Math.max(1, rw);
        rh = Math.max(1, rh);

        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = rw;
        resizeCanvas.height = rh;
        const resizeCtx = resizeCanvas.getContext('2d');
        if (resizeCtx) {
          // Disable smoothing if magnifying extensively, otherwise keep standard bicubic mapping
          resizeCtx.imageSmoothingEnabled = true;
          resizeCtx.imageSmoothingQuality = 'high';
          resizeCtx.drawImage(canvas, 0, 0, currentWidth, currentHeight, 0, 0, rw, rh);
          canvas = resizeCanvas;
          ctx = resizeCtx;
          currentWidth = rw;
          currentHeight = rh;
        }
        break;
      }

      case 'convert': {
        const cfg = step.convertConfig;
        if (!cfg) break;

        if (cfg.format === 'webp') {
          targetMimeType = 'image/webp';
          webpQuality = cfg.webpQuality / 100; // slider is 0 - 100
        } else if (cfg.format === 'jpeg') {
          targetMimeType = 'image/jpeg';
          jpgQuality = cfg.jpgQuality / 100;
        } else if (cfg.format === 'png') {
          targetMimeType = 'image/png';
        }
        break;
      }

      case 'compress': {
        const cfg = step.compressConfig;
        if (!cfg) break;

        compressQuality = cfg.quality / 100;
        compressReduceResolutionPattern = cfg.reduceResolutionPercentage;
        break;
      }
    }
  }

  // If compression resolution adjustment is selected, perform it right before blob packaging
  if (compressReduceResolutionPattern > 0) {
    const scale = (100 - compressReduceResolutionPattern) / 100;
    const cw = Math.max(1, Math.round(currentWidth * scale));
    const ch = Math.max(1, Math.round(currentHeight * scale));

    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = cw;
    scaleCanvas.height = ch;
    const scaleCtx = scaleCanvas.getContext('2d');
    if (scaleCtx) {
      scaleCtx.imageSmoothingEnabled = true;
      scaleCtx.imageSmoothingQuality = 'high';
      scaleCtx.drawImage(canvas, 0, 0, currentWidth, currentHeight, 0, 0, cw, ch);
      canvas = scaleCanvas;
      currentWidth = cw;
      currentHeight = ch;
    }
  }

  // Determine export quality: if compression step specified quality, it overrides conversion quality
  let finalQuality = 1.0;
  if (targetMimeType === 'image/webp') {
    finalQuality = compressQuality !== null ? compressQuality : webpQuality;
  } else if (targetMimeType === 'image/jpeg') {
    finalQuality = compressQuality !== null ? compressQuality : jpgQuality;
  }

  // Export to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            mimeType: targetMimeType,
            width: currentWidth,
            height: currentHeight,
          });
        } else {
          reject(new Error('Failed to encode final canvas image to blob format.'));
        }
      },
      targetMimeType,
      targetMimeType === 'image/png' ? undefined : finalQuality
    );
  });
}
