import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import PhotoshopEditor from './PhotoshopEditor';

// Mock child components
vi.mock('./Canvas', () => ({
  default: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      undo: vi.fn(),
      redo: vi.fn(),
      loadImage: vi.fn(),
      exportImage: vi.fn(),
      applyFilter: vi.fn(),
      updateLayers: vi.fn(),
      deleteLayer: vi.fn(),
      setBackgroundColor: vi.fn(),
    }));
    return React.createElement('div', { 'data-testid': 'mock-canvas' });
  }),
}));

vi.mock('./Toolbar', () => ({
  default: () => <div data-testid="mock-toolbar" />,
}));

vi.mock('./LayersPanel', () => ({
  default: ({ layers, onLayerAdd }: { layers: any[]; onLayerAdd: (type: string) => void }) => (
    <div data-testid="mock-layers-panel">
      <h3>Layers</h3>
      {layers && layers.map((layer: any) => (
        <div key={layer.id}>{layer.name}</div>
      ))}
      <button onClick={() => onLayerAdd('image')} aria-label="Add new layer">Add Layer</button>
    </div>
  ),
}));

vi.mock('./PropertiesPanel', () => ({
  default: () => <div data-testid="mock-properties-panel" />,
}));

vi.mock('./HistoryPanel', () => ({
  default: ({ history, historyStep, onUndo, onRedo }: { history: any[]; historyStep: number; onUndo: () => void; onRedo: () => void }) => (
    <div data-testid="mock-history-panel">
      <button title="Undo" disabled={historyStep < 0} onClick={onUndo}>Undo</button>
      <button title="Redo" disabled={historyStep >= history.length - 1} onClick={onRedo}>Redo</button>
    </div>
  ),
}));

vi.mock('./ColorPicker', () => ({
  default: () => <div data-testid="mock-color-picker" />,
}));

vi.mock('./MenuBar', () => ({
  default: () => <div data-testid="mock-menu-bar">File</div>,
}));

// Mock hooks
vi.mock('../hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock Fabric.js
vi.mock('fabric', () => ({
  Canvas: vi.fn(),
  Circle: vi.fn(),
  Rect: vi.fn(),
  IText: vi.fn(),
  Image: { fromURL: vi.fn() },
  PencilBrush: vi.fn(),
  filters: {
    Brightness: vi.fn(),
    Contrast: vi.fn(),
    Saturation: vi.fn(),
    Blur: vi.fn(),
    Grayscale: vi.fn(),
    Sepia: vi.fn(),
  },
}));

vi.mock('@erase2d/fabric', () => ({
  EraserBrush: vi.fn(),
}));

describe('PhotoshopEditor', () => {
  it('renders without crashing', () => {
    render(<PhotoshopEditor />);
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });

  it('initializes with background layer', () => {
    render(<PhotoshopEditor />);
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('enables undo button after an action', async () => {
    render(<PhotoshopEditor />);

    // Undo should be disabled initially
    const undoBtn = screen.getByTitle('Undo');
    expect(undoBtn).toBeDisabled();

    // Simulate adding a layer (which triggers history add)
    const addLayerBtn = screen.getByLabelText('Add new layer');
    fireEvent.click(addLayerBtn);

    // Undo should be enabled now
    await waitFor(() => {
      expect(undoBtn).not.toBeDisabled();
    });
  });

  it('disables undo button after undoing the only action', async () => {
    render(<PhotoshopEditor />);

    const undoBtn = screen.getByTitle('Undo');
    const addLayerBtn = screen.getByLabelText('Add new layer');

    // Add layer
    fireEvent.click(addLayerBtn);
    await waitFor(() => {
      expect(undoBtn).not.toBeDisabled();
    });

    // Undo
    fireEvent.click(undoBtn);
    await waitFor(() => {
      expect(undoBtn).toBeDisabled();
    });
  });
});
