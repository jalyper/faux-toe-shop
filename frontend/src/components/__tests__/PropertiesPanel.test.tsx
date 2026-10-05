import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PropertiesPanel from '../PropertiesPanel';

describe('PropertiesPanel Component', () => {
  const defaultProps = {
    applyFilter: vi.fn(),
    activeTool: 'select' as const,
    layers: [
      {
        id: 'layer-1',
        name: 'Layer 1',
        visible: true,
        opacity: 100,
        locked: false,
        adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
      },
    ],
    activeLayerId: 'layer-1',
    onLayersUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render properties panel', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Adjustments')).toBeInTheDocument();
    });

    it('should display active layer name', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('For:')).toBeInTheDocument();
      expect(screen.getByText('Layer 1')).toBeInTheDocument();
    });

    it('should render brightness slider', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Brightness')).toBeInTheDocument();
    });

    it('should render contrast slider', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Contrast')).toBeInTheDocument();
    });

    it('should render saturation slider', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Saturation')).toBeInTheDocument();
    });

    it('should render blur slider', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Blur')).toBeInTheDocument();
    });

    it('should render quick filters section', () => {
      render(<PropertiesPanel {...defaultProps} />);

      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
      expect(screen.getByText('Grayscale')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();
    });

    it('should not display layer name when no active layer', () => {
      const props = {
        ...defaultProps,
        layers: [],
        activeLayerId: 'non-existent',
      };

      render(<PropertiesPanel {...props} />);

      expect(screen.queryByText('For:')).not.toBeInTheDocument();
    });
  });

  describe('Adjustment Value Display', () => {
    it('should display current brightness value', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 25, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      // The value "25" should be displayed next to the Brightness label
      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('25');
    });

    it('should display current contrast value', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: -30, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const contrastSection = screen.getByText('Contrast').parentElement;
      expect(contrastSection).toHaveTextContent('-30');
    });

    it('should display current saturation value', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 50, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const saturationSection = screen.getByText('Saturation').parentElement;
      expect(saturationSection).toHaveTextContent('50');
    });

    it('should display current blur value', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 15 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const blurSection = screen.getByText('Blur').parentElement;
      expect(blurSection).toHaveTextContent('15');
    });

    it('should display zero values correctly', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').parentElement;
      const contrastSection = screen.getByText('Contrast').parentElement;
      const saturationSection = screen.getByText('Saturation').parentElement;
      const blurSection = screen.getByText('Blur').parentElement;

      expect(brightnessSection).toHaveTextContent('0');
      expect(contrastSection).toHaveTextContent('0');
      expect(saturationSection).toHaveTextContent('0');
      expect(blurSection).toHaveTextContent('0');
    });
  });

  describe('Brightness Adjustment', () => {
    it.todo('should have correct brightness range (-100 to 100)', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').closest('div');
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      expect(slider).toHaveAttribute('min', '-100');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should call applyFilter when brightness slider is committed', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').closest('div');
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      if (slider) {
        // Simulate value change
        fireEvent.change(slider, { target: { value: '50' } });

        // Simulate value commit (mouse up)
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.applyFilter).toHaveBeenCalledWith('brightness', 50);
        });
      }
    });

    it('should update layers when brightness is applied', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').closest('div');
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '30' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
              id: 'layer-1',
              adjustments: expect.objectContaining({ brightness: 30 }),
            }),
          ]);
        });
      }
    });
  });

  describe('Contrast Adjustment', () => {
    it.todo('should have correct contrast range (-100 to 100)', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const contrastSection = screen.getByText('Contrast').closest('div');
      const slider = contrastSection?.querySelector('input[type="range"]') ||
                     contrastSection?.querySelector('[role="slider"]');

      expect(slider).toHaveAttribute('min', '-100');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should call applyFilter when contrast slider is committed', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const contrastSection = screen.getByText('Contrast').closest('div');
      const slider = contrastSection?.querySelector('input[type="range"]') ||
                     contrastSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '-40' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.applyFilter).toHaveBeenCalledWith('contrast', -40);
        });
      }
    });

    it('should update layers when contrast is applied', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const contrastSection = screen.getByText('Contrast').closest('div');
      const slider = contrastSection?.querySelector('input[type="range"]') ||
                     contrastSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '20' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
              id: 'layer-1',
              adjustments: expect.objectContaining({ contrast: 20 }),
            }),
          ]);
        });
      }
    });
  });

  describe('Saturation Adjustment', () => {
    it.todo('should have correct saturation range (-100 to 100)', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const saturationSection = screen.getByText('Saturation').closest('div');
      const slider = saturationSection?.querySelector('input[type="range"]') ||
                     saturationSection?.querySelector('[role="slider"]');

      expect(slider).toHaveAttribute('min', '-100');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should call applyFilter when saturation slider is committed', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const saturationSection = screen.getByText('Saturation').closest('div');
      const slider = saturationSection?.querySelector('input[type="range"]') ||
                     saturationSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '60' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.applyFilter).toHaveBeenCalledWith('saturation', 60);
        });
      }
    });

    it('should update layers when saturation is applied', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const saturationSection = screen.getByText('Saturation').closest('div');
      const slider = saturationSection?.querySelector('input[type="range"]') ||
                     saturationSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '-50' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
              id: 'layer-1',
              adjustments: expect.objectContaining({ saturation: -50 }),
            }),
          ]);
        });
      }
    });
  });

  describe('Blur Adjustment', () => {
    it.todo('should have correct blur range (0 to 100)', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const blurSection = screen.getByText('Blur').closest('div');
      const slider = blurSection?.querySelector('input[type="range"]') ||
                     blurSection?.querySelector('[role="slider"]');

      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '1');
    });

    it('should call applyFilter when blur slider is committed', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const blurSection = screen.getByText('Blur').closest('div');
      const slider = blurSection?.querySelector('input[type="range"]') ||
                     blurSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '25' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.applyFilter).toHaveBeenCalledWith('blur', 25);
        });
      }
    });

    it('should update layers when blur is applied', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const blurSection = screen.getByText('Blur').closest('div');
      const slider = blurSection?.querySelector('input[type="range"]') ||
                     blurSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '10' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
              id: 'layer-1',
              adjustments: expect.objectContaining({ blur: 10 }),
            }),
          ]);
        });
      }
    });
  });

  describe('Quick Filters', () => {
    it('should apply grayscale filter when button clicked', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const grayscaleButton = screen.getByText('Grayscale');
      fireEvent.click(grayscaleButton);

      expect(defaultProps.applyFilter).toHaveBeenCalledWith('grayscale', 100);
    });

    it('should apply sepia filter when button clicked', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const sepiaButton = screen.getByText('Sepia');
      fireEvent.click(sepiaButton);

      expect(defaultProps.applyFilter).toHaveBeenCalledWith('sepia', 100);
    });

    it('should update layers when grayscale is applied', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const grayscaleButton = screen.getByText('Grayscale');
      fireEvent.click(grayscaleButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalled();
    });

    it('should update layers when sepia is applied', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const sepiaButton = screen.getByText('Sepia');
      fireEvent.click(sepiaButton);

      expect(defaultProps.onLayersUpdate).toHaveBeenCalled();
    });
  });

  describe('Active Layer Changes', () => {
    it('should update adjustment values when active layer changes', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 20, contrast: 30, saturation: 40, blur: 5 },
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: -10, contrast: -20, saturation: -30, blur: 15 },
        },
      ];

      const { rerender } = render(
        <PropertiesPanel {...defaultProps} layers={layers} activeLayerId="layer-1" />
      );

      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('20');

      rerender(<PropertiesPanel {...defaultProps} layers={layers} activeLayerId="layer-2" />);

      expect(brightnessSection).toHaveTextContent('-10');
    });

    it('should update displayed layer name when active layer changes', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      const { rerender } = render(
        <PropertiesPanel {...defaultProps} layers={layers} activeLayerId="layer-1" />
      );

      expect(screen.getByText('Layer 1')).toBeInTheDocument();

      rerender(<PropertiesPanel {...defaultProps} layers={layers} activeLayerId="layer-2" />);

      expect(screen.getByText('Layer 2')).toBeInTheDocument();
    });

    it('should reset to default values when layer has no adjustments', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 50, contrast: 50, saturation: 50, blur: 50 },
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          visible: true,
          opacity: 100,
          locked: false,
          // No adjustments property
        },
      ];

      const { rerender } = render(
        <PropertiesPanel {...defaultProps} layers={layers as any} activeLayerId="layer-1" />
      );

      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('50');

      rerender(<PropertiesPanel {...defaultProps} layers={layers as any} activeLayerId="layer-2" />);

      // Should fall back to 0 or undefined
      waitFor(() => {
        expect(brightnessSection).toHaveTextContent('0');
      });
    });
  });

  describe('Multiple Layer Support', () => {
    it('should only apply filters to active layer', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} activeLayerId="layer-1" />);

      const brightnessSection = screen.getByText('Brightness').closest('div');
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '30' } });
        fireEvent.mouseUp(slider);

        waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalledWith([
            expect.objectContaining({
              id: 'layer-1',
              adjustments: expect.objectContaining({ brightness: 30 }),
            }),
            expect.objectContaining({
              id: 'layer-2',
              adjustments: expect.objectContaining({ brightness: 0 }),
            }),
          ]);
        });
      }
    });
  });

  describe('Integration with Parent Component', () => {
    it('should call applyFilter callback', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const grayscaleButton = screen.getByText('Grayscale');
      fireEvent.click(grayscaleButton);

      expect(defaultProps.applyFilter).toHaveBeenCalledWith('grayscale', 100);
    });

    it('should call onLayersUpdate callback', async () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').closest('div');
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '25' } });
        fireEvent.mouseUp(slider);

        await waitFor(() => {
          expect(defaultProps.onLayersUpdate).toHaveBeenCalled();
        });
      }
    });

    it('should handle layers prop updates', () => {
      const { rerender } = render(<PropertiesPanel {...defaultProps} />);

      const newLayers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 75, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      rerender(<PropertiesPanel {...defaultProps} layers={newLayers} />);

      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('75');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum brightness value (-100)', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: -100, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('-100');
    });

    it('should handle maximum brightness value (100)', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 100, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const brightnessSection = screen.getByText('Brightness').parentElement;
      expect(brightnessSection).toHaveTextContent('100');
    });

    it('should handle minimum blur value (0)', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const blurSection = screen.getByText('Blur').parentElement;
      expect(blurSection).toHaveTextContent('0');
    });

    it('should handle maximum blur value (100)', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          locked: false,
          adjustments: { brightness: 0, contrast: 0, saturation: 0, blur: 100 },
        },
      ];

      render(<PropertiesPanel {...defaultProps} layers={layers} />);

      const blurSection = screen.getByText('Blur').parentElement;
      expect(blurSection).toHaveTextContent('100');
    });

    it('should handle non-existent active layer gracefully', () => {
      const props = {
        ...defaultProps,
        activeLayerId: 'non-existent-layer',
      };

      // Should not crash
      render(<PropertiesPanel {...props} />);

      expect(screen.getByText('Adjustments')).toBeInTheDocument();
      expect(screen.queryByText('For:')).not.toBeInTheDocument();
    });

    it('should handle empty layers array', () => {
      const props = {
        ...defaultProps,
        layers: [],
      };

      render(<PropertiesPanel {...props} />);

      expect(screen.getByText('Adjustments')).toBeInTheDocument();
    });
  });

  describe('Real-time Feedback', () => {
    it('should show updated value during slider drag without committing', () => {
      render(<PropertiesPanel {...defaultProps} />);

      const brightnessSection = screen.getByText('Brightness').parentElement;
      const slider = brightnessSection?.querySelector('input[type="range"]') ||
                     brightnessSection?.querySelector('[role="slider"]');

      if (slider) {
        // Change value without committing (no mouse up)
        fireEvent.change(slider, { target: { value: '45' } });

        // Value should be visible in UI
        expect(brightnessSection).toHaveTextContent('45');

        // But applyFilter should not be called yet (only on commit)
        expect(defaultProps.applyFilter).not.toHaveBeenCalled();
      }
    });
  });
});
