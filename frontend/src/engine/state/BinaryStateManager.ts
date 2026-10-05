/**
 * Binary State Manager
 *
 * Manages canvas state using binary (TypedArray) representations
 * instead of JSON serialization for maximum performance.
 */

import type { CanvasState, LayerState, Rect } from './types';

export class BinaryStateManager {
  private width: number;
  private height: number;
  private layers: Map<string, LayerState> = new Map();
  private activeLayerId: string = '';
  private backgroundColor: string = '#ffffff';

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Initialize a new layer with empty pixels
   */
  createLayer(id: string, name: string): LayerState {
    const pixelCount = this.width * this.height * 4;
    const layer: LayerState = {
      id,
      name,
      visible: true,
      opacity: 1.0,
      locked: false,
      blendMode: 'normal',
      pixels: new Float32Array(pixelCount), // RGBA as 0-1 floats
      bounds: { x: 0, y: 0, width: this.width, height: this.height },
      dirtyRegion: null,
    };

    // Initialize alpha to 0 (transparent)
    for (let i = 3; i < pixelCount; i += 4) {
      layer.pixels![i] = 0;
    }

    this.layers.set(id, layer);
    return layer;
  }

  /**
   * Create layer from ImageData
   */
  createLayerFromImageData(id: string, name: string, imageData: ImageData): LayerState {
    const layer = this.createLayer(id, name);

    // Convert Uint8 [0-255] to Float32 [0-1]
    const pixels = layer.pixels!;
    const data = imageData.data;

    for (let i = 0; i < data.length; i++) {
      pixels[i] = data[i] / 255;
    }

    return layer;
  }

  /**
   * Get layer by ID
   */
  getLayer(id: string): LayerState | undefined {
    return this.layers.get(id);
  }

  /**
   * Delete layer
   */
  deleteLayer(id: string): boolean {
    return this.layers.delete(id);
  }

  /**
   * Get all layers in order
   */
  getLayers(): LayerState[] {
    return Array.from(this.layers.values());
  }

  /**
   * Set active layer
   */
  setActiveLayer(id: string): void {
    this.activeLayerId = id;
  }

  /**
   * Get the current canvas state (for serialization if needed)
   */
  getState(): CanvasState {
    return {
      width: this.width,
      height: this.height,
      layers: this.getLayers(),
      activeLayerId: this.activeLayerId,
      backgroundColor: this.backgroundColor,
    };
  }

  /**
   * Get a region of pixels from a layer
   * Returns a new Float32Array containing just the region
   */
  getRegion(layerId: string, region: Rect): Float32Array | null {
    const layer = this.layers.get(layerId);
    if (!layer?.pixels) return null;

    const { x, y, width, height } = region;
    const result = new Float32Array(width * height * 4);

    for (let row = 0; row < height; row++) {
      const srcOffset = ((y + row) * this.width + x) * 4;
      const dstOffset = row * width * 4;
      result.set(layer.pixels.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    return result;
  }

  /**
   * Set a region of pixels in a layer
   */
  setRegion(layerId: string, region: Rect, pixels: Float32Array): void {
    const layer = this.layers.get(layerId);
    if (!layer?.pixels) return;

    const { x, y, width, height } = region;

    for (let row = 0; row < height; row++) {
      const srcOffset = row * width * 4;
      const dstOffset = ((y + row) * this.width + x) * 4;
      layer.pixels.set(pixels.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    // Mark region as dirty
    layer.dirtyRegion = this.expandRect(layer.dirtyRegion, region);
  }

  /**
   * Convert layer to ImageData for canvas rendering
   */
  layerToImageData(layerId: string): ImageData | null {
    const layer = this.layers.get(layerId);
    if (!layer?.pixels) return null;

    const data = new Uint8ClampedArray(layer.pixels.length);

    // Convert Float32 [0-1] to Uint8 [0-255]
    for (let i = 0; i < layer.pixels.length; i++) {
      data[i] = Math.round(Math.max(0, Math.min(1, layer.pixels[i])) * 255);
    }

    return new ImageData(data, this.width, this.height);
  }

  /**
   * Composite all visible layers into a single ImageData
   */
  composite(): ImageData {
    const result = new Float32Array(this.width * this.height * 4);

    // Start with background color
    const bg = this.parseColor(this.backgroundColor);
    for (let i = 0; i < result.length; i += 4) {
      result[i] = bg.r;
      result[i + 1] = bg.g;
      result[i + 2] = bg.b;
      result[i + 3] = 1.0;
    }

    // Composite each visible layer from bottom to top
    for (const layer of this.layers.values()) {
      if (!layer.visible || !layer.pixels) continue;

      this.blendLayer(result, layer);
    }

    // Convert to ImageData
    const data = new Uint8ClampedArray(result.length);
    for (let i = 0; i < result.length; i++) {
      data[i] = Math.round(Math.max(0, Math.min(1, result[i])) * 255);
    }

    return new ImageData(data, this.width, this.height);
  }

  /**
   * Blend a layer onto the result buffer
   */
  private blendLayer(result: Float32Array, layer: LayerState): void {
    const src = layer.pixels!;
    const opacity = layer.opacity;

    for (let i = 0; i < result.length; i += 4) {
      const srcA = src[i + 3] * opacity;
      if (srcA === 0) continue;

      const dstA = result[i + 3];
      const outA = srcA + dstA * (1 - srcA);

      if (outA > 0) {
        // Normal blend mode
        result[i] = (src[i] * srcA + result[i] * dstA * (1 - srcA)) / outA;
        result[i + 1] = (src[i + 1] * srcA + result[i + 1] * dstA * (1 - srcA)) / outA;
        result[i + 2] = (src[i + 2] * srcA + result[i + 2] * dstA * (1 - srcA)) / outA;
        result[i + 3] = outA;
      }
    }
  }

  /**
   * Parse hex color to RGB floats
   */
  private parseColor(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 1, g: 1, b: 1 };

    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }

  /**
   * Expand a rect to include another rect
   */
  private expandRect(existing: Rect | null, newRect: Rect): Rect {
    if (!existing) return newRect;

    const x = Math.min(existing.x, newRect.x);
    const y = Math.min(existing.y, newRect.y);
    const right = Math.max(existing.x + existing.width, newRect.x + newRect.width);
    const bottom = Math.max(existing.y + existing.height, newRect.y + newRect.height);

    return { x, y, width: right - x, height: bottom - y };
  }

  /**
   * Clear dirty regions after rendering
   */
  clearDirtyRegions(): void {
    for (const layer of this.layers.values()) {
      layer.dirtyRegion = null;
    }
  }

  /**
   * Get memory usage estimate in bytes
   */
  getMemoryUsage(): number {
    let total = 0;
    for (const layer of this.layers.values()) {
      if (layer.pixels) {
        total += layer.pixels.byteLength;
      }
    }
    return total;
  }
}
