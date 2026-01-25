/**
 * FFmpeg CLI client
 * Provides typed access to ffmpeg commands for audio/video processing
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * FFmpeg input/output options
 */
export interface FfmpegIOOptions {
  /** Input file */
  i?: string | string[];
  /** Output file (positional) */
  output?: string;
  /** Overwrite output file without asking */
  y?: boolean;
  /** Do not overwrite output file */
  n?: boolean;
}

/**
 * FFmpeg video options
 */
export interface FfmpegVideoOptions {
  /** Video codec */
  vcodec?: string;
  /** Alias for vcodec */
  'c:v'?: string;
  /** Video bitrate */
  'b:v'?: string;
  /** Frame rate */
  r?: number;
  /** Frame size (WxH) */
  s?: string;
  /** Aspect ratio */
  aspect?: string;
  /** Disable video */
  vn?: boolean;
  /** Video frames to output */
  vframes?: number;
  /** Video filter */
  vf?: string;
  /** Pixel format */
  pixFmt?: string;
  /** Constant Rate Factor (quality) */
  crf?: number;
  /** Encoding preset */
  preset?: string;
  /** Encoding tune */
  tune?: string;
  /** Encoding profile */
  profile?: string;
  /** Encoding level */
  level?: string;
}

/**
 * FFmpeg audio options
 */
export interface FfmpegAudioOptions {
  /** Audio codec */
  acodec?: string;
  /** Alias for acodec */
  'c:a'?: string;
  /** Audio bitrate */
  'b:a'?: string;
  /** Audio sample rate */
  ar?: number;
  /** Audio channels */
  ac?: number;
  /** Disable audio */
  an?: boolean;
  /** Audio frames to output */
  aframes?: number;
  /** Audio filter */
  af?: string;
  /** Audio quality */
  aq?: number;
}

/**
 * FFmpeg timing options
 */
export interface FfmpegTimingOptions {
  /** Start time offset */
  ss?: string;
  /** Duration */
  t?: string;
  /** Stop time */
  to?: string;
  /** Seek to timestamp */
  sseof?: string;
}

/**
 * FFmpeg format options
 */
export interface FfmpegFormatOptions {
  /** Force input/output format */
  f?: string;
  /** Container format */
  format?: string;
  /** Copy codec (no re-encoding) */
  c?: 'copy';
  /** Map streams */
  map?: string | string[];
}

/**
 * FFmpeg metadata options
 */
export interface FfmpegMetadataOptions {
  /** Set metadata */
  metadata?: string | string[];
  /** Map metadata */
  mapMetadata?: string;
}

/**
 * Combined FFmpeg options
 */
export interface FfmpegOptions
  extends FfmpegIOOptions,
    FfmpegVideoOptions,
    FfmpegAudioOptions,
    FfmpegTimingOptions,
    FfmpegFormatOptions,
    FfmpegMetadataOptions {
  /** Additional raw arguments */
  [key: string]: unknown;
}

/**
 * FFmpeg main commands
 */
export interface FfmpegCommands {
  (input: string, args?: Omit<FfmpegOptions, 'i'>): Promise<string>;
  (args?: FfmpegOptions): Promise<string>;
}

/**
 * FFprobe output format
 */
export type FfprobeFormat = 'json' | 'xml' | 'csv' | 'flat' | 'ini' | 'default';

/**
 * FFprobe options
 */
export interface FfprobeOptions {
  /** Show format info */
  showFormat?: boolean;
  /** Show streams info */
  showStreams?: boolean;
  /** Show chapters */
  showChapters?: boolean;
  /** Show programs */
  showPrograms?: boolean;
  /** Show packets */
  showPackets?: boolean;
  /** Show frames */
  showFrames?: boolean;
  /** Output format */
  printFormat?: FfprobeFormat;
  /** Alias for printFormat */
  of?: FfprobeFormat;
  /** Select streams */
  selectStreams?: string;
  /** Show entries */
  showEntries?: string;
  /** Pretty print */
  pretty?: boolean;
  /** Hide banner */
  hideBanner?: boolean;
}

/**
 * FFprobe commands
 */
export interface FfprobeCommands {
  (input: string, args?: FfprobeOptions): Promise<string>;
}

/**
 * FFmpeg CLI client interface
 */
export interface FfmpegClient extends CliClientProxy {
  /** Main ffmpeg command */
  (input: string, args?: Omit<FfmpegOptions, 'i'>): Promise<string>;
  (args?: FfmpegOptions): Promise<string>;
}

/**
 * FFprobe CLI client interface
 */
export interface FfprobeClient extends CliClientProxy {
  (input: string, args?: FfprobeOptions): Promise<string>;
}

/**
 * Pre-configured FFmpeg CLI client
 *
 * @example
 * // Convert video format
 * await ffmpeg('input.mp4', { output: 'output.webm', y: true });
 *
 * // Extract audio
 * await ffmpeg('video.mp4', { vn: true, acodec: 'mp3', output: 'audio.mp3' });
 *
 * // Trim video
 * await ffmpeg('input.mp4', { ss: '00:01:00', t: '30', output: 'clip.mp4' });
 *
 * // Scale video
 * await ffmpeg('input.mp4', { vf: 'scale=1280:720', output: 'scaled.mp4' });
 */
export const ffmpeg = createCliClient({
  command: 'ffmpeg',
  argOptions: {
    kebabCase: true,
    prefix: '-',
  },
}) as unknown as FfmpegClient;

/**
 * Pre-configured FFprobe CLI client
 *
 * @example
 * // Get video info as JSON
 * const info = await ffprobe('video.mp4', {
 *   showFormat: true,
 *   showStreams: true,
 *   printFormat: 'json',
 * });
 */
export const ffprobe = createCliClient({
  command: 'ffprobe',
  argOptions: {
    kebabCase: true,
    prefix: '-',
  },
}) as unknown as FfprobeClient;

/**
 * Get an ffmpeg client instance
 * @returns ffmpeg client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): FfmpegClient => ffmpeg;

export default ffmpeg;
