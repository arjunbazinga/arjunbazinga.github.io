// Check that the browser fitter (fitStudent in film-core.js) reproduces the
// students that fit_students.py wrote, and that they score the same.
// Usage, from the repository root: node scripts/charmera/test_students.js
const fs = require('fs');
const path = require('path');
global.window = {};
require('../../static/charmera/film-core.js');
const C = window.Charmera;

const dir = path.join(__dirname, '../../static/charmera');
const luts = new Uint8Array(fs.readFileSync(path.join(dir, 'luts.bin')));
const students = JSON.parse(fs.readFileSync(path.join(dir, 'students.json'), 'utf8'));
const cube = C.cubeInputs();

let failures = 0;
C.MODES.forEach((mode, k) => {
  const teacher = Float32Array.from(luts.subarray(k * C.LUT_BYTES, (k + 1) * C.LUT_BYTES));
  const fitted = C.fitStudent(cube, teacher, { clip: true });
  const stored = students[mode.key];
  const curveOff = Math.max(...fitted.curve.map((v, i) => Math.abs(v - stored.curve[i])));
  const matrixOff = Math.max(...fitted.matrix.flat().map((v, i) => Math.abs(v - stored.matrix.flat()[i])));
  const score = C.psnr(C.applyStudent(cube, fitted), teacher);
  const ok = curveOff <= 1 && matrixOff <= 1 && Math.abs(score - stored.psnr) < 0.1;
  if (!ok) failures++;
  console.log(`${ok ? 'ok      ' : 'MISMATCH'} ${mode.id.padEnd(8)} ${score.toFixed(2)} dB (stored ${stored.psnr}) · curve ±${curveOff} · matrix ±${matrixOff}`);
});
console.log(failures ? `${failures} modes differ` : 'The browser fitter reproduces all seven students.');
process.exitCode = failures ? 1 : 0;
