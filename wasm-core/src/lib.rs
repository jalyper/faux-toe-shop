//! # Faux-Toe-Shop WASM Core
//!
//! High-performance WebAssembly image processing library.
//! Provides GPU-like performance for image filters and transformations.

mod filters;
mod color;

use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// ImageBuffer represents a raw RGBA image in memory.
/// Pixels are stored as f32 values in range [0.0, 1.0] for precision.
#[wasm_bindgen]
pub struct ImageBuffer {
    width: u32,
    height: u32,
    pixels: Vec<f32>, // RGBA as f32 for precision
}

#[wasm_bindgen]
impl ImageBuffer {
    /// Create a new ImageBuffer from raw RGBA u8 data
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, data: &[u8]) -> Result<ImageBuffer, JsValue> {
        let expected_len = (width * height * 4) as usize;
        if data.len() != expected_len {
            return Err(JsValue::from_str(&format!(
                "Invalid data length: expected {}, got {}",
                expected_len,
                data.len()
            )));
        }

        // Convert u8 [0-255] to f32 [0.0-1.0]
        let pixels: Vec<f32> = data.iter().map(|&v| v as f32 / 255.0).collect();

        Ok(ImageBuffer {
            width,
            height,
            pixels,
        })
    }

    /// Create an empty ImageBuffer
    #[wasm_bindgen(js_name = empty)]
    pub fn empty(width: u32, height: u32) -> ImageBuffer {
        let pixels = vec![0.0; (width * height * 4) as usize];
        ImageBuffer {
            width,
            height,
            pixels,
        }
    }

    /// Get the width
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Get the height
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Get the raw pixel data as u8 array (for Canvas putImageData)
    #[wasm_bindgen(js_name = toUint8Array)]
    pub fn to_uint8_array(&self) -> Vec<u8> {
        self.pixels
            .iter()
            .map(|&v| (v.clamp(0.0, 1.0) * 255.0).round() as u8)
            .collect()
    }

    /// Get a pointer to the internal buffer for zero-copy access
    #[wasm_bindgen(js_name = getPtr)]
    pub fn get_ptr(&self) -> *const f32 {
        self.pixels.as_ptr()
    }

    /// Get buffer length
    #[wasm_bindgen(js_name = getLen)]
    pub fn get_len(&self) -> usize {
        self.pixels.len()
    }

    // ==================== FILTERS ====================

    /// Apply brightness adjustment
    /// brightness: -1.0 to 1.0 (0.0 = no change)
    #[wasm_bindgen]
    pub fn brightness(&mut self, amount: f32) {
        filters::brightness::apply(&mut self.pixels, amount);
    }

    /// Apply contrast adjustment
    /// contrast: -1.0 to 1.0 (0.0 = no change)
    #[wasm_bindgen]
    pub fn contrast(&mut self, amount: f32) {
        filters::contrast::apply(&mut self.pixels, amount);
    }

    /// Apply saturation adjustment
    /// saturation: -1.0 to 1.0 (0.0 = no change, -1.0 = grayscale)
    #[wasm_bindgen]
    pub fn saturation(&mut self, amount: f32) {
        filters::saturation::apply(&mut self.pixels, amount);
    }

    /// Apply Gaussian blur
    /// radius: blur radius in pixels (1-100)
    #[wasm_bindgen]
    pub fn blur(&mut self, radius: u32) {
        filters::blur::apply(&mut self.pixels, self.width, self.height, radius);
    }

    /// Convert to grayscale
    #[wasm_bindgen]
    pub fn grayscale(&mut self) {
        filters::grayscale::apply(&mut self.pixels);
    }

    /// Apply sepia tone
    #[wasm_bindgen]
    pub fn sepia(&mut self) {
        filters::sepia::apply(&mut self.pixels);
    }

    /// Invert colors
    #[wasm_bindgen]
    pub fn invert(&mut self) {
        filters::invert::apply(&mut self.pixels);
    }

    // ==================== COLOR OPERATIONS ====================

    /// Convert RGB to HSL
    #[wasm_bindgen(js_name = rgbToHsl)]
    pub fn rgb_to_hsl(&self, r: f32, g: f32, b: f32) -> Vec<f32> {
        let (h, s, l) = color::conversions::rgb_to_hsl(r, g, b);
        vec![h, s, l]
    }

    /// Convert HSL to RGB
    #[wasm_bindgen(js_name = hslToRgb)]
    pub fn hsl_to_rgb(&self, h: f32, s: f32, l: f32) -> Vec<f32> {
        let (r, g, b) = color::conversions::hsl_to_rgb(h, s, l);
        vec![r, g, b]
    }

    // ==================== COMPOSITING ====================

    /// Blend another image buffer onto this one
    /// mode: 0=normal, 1=multiply, 2=screen, 3=overlay
    #[wasm_bindgen]
    pub fn blend(&mut self, other: &ImageBuffer, opacity: f32, mode: u8) {
        if self.width != other.width || self.height != other.height {
            return;
        }

        let op = opacity.clamp(0.0, 1.0);

        for i in (0..self.pixels.len()).step_by(4) {
            let (sr, sg, sb, sa) = (
                self.pixels[i],
                self.pixels[i + 1],
                self.pixels[i + 2],
                self.pixels[i + 3],
            );
            let (dr, dg, db, da) = (
                other.pixels[i],
                other.pixels[i + 1],
                other.pixels[i + 2],
                other.pixels[i + 3],
            );

            let (br, bg, bb) = match mode {
                1 => (sr * dr, sg * dg, sb * db), // Multiply
                2 => (
                    1.0 - (1.0 - sr) * (1.0 - dr),
                    1.0 - (1.0 - sg) * (1.0 - dg),
                    1.0 - (1.0 - sb) * (1.0 - db),
                ), // Screen
                3 => {
                    // Overlay
                    let overlay = |s: f32, d: f32| {
                        if s < 0.5 {
                            2.0 * s * d
                        } else {
                            1.0 - 2.0 * (1.0 - s) * (1.0 - d)
                        }
                    };
                    (overlay(sr, dr), overlay(sg, dg), overlay(sb, db))
                }
                _ => (dr, dg, db), // Normal
            };

            // Alpha blending
            let blend_alpha = da * op;
            let out_alpha = sa + blend_alpha * (1.0 - sa);

            if out_alpha > 0.0 {
                self.pixels[i] = (sr * sa + br * blend_alpha * (1.0 - sa)) / out_alpha;
                self.pixels[i + 1] = (sg * sa + bg * blend_alpha * (1.0 - sa)) / out_alpha;
                self.pixels[i + 2] = (sb * sa + bb * blend_alpha * (1.0 - sa)) / out_alpha;
                self.pixels[i + 3] = out_alpha;
            }
        }
    }
}

// ==================== STANDALONE FUNCTIONS ====================

/// Process a raw pixel buffer in-place (for use with SharedArrayBuffer)
/// This avoids copying data across the WASM boundary
#[wasm_bindgen(js_name = processBrightnessInPlace)]
pub fn process_brightness_in_place(pixels: &mut [f32], amount: f32) {
    filters::brightness::apply(pixels, amount);
}

#[wasm_bindgen(js_name = processContrastInPlace)]
pub fn process_contrast_in_place(pixels: &mut [f32], amount: f32) {
    filters::contrast::apply(pixels, amount);
}

#[wasm_bindgen(js_name = processSaturationInPlace)]
pub fn process_saturation_in_place(pixels: &mut [f32], amount: f32) {
    filters::saturation::apply(pixels, amount);
}

#[wasm_bindgen(js_name = processGrayscaleInPlace)]
pub fn process_grayscale_in_place(pixels: &mut [f32]) {
    filters::grayscale::apply(pixels);
}

#[wasm_bindgen(js_name = processSepiaInPlace)]
pub fn process_sepia_in_place(pixels: &mut [f32]) {
    filters::sepia::apply(pixels);
}

#[wasm_bindgen(js_name = processInvertInPlace)]
pub fn process_invert_in_place(pixels: &mut [f32]) {
    filters::invert::apply(pixels);
}
