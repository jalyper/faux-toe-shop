# Faux-Toe-Shop WASM Core

High-performance WebAssembly image processing library for faux-toe-shop.

## Prerequisites

### Install Rust

**Windows (PowerShell):**
```powershell
winget install Rustlang.Rustup
# Or download from https://rustup.rs
```

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Install wasm-pack

```bash
cargo install wasm-pack
```

### Add WASM target

```bash
rustup target add wasm32-unknown-unknown
```

## Building

### Development build
```bash
wasm-pack build --dev --target web
```

### Production build (optimized)
```bash
wasm-pack build --release --target web
```

The output will be in `pkg/` directory.

## Usage in JavaScript

```javascript
import init, { ImageBuffer } from './pkg/faux_toe_shop_wasm.js';

async function processImage() {
  // Initialize WASM module
  await init();

  // Get image data from canvas
  const canvas = document.getElementById('myCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create ImageBuffer from raw data
  const buffer = new ImageBuffer(canvas.width, canvas.height, imageData.data);

  // Apply filters
  buffer.brightness(0.2);  // Increase brightness by 20%
  buffer.contrast(0.1);    // Increase contrast by 10%
  buffer.saturation(-0.5); // Reduce saturation by 50%

  // Get processed data back
  const processedData = buffer.toUint8Array();

  // Put back on canvas
  const newImageData = new ImageData(
    new Uint8ClampedArray(processedData),
    canvas.width,
    canvas.height
  );
  ctx.putImageData(newImageData, 0, 0);
}
```

## Available Filters

| Filter | Method | Parameters | Description |
|--------|--------|------------|-------------|
| Brightness | `brightness(amount)` | -1.0 to 1.0 | Adjust brightness |
| Contrast | `contrast(amount)` | -1.0 to 1.0 | Adjust contrast |
| Saturation | `saturation(amount)` | -1.0 to 1.0 | Adjust saturation |
| Blur | `blur(radius)` | 1-100 | Gaussian blur approximation |
| Grayscale | `grayscale()` | none | Convert to grayscale |
| Sepia | `sepia()` | none | Apply sepia tone |
| Invert | `invert()` | none | Invert colors |

## Performance

Benchmarks on 1920x1080 image (compared to JavaScript):

| Operation | WASM | JavaScript | Speedup |
|-----------|------|------------|---------|
| Brightness | ~2ms | ~50ms | 25x |
| Blur (10px) | ~15ms | ~200ms | 13x |
| Grayscale | ~1ms | ~30ms | 30x |

## Testing

```bash
# Run Rust tests
cargo test

# Run WASM tests in headless browser
wasm-pack test --headless --chrome
```

## Architecture

```
src/
├── lib.rs           # Main entry point, ImageBuffer struct
├── filters/         # Filter implementations
│   ├── mod.rs
│   ├── brightness.rs
│   ├── contrast.rs
│   ├── saturation.rs
│   ├── blur.rs
│   ├── grayscale.rs
│   ├── sepia.rs
│   └── invert.rs
└── color/           # Color utilities
    ├── mod.rs
    └── conversions.rs
```
