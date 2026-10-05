//! Gaussian blur filter using box blur approximation
//!
//! Uses 3-pass box blur which approximates Gaussian blur
//! This is much faster than true Gaussian while producing similar results

/// Apply blur effect to RGBA pixel data
///
/// # Arguments
/// * `pixels` - Mutable slice of f32 RGBA values
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `radius` - Blur radius (1-100)
pub fn apply(pixels: &mut [f32], width: u32, height: u32, radius: u32) {
    if radius == 0 {
        return;
    }

    let radius = radius.min(100) as i32;
    let w = width as i32;
    let h = height as i32;

    // Create temporary buffer
    let mut temp = pixels.to_vec();

    // 3-pass box blur approximates Gaussian
    for _ in 0..3 {
        // Horizontal pass
        box_blur_h(pixels, &mut temp, w, h, radius);
        // Vertical pass
        box_blur_v(&temp, pixels, w, h, radius);
    }
}

fn box_blur_h(src: &[f32], dst: &mut [f32], w: i32, h: i32, r: i32) {
    let divisor = (r * 2 + 1) as f32;

    for y in 0..h {
        let row_offset = (y * w * 4) as usize;

        for c in 0..3 {
            // Initialize sum for first pixel
            let mut sum = 0.0f32;
            for x in -r..=r {
                let idx = row_offset + (x.clamp(0, w - 1) * 4) as usize + c;
                sum += src[idx];
            }

            for x in 0..w {
                dst[row_offset + (x * 4) as usize + c] = sum / divisor;

                // Slide window
                let left_idx = (x - r - 1).clamp(0, w - 1);
                let right_idx = (x + r + 1).clamp(0, w - 1);

                sum -= src[row_offset + (left_idx * 4) as usize + c];
                sum += src[row_offset + (right_idx * 4) as usize + c];
            }
        }

        // Copy alpha unchanged
        for x in 0..w {
            let idx = row_offset + (x * 4) as usize + 3;
            dst[idx] = src[idx];
        }
    }
}

fn box_blur_v(src: &[f32], dst: &mut [f32], w: i32, h: i32, r: i32) {
    let divisor = (r * 2 + 1) as f32;

    for x in 0..w {
        for c in 0..3 {
            // Initialize sum for first pixel
            let mut sum = 0.0f32;
            for y in -r..=r {
                let idx = (y.clamp(0, h - 1) * w * 4 + x * 4) as usize + c;
                sum += src[idx];
            }

            for y in 0..h {
                let dst_idx = (y * w * 4 + x * 4) as usize + c;
                dst[dst_idx] = sum / divisor;

                // Slide window
                let top_y = (y - r - 1).clamp(0, h - 1);
                let bottom_y = (y + r + 1).clamp(0, h - 1);

                sum -= src[(top_y * w * 4 + x * 4) as usize + c];
                sum += src[(bottom_y * w * 4 + x * 4) as usize + c];
            }
        }

        // Copy alpha unchanged
        for y in 0..h {
            let idx = (y * w * 4 + x * 4) as usize + 3;
            dst[idx] = src[idx];
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blur_small() {
        // 2x2 image
        let mut pixels = vec![
            1.0, 0.0, 0.0, 1.0, // Red
            0.0, 1.0, 0.0, 1.0, // Green
            0.0, 0.0, 1.0, 1.0, // Blue
            1.0, 1.0, 1.0, 1.0, // White
        ];
        apply(&mut pixels, 2, 2, 1);
        // Just verify it doesn't crash and produces valid output
        assert!(pixels.iter().all(|&v| v >= 0.0 && v <= 1.0));
    }
}
