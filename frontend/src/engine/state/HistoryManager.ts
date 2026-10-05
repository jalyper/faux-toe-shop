/**
 * History Manager
 *
 * Efficient undo/redo using binary diffs instead of full state snapshots.
 * Only stores the changed regions, dramatically reducing memory usage.
 */

import type { HistoryEntry, RegionDiff, Rect } from './types';
import { BinaryStateManager } from './BinaryStateManager';

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentStep: number = -1;
  private stateManager: BinaryStateManager;
  private maxHistorySize: number;
  private lastSnapshot: Map<string, Float32Array> = new Map();

  constructor(stateManager: BinaryStateManager, maxHistorySize: number = 50) {
    this.stateManager = stateManager;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Save a full snapshot of all layers
   * Simpler API for compatibility - internally creates diffs
   */
  saveSnapshot(description: string): void {
    const currentState = this.stateManager.getState();
    const layerChanges = new Map<string, { region: Rect; oldPixels: Float32Array; newPixels: Float32Array }[]>();

    for (const layer of currentState.layers) {
      if (!layer.pixels) continue;

      const oldPixels = this.lastSnapshot.get(layer.id);
      const newPixels = new Float32Array(layer.pixels);

      // Only record if there was a previous snapshot
      if (oldPixels) {
        const region: Rect = {
          x: 0,
          y: 0,
          width: currentState.width,
          height: currentState.height,
        };
        layerChanges.set(layer.id, [{ region, oldPixels, newPixels }]);
      }

      // Update last snapshot
      this.lastSnapshot.set(layer.id, newPixels);
    }

    if (layerChanges.size > 0) {
      this.recordChange(description, layerChanges);
    }
  }

  /**
   * Record a change to the history
   *
   * @param description - Human-readable description of the action
   * @param layerChanges - Map of layer IDs to their changed regions and old pixels
   */
  recordChange(
    description: string,
    layerChanges: Map<string, { region: Rect; oldPixels: Float32Array; newPixels: Float32Array }[]>
  ): void {
    // Truncate any redo history
    if (this.currentStep < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentStep + 1);
    }

    // Create diffs for each layer
    const layerDiffs = new Map<string, RegionDiff[]>();

    for (const [layerId, changes] of layerChanges) {
      const diffs: RegionDiff[] = changes.map(change => ({
        bounds: change.region,
        oldPixels: change.oldPixels,
        newPixels: change.newPixels,
      }));
      layerDiffs.set(layerId, diffs);
    }

    // Create history entry
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      description,
      layerDiffs,
    };

    this.history.push(entry);
    this.currentStep = this.history.length - 1;

    // Enforce history size limit
    if (this.history.length > this.maxHistorySize) {
      const overflow = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(overflow);
      this.currentStep = Math.max(0, this.currentStep - overflow);
    }
  }

  /**
   * Undo the last action
   * @returns The description of the undone action, or null if nothing to undo
   */
  undo(): string | null {
    if (this.currentStep < 0) return null;

    const entry = this.history[this.currentStep];

    // Apply old pixels for each layer's diffs
    for (const [layerId, diffs] of entry.layerDiffs) {
      for (const diff of diffs) {
        this.stateManager.setRegion(layerId, diff.bounds, diff.oldPixels);
      }
    }

    this.currentStep--;
    return entry.description;
  }

  /**
   * Redo the last undone action
   * @returns The description of the redone action, or null if nothing to redo
   */
  redo(): string | null {
    if (this.currentStep >= this.history.length - 1) return null;

    this.currentStep++;
    const entry = this.history[this.currentStep];

    // Apply new pixels for each layer's diffs
    for (const [layerId, diffs] of entry.layerDiffs) {
      for (const diff of diffs) {
        this.stateManager.setRegion(layerId, diff.bounds, diff.newPixels);
      }
    }

    return entry.description;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentStep >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentStep < this.history.length - 1;
  }

  /**
   * Get the history list for display
   */
  getHistory(): Array<{ id: string; description: string; timestamp: number; isCurrent: boolean }> {
    return this.history.map((entry, index) => ({
      id: entry.id,
      description: entry.description,
      timestamp: entry.timestamp,
      isCurrent: index === this.currentStep,
    }));
  }

  /**
   * Get current step index
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentStep = -1;
  }

  /**
   * Get memory usage estimate in bytes
   */
  getMemoryUsage(): number {
    let total = 0;
    for (const entry of this.history) {
      for (const diffs of entry.layerDiffs.values()) {
        for (const diff of diffs) {
          total += diff.oldPixels.byteLength;
          total += diff.newPixels.byteLength;
        }
      }
    }
    return total;
  }
}
