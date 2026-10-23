// Check the essay's Pixel filter reimplementation against VYUY bytes produced by
// the original ARM loop (recorded from pixel_probe.py).
// Usage, from the repository root: node scripts/charmera/test_pixel.js
global.window = {};
require('../../static/charmera/film-core.js');
const C = window.Charmera;

const pairs = [[200, 50], [50, 200], [124, 123], [123, 124]];
const original = { // selector -> output (V, Y0, U, Y1) for each input pair above
  8: [[255, 76, 128, 0], [128, 0, 85, 76], [255, 76, 128, 0], [128, 0, 85, 76]],
  9: [[108, 27, 128, 0], [128, 0, 255, 27], [108, 27, 128, 0], [128, 0, 255, 27]],
  10: [[158, 207, 128, 0], [128, 0, 55, 207], [158, 207, 128, 0], [128, 0, 55, 207]],
  11: [[128, 206, 128, 0], [128, 0, 118, 206], [128, 206, 128, 0], [128, 0, 118, 206]],
};
const toRgb = (Y, U, V) => [Y + 1.402 * (V - 128), Y - 0.344136 * (U - 128) - 0.714136 * (V - 128), Y + 1.772 * (U - 128)].map(C.clamp);

let failures = 0;
for (const pixel of C.PIXEL) {
  const src = new Float32Array(pairs.flatMap(([a, b]) => [a, a, a, b, b, b]));
  const out = C.applyPixelFilter(src, 8, pixel);
  original[pixel.selector].forEach(([V, Y0, U, Y1], k) => {
    const want = [...toRgb(Y0, U, V), ...toRgb(Y1, U, V)];
    const got = Array.from(out.slice(k * 6, k * 6 + 6));
    if (want.some((v, i) => Math.abs(v - got[i]) > 1e-3)) {
      failures++;
      console.log('MISMATCH', pixel.id, pairs[k], want, got);
    }
  });
}
console.log(failures ? `${failures} mismatches` : 'All 16 pixel pairs match the original loop.');
process.exitCode = failures ? 1 : 0;
