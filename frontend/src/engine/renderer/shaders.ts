/**
 * WebGL Shaders for image compositing and filter previews
 */

// Vertex shader - simple passthrough for 2D rendering
export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;

  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader for basic texture rendering
export const TEXTURE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_opacity;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    gl_FragColor = vec4(color.rgb, color.a * u_opacity);
  }
`;

// Fragment shader for layer compositing with blend modes
export const COMPOSITE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_baseTexture;
  uniform sampler2D u_blendTexture;
  uniform float u_opacity;
  uniform int u_blendMode;

  varying vec2 v_texCoord;

  // Blend mode functions
  vec3 blendNormal(vec3 base, vec3 blend) {
    return blend;
  }

  vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
  }

  vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }

  vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(
      base.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
      base.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
      base.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
    );
  }

  vec3 blendDarken(vec3 base, vec3 blend) {
    return min(base, blend);
  }

  vec3 blendLighten(vec3 base, vec3 blend) {
    return max(base, blend);
  }

  void main() {
    vec4 baseColor = texture2D(u_baseTexture, v_texCoord);
    vec4 blendColor = texture2D(u_blendTexture, v_texCoord);

    float blendAlpha = blendColor.a * u_opacity;

    vec3 blended;
    if (u_blendMode == 0) {
      blended = blendNormal(baseColor.rgb, blendColor.rgb);
    } else if (u_blendMode == 1) {
      blended = blendMultiply(baseColor.rgb, blendColor.rgb);
    } else if (u_blendMode == 2) {
      blended = blendScreen(baseColor.rgb, blendColor.rgb);
    } else if (u_blendMode == 3) {
      blended = blendOverlay(baseColor.rgb, blendColor.rgb);
    } else if (u_blendMode == 4) {
      blended = blendDarken(baseColor.rgb, blendColor.rgb);
    } else if (u_blendMode == 5) {
      blended = blendLighten(baseColor.rgb, blendColor.rgb);
    } else {
      blended = blendNormal(baseColor.rgb, blendColor.rgb);
    }

    // Alpha compositing
    float outAlpha = blendAlpha + baseColor.a * (1.0 - blendAlpha);
    vec3 outColor = outAlpha > 0.0
      ? (blended * blendAlpha + baseColor.rgb * baseColor.a * (1.0 - blendAlpha)) / outAlpha
      : vec3(0.0);

    gl_FragColor = vec4(outColor, outAlpha);
  }
`;

// Fragment shader for brightness/contrast adjustments (real-time preview)
export const ADJUSTMENT_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);

    // Brightness
    vec3 result = color.rgb + u_brightness;

    // Contrast
    result = (result - 0.5) * (1.0 + u_contrast) + 0.5;

    // Saturation
    float gray = dot(result, vec3(0.2126, 0.7152, 0.0722));
    result = mix(vec3(gray), result, 1.0 + u_saturation);

    // Clamp to valid range
    result = clamp(result, 0.0, 1.0);

    gl_FragColor = vec4(result, color.a);
  }
`;

// Fragment shader for grayscale
export const GRAYSCALE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(vec3(gray), color.a);
  }
`;

// Fragment shader for sepia
export const SEPIA_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;

  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);

    vec3 sepia;
    sepia.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
    sepia.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
    sepia.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));

    gl_FragColor = vec4(clamp(sepia, 0.0, 1.0), color.a);
  }
`;
