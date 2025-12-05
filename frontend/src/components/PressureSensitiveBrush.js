import { PencilBrush } from 'fabric';

class PressureSensitiveBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.pressurePoints = [];
    this.simulatePressure = true; // For testing without stylus
    this.simulationPhase = 0;
  }

  // Override onMouseDown to track pressure
  onMouseDown(pointer, options) {
    this.pressurePoints = [];
    const pressure = this.getPressure(options.e);
    this.pressurePoints.push({ x: pointer.x, y: pointer.y, pressure });
    super.onMouseDown(pointer, options);
  }

  // Override onMouseMove to track pressure and adjust width
  onMouseMove(pointer, options) {
    const pressure = this.getPressure(options.e);
    this.pressurePoints.push({ x: pointer.x, y: pointer.y, pressure });
    
    // Adjust brush width based on pressure
    this.width = this._originalWidth * pressure;
    
    super.onMouseMove(pointer, options);
  }

  // Get pressure from pointer event or simulate it
  getPressure(event) {
    // Check if device supports pressure
    if (event.pressure !== undefined && event.pressure > 0) {
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

  // Store original width
  set width(value) {
    this._originalWidth = value;
    super.width = value;
  }

  get width() {
    return super.width;
  }
}

export default PressureSensitiveBrush;
