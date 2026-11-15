/**
 * WCAG AA contrast gate for the design tokens, checked in the combinations the
 * UI actually uses (white on the accent button, muted body text on white, and
 * so on) rather than token-by-token.
 *
 * Run with `npm run check:contrast`. Exits non-zero on any failure.
 *
 * These values are duplicated from the brand kit and must be kept in step with
 * web/app/brand.css (the --ys-* tokens, mapped in globals.css @theme).
 *
 * Amber is deliberately absent as a text colour on white (2.2:1): it is only
 * used for decorative marks there, and as text or focus rings on navy.
 */
const T = {
  ink: '#1D232B',
  body: '#5B6470',
  bgSoft: '#F7F8FA',
  accent: '#13294B', // Rail Navy
  accentDark: '#0C1B31',
  navyTint: '#EEF0F2',
  amber: '#E9A23B', // Signal Amber
  teal: '#1e847d',
  tealDark: '#166860',
  line: '#E3E6EA',
  warn: '#b3492f',
  white: '#ffffff',
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Composite a translucent foreground over an opaque background.
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const ratio = (fg, bg) => {
  const L1 = lum(fg), L2 = lum(bg);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
};

// [label, fg, bg, alpha, isLargeText]
const cases = [
  ['body text on white', T.body, T.white, 1, false],
  ['body text on bg-soft', T.body, T.bgSoft, 1, false],
  ['ink heading on white', T.ink, T.white, 1, false],
  ['white on navy (primary button)', T.white, T.accent, 1, false],
  ['white on navy-dark (button hover)', T.white, T.accentDark, 1, false],
  ['navy on white (outline button, links)', T.accent, T.white, 1, false],
  ['navy on navy-tint (outline hover)', T.accent, T.navyTint, 1, false],
  ['navy-dark on white (panel button)', T.accentDark, T.white, 1, false],
  ['teal-dark (success) on white', T.tealDark, T.white, 1, false],
  ['warn (error) on white', T.warn, T.white, 1, false],
  ['footer body: white/70 on navy', T.white, T.accent, 0.7, false],
  ['footer legal: white/50 on navy', T.white, T.accent, 0.5, false],
  ['footer heading: white on navy', T.white, T.accent, 1, false],
  ['hero subhead: white on ink overlay', T.white, T.ink, 1, false],
  ['panel text: white on navy', T.white, T.accent, 1, false],
  ['panel text: white on navy-dark', T.white, T.accentDark, 1, false],
  ['amber (focus ring/icons) on navy', T.amber, T.accent, 1, false],
  ['placeholder: body on white', T.body, T.white, 1, false],
  ['nav phone: body on white', T.body, T.white, 1, false],
];

let failures = 0;
console.log('label'.padEnd(42), 'ratio'.padStart(6), ' need  result');
console.log('-'.repeat(72));
for (const [label, fg, bg, a, large] of cases) {
  const bgRgb = hex(bg);
  const fgRgb = a < 1 ? over(hex(fg), a, bgRgb) : hex(fg);
  const r = ratio(fgRgb, bgRgb);
  const need = large ? 3 : 4.5;
  const ok = r >= need;
  if (!ok) failures++;
  console.log(
    label.padEnd(42),
    r.toFixed(2).padStart(6),
    ` ${need.toFixed(1)}   ${ok ? 'PASS' : 'FAIL (AA)'}`,
  );
}
console.log('-'.repeat(72));
console.log(`${cases.length - failures}/${cases.length} pass WCAG AA`);
process.exit(failures > 0 ? 1 : 0);
