//! Sepia tone filter

/// Apply sepia tone effect to RGBA pixel data
#[inline]
pub fn apply(pixels: &mut [f32]) {
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0];
        let g = chunk[1];
        let b = chunk[2];

        // Sepia matrix transformation
        chunk[0] = (r * 0.393 + g * 0.769 + b * 0.189).clamp(0.0, 1.0);
        chunk[1] = (r * 0.349 + g * 0.686 + b * 0.168).clamp(0.0, 1.0);
        chunk[2] = (r * 0.272 + g * 0.534 + b * 0.131).clamp(0.0, 1.0);
    }
}
