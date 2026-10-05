//! Grayscale filter

/// Convert RGBA pixel data to grayscale
///
/// Uses ITU-R BT.709 luminance weights for accurate perception
#[inline]
pub fn apply(pixels: &mut [f32]) {
    const LUM_R: f32 = 0.2126;
    const LUM_G: f32 = 0.7152;
    const LUM_B: f32 = 0.0722;

    for chunk in pixels.chunks_exact_mut(4) {
        let lum = chunk[0] * LUM_R + chunk[1] * LUM_G + chunk[2] * LUM_B;
        chunk[0] = lum;
        chunk[1] = lum;
        chunk[2] = lum;
    }
}
