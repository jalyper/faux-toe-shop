/**
 * Tests for WasmFilterEngine
 *
 * Note: In Jest/Node environment, WASM may not load, so these tests
 * verify the JS fallback works correctly. The WASM path is tested
 * in browser integration tests.
 */

import { WasmFilterEngine } from '../filters/WasmFilterEngine';

// Polyfill ImageData for Node environment
class ImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height ?? data.length / (width * 4);
  }
}

// @ts-ignore - polyfill for Node environment
if (typeof ImageData === 'undefined') {
  // @ts-ignore
  global.ImageData = ImageDataPolyfill;
}

describe('WasmFilterEngine', () => {
  let engine: WasmFilterEngine;

  beforeEach(() => {
    engine = new WasmFilterEngine();
  });

  describe('initialization', () => {
    it('should initialize without throwing', async () => {
      await expect(engine.init()).resolves.toBeDefined();
    });

    it('should handle multiple init calls', async () => {
      const result1 = await engine.init();
      const result2 = await engine.init();
      expect(result1).toBe(result2);
    });
  });

  describe('applyFilters with JS fallback', () => {
    // Create a mock ImageData
    const createImageData = (width: number, height: number, fill?: number[]): ImageData => {
      const data = new Uint8ClampedArray(width * height * 4);
      if (fill) {
        for (let i = 0; i < data.length; i += 4) {
          data[i] = fill[0];     // R
          data[i + 1] = fill[1]; // G
          data[i + 2] = fill[2]; // B
          data[i + 3] = fill[3]; // A
        }
      }
      return { data, width, height } as ImageData;
    };

    it('should apply brightness filter', async () => {
      const imageData = createImageData(2, 2, [128, 128, 128, 255]);

      const result = await engine.applyFilters(imageData, { brightness: 0.2 });

      // Brightness adds to each channel: 128 + (0.2 * 255) = 128 + 51 = 179
      expect(result.data[0]).toBeCloseTo(179, -1);
      expect(result.data[1]).toBeCloseTo(179, -1);
      expect(result.data[2]).toBeCloseTo(179, -1);
      expect(result.data[3]).toBe(255); // Alpha unchanged
    });

    it('should apply negative brightness', async () => {
      const imageData = createImageData(2, 2, [128, 128, 128, 255]);

      const result = await engine.applyFilters(imageData, { brightness: -0.2 });

      // 128 - 51 = 77
      expect(result.data[0]).toBeCloseTo(77, -1);
    });

    it('should clamp brightness to valid range', async () => {
      const imageData = createImageData(2, 2, [200, 200, 200, 255]);

      const result = await engine.applyFilters(imageData, { brightness: 0.5 });

      // 200 + 127 = 327, clamped to 255
      expect(result.data[0]).toBe(255);
    });

    it('should apply contrast filter', async () => {
      const imageData = createImageData(2, 2, [100, 100, 100, 255]);

      const result = await engine.applyFilters(imageData, { contrast: 0.5 });

      // Contrast: (100 - 128) * 1.5 + 128 = -42 + 128 = 86
      expect(result.data[0]).toBeCloseTo(86, -1);
    });

    it('should apply grayscale filter', async () => {
      const imageData = createImageData(2, 2, [255, 0, 0, 255]); // Red

      const result = await engine.applyFilters(imageData, { grayscale: true });

      // Grayscale: 0.2126 * 255 + 0.7152 * 0 + 0.0722 * 0 ≈ 54
      expect(result.data[0]).toBeCloseTo(54, -1);
      expect(result.data[1]).toBeCloseTo(54, -1);
      expect(result.data[2]).toBeCloseTo(54, -1);
    });

    it('should apply sepia filter', async () => {
      const imageData = createImageData(2, 2, [100, 100, 100, 255]);

      const result = await engine.applyFilters(imageData, { sepia: true });

      // Sepia transforms each channel differently
      expect(result.data[0]).toBeGreaterThan(result.data[2]); // R > B in sepia
    });

    it('should apply invert filter', async () => {
      const imageData = createImageData(2, 2, [100, 150, 200, 255]);

      const result = await engine.applyFilters(imageData, { invert: true });

      expect(result.data[0]).toBe(155); // 255 - 100
      expect(result.data[1]).toBe(105); // 255 - 150
      expect(result.data[2]).toBe(55);  // 255 - 200
      expect(result.data[3]).toBe(255); // Alpha unchanged
    });

    it('should apply saturation filter', async () => {
      const imageData = createImageData(2, 2, [200, 100, 50, 255]);

      const result = await engine.applyFilters(imageData, { saturation: -1 });

      // Full desaturation should make R = G = B (grayscale)
      expect(result.data[0]).toBeCloseTo(result.data[1], -1);
      expect(result.data[1]).toBeCloseTo(result.data[2], -1);
    });

    it('should apply multiple filters in sequence', async () => {
      const imageData = createImageData(2, 2, [128, 128, 128, 255]);

      const result = await engine.applyFilters(imageData, {
        brightness: 0.1,
        contrast: 0.2
      });

      // Filters applied in order: brightness then contrast
      expect(result.data[0]).not.toBe(128);
    });

    it('should not modify original ImageData', async () => {
      const imageData = createImageData(2, 2, [128, 128, 128, 255]);
      const originalValue = imageData.data[0];

      await engine.applyFilters(imageData, { brightness: 0.5 });

      expect(imageData.data[0]).toBe(originalValue);
    });

    it('should skip filters with zero/undefined values', async () => {
      const imageData = createImageData(2, 2, [128, 128, 128, 255]);

      const result = await engine.applyFilters(imageData, {
        brightness: 0,
        contrast: undefined
      });

      expect(result.data[0]).toBe(128);
    });
  });

  describe('processFloat32InPlace', () => {
    it('should process Float32Array brightness in place', async () => {
      const pixels = new Float32Array([
        0.5, 0.5, 0.5, 1.0,  // Pixel 1
        0.3, 0.3, 0.3, 1.0   // Pixel 2
      ]);

      await engine.processFloat32InPlace(pixels, { brightness: 0.2 });

      expect(pixels[0]).toBeCloseTo(0.7, 2);
      expect(pixels[1]).toBeCloseTo(0.7, 2);
      expect(pixels[2]).toBeCloseTo(0.7, 2);
      expect(pixels[3]).toBe(1.0); // Alpha unchanged
    });

    it('should clamp Float32Array values to [0, 1]', async () => {
      const pixels = new Float32Array([0.9, 0.9, 0.9, 1.0]);

      await engine.processFloat32InPlace(pixels, { brightness: 0.5 });

      expect(pixels[0]).toBe(1.0); // Clamped
    });
  });
});
