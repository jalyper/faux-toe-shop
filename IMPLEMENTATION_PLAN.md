# Faux-Toe-Shop: Performance-First Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring strategy for faux-toe-shop with **performance as the primary objective**. After thorough analysis of the current codebase, the recommendation is a **complete architectural overhaul** using WebGL/WebGPU for rendering and Rust/WebAssembly for image processing, while retaining React only for UI chrome.

---

## Current Implementation Status

> **Last Updated:** December 28, 2024

### Completed

| Component | Status | Location | Description |
|-----------|--------|----------|-------------|
| **Immediate Performance Fixes** | ✅ Done | `frontend/src/components/Canvas.jsx` | History limit (50 states), debounced rendering, memoized lookups |
| **Rust/WASM Project Structure** | ✅ Done | `wasm-core/` | Complete Cargo project with filters |
| **WASM Filters (Rust)** | ✅ Done | `wasm-core/src/filters/` | brightness, contrast, saturation, blur, grayscale, sepia, invert |
| **Color Utilities (Rust)** | ✅ Done | `wasm-core/src/color/` | RGB/HSL conversions |
| **TypeScript Engine Core** | ✅ Done | `frontend/src/engine/` | Module structure and exports |
| **Binary State Manager** | ✅ Done | `frontend/src/engine/state/BinaryStateManager.ts` | Float32Array-based layer management |
| **History Manager** | ✅ Done | `frontend/src/engine/state/HistoryManager.ts` | Binary diff undo/redo |
| **Type Definitions** | ✅ Done | `frontend/src/engine/state/types.ts` | LayerState, CanvasState, etc. |
| **WASM Filter Engine Wrapper** | ✅ Done | `frontend/src/engine/filters/WasmFilterEngine.ts` | TS wrapper with JS fallback |
| **WebGL Shaders** | ✅ Done | `frontend/src/engine/renderer/shaders.ts` | Blend modes, adjustments, effects |
| **WebGL Renderer** | ✅ Done | `frontend/src/engine/renderer/WebGLRenderer.ts` | GPU-accelerated compositing |
| **Unit Tests (BinaryStateManager)** | ✅ Done | `frontend/src/engine/__tests__/` | Comprehensive test suite |
| **Integration Tests (PhotoshopEditor)** | ✅ Done | `frontend/src/components/PhotoshopEditor.test.jsx` | 4 passing tests |

### In Progress

| Component | Status | Notes |
|-----------|--------|-------|
| **Unit Tests (HistoryManager)** | 🔄 In Progress | Need to complete test suite |
| **Performance Benchmark Tests** | 🔄 In Progress | Framework needed |

### Completed (December 2024)

| Component | Status | Location | Description |
|-----------|--------|----------|-------------|
| **Eyedropper Tool** | ✅ Done | `frontend/src/components/Toolbar.jsx`, `Canvas.jsx` | Click to sample color from canvas (doesn't select strokes) |
| **Multiple Undo/Redo (50 steps)** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx`, `Canvas.jsx` | Full history support with ref-based tracking |
| **Ctrl+Y Redo Shortcut** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Standard redo keyboard shortcut |
| **Ctrl+S Save Shortcut** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Save project with keyboard |
| **Ctrl+Shift+S Save As** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Save to new location |
| **Ctrl+O Open Project** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Open project with keyboard |
| **.FTS Project File Format** | ✅ Done | `frontend/src/utils/ftsFormat.js` | Save/load projects with layer data |
| **File System Access API** | ✅ Done | `frontend/src/utils/ftsFormat.js` | Native file picker, save to user-chosen location |
| **Auto-Save Feature** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Auto-saves every 60s when project has been saved |
| **Circle Brush Cursor** | ✅ Done | `frontend/src/components/Canvas.jsx` | Dynamic SVG cursor matching brush size |
| **Cursor Visible While Drawing** | ✅ Done | `frontend/src/components/Canvas.jsx` | CSS override keeps cursor visible during strokes |
| **Unsaved Changes Indicator** | ✅ Done | `frontend/src/components/PhotoshopEditor.jsx` | Shows * in document name when unsaved |

### Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |
| **Ctrl+Shift+Z** | Redo (alternative) |
| **Ctrl+S** | Save Project |
| **Ctrl+Shift+S** | Save Project As |
| **Ctrl+O** | Open Project |

### Remaining Work

| Component | Priority | Description |
|-----------|----------|-------------|
| **Install Rust Toolchain** | High | Required to build WASM (`winget install Rustlang.Rustup`) |
| **Build WASM Module** | High | `wasm-pack build --release --target web` |
| **Web Worker Integration** | Medium | OffscreenCanvas + compute workers for non-blocking filters |
| **React-Engine Bridge** | Medium | Connect new engine to existing UI |
| **Brush Engine Rewrite** | Low | GPU-accelerated brush rendering |
| **Selection Tools** | Low | Marching ants, feathering, lasso |
| **PSD Import** | Low | Import Adobe Photoshop files via WASM parser |

### Already Using

| Component | Status | Notes |
|-----------|--------|-------|
| **Vite** | ✅ Active | v6.4.1 - Fast HMR, WASM support |
| **.FTS Format** | ✅ Active | Native project save/load with File System Access API |

### Quick Start

```bash
# 1. Install Rust (if not installed)
# Windows:
winget install Rustlang.Rustup
# macOS/Linux:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Add WASM target
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 3. Build WASM module
cd wasm-core
wasm-pack build --release --target web

# 4. Copy to frontend
mkdir -p ../frontend/src/wasm
cp -r pkg/* ../frontend/src/wasm/

# 5. Run tests
cd ../frontend
npm test
```

---

## Part 1: Current State Analysis

### 1.1 Critical Performance Issues Identified

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| **JSON Serialization on Every Action** | `Canvas.jsx:123-128` | O(n) where n = canvas complexity | CRITICAL |
| **Unbounded History Array** | `Canvas.jsx:22-24` | Memory leak, grows indefinitely | CRITICAL |
| **Fabric.js Canvas 2D API** | Entire canvas rendering | No GPU acceleration | HIGH |
| **renderAll() Called Excessively** | Multiple locations | Full canvas redraw per operation | HIGH |
| **Linear Object Iteration** | `Canvas.jsx:145-165, 168-192` | O(n) per layer change | MEDIUM |
| **Single-Threaded Filters** | `Canvas.jsx:68-108` | Blocks main thread | HIGH |
| **Pressure Simulation Per-Move** | `PressureSensitiveBrush.js:39-46` | Math.sin() per mouse event | LOW |

### 1.2 Current Technology Limitations

**Why Fabric.js is Insufficient for Professional Image Editing:**
1. Uses Canvas 2D API - no GPU acceleration for pixel operations
2. JSON-based serialization - extremely slow for large canvases
3. No built-in Web Worker support
4. Filter pipeline is synchronous and blocks main thread
5. Memory management is opaque and unoptimized

**Why React is Overhead for Pixel Manipulation:**
1. Virtual DOM reconciliation is unnecessary for canvas operations
2. State updates trigger re-renders unrelated to pixel data
3. Effect cascades create performance bottlenecks

---

## Part 2: Recommended Architecture

### 2.1 Technology Stack Replacement

```
CURRENT STACK                    NEW STACK
--------------                   ---------
React 19                    →    React 19 (UI chrome only)
Fabric.js (Canvas 2D)       →    WebGL 2.0 / WebGPU
JavaScript filters          →    Rust + WebAssembly
Single-threaded             →    Web Workers + OffscreenCanvas
JSON state serialization    →    Binary state (ArrayBuffer)
npm/webpack bundle          →    Vite + wasm-pack
```

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React UI Layer                          │
│  (Toolbar, Panels, Menus - Lightweight, No Canvas State)        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Commands/Events
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TypeScript Engine Core                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Command Bus │  │ State Manager│  │ History (Binary Diff)  │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│ Main Thread  │  │ Render Worker│  │ Compute Worker Pool      │
│ (UI Events)  │  │ (WebGL/GPU)  │  │ (Rust/WASM Filters)      │
│              │  │ OffscreenCnvs│  │ - Brightness/Contrast    │
│              │  │              │  │ - Blur (Box/Gaussian)    │
│              │  │              │  │ - Color Transforms       │
└──────────────┘  └──────────────┘  └──────────────────────────┘
```

### 2.3 Core Components

**1. Rust/WASM Image Processing Core (`/wasm-core/`)**
- All pixel-level operations in Rust compiled to WASM
- SIMD instructions for parallel pixel processing
- Zero-copy operations using SharedArrayBuffer
- Includes: filters, transforms, blending modes, color space conversions

**2. WebGL Rendering Engine (`/src/engine/renderer/`)**
- GPU-accelerated compositing and display
- Shader-based real-time filter previews
- Texture-based layer management
- Hardware-accelerated zoom/pan

**3. Binary State Management (`/src/engine/state/`)**
- TypedArray-based canvas state (Float32Array for pixels)
- Binary diff for history (only store changed regions)
- Memory-mapped layer storage
- Compressed undo stack with configurable limits

**4. Worker Architecture (`/src/engine/workers/`)**
- `RenderWorker`: OffscreenCanvas + WebGL rendering
- `ComputeWorkerPool`: WASM filter execution (navigator.hardwareConcurrency threads)
- `IOWorker`: File import/export without blocking main thread

---

## Part 3: Implementation Phases

### Phase 1: Foundation & Infrastructure

**1.1 Project Restructure**
```
faux-toe-shop/
├── frontend/
│   ├── src/
│   │   ├── ui/              # React components (UI only)
│   │   ├── engine/          # TypeScript core engine
│   │   │   ├── renderer/    # WebGL rendering
│   │   │   ├── state/       # Binary state management
│   │   │   ├── history/     # Binary diff undo/redo
│   │   │   ├── workers/     # Web Worker orchestration
│   │   │   └── commands/    # Command pattern implementation
│   │   └── wasm/            # WASM bindings
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── performance/     # Performance benchmarks
│   └── vite.config.ts
├── wasm-core/               # Rust WASM library
│   ├── src/
│   │   ├── lib.rs
│   │   ├── filters/
│   │   ├── transforms/
│   │   ├── color/
│   │   └── blend/
│   ├── Cargo.toml
│   └── tests/
└── backend/                 # Existing FastAPI backend
```

**1.2 Build System Migration**
- Replace Create React App + Craco with Vite
- Configure wasm-pack for Rust compilation
- Set up worker bundling with proper module support
- Configure SharedArrayBuffer headers (COOP/COEP)

**1.3 Testing Infrastructure**
- Jest for unit tests
- Playwright for integration tests
- Custom performance benchmark suite
- Automated regression testing for filter accuracy

### Phase 2: Core Engine Development

**2.1 Binary State Manager**
```typescript
// Core state structure
interface CanvasState {
  width: number;
  height: number;
  layers: LayerState[];
  activeLayerId: string;
}

interface LayerState {
  id: string;
  pixels: Float32Array;  // RGBA as 0-1 floats
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  bounds: Rect;          // For sparse storage
}
```

**2.2 History System (Binary Diff)**
```typescript
interface HistoryEntry {
  timestamp: number;
  description: string;
  layerDiffs: Map<string, RegionDiff[]>;
}

interface RegionDiff {
  bounds: Rect;
  oldPixels: Float32Array;
  newPixels: Float32Array;
}
```
- Only store changed regions, not full canvas
- Configurable history limit (default: 50 entries)
- Memory pressure handling (auto-prune oldest)

**2.3 Command Pattern**
```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  getDescription(): string;
}
```
- All operations as commands
- Batching for related operations
- Async execution for heavy operations

### Phase 3: Rust/WASM Filter Engine

**3.1 Core Filters (Rust)**
```rust
// Example: Optimized brightness filter
#[wasm_bindgen]
pub fn apply_brightness(
    pixels: &mut [f32],
    width: u32,
    height: u32,
    brightness: f32
) {
    // SIMD-optimized loop
    pixels.chunks_exact_mut(4).for_each(|chunk| {
        chunk[0] = (chunk[0] + brightness).clamp(0.0, 1.0);
        chunk[1] = (chunk[1] + brightness).clamp(0.0, 1.0);
        chunk[2] = (chunk[2] + brightness).clamp(0.0, 1.0);
        // Alpha unchanged
    });
}
```

**3.2 Filter Pipeline**
- Chain multiple filters efficiently
- Avoid intermediate buffer allocations
- Preview quality modes (half-res for real-time)

**3.3 Performance Targets**
| Operation | Target (1920x1080) | Current Fabric.js |
|-----------|-------------------|-------------------|
| Brightness | <5ms | ~50-100ms |
| Gaussian Blur (10px) | <20ms | ~200-500ms |
| Full composite | <16ms (60fps) | N/A |

### Phase 4: WebGL Rendering Engine

**4.1 Texture-Based Layer System**
- Each layer as WebGL texture
- GPU-based compositing with blend modes
- Shader-based filter previews (non-destructive)

**4.2 Rendering Pipeline**
```
Layer Textures → Blend Shaders → Composite → Display
                      ↑
               Adjustment Layers (Shaders)
```

**4.3 OffscreenCanvas Worker**
- All rendering in dedicated worker
- Main thread only handles input events
- 60fps target with complex compositions

### Phase 5: Tool Implementation

**5.1 Brush Engine (Complete Rewrite)**
- GPU-accelerated brush rendering
- True pressure sensitivity (PointerEvent.pressure)
- Brush dynamics: size, opacity, flow, hardness
- Brush tip textures
- Stamp spacing algorithm

**5.2 Selection Tools**
- GPU-based marching ants
- Feathered selections
- Quick mask mode

**5.3 Transform Tools**
- GPU-accelerated transformations
- Bilinear/bicubic interpolation options

### Phase 6: Integration & Polish

**6.1 React UI Integration**
- Minimal bridge between React and Engine
- Event-driven updates (not React state)
- useRef for engine instance

**6.2 File Format Support**
- Native: Custom project format (.fts) - see spec below
- Import: PNG, JPEG, WebP, PSD (via WASM parser)
- Export: PNG, JPEG, WebP, PDF

### .FTS (Faux-Toe-Shop) Project File Format

The `.fts` format stores complete project state including layers, history, and canvas settings.

**File Structure (JSON-based):**
```json
{
  "version": "1.0",
  "format": "fts",
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "layers": [
    {
      "id": "layer-uuid",
      "name": "Layer 1",
      "visible": true,
      "locked": false,
      "opacity": 100,
      "blendMode": "normal",
      "data": "<base64-encoded-image-data>"
    }
  ],
  "activeLayerId": "layer-uuid",
  "metadata": {
    "created": "2024-12-27T00:00:00Z",
    "modified": "2024-12-27T00:00:00Z",
    "appVersion": "0.1.0"
  }
}
```

**Implementation:**
- `frontend/src/utils/ftsFormat.js` - Serialization/deserialization utilities
- Layer data stored as base64-encoded PNG for efficient compression
- Future: Binary format option for larger projects

**6.3 Performance Monitoring**
- Built-in performance overlay
- Memory usage tracking
- Frame time graph

---

## Part 4: Testing Strategy

### 4.1 Test Categories

**Unit Tests**
- WASM filter correctness (pixel-accurate)
- State management operations
- History diff/apply
- Command execution

**Integration Tests**
- End-to-end tool workflows
- Layer operations
- Export/import cycles
- Undo/redo chains

**Performance Tests**
```typescript
describe('Performance Benchmarks', () => {
  it('brightness filter < 5ms on 1920x1080', async () => {
    const start = performance.now();
    await engine.applyFilter('brightness', 0.5);
    expect(performance.now() - start).toBeLessThan(5);
  });

  it('maintains 60fps during brush stroke', async () => {
    const frameTimes = await measureBrushStroke();
    expect(Math.max(...frameTimes)).toBeLessThan(16.67);
  });
});
```

**Visual Regression Tests**
- Golden image comparisons
- Filter output verification
- Cross-browser consistency

### 4.2 Continuous Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Build WASM
        run: wasm-pack build wasm-core
      - name: Unit Tests
        run: npm test
      - name: Integration Tests
        run: npx playwright test
      - name: Performance Tests
        run: npm run test:perf
      - name: Upload Performance Report
        uses: actions/upload-artifact@v3
```

---

## Part 5: Performance Benchmarks & Validation

### 5.1 Benchmark Suite

Every PR must pass these benchmarks:

| Metric | Threshold | Measurement |
|--------|-----------|-------------|
| Cold start | <500ms | Time to interactive canvas |
| Memory baseline | <100MB | Empty 1920x1080 canvas |
| Memory per layer | <10MB | 1920x1080 layer overhead |
| Brush latency | <8ms | Pointer event to pixel |
| Filter (brightness) | <5ms | 1920x1080 full canvas |
| Filter (blur 10px) | <20ms | 1920x1080 full canvas |
| Undo operation | <10ms | Single action undo |
| Export PNG | <100ms | 1920x1080 to blob |

### 5.2 Profiling Tools

- Chrome DevTools Performance panel
- WebGL profilers (Spector.js)
- WASM profiling (Chrome WASM debugging)
- Custom frame time overlay

---

## Part 6: Migration Path

### 6.1 Incremental Migration Strategy

The migration should be done incrementally to maintain a working application:

**Step 1: Parallel Implementation**
- Build new engine alongside existing Fabric.js implementation
- Feature flag to switch between engines
- Compare outputs for correctness

**Step 2: Feature Parity**
- All existing tools working in new engine
- All existing filters implemented in WASM
- History system fully operational

**Step 3: Performance Validation**
- All benchmarks passing
- No regressions in functionality
- Memory usage validated

**Step 4: Cutover**
- Remove Fabric.js dependency
- Clean up legacy code
- Update documentation

### 6.2 Rollback Plan

- Keep Fabric.js implementation as fallback
- Feature flag for emergency rollback
- Staged rollout (internal → beta → production)

---

## Part 7: Immediate Fixes (Current Codebase)

While the full rewrite is in progress, apply these critical fixes to the existing code:

### 7.1 History Memory Leak Fix

```javascript
// Canvas.jsx - Add history limit
const MAX_HISTORY_SIZE = 50;

const saveState = () => {
  const json = JSON.stringify(fabricCanvasRef.current.toJSON());
  historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
  historyRef.current.push(json);

  // Limit history size
  if (historyRef.current.length > MAX_HISTORY_SIZE) {
    historyRef.current = historyRef.current.slice(-MAX_HISTORY_SIZE);
    historyStepRef.current = historyRef.current.length - 1;
  } else {
    historyStepRef.current = historyRef.current.length - 1;
  }
};
```

### 7.2 Debounce renderAll()

```javascript
// Add debounced render for frequent updates
import { debounce } from 'lodash';

const debouncedRender = useRef(
  debounce(() => {
    fabricCanvasRef.current?.renderAll();
  }, 16) // ~60fps
).current;
```

### 7.3 Batch Object Updates

```javascript
// Instead of iterating with renderAll after each
const updateObjectsVisibility = () => {
  if (!fabricCanvasRef.current) return;
  const canvas = fabricCanvasRef.current;
  const visibleLayers = new Set(layers.filter(l => l.visible).map(l => l.id));

  canvas.getObjects().forEach(obj => {
    if (obj.layerId) {
      const layer = layers.find(l => l.id === obj.layerId);
      obj.set({
        visible: visibleLayers.has(obj.layerId),
        opacity: layer ? layer.opacity / 100 : 1
      });
    }
  });

  canvas.renderAll(); // Single render at the end
};
```

---

## Part 8: Resource Requirements

### 8.1 Dependencies to Add

**Rust/WASM:**
- `wasm-bindgen` - JS bindings
- `wasm-pack` - Build tool
- `console_error_panic_hook` - Debugging
- `image` - Image codec support

**Frontend:**
- `vite` - Build tool
- `vite-plugin-wasm` - WASM support
- `comlink` - Worker communication
- `gl-matrix` - Matrix math for transforms

### 8.2 Browser Requirements

- WebGL 2.0 support (97%+ of browsers)
- SharedArrayBuffer (requires COOP/COEP headers)
- Web Workers
- OffscreenCanvas (fallback for Safari)

---

## Part 9: Success Metrics

### 9.1 Performance Goals

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Brush latency | ~30ms | <8ms | 4x |
| Filter speed | ~100ms | <10ms | 10x |
| Memory usage | Unbounded | <500MB cap | Bounded |
| Frame rate | Variable | 60fps stable | Consistent |
| Load time | ~2s | <500ms | 4x |

### 9.2 Quality Goals

- Zero visual regression from current features
- All existing tests passing
- 90%+ code coverage on engine core
- Performance tests as part of CI

---

## Appendix A: Alternative Approaches Considered

### A.1 Keep Fabric.js, Optimize

**Pros:** Faster to implement
**Cons:** Cannot overcome Canvas 2D limitations, filters will always be slow

### A.2 PixiJS Instead of Raw WebGL

**Pros:** Easier WebGL abstraction
**Cons:** Still no WASM filters, added dependency weight

### A.3 Native Desktop App (Tauri + Rust)

**Pros:** Maximum performance, native file access
**Cons:** Loses web deployment, different distribution model

### A.4 Photopea's Approach (Full Custom Engine)

**Pros:** Proven to work
**Cons:** Massive development effort, years of work

**Decision:** WebGL + Rust/WASM offers the best balance of performance and web compatibility.

---

## Appendix B: Reference Implementations

- **Photopea** - Professional web Photoshop clone (custom engine)
- **Figma** - WebGL + WASM for vector editing
- **Excalidraw** - High-performance canvas (simpler use case)
- **image-rs** - Rust image processing library

---

## Conclusion

This plan provides a path to transform faux-toe-shop from a proof-of-concept into a performance-competitive image editor. The key investments are:

1. **WebGL rendering** for GPU-accelerated display
2. **Rust/WASM filters** for CPU-intensive operations
3. **Web Workers** for non-blocking execution
4. **Binary state management** for efficient memory use

The result will be an image editor that can handle professional workflows while maintaining web accessibility.
