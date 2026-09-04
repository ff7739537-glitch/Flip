/**
 * Media compression utility for FLIP.
 * Automatically compresses images, audio, and video before upload to reduce
 * file sizes and bandwidth usage. Uses browser-native Canvas, Web Audio, and MediaRecorder APIs.
 */

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  type: string;
}

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.72;
const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = file.type === 'image/png' && originalSize < 200 * 1024 ? 'image/png' : 'image/jpeg';
  const compressedDataUrl = canvas.toDataURL(outputType, IMAGE_QUALITY);
  const blob = dataURLToBlob(compressedDataUrl);

  return {
    blob,
    dataUrl: compressedDataUrl,
    originalSize,
    compressedSize: blob.size,
    compressionRatio: originalSize > 0 ? Math.round((1 - blob.size / originalSize) * 100) : 0,
    type: outputType,
  };
}

export async function compressAudio(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('audio/')) {
    throw new Error('File is not audio');
  }

  // For small files, just return as-is
  if (originalSize <= MAX_AUDIO_SIZE / 5) {
    const dataUrl = await readFileAsDataURL(file);
    return {
      blob: file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      type: file.type,
    };
  }

  // Use Web Audio API to re-encode at lower bitrate
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
      Math.min(audioBuffer.numberOfChannels, 2),
      audioBuffer.length,
      Math.min(audioBuffer.sampleRate, 44100),
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV (PCM) - most compatible compressed-ish format available without external libs
    const wavBlob = audioBufferToWav(renderedBuffer);
    const wavDataUrl = await blobToDataURL(wavBlob);

    return {
      blob: wavBlob,
      dataUrl: wavDataUrl,
      originalSize,
      compressedSize: wavBlob.size,
      compressionRatio: originalSize > 0 ? Math.round((1 - wavBlob.size / originalSize) * 100) : 0,
      type: 'audio/wav',
    };
  } catch {
    // Fallback: return original
    const dataUrl = await readFileAsDataURL(file);
    return {
      blob: file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      type: file.type,
    };
  }
}

export async function compressVideo(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('video/')) {
    throw new Error('File is not a video');
  }

  // For videos, use MediaRecorder to re-encode at lower resolution/bitrate
  try {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });

    const targetWidth = Math.min(video.videoWidth, 854);
    const targetHeight = Math.min(video.videoHeight, 480);
    const scale = Math.min(targetWidth / video.videoWidth, targetHeight / video.videoHeight, 1);
    const outWidth = Math.round(video.videoWidth * scale);
    const outHeight = Math.round(video.videoHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const stream = canvas.captureStream(30);
    const audioStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 800_000,
      audioBitsPerSecond: 64_000,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start();
    video.play();

    const duration = Math.min(video.duration || 30, 30);
    const fps = 30;
    const frameInterval = 1000 / fps;
    let elapsed = 0;

    const drawFrame = () => {
      if (video.ended || elapsed >= duration * 1000) {
        recorder.stop();
        return;
      }
      ctx.drawImage(video, 0, 0, outWidth, outHeight);
      elapsed += frameInterval;
      setTimeout(drawFrame, frameInterval);
    };
    drawFrame();

    const compressedBlob = await finished;
    URL.revokeObjectURL(video.src);

    if (compressedBlob.size >= originalSize) {
      const dataUrl = await readFileAsDataURL(file);
      return {
        blob: file,
        dataUrl,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        type: file.type,
      };
    }

    const compressedDataUrl = await blobToDataURL(compressedBlob);
    return {
      blob: compressedBlob,
      dataUrl: compressedDataUrl,
      originalSize,
      compressedSize: compressedBlob.size,
      compressionRatio: Math.round((1 - compressedBlob.size / originalSize) * 100),
      type: mimeType,
    };
  } catch {
    const dataUrl = await readFileAsDataURL(file);
    return {
      blob: file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      type: file.type,
    };
  }
}

export async function compressMedia(file: File): Promise<CompressionResult> {
  if (file.type.startsWith('image/')) return compressImage(file);
  if (file.type.startsWith('audio/')) return compressAudio(file);
  if (file.type.startsWith('video/')) return compressVideo(file);
  throw new Error(`Unsupported media type: ${file.type}`);
}

export function shouldCompress(file: File): boolean {
  if (file.type.startsWith('image/')) return file.size > 100 * 1024;
  if (file.type.startsWith('audio/')) return file.size > MAX_AUDIO_SIZE / 5;
  if (file.type.startsWith('video/')) return file.size > MAX_VIDEO_SIZE / 5;
  return false;
}

export { formatBytes };

// --- Helpers ---

function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function dataURLToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
