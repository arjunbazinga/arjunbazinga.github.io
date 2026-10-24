// Check the frame maker's compositing and encoding rules.
// Usage, from the repository root: node scripts/charmera/test_frames.js
// Expected outputs come from frame_probe.py, which runs the camera's own
// compositor (file 0xEE80 -> 0xEDA4) on the same test pairs.
global.window = {};
require('../../static/charmera/frames.js');
const F = window.CharmeraFrame;
const W = 800, H = 600, ROWPAIR = W * 3;
let failures = 0;
const check = (label, ok) => { if (!ok) { failures++; console.log('FAIL', label); } };

// Photo: Y=10 everywhere, U=20, V=30. Frame: six test pairs repeated along each row.
const tests = [
  [[140, 140], [128, 128], 'photo'], [[140, 140], [85, 255], 'photo'], [[140, 141], [128, 128], 'frame'],
  [[139, 140], [128, 128], 'frame'], [[200, 200], [128, 128], 'frame'], [[76, 76], [85, 255], 'frame'],
];
const photo = new Uint8Array(ROWPAIR * H / 2), frame = new Uint8Array(ROWPAIR * H / 2);
for (let p = 0; p < H / 2; p++) {
  const base = p * ROWPAIR;
  for (let k = 0; k < W / 2; k++) {
    const [[y0, y1], [u, v]] = tests[k % tests.length];
    for (const row of [base, base + 2 * W]) { photo[row + 2 * k] = 10; photo[row + 2 * k + 1] = 10; frame[row + 2 * k] = y0; frame[row + 2 * k + 1] = y1; }
    photo[base + W + 2 * k] = 20; photo[base + W + 2 * k + 1] = 30;
    frame[base + W + 2 * k] = u; frame[base + W + 2 * k + 1] = v;
  }
}
const out = F.compose(photo, frame);
tests.forEach(([[y0, y1], [u, v], expect], k) => {
  const even = [out[2 * k], out[2 * k + 1]], uv = [out[W + 2 * k], out[W + 2 * k + 1]], odd = [out[2 * W + 2 * k], out[2 * W + 2 * k + 1]];
  const want = expect === 'photo' ? [[10, 10], [20, 30], [10, 10]] : [[y0, y1], [u, v], [y0, y1]];
  check(`pair ${k} (${y0},${y1}) uv(${u},${v}) -> ${expect}`, JSON.stringify([even, uv, odd]) === JSON.stringify(want));
});

// An opaque frame whose luma lands exactly on the key must be nudged so it stays solid.
const grey = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) grey.set([140, 140, 140, 255], i * 4);
const { bytes, nudged } = F.frameToRowPair(grey);
check('every opaque key-valued pair is nudged', nudged === (W / 2) * H && !F.isKeyPair(bytes, 0, 0));
// Fully transparent art becomes the key everywhere.
const clear = F.frameToRowPair(new Uint8ClampedArray(W * H * 4));
check('transparent art is all key', clear.nudged === 0 && F.isKeyPair(clear.bytes, 0, 0) && F.isKeyPair(clear.bytes, 2 * W, 399));

// The camera's own frame-menu thumbnails decode and re-encode to the same RGB565 bytes.
const zlib = require('zlib'), fs = require('fs'), path = require('path');
for (let n = 0; n < 4; n++) {
  const file = fs.readFileSync(path.join(__dirname, '../../static/charmera/firmware', `PV00${n}GPZP.gpzp`));
  const raw = zlib.inflateRawSync(file.subarray(4));
  const back = F.toRgb565(F.fromRgb565(raw));
  check(`thumbnail ${n} is ${F.THUMB_W}x${F.THUMB_H} RGB565 and round-trips`, raw.length === F.THUMB_W * F.THUMB_H * 2 && Buffer.from(back).equals(raw));
}

console.log(failures ? `${failures} failures` : 'Frame compositing matches the camera\'s rule on all test pairs; key handling and thumbnails OK.');
process.exitCode = failures ? 1 : 0;
