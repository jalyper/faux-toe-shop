//! Invert colors filter

/// Invert RGB values (1.0 - value)
#[inline]
pub fn apply(pixels: &mut [f32]) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = 1.0 - chunk[0];
        chunk[1] = 1.0 - chunk[1];
        chunk[2] = 1.0 - chunk[2];
        // Alpha unchanged
    }
}
