import { PencilBrush, Path, util } from 'fabric';

/**
 * Pressure-sensitive brush that creates variable-width strokes
 * Supports Wacom tablets with up to 4096 levels of pressure
 */
class PressureSensitiveBrush extends PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.baseWidth = 5;
    this.minWidthFactor = 0.1; // Minimum width as fraction of baseWidth
    this.maxWidthFactor = 1.0; // Maximum width as fraction of baseWidth
    this.pressureSmoothing = 0.3; // Smooth pressure changes (0-1)

    // Store points with pressure data
    this._pressurePoints = [];
    this._lastPressure = 0.5;
    this._isDrawing = false;
  }

  /**
   * Get pressure from pointer event
   * Supports PointerEvent.pressure (0.0 - 1.0)
   * Wacom Intuos Pro provides ~4096 levels mapped to this range
   */
  _getPressure(event) {
    if (!event) return this._lastPressure;

    let pressure = 0.5;

    // PointerEvent (modern API - works with Wacom)
    if (event.pointerType === 'pen' && typeof event.pressure === 'number') {
      // Wacom pressure is already normalized 0.0-1.0
      pressure = event.pressure;

      // Some tablets report 0 pressure on hover, use last known pressure
      if (pressure === 0 && this._isDrawing) {
        pressure = this._lastPressure;
      }
    }
    // Touch events with force (iOS)
    else if (event.touches && event.touches[0] && typeof event.touches[0].force === 'number') {
      pressure = Math.min(1, event.touches[0].force);
    }
    // MouseEvent fallback - no pressure, use constant
    else if (event.type && event.type.startsWith('mouse')) {
      pressure = 0.5;
    }

    // Apply smoothing to prevent jittery width changes
    pressure = this._lastPressure * this.pressureSmoothing +
               pressure * (1 - this.pressureSmoothing);

    // Clamp to valid range
    pressure = Math.max(0.01, Math.min(1, pressure));
    this._lastPressure = pressure;

    return pressure;
  }

  /**
   * Calculate stroke width from pressure
   */
  _getWidthFromPressure(pressure) {
    const minWidth = this.baseWidth * this.minWidthFactor;
    const maxWidth = this.baseWidth * this.maxWidthFactor;
    return minWidth + (maxWidth - minWidth) * pressure;
  }

  onMouseDown(pointer, options) {
    this._isDrawing = true;
    this._pressurePoints = [];
    this._lastPressure = 0.5;

    const pressure = this._getPressure(options?.e);
    this._pressurePoints.push({
      x: pointer.x,
      y: pointer.y,
      pressure: pressure
    });

    // Set initial width for the preview
    this.width = this._getWidthFromPressure(pressure);

    super.onMouseDown(pointer, options);
  }

  onMouseMove(pointer, options) {
    if (!this._isDrawing) return;

    const pressure = this._getPressure(options?.e);
    this._pressurePoints.push({
      x: pointer.x,
      y: pointer.y,
      pressure: pressure
    });

    // Update preview width (for cursor size hint)
    this.width = this._getWidthFromPressure(pressure);

    // Call parent to update internal points
    super.onMouseMove(pointer, options);

    // Re-render with our custom variable-width preview
    this._renderVariableWidthPreview();
  }

  onMouseUp(options) {
    this._isDrawing = false;

    // Clear the preview canvas before creating final path
    const ctx = this.canvas.contextTop;
    if (ctx) {
      this.canvas.clearContext(ctx);
    }

    // Get the result from parent (the created path)
    const result = super.onMouseUp(options);

    return result;
  }

  /**
   * Render variable-width stroke preview in real-time
   */
  _renderVariableWidthPreview() {
    const ctx = this.canvas.contextTop;
    if (!ctx || this._pressurePoints.length < 2) return;

    // Clear the top canvas for fresh render
    this.canvas.clearContext(ctx);

    ctx.save();

    // Generate the outline for current points
    const outlinePoints = this._generateStrokeOutline(this._pressurePoints);

    if (outlinePoints.length < 4) {
      ctx.restore();
      return;
    }

    // Draw the filled shape
    ctx.beginPath();
    ctx.moveTo(outlinePoints[0].x, outlinePoints[0].y);

    // Draw smooth curves through outline points
    for (let i = 1; i < outlinePoints.length - 1; i++) {
      const curr = outlinePoints[i];
      const next = outlinePoints[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
    }

    // Close the path
    const last = outlinePoints[outlinePoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.closePath();

    // Fill with brush color
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Override createPath to generate variable-width stroke
   * Instead of a single path, create a filled shape that represents
   * the variable-width stroke
   */
  createPath(pathData) {
    if (this._pressurePoints.length < 2) {
      return super.createPath(pathData);
    }

    // Generate variable-width stroke outline
    const outlinePoints = this._generateStrokeOutline(this._pressurePoints);

    if (outlinePoints.length < 4) {
      return super.createPath(pathData);
    }

    // Create SVG path from outline
    const svgPath = this._pointsToSVGPath(outlinePoints);

    const path = new Path(svgPath, {
      fill: this.color,
      stroke: null,
      strokeWidth: 0,
      strokeLineCap: this.strokeLineCap,
      strokeLineJoin: this.strokeLineJoin,
      strokeMiterLimit: this.strokeMiterLimit,
      originX: 'center',
      originY: 'center',
    });

    return path;
  }

  /**
   * Generate outline points for variable-width stroke
   * Creates two parallel paths (left and right edges) based on pressure
   */
  _generateStrokeOutline(points) {
    if (points.length < 2) return [];

    const leftEdge = [];
    const rightEdge = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const width = this._getWidthFromPressure(point.pressure) / 2;

      // Calculate perpendicular direction
      let perpX, perpY;

      if (i === 0) {
        // First point: use direction to next point
        const next = points[i + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        perpX = -dy / len;
        perpY = dx / len;
      } else if (i === points.length - 1) {
        // Last point: use direction from previous point
        const prev = points[i - 1];
        const dx = point.x - prev.x;
        const dy = point.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        perpX = -dy / len;
        perpY = dx / len;
      } else {
        // Middle points: average of prev and next directions
        const prev = points[i - 1];
        const next = points[i + 1];
        const dx1 = point.x - prev.x;
        const dy1 = point.y - prev.y;
        const dx2 = next.x - point.x;
        const dy2 = next.y - point.y;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

        // Average perpendicular
        perpX = -(dy1 / len1 + dy2 / len2) / 2;
        perpY = (dx1 / len1 + dx2 / len2) / 2;
        const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        perpX /= perpLen;
        perpY /= perpLen;
      }

      // Add offset points for left and right edges
      leftEdge.push({
        x: point.x + perpX * width,
        y: point.y + perpY * width
      });
      rightEdge.push({
        x: point.x - perpX * width,
        y: point.y - perpY * width
      });
    }

    // Combine into closed outline (left edge forward, right edge backward)
    return [...leftEdge, ...rightEdge.reverse()];
  }

  /**
   * Convert outline points to SVG path string
   */
  _pointsToSVGPath(points) {
    if (points.length < 3) return '';

    let path = `M ${points[0].x} ${points[0].y}`;

    // Use quadratic curves for smoother result
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      path += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
    }

    // Close the path
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y} Z`;

    return path;
  }
}

export default PressureSensitiveBrush;
