//! Brightness filter - optimized for WASM SIMD

/// Apply brightness adjustment to RGBA pixel data
///
/// # Arguments
/// * `pixels` - Mutable slice of f32 RGBA values in range [0.0, 1.0]
/// * `amount` - Brightness adjustment (-1.0 to 1.0, 0.0 = no change)
///
/// # Performance
/// - O(n) where n = number of pixels
/// - Optimized for auto-vectorization
/// - Processes 4 pixels at a time when possible
#[inline]
pub fn apply(pixels: &mut [f32], amount: f32) {
    // Early exit for no-op
    if amount.abs() < 0.001 {
        return;
    }

    // Process in chunks of 16 (4 RGBA pixels) for better vectorization
    let mut chunks = pixels.chunks_exact_mut(16);

    for chunk in chunks.by_ref() {
        // Pixel 1
        chunk[0] = (chunk[0] + amount).clamp(0.0, 1.0); // R
        chunk[1] = (chunk[1] + amount).clamp(0.0, 1.0); // G
        chunk[2] = (chunk[2] + amount).clamp(0.0, 1.0); // B
        // chunk[3] = alpha unchanged

        // Pixel 2
        chunk[4] = (chunk[4] + amount).clamp(0.0, 1.0);
        chunk[5] = (chunk[5] + amount).clamp(0.0, 1.0);
        chunk[6] = (chunk[6] + amount).clamp(0.0, 1.0);

        // Pixel 3
        chunk[8] = (chunk[8] + amount).clamp(0.0, 1.0);
        chunk[9] = (chunk[9] + amount).clamp(0.0, 1.0);
        chunk[10] = (chunk[10] + amount).clamp(0.0, 1.0);

        // Pixel 4
        chunk[12] = (chunk[12] + amount).clamp(0.0, 1.0);
        chunk[13] = (chunk[13] + amount).clamp(0.0, 1.0);
        chunk[14] = (chunk[14] + amount).clamp(0.0, 1.0);
    }

    // Handle remaining pixels
    for chunk in chunks.into_remainder().chunks_exact_mut(4) {
        chunk[0] = (chunk[0] + amount).clamp(0.0, 1.0);
        chunk[1] = (chunk[1] + amount).clamp(0.0, 1.0);
        chunk[2] = (chunk[2] + amount).clamp(0.0, 1.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brightness_increase() {
        let mut pixels = vec![0.5, 0.5, 0.5, 1.0];
        apply(&mut pixels, 0.2);
        assert!((pixels[0] - 0.7).abs() < 0.001);
        assert!((pixels[1] - 0.7).abs() < 0.001);
        assert!((pixels[2] - 0.7).abs() < 0.001);
        assert!((pixels[3] - 1.0).abs() < 0.001); // Alpha unchanged
    }

    #[test]
    fn test_brightness_decrease() {
        let mut pixels = vec![0.5, 0.5, 0.5, 1.0];
        apply(&mut pixels, -0.2);
        assert!((pixels[0] - 0.3).abs() < 0.001);
    }

    #[test]
    fn test_brightness_clamp() {
        let mut pixels = vec![0.9, 0.1, 0.5, 1.0];
        apply(&mut pixels, 0.5);
        assert!((pixels[0] - 1.0).abs() < 0.001); // Clamped to max
        assert!((pixels[1] - 0.6).abs() < 0.001);
    }
}
