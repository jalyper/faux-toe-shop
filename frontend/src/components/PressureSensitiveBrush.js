import { PencilBrush } from 'fabric';

class PressureSensitiveBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.simulatePressure = true; // For testing without stylus
    this.simulationPhase = 0;
    this.baseWidth = 5; // Will be set from outside
  }

  // Get pressure from pointer event or simulate it
  _getPressure(event) {
    // Check if device supports pressure
    if (event && event.pressure !== undefined && event.pressure > 0) {
      return event.pressure;
    }
    
    // Simulate pressure for testing (sine wave pattern)
    if (this.simulatePressure) {
      this.simulationPhase += 0.1;
      // Create a smooth sine wave between 0.3 and 1.0
      const pressure = 0.65 + 0.35 * Math.sin(this.simulationPhase);
      return Math.max(0.3, Math.min(1.0, pressure));
    }
    
    return 0.5; // Default pressure
  }

  // Override _render to apply pressure during drawing
  _render(ctx) {
    // Store original width
    const originalWidth = this.width;
    
    // Don't modify width - just call parent render
    super._render(ctx);
  }

  // Apply pressure to stroke width during drawing
  onMouseMove(pointer, options) {
    if (options && options.e) {
      const pressure = this._getPressure(options.e);
      // Temporarily adjust width based on pressure
      this.width = this.baseWidth * pressure;
    }
    
    super.onMouseMove(pointer, options);
  }

  onMouseDown(pointer, options) {
    this.simulationPhase = 0; // Reset simulation phase
    if (options && options.e) {
      const pressure = this._getPressure(options.e);
      this.width = this.baseWidth * pressure;
    }
    super.onMouseDown(pointer, options);
  }
}

export default PressureSensitiveBrush;
