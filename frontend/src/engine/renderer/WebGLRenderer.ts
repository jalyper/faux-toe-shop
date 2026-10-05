/**
 * WebGL Renderer
 *
 * GPU-accelerated rendering for layer compositing and filter previews.
 * Provides significant performance improvements over Canvas 2D for complex scenes.
 */

import {
  VERTEX_SHADER,
  TEXTURE_FRAGMENT_SHADER,
  COMPOSITE_FRAGMENT_SHADER,
  ADJUSTMENT_FRAGMENT_SHADER,
  GRAYSCALE_FRAGMENT_SHADER,
  SEPIA_FRAGMENT_SHADER,
} from './shaders';
import type { BlendMode } from '../state/types';

interface ShaderProgram {
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

interface LayerTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
}

const BLEND_MODE_MAP: Record<BlendMode, number> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  darken: 4,
  lighten: 5,
  'color-dodge': 0, // Fallback to normal for unsupported modes
  'color-burn': 0,
  'hard-light': 3, // Similar to overlay
  'soft-light': 3,
  difference: 0,
  exclusion: 0,
};

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private programs: Map<string, ShaderProgram> = new Map();
  private textures: Map<string, LayerTexture> = new Map();
  private quadBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private framebufferTexture: WebGLTexture | null = null;

  private width: number;
  private height: number;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  /**
   * Initialize WebGL context and resources
   */
  init(): boolean {
    if (this.isInitialized) return true;

    // Try WebGL2 first, fall back to WebGL1
    this.gl =
      (this.canvas.getContext('webgl2') as WebGLRenderingContext) ||
      this.canvas.getContext('webgl') ||
      this.canvas.getContext('experimental-webgl');

    if (!this.gl) {
      console.error('[WebGLRenderer] WebGL not supported');
      return false;
    }

    const gl = this.gl;

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create shader programs
    this.createProgram('texture', VERTEX_SHADER, TEXTURE_FRAGMENT_SHADER);
    this.createProgram('composite', VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);
    this.createProgram('adjustment', VERTEX_SHADER, ADJUSTMENT_FRAGMENT_SHADER);
    this.createProgram('grayscale', VERTEX_SHADER, GRAYSCALE_FRAGMENT_SHADER);
    this.createProgram('sepia', VERTEX_SHADER, SEPIA_FRAGMENT_SHADER);

    // Create geometry buffers
    this.createBuffers();

    // Create framebuffer for offscreen rendering
    this.createFramebuffer();

    this.isInitialized = true;
    console.log('[WebGLRenderer] Initialized successfully');
    return true;
  }

  /**
   * Compile a shader
   */
  private compileShader(source: string, type: number): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[WebGLRenderer] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create a shader program
   */
  private createProgram(name: string, vertexSrc: string, fragmentSrc: string): boolean {
    const gl = this.gl!;

    const vertexShader = this.compileShader(vertexSrc, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSrc, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return false;

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[WebGLRenderer] Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    // Get attribute and uniform locations
    const attributes: Record<string, number> = {
      a_position: gl.getAttribLocation(program, 'a_position'),
      a_texCoord: gl.getAttribLocation(program, 'a_texCoord'),
    };

    const uniformNames = [
      'u_texture',
      'u_baseTexture',
      'u_blendTexture',
      'u_opacity',
      'u_blendMode',
      'u_brightness',
      'u_contrast',
      'u_saturation',
    ];

    const uniforms: Record<string, WebGLUniformLocation> = {};
    for (const name of uniformNames) {
      const location = gl.getUniformLocation(program, name);
      if (location) uniforms[name] = location;
    }

    this.programs.set(name, { program, attributes, uniforms });
    return true;
  }

  /**
   * Create vertex buffers for a full-screen quad
   */
  private createBuffers(): void {
    const gl = this.gl!;

    // Vertex positions (full-screen quad in clip space)
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture coordinates
    const texCoords = new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  /**
   * Create framebuffer for offscreen rendering
   */
  private createFramebuffer(): void {
    const gl = this.gl!;

    this.framebuffer = gl.createFramebuffer();
    this.framebufferTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.framebufferTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.framebufferTexture,
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Create or update a texture from ImageData
   */
  updateTexture(id: string, imageData: ImageData): void {
    const gl = this.gl!;

    let layerTexture = this.textures.get(id);

    if (!layerTexture) {
      const texture = gl.createTexture();
      if (!texture) return;

      layerTexture = {
        texture,
        width: imageData.width,
        height: imageData.height,
      };
      this.textures.set(id, layerTexture);
    }

    gl.bindTexture(gl.TEXTURE_2D, layerTexture.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageData
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    layerTexture.width = imageData.width;
    layerTexture.height = imageData.height;
  }

  /**
   * Delete a texture
   */
  deleteTexture(id: string): void {
    const layerTexture = this.textures.get(id);
    if (layerTexture) {
      this.gl?.deleteTexture(layerTexture.texture);
      this.textures.delete(id);
    }
  }

  /**
   * Render a single texture to the canvas
   */
  renderTexture(textureId: string, opacity: number = 1.0): void {
    const gl = this.gl!;
    const program = this.programs.get('texture');
    const layerTexture = this.textures.get(textureId);

    if (!program || !layerTexture) return;

    gl.useProgram(program.program);
    this.bindBuffers(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layerTexture.texture);
    gl.uniform1i(program.uniforms.u_texture, 0);
    gl.uniform1f(program.uniforms.u_opacity, opacity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Composite two textures using a blend mode
   */
  compositeTextures(
    baseId: string,
    blendId: string,
    blendMode: BlendMode,
    opacity: number
  ): void {
    const gl = this.gl!;
    const program = this.programs.get('composite');
    const baseTexture = this.textures.get(baseId);
    const blendTexture = this.textures.get(blendId);

    if (!program || !baseTexture || !blendTexture) return;

    gl.useProgram(program.program);
    this.bindBuffers(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, baseTexture.texture);
    gl.uniform1i(program.uniforms.u_baseTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blendTexture.texture);
    gl.uniform1i(program.uniforms.u_blendTexture, 1);

    gl.uniform1f(program.uniforms.u_opacity, opacity);
    gl.uniform1i(program.uniforms.u_blendMode, BLEND_MODE_MAP[blendMode] ?? 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Apply adjustment filter for real-time preview
   */
  renderWithAdjustments(
    textureId: string,
    brightness: number,
    contrast: number,
    saturation: number
  ): void {
    const gl = this.gl!;
    const program = this.programs.get('adjustment');
    const layerTexture = this.textures.get(textureId);

    if (!program || !layerTexture) return;

    gl.useProgram(program.program);
    this.bindBuffers(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layerTexture.texture);
    gl.uniform1i(program.uniforms.u_texture, 0);
    gl.uniform1f(program.uniforms.u_brightness, brightness);
    gl.uniform1f(program.uniforms.u_contrast, contrast);
    gl.uniform1f(program.uniforms.u_saturation, saturation);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Bind vertex buffers and attributes
   */
  private bindBuffers(program: ShaderProgram): void {
    const gl = this.gl!;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(program.attributes.a_position);
    gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(program.attributes.a_texCoord);
    gl.vertexAttribPointer(program.attributes.a_texCoord, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Clear the canvas
   */
  clear(r: number = 0, g: number = 0, b: number = 0, a: number = 0): void {
    const gl = this.gl!;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Set viewport size
   */
  setViewport(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl?.viewport(0, 0, width, height);

    // Recreate framebuffer texture with new size
    if (this.framebufferTexture && this.gl) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.framebufferTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
  }

  /**
   * Read pixels from canvas
   */
  readPixels(): Uint8Array {
    const gl = this.gl!;
    const pixels = new Uint8Array(this.width * this.height * 4);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  /**
   * Get ImageData from canvas
   */
  getImageData(): ImageData {
    const pixels = this.readPixels();
    // Flip Y axis (WebGL is bottom-up)
    const flipped = new Uint8ClampedArray(pixels.length);
    const rowSize = this.width * 4;

    for (let y = 0; y < this.height; y++) {
      const srcRow = (this.height - 1 - y) * rowSize;
      const dstRow = y * rowSize;
      flipped.set(pixels.subarray(srcRow, srcRow + rowSize), dstRow);
    }

    return new ImageData(flipped, this.width, this.height);
  }

  /**
   * Check if WebGL is available
   */
  get isAvailable(): boolean {
    return this.isInitialized && this.gl !== null;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    const gl = this.gl;
    if (!gl) return;

    // Delete textures
    for (const layerTexture of this.textures.values()) {
      gl.deleteTexture(layerTexture.texture);
    }
    this.textures.clear();

    // Delete programs
    for (const program of this.programs.values()) {
      gl.deleteProgram(program.program);
    }
    this.programs.clear();

    // Delete buffers
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

    // Delete framebuffer
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    if (this.framebufferTexture) gl.deleteTexture(this.framebufferTexture);

    this.isInitialized = false;
  }
}
