/**
 * Tests for HistoryManager
 *
 * Critical focus areas:
 * - Binary diff undo/redo logic (data integrity)
 * - Multi-layer change tracking
 * - History size limits and truncation
 * - Integration with BinaryStateManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../state/HistoryManager';
import { BinaryStateManager } from '../state/BinaryStateManager';
import type { Rect } from '../state/types';

describe('HistoryManager', () => {
  let historyManager: HistoryManager;
  let stateManager: BinaryStateManager;

  beforeEach(() => {
    stateManager = new BinaryStateManager(100, 100);
    historyManager = new HistoryManager(stateManager, 10);
  });

  describe('constructor', () => {
    it('should initialize with empty history', () => {
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getCurrentStep()).toBe(-1);
      expect(historyManager.getHistory()).toEqual([]);
    });

    it('should accept custom max history size', () => {
      const customHistory = new HistoryManager(stateManager, 5);
      expect(customHistory.getCurrentStep()).toBe(-1);
    });
  });

  describe('recordChange', () => {
    it('should record a single layer change', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const oldPixels = new Float32Array(4 * 4 * 4); // 4x4 region
      const newPixels = new Float32Array(4 * 4 * 4);
      for (let i = 0; i < newPixels.length; i++) {
        newPixels[i] = 0.5;
      }

      const region: Rect = { x: 0, y: 0, width: 4, height: 4 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels, newPixels }]],
      ]);

      historyManager.recordChange('Paint brush', changes);

      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getCurrentStep()).toBe(0);
    });

    it('should record multi-layer changes', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');

      const region: Rect = { x: 0, y: 0, width: 2, height: 2 };
      const oldPixels1 = new Float32Array(2 * 2 * 4);
      const newPixels1 = new Float32Array(2 * 2 * 4);
      const oldPixels2 = new Float32Array(2 * 2 * 4);
      const newPixels2 = new Float32Array(2 * 2 * 4);

      const changes = new Map([
        ['layer1', [{ region, oldPixels: oldPixels1, newPixels: newPixels1 }]],
        ['layer2', [{ region, oldPixels: oldPixels2, newPixels: newPixels2 }]],
      ]);

      historyManager.recordChange('Multi-layer edit', changes);

      const history = historyManager.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].description).toBe('Multi-layer edit');
    });

    it('should truncate redo history when recording new change', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes1 = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);
      const changes2 = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);
      const changes3 = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change 1', changes1);
      historyManager.recordChange('Change 2', changes2);
      historyManager.recordChange('Change 3', changes3);

      expect(historyManager.getHistory().length).toBe(3);

      // Undo twice
      historyManager.undo();
      historyManager.undo();

      expect(historyManager.getCurrentStep()).toBe(0);
      expect(historyManager.canRedo()).toBe(true);

      // Record new change - should truncate redo history
      historyManager.recordChange('New branch', changes1);

      expect(historyManager.getHistory().length).toBe(2);
      expect(historyManager.canRedo()).toBe(false);
      expect(historyManager.getHistory()[1].description).toBe('New branch');
    });

    it('should enforce max history size', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };

      // Record 15 changes (max is 10)
      for (let i = 0; i < 15; i++) {
        const changes = new Map([
          ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
        ]);
        historyManager.recordChange(`Change ${i}`, changes);
      }

      const history = historyManager.getHistory();
      expect(history.length).toBe(10);

      // Oldest entries should be removed
      expect(history[0].description).toBe('Change 5');
      expect(history[9].description).toBe('Change 14');
    });

    it('should generate unique IDs for each entry', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change 1', changes);
      historyManager.recordChange('Change 2', changes);

      const history = historyManager.getHistory();
      expect(history[0].id).not.toBe(history[1].id);
    });

    it('should record timestamp for each entry', () => {
      const before = Date.now();

      stateManager.createLayer('layer1', 'Layer 1');
      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change', changes);

      const after = Date.now();
      const history = historyManager.getHistory();

      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('undo', () => {
    it('should return null when nothing to undo', () => {
      expect(historyManager.undo()).toBeNull();
    });

    it('should restore old pixels for single layer', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      // Set initial state
      const region: Rect = { x: 0, y: 0, width: 2, height: 2 };
      const oldPixels = new Float32Array(2 * 2 * 4);
      const newPixels = new Float32Array(2 * 2 * 4);

      // Fill old pixels with 0.25, new pixels with 0.75
      for (let i = 0; i < oldPixels.length; i++) {
        oldPixels[i] = 0.25;
        newPixels[i] = 0.75;
      }

      // Apply new pixels
      stateManager.setRegion('layer1', region, newPixels);

      // Record the change
      const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
      historyManager.recordChange('Paint', changes);

      // Undo should restore old pixels
      const description = historyManager.undo();

      expect(description).toBe('Paint');
      expect(historyManager.getCurrentStep()).toBe(-1);

      // Verify pixels were restored
      const restoredRegion = stateManager.getRegion('layer1', region);
      expect(restoredRegion![0]).toBe(0.25);
    });

    it('should restore old pixels for multiple layers', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const oldPixels1 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const newPixels1 = new Float32Array([0.5, 0.6, 0.7, 0.8]);
      const oldPixels2 = new Float32Array([0.9, 0.8, 0.7, 0.6]);
      const newPixels2 = new Float32Array([0.5, 0.4, 0.3, 0.2]);

      // Apply changes
      stateManager.setRegion('layer1', region, newPixels1);
      stateManager.setRegion('layer2', region, newPixels2);

      const changes = new Map([
        ['layer1', [{ region, oldPixels: oldPixels1, newPixels: newPixels1 }]],
        ['layer2', [{ region, oldPixels: oldPixels2, newPixels: newPixels2 }]],
      ]);

      historyManager.recordChange('Multi-layer edit', changes);

      // Undo
      historyManager.undo();

      // Verify both layers were restored
      const restored1 = stateManager.getRegion('layer1', region);
      const restored2 = stateManager.getRegion('layer2', region);

      expect(restored1![0]).toBeCloseTo(0.1, 5);
      expect(restored2![0]).toBeCloseTo(0.9, 5);
    });

    it('should handle multiple regions in single layer', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region1: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const region2: Rect = { x: 2, y: 2, width: 1, height: 1 };

      const oldPixels1 = new Float32Array([0.1, 0.1, 0.1, 1.0]);
      const newPixels1 = new Float32Array([0.9, 0.9, 0.9, 1.0]);
      const oldPixels2 = new Float32Array([0.2, 0.2, 0.2, 1.0]);
      const newPixels2 = new Float32Array([0.8, 0.8, 0.8, 1.0]);

      stateManager.setRegion('layer1', region1, newPixels1);
      stateManager.setRegion('layer1', region2, newPixels2);

      const changes = new Map([
        [
          'layer1',
          [
            { region: region1, oldPixels: oldPixels1, newPixels: newPixels1 },
            { region: region2, oldPixels: oldPixels2, newPixels: newPixels2 },
          ],
        ],
      ]);

      historyManager.recordChange('Multiple regions', changes);

      historyManager.undo();

      const restored1 = stateManager.getRegion('layer1', region1);
      const restored2 = stateManager.getRegion('layer1', region2);

      expect(restored1![0]).toBeCloseTo(0.1, 5);
      expect(restored2![0]).toBeCloseTo(0.2, 5);
    });

    it('should allow multiple undos in sequence', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };

      for (let i = 0; i < 5; i++) {
        const oldPixels = new Float32Array(4);
        const newPixels = new Float32Array(4);
        oldPixels.fill(i * 0.1);
        newPixels.fill((i + 1) * 0.1);

        stateManager.setRegion('layer1', region, newPixels);
        const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
        historyManager.recordChange(`Change ${i}`, changes);
      }

      expect(historyManager.getCurrentStep()).toBe(4);

      historyManager.undo();
      expect(historyManager.getCurrentStep()).toBe(3);

      historyManager.undo();
      expect(historyManager.getCurrentStep()).toBe(2);

      historyManager.undo();
      expect(historyManager.getCurrentStep()).toBe(1);
    });
  });

  describe('redo', () => {
    it('should return null when nothing to redo', () => {
      expect(historyManager.redo()).toBeNull();
    });

    it('should reapply new pixels after undo', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const oldPixels = new Float32Array([0.2, 0.2, 0.2, 1.0]);
      const newPixels = new Float32Array([0.8, 0.8, 0.8, 1.0]);

      stateManager.setRegion('layer1', region, newPixels);

      const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
      historyManager.recordChange('Paint', changes);

      // Undo then redo
      historyManager.undo();
      const description = historyManager.redo();

      expect(description).toBe('Paint');
      expect(historyManager.getCurrentStep()).toBe(0);

      // Verify new pixels were reapplied
      const restoredRegion = stateManager.getRegion('layer1', region);
      expect(restoredRegion![0]).toBeCloseTo(0.8, 5);
    });

    it('should handle multiple redos', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };

      for (let i = 0; i < 3; i++) {
        const oldPixels = new Float32Array(4);
        const newPixels = new Float32Array(4);
        newPixels.fill((i + 1) * 0.25);

        const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
        historyManager.recordChange(`Change ${i}`, changes);
      }

      // Undo all
      historyManager.undo();
      historyManager.undo();
      historyManager.undo();

      expect(historyManager.getCurrentStep()).toBe(-1);

      // Redo all
      historyManager.redo();
      expect(historyManager.getCurrentStep()).toBe(0);

      historyManager.redo();
      expect(historyManager.getCurrentStep()).toBe(1);

      historyManager.redo();
      expect(historyManager.getCurrentStep()).toBe(2);
    });

    it('should not redo beyond last change', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change', changes);

      expect(historyManager.redo()).toBeNull();
      expect(historyManager.getCurrentStep()).toBe(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('should correctly report undo/redo availability', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      // Initially no undo/redo
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);

      // After recording
      historyManager.recordChange('Change 1', changes);
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);

      // After undo
      historyManager.undo();
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(true);

      // After redo
      historyManager.redo();
      expect(historyManager.canUndo()).toBe(true);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('should return history with correct metadata', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('First change', changes);
      historyManager.recordChange('Second change', changes);

      const history = historyManager.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].description).toBe('First change');
      expect(history[1].description).toBe('Second change');
      expect(history[0].isCurrent).toBe(false);
      expect(history[1].isCurrent).toBe(true);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });

    it('should mark correct entry as current after undo', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change 1', changes);
      historyManager.recordChange('Change 2', changes);
      historyManager.recordChange('Change 3', changes);

      historyManager.undo();

      const history = historyManager.getHistory();
      expect(history[0].isCurrent).toBe(false);
      expect(history[1].isCurrent).toBe(true);
      expect(history[2].isCurrent).toBe(false);
    });
  });

  describe('saveSnapshot', () => {
    it('should record changes between snapshots', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      // Take first snapshot
      historyManager.saveSnapshot('Initial state');

      // Modify layer
      const region: Rect = { x: 0, y: 0, width: 2, height: 2 };
      const newPixels = new Float32Array(2 * 2 * 4);
      newPixels.fill(0.5);
      stateManager.setRegion('layer1', region, newPixels);

      // Take second snapshot - should record diff
      historyManager.saveSnapshot('After modification');

      expect(historyManager.getHistory().length).toBe(1);
      expect(historyManager.canUndo()).toBe(true);
    });

    it('should not record change for first snapshot', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      historyManager.saveSnapshot('Initial');

      expect(historyManager.getHistory().length).toBe(0);
      expect(historyManager.canUndo()).toBe(false);
    });

    it('should handle multiple layers in snapshot', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');

      historyManager.saveSnapshot('Initial');

      // Modify both layers
      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const pixels1 = new Float32Array(4);
      const pixels2 = new Float32Array(4);
      pixels1.fill(0.3);
      pixels2.fill(0.7);

      stateManager.setRegion('layer1', region, pixels1);
      stateManager.setRegion('layer2', region, pixels2);

      historyManager.saveSnapshot('Modified both');

      expect(historyManager.getHistory().length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const changes = new Map([
        ['layer1', [{ region, oldPixels: new Float32Array(4), newPixels: new Float32Array(4) }]],
      ]);

      historyManager.recordChange('Change 1', changes);
      historyManager.recordChange('Change 2', changes);

      expect(historyManager.getHistory().length).toBe(2);

      historyManager.clear();

      expect(historyManager.getHistory().length).toBe(0);
      expect(historyManager.getCurrentStep()).toBe(-1);
      expect(historyManager.canUndo()).toBe(false);
      expect(historyManager.canRedo()).toBe(false);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return 0 for empty history', () => {
      expect(historyManager.getMemoryUsage()).toBe(0);
    });

    it('should calculate memory usage correctly', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 2, height: 2 };
      const oldPixels = new Float32Array(2 * 2 * 4); // 16 floats * 4 bytes = 64 bytes
      const newPixels = new Float32Array(2 * 2 * 4); // 16 floats * 4 bytes = 64 bytes

      const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
      historyManager.recordChange('Change', changes);

      // Should be 128 bytes (64 + 64)
      expect(historyManager.getMemoryUsage()).toBe(128);
    });

    it('should accumulate memory usage across multiple entries', () => {
      stateManager.createLayer('layer1', 'Layer 1');

      const region: Rect = { x: 0, y: 0, width: 1, height: 1 };

      for (let i = 0; i < 3; i++) {
        const oldPixels = new Float32Array(4); // 4 floats * 4 bytes = 16 bytes
        const newPixels = new Float32Array(4); // 16 bytes
        const changes = new Map([['layer1', [{ region, oldPixels, newPixels }]]]);
        historyManager.recordChange(`Change ${i}`, changes);
      }

      // 3 entries * 32 bytes each = 96 bytes
      expect(historyManager.getMemoryUsage()).toBe(96);
    });
  });

  describe('integration tests', () => {
    it('should maintain data integrity through complex undo/redo sequence', () => {
      stateManager.createLayer('layer1', 'Test Layer');

      const region: Rect = { x: 0, y: 0, width: 2, height: 2 };

      // State 0: Initial (all zeros)
      const state0 = new Float32Array(2 * 2 * 4);

      // State 1: Fill with 0.25
      const state1 = new Float32Array(2 * 2 * 4);
      state1.fill(0.25);
      stateManager.setRegion('layer1', region, state1);
      const changes1 = new Map([['layer1', [{ region, oldPixels: state0, newPixels: state1 }]]]);
      historyManager.recordChange('Step 1', changes1);

      // State 2: Fill with 0.5
      const state2 = new Float32Array(2 * 2 * 4);
      state2.fill(0.5);
      stateManager.setRegion('layer1', region, state2);
      const changes2 = new Map([['layer1', [{ region, oldPixels: state1, newPixels: state2 }]]]);
      historyManager.recordChange('Step 2', changes2);

      // State 3: Fill with 0.75
      const state3 = new Float32Array(2 * 2 * 4);
      state3.fill(0.75);
      stateManager.setRegion('layer1', region, state3);
      const changes3 = new Map([['layer1', [{ region, oldPixels: state2, newPixels: state3 }]]]);
      historyManager.recordChange('Step 3', changes3);

      // Verify current state
      let current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0.75);

      // Undo to state 2
      historyManager.undo();
      current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0.5);

      // Undo to state 1
      historyManager.undo();
      current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0.25);

      // Redo to state 2
      historyManager.redo();
      current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0.5);

      // Redo to state 3
      historyManager.redo();
      current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0.75);

      // Undo all the way back
      historyManager.undo();
      historyManager.undo();
      historyManager.undo();
      current = stateManager.getRegion('layer1', region);
      expect(current![0]).toBe(0);
    });

    it('should handle concurrent modifications to different layers', () => {
      stateManager.createLayer('layer1', 'Layer 1');
      stateManager.createLayer('layer2', 'Layer 2');

      const region1: Rect = { x: 0, y: 0, width: 1, height: 1 };
      const region2: Rect = { x: 1, y: 1, width: 1, height: 1 };

      // Change 1: Modify layer1
      const old1 = new Float32Array(4);
      const new1 = new Float32Array([1.0, 0, 0, 1.0]); // Red
      stateManager.setRegion('layer1', region1, new1);
      historyManager.recordChange(
        'Paint red',
        new Map([['layer1', [{ region: region1, oldPixels: old1, newPixels: new1 }]]])
      );

      // Change 2: Modify layer2
      const old2 = new Float32Array(4);
      const new2 = new Float32Array([0, 0, 1.0, 1.0]); // Blue
      stateManager.setRegion('layer2', region2, new2);
      historyManager.recordChange(
        'Paint blue',
        new Map([['layer2', [{ region: region2, oldPixels: old2, newPixels: new2 }]]])
      );

      // Change 3: Modify both layers
      const old1b = new Float32Array(4);
      old1b.set(new1);
      const new1b = new Float32Array([0, 1.0, 0, 1.0]); // Green
      const old2b = new Float32Array(4);
      old2b.set(new2);
      const new2b = new Float32Array([1.0, 1.0, 0, 1.0]); // Yellow

      stateManager.setRegion('layer1', region1, new1b);
      stateManager.setRegion('layer2', region2, new2b);
      historyManager.recordChange(
        'Paint both',
        new Map([
          ['layer1', [{ region: region1, oldPixels: old1b, newPixels: new1b }]],
          ['layer2', [{ region: region2, oldPixels: old2b, newPixels: new2b }]],
        ])
      );

      // Undo last change
      historyManager.undo();

      const restored1 = stateManager.getRegion('layer1', region1);
      const restored2 = stateManager.getRegion('layer2', region2);

      expect(restored1![0]).toBe(1.0); // Red
      expect(restored2![2]).toBe(1.0); // Blue
    });
  });
});
