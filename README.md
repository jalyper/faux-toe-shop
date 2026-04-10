# Faux-Toe-Shop

**A browser-based image editor built with React 19 and Fabric.js — Photoshop-style tools and panels in a single-page app.**

Faux-Toe-Shop is a canvas-driven raster editor with the layout and behavior people expect from a desktop image tool: a toolbar of drawing tools, a layers panel with per-layer opacity and visibility, a properties panel for tool size and color, an undo/redo history panel, and an editable canvas in the middle. Built with [Fabric.js](http://fabricjs.com) for canvas object management and [@erase2d/fabric](https://www.npmjs.com/package/@erase2d/fabric) for proper destination-out eraser behavior.

(The repo name is a pun on "fauxtoshop," because of course it is.)

## Features

- **Drawing tools** — pencil, brush, eraser, plus rectangle / circle / text / move primitives
- **Pressure-sensitive brush** — variable line width based on pointer pressure events (gracefully falls back to fixed width on devices without a stylus)
- **Layers panel** — add, delete, reorder, lock, hide, and adjust per-layer opacity
- **Color picker** — full SketchPicker color wheel via [`react-color`](https://casesandberg.github.io/react-color/)
- **Properties panel** — live size and opacity sliders that affect the active tool
- **History panel** — undo/redo stack with click-to-jump navigation
- **Menu bar** — File / Edit / Image / Layers / Filters dropdowns
- **Filters** — wraps Fabric's image filter pipeline (brightness, contrast, blur, etc.)
- **Status-check API** — minimal FastAPI + MongoDB backend for client telemetry/heartbeats

## Tech Stack

| Layer | Tools |
|-------|-------|
| UI framework | React 19 |
| Canvas engine | Fabric.js 6, @erase2d/fabric |
| Color picker | react-color (SketchPicker) |
| UI primitives | Radix UI (alert-dialog, dropdown-menu, popover, scroll-area, separator, slider, label, checkbox, toast) styled via Tailwind CSS + class-variance-authority |
| Icons | lucide-react |
| Routing | react-router-dom 7 |
| Build | Vite (with `@/` path alias) |
| Backend | FastAPI, Motor (async MongoDB), Pydantic |

## Architecture

```
 ┌──────────────────────────────────┐
 │           React frontend         │
 │                                  │
 │  ┌────────────┐                  │
 │  │  MenuBar   │  File / Edit /   │
 │  └────────────┘  Image / Layers  │
 │  ┌────────────┐                  │
 │  │  Toolbar   │  Tool selection  │
 │  └────────────┘  + size sliders  │
 │  ┌──────────┐  ┌──────────────┐  │
 │  │ Layers   │  │   Canvas     │  │
 │  │  Panel   │  │  (Fabric.js) │  │
 │  └──────────┘  │              │  │
 │  ┌──────────┐  │              │  │
 │  │ History  │  │              │  │
 │  │  Panel   │  │              │  │
 │  └──────────┘  └──────────────┘  │
 │                ┌──────────────┐  │
 │                │  Properties  │  │
 │                │     Panel    │  │
 │                └──────────────┘  │
 └──────────────────────────────────┘
            │ /api/*
            ▼
 ┌──────────────────────────────────┐
 │     FastAPI backend (port 8001)  │
 │                                  │
 │  GET  /api/        → hello       │
 │  POST /api/status  → log client  │
 │  GET  /api/status  → list logs   │
 │           │                      │
 │           ▼                      │
 │       MongoDB                    │
 └──────────────────────────────────┘
```

The frontend lives in `frontend/src/components/`:

- `PhotoshopEditor.jsx` — top-level shell that wires the panels together and owns the editor state
- `Canvas.jsx` — Fabric.js canvas with drawing tools, layers, history, and the eraser brush
- `Toolbar.jsx` — left-rail tool palette with size and color controls
- `MenuBar.jsx` — top dropdown menus
- `LayersPanel.jsx` — layer list with opacity, visibility, and lock toggles
- `PropertiesPanel.jsx` — tool-specific options for the active selection
- `HistoryPanel.jsx` — undo/redo stack viewer
- `ColorPicker.jsx` — popover-wrapped SketchPicker
- `PressureSensitiveBrush.js` — custom Fabric brush that scales width by pointer pressure

## Running locally

The editor itself is a static SPA — the backend is optional and only needed if you want the status-check API up. Most of the time you only need the frontend.

### Prerequisites

- Node.js 18+
- npm 9+ (ships with Node 18)
- (Optional, for the backend) Python 3.11+ and MongoDB

### Frontend (the actual app)

```bash
git clone https://github.com/jalyper/faux-toe-shop.git
cd faux-toe-shop/frontend
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Backend (optional)

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="faux_toe_shop"
CORS_ORIGINS="*"
```

Start MongoDB if it isn't running:

```bash
docker run -d -p 27017:27017 --name faux-toe-mongo mongo:latest
```

Then run the API:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Building for production

```bash
cd frontend
npm run build
```

The static bundle lands in `frontend/build/`. Serve it with `npx serve -s build` or any static host.

## Scope notes

- The backend is intentionally minimal — it's a status-check / heartbeat endpoint, not an image storage service. The editor itself runs entirely in the browser.
- Image export is handled client-side via Fabric's `toDataURL()`. There's no upload-to-server flow.
- The pressure-sensitive brush works best with a stylus (Apple Pencil, Wacom). Mouse and trackpad fall back to a fixed width.

## License

MIT
