/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AspectRatioType = '1:1' | '4:3' | '16:9' | '3:2' | '2:3' | 'custom';

export type CropAnchor =
  | 'center'
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export type StepType = 'crop' | 'resize' | 'convert' | 'compress' | 'rotate' | 'remove-bg';

export interface RotateStepConfig {
  angle: 90 | 180 | 270;
}

export interface RemoveBgStepConfig {
  method: 'ai-dominant' | 'chroma-key' | 'border-bleed' | 'luminance';
  chromaColor: string; // custom color like '#00ff00' for keyer
  tolerance: number; // 0 to 120 (higher tolerance picks up wider gamut shade offsets)
  feather: number; // 0 to 20px of soft alpha feathering
  decontaminate: boolean; // Fringe removal
  replacementType: 'transparent' | 'solid' | 'gradient';
  replaceSolidColor: string;
  replaceGradientStart: string;
  replaceGradientEnd: string;
}

export interface CropStepConfig {
  mode: 'ratio' | 'pixels' | 'percentage';
  aspectRatio: AspectRatioType;
  customRatioX: number;
  customRatioY: number;
  width: number;
  height: number;
  percentage: number;
  anchor: CropAnchor;
}

export interface ResizeStepConfig {
  mode: 'percentage' | 'longest-side' | 'pixels';
  percentage: number;
  longestSide: number;
  width: number;
  height: number;
  keepAspectRatio: boolean;
}

export interface ConvertStepConfig {
  format: 'webp' | 'png' | 'jpeg' | 'tiff' | 'gif' | 'bmp' | 'avif';
  webpQuality: number; // For webp aggressive compression
  jpgQuality: number;
}

export interface CompressStepConfig {
  quality: number;
  reduceResolutionPercentage: number; // 0% = no change, otherwise reduces dimension by %
}

export interface PipelineStep {
  id: string;
  type: StepType;
  enabled: boolean;
  cropConfig?: CropStepConfig;
  resizeConfig?: ResizeStepConfig;
  convertConfig?: ConvertStepConfig;
  compressConfig?: CompressStepConfig;
  rotateConfig?: RotateStepConfig;
  removeBgConfig?: RemoveBgStepConfig;
}

export interface SourceFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string; // If uploaded as part of folder
  originalUrl: string; // Object URL for preview
}

export interface ProcessedResult {
  id: string;
  sourceId: string;
  name: string;
  originalSize: number;
  processedSize: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
  processedUrl?: string; // Object URL for preview/download
  blob?: Blob;
  mimeType?: string;
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
}

export interface CollisionSettings {
  behavior: 'auto-number' | 'overwrite' | 'ask';
  outputFolderName: string; // for folder results default is "Processed"
}

