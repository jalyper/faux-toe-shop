# Faux Toe Shop

A web-based image editor inspired by professional photo editing software, built with React and Fabric.js with performance-focused architecture using Rust/WebAssembly.

## About this project

Faux Toe Shop was built as an exploration of multi-tool AI-assisted development. The initial scaffold came out of **Emergent**, an agentic dev platform — that's where the `auto-commit for <uuid>` commit history comes from, which is Emergent's default commit format and not a reflection of the actual editing cadence. I then moved ongoing development to **Claude Code** (Anthropic's CLI agent, see `.claude/`) and started using **Gemini via Google Antigravity** to drive UI verification tests against the built app.

I want to call this out up front because the commit log alone could be misread. What I owned throughout:

- **Product scope and feature prioritization** — deciding what a "good enough Photoshop clone" actually needs
- **Architecture decisions** — React 19 + Vite for the shell, Fabric.js for canvas interaction, a **custom WebGL2 renderer** for GPU-accelerated layer compositing and blend modes, **Rust/WebAssembly** (SIMD-enabled) for filter kernels
- **Technical direction and review** on every iteration across all three tools
- **The hard parts** — blend-mode math, undo/redo correctness, WebGL texture lifecycle, the custom `.FTS` project format, cross-tool coordination
- **Tool orchestration** — choosing which AI tool was best for which layer of the stack (Emergent for breadth and first-pass scaffolding, Claude Code for targeted implementation and refactoring, Gemini/Antigravity for UI test generation and verification)

The point of building it this way was to pressure-test, as a QA engineer whose job is increasingly about evaluating AI-generated code, where each of these tools actually delivers leverage, where they break down, and what the human review loop needs to look like at each layer. I can walk through any file in this repo and explain what it does and why.

## Features

### Drawing Tools
- **Brush** - Pressure-sensitive brush with customizable size and opacity
- **Pencil** - Fine drawing tool with pressure support
- **Eraser** - Remove strokes from the canvas
- **Eyedropper** - Sample colors from anywhere on the canvas
- **Shapes** - Rectangle and circle tools
- **Text** - Add and edit text on canvas

### Cursor & UX
- Dynamic circle cursor that matches brush/pencil/eraser size
- Cursor stays visible while drawing
- Real-time cursor size updates when adjusting slider

### Project Management
- **.FTS file format** - Save and load complete projects with layers
- **File System Access API** - Save directly to your computer (Chrome/Edge)
- **Auto-save** - Automatically saves every 60 seconds after initial save
- **Unsaved changes indicator** - Shows * when project has unsaved changes

### History
- **50-step undo/redo** - Full history support
- **Keyboard shortcuts** - Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo)

### Layers
- Multiple layer support
- Layer visibility toggle
- Layer opacity control
- Layer locking
- Background color customization

### Filters (WASM-accelerated)
- Brightness
- Contrast
- Saturation
- Blur
- Grayscale
- Sepia
- Invert

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo (alternative) |
| Ctrl+S | Save Project |
| Ctrl+Shift+S | Save Project As |
| Ctrl+O | Open Project |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/faux-toe-shop.git
cd faux-toe-shop

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:3000

### Running Tests

```bash
cd frontend
npm test
```

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Canvas**: Fabric.js
- **UI Components**: Radix UI, Lucide Icons
- **Testing**: Vitest, React Testing Library
- **Performance**: Rust/WebAssembly for filters (optional)

## Project Structure

```
faux-toe-shop/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── engine/         # WASM engine & state management
│   │   ├── utils/          # Utilities (ftsFormat, etc.)
│   │   └── hooks/          # Custom React hooks
│   └── tests/
├── wasm-core/              # Rust WASM filters
└── backend/                # FastAPI backend (optional)
```

## Documentation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed technical documentation and roadmap.

## License

MIT
