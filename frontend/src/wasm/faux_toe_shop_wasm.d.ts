/* tslint:disable */
/* eslint-disable */

export class ImageBuffer {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Apply brightness adjustment
   * brightness: -1.0 to 1.0 (0.0 = no change)
   */
  brightness(amount: number): void;
  /**
   * Convert HSL to RGB
   */
  hslToRgb(h: number, s: number, l: number): Float32Array;
  /**
   * Convert RGB to HSL
   */
  rgbToHsl(r: number, g: number, b: number): Float32Array;
  /**
   * Apply saturation adjustment
   * saturation: -1.0 to 1.0 (0.0 = no change, -1.0 = grayscale)
   */
  saturation(amount: number): void;
  /**
   * Get the raw pixel data as u8 array (for Canvas putImageData)
   */
  toUint8Array(): Uint8Array;
  /**
   * Create a new ImageBuffer from raw RGBA u8 data
   */
  constructor(width: number, height: number, data: Uint8Array);
  /**
   * Apply Gaussian blur
   * radius: blur radius in pixels (1-100)
   */
  blur(radius: number): void;
  /**
   * Blend another image buffer onto this one
   * mode: 0=normal, 1=multiply, 2=screen, 3=overlay
   */
  blend(other: ImageBuffer, opacity: number, mode: number): void;
  /**
   * Create an empty ImageBuffer
   */
  static empty(width: number, height: number): ImageBuffer;
  /**
   * Apply sepia tone
   */
  sepia(): void;
  /**
   * Invert colors
   */
  invert(): void;
  /**
   * Get buffer length
   */
  getLen(): number;
  /**
   * Get a pointer to the internal buffer for zero-copy access
   */
  getPtr(): number;
  /**
   * Apply contrast adjustment
   * contrast: -1.0 to 1.0 (0.0 = no change)
   */
  contrast(amount: number): void;
  /**
   * Convert to grayscale
   */
  grayscale(): void;
  /**
   * Get the width
   */
  readonly width: number;
  /**
   * Get the height
   */
  readonly height: number;
}

export function init(): void;

/**
 * Process a raw pixel buffer in-place (for use with SharedArrayBuffer)
 * This avoids copying data across the WASM boundary
 */
export function processBrightnessInPlace(pixels: Float32Array, amount: number): void;

export function processContrastInPlace(pixels: Float32Array, amount: number): void;

export function processGrayscaleInPlace(pixels: Float32Array): void;

export function processInvertInPlace(pixels: Float32Array): void;

export function processSaturationInPlace(pixels: Float32Array, amount: number): void;

export function processSepiaInPlace(pixels: Float32Array): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_imagebuffer_free: (a: number, b: number) => void;
  readonly imagebuffer_blend: (a: number, b: number, c: number, d: number) => void;
  readonly imagebuffer_blur: (a: number, b: number) => void;
  readonly imagebuffer_brightness: (a: number, b: number) => void;
  readonly imagebuffer_contrast: (a: number, b: number) => void;
  readonly imagebuffer_empty: (a: number, b: number) => number;
  readonly imagebuffer_getLen: (a: number) => number;
  readonly imagebuffer_getPtr: (a: number) => number;
  readonly imagebuffer_grayscale: (a: number) => void;
  readonly imagebuffer_height: (a: number) => number;
  readonly imagebuffer_hslToRgb: (a: number, b: number, c: number, d: number) => [number, number];
  readonly imagebuffer_invert: (a: number) => void;
  readonly imagebuffer_new: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly imagebuffer_rgbToHsl: (a: number, b: number, c: number, d: number) => [number, number];
  readonly imagebuffer_saturation: (a: number, b: number) => void;
  readonly imagebuffer_sepia: (a: number) => void;
  readonly imagebuffer_toUint8Array: (a: number) => [number, number];
  readonly imagebuffer_width: (a: number) => number;
  readonly processBrightnessInPlace: (a: number, b: number, c: any, d: number) => void;
  readonly processContrastInPlace: (a: number, b: number, c: any, d: number) => void;
  readonly processGrayscaleInPlace: (a: number, b: number, c: any) => void;
  readonly processInvertInPlace: (a: number, b: number, c: any) => void;
  readonly processSaturationInPlace: (a: number, b: number, c: any, d: number) => void;
  readonly processSepiaInPlace: (a: number, b: number, c: any) => void;
  readonly init: () => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
