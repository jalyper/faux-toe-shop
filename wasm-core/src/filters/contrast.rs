//! Contrast filter

/// Apply contrast adjustment to RGBA pixel data
///
/// # Arguments
/// * `pixels` - Mutable slice of f32 RGBA values in range [0.0, 1.0]
/// * `amount` - Contrast adjustment (-1.0 to 1.0, 0.0 = no change)
#[inline]
pub fn apply(pixels: &mut [f32], amount: f32) {
    if amount.abs() < 0.001 {
        return;
    }

    // Convert amount to contrast factor
    // amount of 1.0 -> factor of 2.0 (double contrast)
    // amount of -1.0 -> factor of 0.0 (no contrast)
    let factor = 1.0 + amount;
    let factor = factor.max(0.0);

    for chunk in pixels.chunks_exact_mut(4) {
        // Contrast formula: (pixel - 0.5) * factor + 0.5
        chunk[0] = ((chunk[0] - 0.5) * factor + 0.5).clamp(0.0, 1.0);
        chunk[1] = ((chunk[1] - 0.5) * factor + 0.5).clamp(0.0, 1.0);
        chunk[2] = ((chunk[2] - 0.5) * factor + 0.5).clamp(0.0, 1.0);
        // Alpha unchanged
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contrast_increase() {
        let mut pixels = vec![0.6, 0.4, 0.5, 1.0];
        apply(&mut pixels, 0.5);
        // 0.6 -> (0.6 - 0.5) * 1.5 + 0.5 = 0.65
        assert!((pixels[0] - 0.65).abs() < 0.001);
        // 0.4 -> (0.4 - 0.5) * 1.5 + 0.5 = 0.35
        assert!((pixels[1] - 0.35).abs() < 0.001);
        // 0.5 stays at 0.5 (neutral point)
        assert!((pixels[2] - 0.5).abs() < 0.001);
    }
}
