//! Saturation filter

/// Apply saturation adjustment to RGBA pixel data
///
/// # Arguments
/// * `pixels` - Mutable slice of f32 RGBA values in range [0.0, 1.0]
/// * `amount` - Saturation adjustment (-1.0 to 1.0, 0.0 = no change, -1.0 = grayscale)
#[inline]
pub fn apply(pixels: &mut [f32], amount: f32) {
    if amount.abs() < 0.001 {
        return;
    }

    let factor = 1.0 + amount;
    let factor = factor.max(0.0);

    // Luminance weights (ITU-R BT.709)
    const LUM_R: f32 = 0.2126;
    const LUM_G: f32 = 0.7152;
    const LUM_B: f32 = 0.0722;

    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0];
        let g = chunk[1];
        let b = chunk[2];

        // Calculate luminance
        let lum = r * LUM_R + g * LUM_G + b * LUM_B;

        // Interpolate between grayscale and original based on factor
        chunk[0] = (lum + (r - lum) * factor).clamp(0.0, 1.0);
        chunk[1] = (lum + (g - lum) * factor).clamp(0.0, 1.0);
        chunk[2] = (lum + (b - lum) * factor).clamp(0.0, 1.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_saturation_zero() {
        let mut pixels = vec![1.0, 0.0, 0.0, 1.0]; // Pure red
        apply(&mut pixels, -1.0); // Full desaturation
        // Should be grayscale
        assert!((pixels[0] - pixels[1]).abs() < 0.001);
        assert!((pixels[1] - pixels[2]).abs() < 0.001);
    }
}
