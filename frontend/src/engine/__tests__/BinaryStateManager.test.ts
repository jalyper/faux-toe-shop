/**
 * Tests for BinaryStateManager
 */

import { BinaryStateManager } from '../state/BinaryStateManager';

describe('BinaryStateManager', () => {
  let stateManager: BinaryStateManager;

  beforeEach(() => {
    stateManager = new BinaryStateManager(100, 100);
  });

  describe('createLayer', () => {
    it('should create a layer with correct dimensions', () => {
      const layer = stateManager.createLayer('layer1', 'Test Layer');

      expect(layer.id).toBe('layer1');
      expect(layer.name).toBe('Test Layer');
      expect(layer.visible).toBe(true);
      expect(layer.opacity).toBe(1.0);
      expect(layer.locked).toBe(false);
      expect(layer.blendMode).toBe('normal');
      expect(layer.pixels).not.toBeNull();
      expect(layer.pixels!.length).toBe(100 * 100 * 4); // RGBA
    });

    it('should initialize pixels with transparent alpha', () => {
      const layer = stateManager.createLayer('layer1', 'Test Layer');

      // Check that alpha values are 0 (transparent)
      for (let i = 3; i < layer.pixels!.length; i += 4) {
        expect(layer.pixels![i]).toBe(0);
      }
    });
  });

  describe('createLayerFromImageData', () => {
    it('should convert ImageData to Float32Array correctly', () => {
      // Create mock ImageData
      const width = 2;
      const height = 2;
      const data = new Uint8ClampedArray([
        255, 0, 0, 255,   // Red pixel
        0, 255, 0, 255,   // Green pixel
        0, 0, 255, 255,   // Blue pixel
        255, 255, 255, 255 // White pixel
      ]);
      const imageData = { data, width, height } as ImageData;

      // Need to mock ImageData constructor
      stateManager = new BinaryStateManager(2, 2);
      const layer = stateManager.createLayerFromImageData('layer1', 'Test', imageData);

      expect(layer.pixels![0]).toBeCloseTo(1.0, 2); // Red = 255/255 = 1.0
      expect(layer.pixels![1]).toBeCloseTo(0.0, 2); // Green = 0/255 = 0.0
      expect(layer.pixels![2]).toBeCloseTo(0.0, 2); // Blue = 0/255 = 0.0
      expect(layer.pixels![3]).toBeCloseTo(1.0, 2); // Alpha = 255/255 = 1.0
    });
  });

  describe('getLayer', () => {
    it('should return undefined for non-existent layer', () => {
      expect(stateManager.getLayer('nonexistent')).toBeUndefined();
    });

    it('should return the correct layer', () => {
      stateManager.createLayer('layer1', 'Test Layer');
      const layer = stateManager.getLayer('layer1');

      expect(layer).toBeDefined();
      expect(layer!.id).toBe('layer1');
    });
  });

  describe('deleteLayer', () => {
    it('should delete an existing layer', () => {
      stateManager.createLayer('layer1', 'Test Layer');
      expect(stateManager.getLayer('layer1')).toBeDefined();

      const result = stateManager.deleteLayer('layer1');

      expect(result).toBe(true);
      expect(stateManager.getLayer('layer1')).toBeUndefined();
    });

    it('should return false for non-existent layer', () => {
      const result = stateManager.deleteLayer('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getLayers', () => {
    it('should return all layers', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');
      stateManager.createLayer('layer3', 'Layer 3');

      const layers = stateManager.getLayers();

      expect(layers.length).toBe(3);
      expect(layers.map(l => l.id)).toEqual(['layer1', 'layer2', 'layer3']);
    });
  });

  describe('getRegion', () => {
    it('should extract a region of pixels', () => {
      stateManager = new BinaryStateManager(4, 4);
      const layer = stateManager.createLayer('layer1', 'Test');

      // Set some test values
      const pixels = layer.pixels!;
      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = i / pixels.length;
      }

      const region = stateManager.getRegion('layer1', { x: 1, y: 1, width: 2, height: 2 });

      expect(region).not.toBeNull();
      expect(region!.length).toBe(2 * 2 * 4); // 2x2 region, RGBA
    });

    it('should return null for non-existent layer', () => {
      const region = stateManager.getRegion('nonexistent', { x: 0, y: 0, width: 10, height: 10 });
      expect(region).toBeNull();
    });
  });

  describe('setRegion', () => {
    it('should set a region of pixels', () => {
      stateManager = new BinaryStateManager(4, 4);
      stateManager.createLayer('layer1', 'Test');

      const newPixels = new Float32Array(2 * 2 * 4);
      for (let i = 0; i < newPixels.length; i++) {
        newPixels[i] = 0.5;
      }

      stateManager.setRegion('layer1', { x: 1, y: 1, width: 2, height: 2 }, newPixels);

      const layer = stateManager.getLayer('layer1')!;

      // Check that the region was updated
      // Pixel at (1, 1) should now be 0.5
      const idx = (1 * 4 + 1) * 4; // (y * width + x) * 4
      expect(layer.pixels![idx]).toBe(0.5);

      // Check that dirty region was set
      expect(layer.dirtyRegion).not.toBeNull();
    });
  });

  describe('getState', () => {
    it('should return the full canvas state', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');
      stateManager.setActiveLayer('layer2');

      const state = stateManager.getState();

      expect(state.width).toBe(100);
      expect(state.height).toBe(100);
      expect(state.layers.length).toBe(2);
      expect(state.activeLayerId).toBe('layer2');
    });
  });

  describe('getMemoryUsage', () => {
    it('should return correct memory usage', () => {
      stateManager = new BinaryStateManager(10, 10);
      stateManager.createLayer('layer1', 'Layer 1');

      // 10 * 10 * 4 (RGBA) * 4 (bytes per float32) = 1600 bytes
      expect(stateManager.getMemoryUsage()).toBe(1600);

      stateManager.createLayer('layer2', 'Layer 2');
      expect(stateManager.getMemoryUsage()).toBe(3200);
    });
  });

  describe('clearDirtyRegions', () => {
    it('should clear all dirty regions', () => {
      stateManager = new BinaryStateManager(4, 4);
      stateManager.createLayer('layer1', 'Test');

      const newPixels = new Float32Array(4);
      stateManager.setRegion('layer1', { x: 0, y: 0, width: 1, height: 1 }, newPixels);

      expect(stateManager.getLayer('layer1')!.dirtyRegion).not.toBeNull();

      stateManager.clearDirtyRegions();

      expect(stateManager.getLayer('layer1')!.dirtyRegion).toBeNull();
    });
  });
});
