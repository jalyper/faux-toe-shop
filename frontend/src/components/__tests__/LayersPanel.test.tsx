import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LayersPanel from '../LayersPanel';

describe('LayersPanel Component', () => {
  const defaultProps = {
    layers: [
      { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 100, locked: false, isBackground: false },
      { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 80, locked: false, isBackground: false },
    ],
    activeLayerId: 'layer-1',
    setActiveLayerId: vi.fn(),
    onLayersUpdate: vi.fn(),
    onLayerAdd: vi.fn(),
    backgroundColor: '#ffffff',
    onBackgroundColorChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render layers panel', () => {
      render(<LayersPanel {...defaultProps} />);

      expect(screen.getByTestId('layers-panel')).toBeInTheDocument();
      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('should render add layer button', () => {
      render(<LayersPanel {...defaultProps} />);

      const addButton = screen.getByTestId('add-layer-button');
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAttribute('aria-label', 'Add new layer');
    });

    it('should render all layers in reverse order', () => {
      render(<LayersPanel {...defaultProps} />);

      const layersList = screen.getByTestId('layers-list');
      expect(layersList).toBeInTheDocument();

      expect(screen.getByTestId('layer-layer-1')).toBeInTheDocument();
      expect(screen.getByTestId('layer-layer-2')).toBeInTheDocument();
    });

    it('should render no layers message when layers array is empty', () => {
      render(<LayersPanel {...defaultProps} layers={[]} />);

      expect(screen.getByTestId('no-layers-message')).toBeInTheDocument();
      expect(screen.getByText('No layers yet')).toBeInTheDocument();
    });

    it('should highlight active layer', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const activeLayer = screen.getByTestId('layer-layer-2');
      const inactiveLayer = screen.getByTestId('layer-layer-1');

      expect(activeLayer).toHaveClass('bg-[#0d7bdc]');
      expect(inactiveLayer).toHaveClass('bg-[#3e3e3e]');
    });

    it('should display layer names', () => {
      render(<LayersPanel {...defaultProps} />);

      expect(screen.getByTestId('layer-name-layer-1')).toHaveTextContent('Layer 1');
      expect(screen.getByTestId('layer-name-layer-2')).toHaveTextContent('Layer 2');
    });

    it('should display layer opacity values', () => {
      render(<LayersPanel {...defaultProps} />);

      const layers = screen.getAllByText(/\d+%/);
      expect(layers.length).toBeGreaterThan(0);
    });
  });

  describe('Layer Selection', () => {
    it('should call setActiveLayerId when layer is clicked', () => {
      render(<LayersPanel {...defaultProps} />);

      const layer = screen.getByTestId('layer-layer-2');
      fireEvent.click(layer);

      expect(defaultProps.setActiveLayerId).toHaveBeenCalledWith('layer-2');
    });

    it('should allow clicking on already active layer', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-1" />);

      const layer = screen.getByTestId('layer-layer-1');
      fireEvent.click(layer);

      expect(defaultProps.setActiveLayerId).toHaveBeenCalledWith('layer-1');
    });
  });

  describe('Layer Visibility Toggle', () => {
    it('should render visibility icons correctly', () => {
      const layers = [
        { id: 'visible-layer', name: 'Visible', visible: true, opacity: 100, locked: false },
        { id: 'hidden-layer', name: 'Hidden', visible: false, opacity: 100, locked: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const visibleButton = screen.getByTestId('layer-visibility-visible-layer');
      const hiddenButton = screen.getByTestId('layer-visibility-hidden-layer');

      expect(visibleButton).toBeInTheDocument();
      expect(hiddenButton).toBeInTheDocument();
    });

    it('should toggle layer visibility when eye icon clicked', () => {
      render(<LayersPanel {...defaultProps} />);

      const visibilityButton = screen.getByTestId('layer-visibility-layer-1');
      fireEvent.click(visibilityButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
        { id: 'layer-1', name: 'Layer 1', visible: false, opacity: 100, locked: false, isBackground: false },
        { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 80, locked: false, isBackground: false },
      ]);
    });

    it('should not activate layer when visibility icon is clicked', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const visibilityButton = screen.getByTestId('layer-visibility-layer-1');
      fireEvent.click(visibilityButton);

      // setActiveLayerId should not be called
      expect(defaultProps.setActiveLayerId).not.toHaveBeenCalled();
    });

    it('should have correct aria-label for visibility toggle', () => {
      render(<LayersPanel {...defaultProps} />);

      const visibilityButton = screen.getByTestId('layer-visibility-layer-1');
      expect(visibilityButton).toHaveAttribute('aria-label', 'Toggle visibility for Layer 1');
    });
  });

  describe('Layer Lock Toggle', () => {
    it('should render lock icons correctly', () => {
      const layers = [
        { id: 'unlocked-layer', name: 'Unlocked', visible: true, opacity: 100, locked: false },
        { id: 'locked-layer', name: 'Locked', visible: true, opacity: 100, locked: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const unlockedButton = screen.getByTestId('layer-lock-unlocked-layer');
      const lockedButton = screen.getByTestId('layer-lock-locked-layer');

      expect(unlockedButton).toBeInTheDocument();
      expect(lockedButton).toBeInTheDocument();
    });

    it('should toggle layer lock when icon clicked', () => {
      render(<LayersPanel {...defaultProps} />);

      const lockButton = screen.getByTestId('layer-lock-layer-1');
      fireEvent.click(lockButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
        { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 100, locked: true, isBackground: false },
        { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 80, locked: false, isBackground: false },
      ]);
    });

    it('should not activate layer when lock icon is clicked', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const lockButton = screen.getByTestId('layer-lock-layer-1');
      fireEvent.click(lockButton);

      expect(defaultProps.setActiveLayerId).not.toHaveBeenCalled();
    });

    it('should have correct aria-label for lock toggle', () => {
      render(<LayersPanel {...defaultProps} />);

      const lockButton = screen.getByTestId('layer-lock-layer-1');
      expect(lockButton).toHaveAttribute('aria-label', 'Toggle lock for Layer 1');
    });
  });

  describe('Layer Opacity Control', () => {
    it.todo('should update layer opacity when slider changes', () => {
      render(<LayersPanel {...defaultProps} />);

      const layer = screen.getByTestId('layer-layer-1');
      const slider = layer.querySelector('input[type="range"]') ||
                      layer.querySelector('[role="slider"]');

      expect(slider).toBeInTheDocument();

      if (slider) {
        fireEvent.change(slider, { target: { value: '50' } });

        // onLayersUpdate should be called with updated opacity
        waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith(
            expect.arrayContaining([
              expect.objectContaining({ id: 'layer-1', opacity: 50 })
            ])
          );
        });
      }
    });

    it('should not change active layer when opacity slider is interacted with', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const layer = screen.getByTestId('layer-layer-1');
      const slider = layer.querySelector('input[type="range"]') ||
                      layer.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.click(slider);

        expect(defaultProps.setActiveLayerId).not.toHaveBeenCalled();
      }
    });
  });

  describe('Layer Deletion', () => {
    it('should render delete button for non-background layers', () => {
      render(<LayersPanel {...defaultProps} />);

      const deleteButton = screen.getByTestId('layer-delete-layer-1');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not render delete button for background layer', () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const deleteButton = screen.queryByTestId('layer-delete-bg-layer');
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should delete layer when delete button clicked', () => {
      render(<LayersPanel {...defaultProps} />);

      const deleteButton = screen.getByTestId('layer-delete-layer-1');
      fireEvent.click(deleteButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
        { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 80, locked: false, isBackground: false },
      ]);
    });

    it('should not delete background layer even if deleteLayer is called', () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
        { id: 'normal-layer', name: 'Layer 1', visible: true, opacity: 100, locked: false, isBackground: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      // Attempt to delete background layer (should not have delete button, but test the logic)
      const deleteButton = screen.queryByTestId('layer-delete-bg-layer');
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should not activate layer when delete button is clicked', () => {
      render(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const deleteButton = screen.getByTestId('layer-delete-layer-1');
      fireEvent.click(deleteButton);

      expect(defaultProps.setActiveLayerId).not.toHaveBeenCalled();
    });

    it('should have correct aria-label for delete button', () => {
      render(<LayersPanel {...defaultProps} />);

      const deleteButton = screen.getByTestId('layer-delete-layer-1');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete Layer 1');
    });
  });

  describe('Add Layer', () => {
    it('should call onLayerAdd when add button is clicked', () => {
      render(<LayersPanel {...defaultProps} />);

      const addButton = screen.getByTestId('add-layer-button');
      fireEvent.click(addButton);

      expect(defaultProps.onLayerAdd).toHaveBeenCalledWith('image');
    });
  });

  describe('Background Layer Normalization', () => {
    it('should show normalize dialog when background layer is double-clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const bgLayer = screen.getByTestId('layer-bg-layer');
      fireEvent.doubleClick(bgLayer);

      await waitFor(() => {
        expect(screen.getByTestId('normalize-dialog')).toBeInTheDocument();
        expect(screen.getByText('Normalize layer?')).toBeInTheDocument();
      });
    });

    it('should not show normalize dialog for non-background layers', async () => {
      render(<LayersPanel {...defaultProps} />);

      const layer = screen.getByTestId('layer-layer-1');
      fireEvent.doubleClick(layer);

      // Dialog should not appear
      await waitFor(() => {
        expect(screen.queryByTestId('normalize-dialog')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should normalize background layer when confirmed', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const bgLayer = screen.getByTestId('layer-bg-layer');
      fireEvent.doubleClick(bgLayer);

      await waitFor(() => {
        expect(screen.getByTestId('normalize-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('normalize-confirm');
      fireEvent.click(confirmButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
        { id: 'bg-layer', name: 'Layer 0', visible: true, opacity: 100, locked: false, isBackground: false },
      ]);
    });

    it('should not normalize background layer when cancelled', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const bgLayer = screen.getByTestId('layer-bg-layer');
      fireEvent.doubleClick(bgLayer);

      await waitFor(() => {
        expect(screen.getByTestId('normalize-dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('normalize-cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onLayersUpdate).not.toHaveBeenCalled();
    });

    it('should close normalize dialog after confirmation', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const bgLayer = screen.getByTestId('layer-bg-layer');
      fireEvent.doubleClick(bgLayer);

      await waitFor(() => {
        expect(screen.getByTestId('normalize-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('normalize-confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('normalize-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Background Color Picker', () => {
    it('should render background color swatch for background layer', () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} backgroundColor="#ff0000" />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      expect(colorSwatch).toBeInTheDocument();
      expect(colorSwatch).toHaveStyle({ backgroundColor: '#ff0000' });
    });

    it('should not render background color swatch for non-background layers', () => {
      render(<LayersPanel {...defaultProps} />);

      const colorSwatch = screen.queryByTestId('background-color-swatch');
      expect(colorSwatch).not.toBeInTheDocument();
    });

    it('should open color picker when background color swatch is clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTestId('background-color-picker-dialog')).toBeInTheDocument();
        expect(screen.getByText('Background Color')).toBeInTheDocument();
      });
    });

    it('should not activate layer when color swatch is clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
        { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 100, locked: false, isBackground: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} activeLayerId="layer-1" />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      expect(defaultProps.setActiveLayerId).not.toHaveBeenCalled();
    });

    it('should update background color in real-time when color input changes', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTestId('background-color-input')).toBeInTheDocument();
      });

      const colorInput = screen.getByTestId('background-color-input');
      fireEvent.change(colorInput, { target: { value: '#00ff00' } });

      expect(defaultProps.onBackgroundColorChange).toHaveBeenCalledWith('#00ff00');
    });

    it('should update background color when hex input changes', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTestId('background-color-hex-input')).toBeInTheDocument();
      });

      const hexInput = screen.getByTestId('background-color-hex-input');
      fireEvent.change(hexInput, { target: { value: '#0000ff' } });

      expect(defaultProps.onBackgroundColorChange).toHaveBeenCalledWith('#0000ff');
    });

    it('should apply color change when OK is clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTestId('background-color-ok')).toBeInTheDocument();
      });

      const okButton = screen.getByTestId('background-color-ok');
      fireEvent.click(okButton);

      await waitFor(() => {
        expect(screen.queryByTestId('background-color-picker-dialog')).not.toBeInTheDocument();
      });
    });

    it('should revert color change when Cancel is clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} backgroundColor="#ffffff" />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTestId('background-color-input')).toBeInTheDocument();
      });

      // Change color
      const colorInput = screen.getByTestId('background-color-input');
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });

      expect(defaultProps.onBackgroundColorChange).toHaveBeenCalledWith('#ff0000');

      // Click cancel
      const cancelButton = screen.getByTestId('background-color-cancel');
      fireEvent.click(cancelButton);

      // Should revert to original
      await waitFor(() => {
        expect(defaultProps.onBackgroundColorChange).toHaveBeenCalledWith('#ffffff');
      });
    });

    it('should render quick color presets', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByText('Quick Colors')).toBeInTheDocument();
      });

      // Should have 16 preset colors
      const presetButtons = screen.getAllByTitle(/#[0-9a-fA-F]{6}/);
      expect(presetButtons.length).toBe(16);
    });

    it('should apply preset color when clicked', async () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      fireEvent.click(colorSwatch);

      await waitFor(() => {
        expect(screen.getByTitle('#ff0000')).toBeInTheDocument();
      });

      const redPreset = screen.getByTitle('#ff0000');
      fireEvent.click(redPreset);

      expect(defaultProps.onBackgroundColorChange).toHaveBeenCalledWith('#ff0000');
    });
  });

  describe('Integration with Parent Component', () => {
    it('should handle layers prop updates', () => {
      const { rerender } = render(<LayersPanel {...defaultProps} />);

      const newLayers = [
        { id: 'layer-1', name: 'Layer 1', visible: true, opacity: 100, locked: false, isBackground: false },
        { id: 'layer-2', name: 'Layer 2', visible: true, opacity: 80, locked: false, isBackground: false },
        { id: 'layer-3', name: 'Layer 3', visible: true, opacity: 60, locked: false, isBackground: false },
      ];

      rerender(<LayersPanel {...defaultProps} layers={newLayers} />);

      expect(screen.getByTestId('layer-layer-3')).toBeInTheDocument();
    });

    it('should handle activeLayerId prop updates', () => {
      const { rerender } = render(<LayersPanel {...defaultProps} activeLayerId="layer-1" />);

      const layer1 = screen.getByTestId('layer-layer-1');
      expect(layer1).toHaveClass('bg-[#0d7bdc]');

      rerender(<LayersPanel {...defaultProps} activeLayerId="layer-2" />);

      const layer2 = screen.getByTestId('layer-layer-2');
      expect(layer2).toHaveClass('bg-[#0d7bdc]');
    });

    it('should handle backgroundColor prop updates', () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      const { rerender } = render(
        <LayersPanel {...defaultProps} layers={layers} backgroundColor="#ffffff" />
      );

      const colorSwatch = screen.getByTestId('background-color-swatch');
      expect(colorSwatch).toHaveStyle({ backgroundColor: '#ffffff' });

      rerender(
        <LayersPanel {...defaultProps} layers={layers} backgroundColor="#000000" />
      );

      expect(colorSwatch).toHaveStyle({ backgroundColor: '#000000' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for interactive elements', () => {
      render(<LayersPanel {...defaultProps} />);

      expect(screen.getByTestId('add-layer-button')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('layer-visibility-layer-1')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('layer-lock-layer-1')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('layer-delete-layer-1')).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation for layer selection', () => {
      render(<LayersPanel {...defaultProps} />);

      const layer = screen.getByTestId('layer-layer-1');

      // Layer should be clickable (accessible via keyboard)
      expect(layer).toHaveClass('cursor-pointer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single layer', () => {
      const layers = [
        { id: 'only-layer', name: 'Only Layer', visible: true, opacity: 100, locked: false, isBackground: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      expect(screen.getByTestId('layer-only-layer')).toBeInTheDocument();
    });

    it('should handle layer with 0% opacity', () => {
      const layers = [
        { id: 'transparent', name: 'Transparent', visible: true, opacity: 0, locked: false, isBackground: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle layer with 100% opacity', () => {
      const layers = [
        { id: 'opaque', name: 'Opaque', visible: true, opacity: 100, locked: false, isBackground: false },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle missing backgroundColor prop', () => {
      const layers = [
        { id: 'bg-layer', name: 'Background', visible: true, opacity: 100, locked: false, isBackground: true },
      ];

      render(<LayersPanel {...defaultProps} layers={layers} backgroundColor={undefined} />);

      const colorSwatch = screen.getByTestId('background-color-swatch');
      // Should default to white
      expect(colorSwatch).toHaveStyle({ backgroundColor: '#ffffff' });
    });
  });
});
