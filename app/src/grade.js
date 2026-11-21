// Colour grades: the look of the cover.
//
// Each grade is two halves. The pixel half rewrites a photo once (and is
// cached per photo + grade): a small per-pixel pass over an offscreen
// canvas — lifted warm shadows for Vice Sunset, a magenta/cyan duotone
// blend for Neon Nights, teal shadows against orange highlights for
// Classic Print. The scene half is the palette the renderer paints the
// sky, sun and lettering with, so the photos and the poster furniture
// always agree with each other.

export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    blurb: 'Warm orange-to-pink sunset, shadows lifted into plum',
    sky: ['#2a1052', '#7b2a86', '#d6417e', '#ff7e47', '#ffb35c'],
    sunCore: '#ffe9a8',
    sunGlow: '#ff5e78',
    accent: '#ff2e88',
    accent2: '#ffb35c',
    titleStops: ['#ffffff', '#ffe3ae', '#ff8a5c'],
    strip: '#ffd9a0',
  },
  neon: {
    label: 'Neon Nights',
    blurb: 'Magenta and cyan duotone over a midnight grade',
    sky: ['#070418', '#1c0b3d', '#4b1160', '#8f1d7d', '#c22a8f'],
    sunCore: '#a5f6ff',
    sunGlow: '#22d3ee',
    accent: '#22d3ee',
    accent2: '#ff2ea6',
    titleStops: ['#ffffff', '#b8f4ff', '#5cd6ff'],
    strip: '#a5f6ff',
  },
  print: {
    label: 'Classic Print',
    blurb: 'Teal-and-orange print grade with halftone grain',
    sky: ['#0d2f3d', '#14586a', '#2a8a8a', '#d98a4b', '#f2b25c'],
    sunCore: '#fff3c4',
    sunGlow: '#ff9a3d',
    accent: '#ffb35c',
    accent2: '#2dd4bf',
    titleStops: ['#fffaf0', '#ffd9a0', '#ff9a5c'],
    strip: '#ffe9c4',
  },
};

export const GRADE_ORDER = ['vice', 'neon', 'print'];

// ------------------------------------------------------------------ pixels

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function saturate(r, g, b, amount) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return [lum + (r - lum) * amount, lum + (g - lum) * amount, lum + (b - lum) * amount];
}

function contrast(v, amount) {
  return (v - 128) * amount + 128;
}

/** One pixel of the Vice Sunset grade: gentle gamma lift, warm tint,
 *  plum shadow wash, golden highlight kiss. */
function vicePixel(r, g, b) {
  const lift = (v) => 255 * Math.pow(v / 255, 0.92);
  let [nr, ng, nb] = saturate(lift(r), lift(g), lift(b), 1.26);
  nr *= 1.07; ng *= 1.0; nb *= 0.9;
  const lum = (0.299 * nr + 0.587 * ng + 0.114 * nb) / 255;
  const shadow = Math.pow(1 - lum, 2) * 0.26;
  nr = nr * (1 - shadow) + 46 * shadow;
  ng = ng * (1 - shadow) + 18 * shadow;
  nb = nb * (1 - shadow) + 74 * shadow;
  const glow = Math.pow(lum, 3) * 0.18;
  nr = nr * (1 - glow) + 255 * glow;
  ng = ng * (1 - glow) + 176 * glow;
  nb = nb * (1 - glow) + 96 * glow;
  return [nr, ng, nb];
}

/** One pixel of Neon Nights: contrast and saturation first, then a
 *  62% blend into a navy -> magenta -> cyan duotone ramp. */
function neonPixel(r, g, b) {
  let [nr, ng, nb] = saturate(contrast(r, 1.1), contrast(g, 1.1), contrast(b, 1.1), 1.14);
  const lum = (0.299 * nr + 0.587 * ng + 0.114 * nb) / 255;
  let dr; let dg; let db;
  if (lum < 0.5) {
    const t = lum * 2;
    dr = 12 + (206 - 12) * t; dg = 8 + (36 - 8) * t; db = 44 + (150 - 44) * t;
  } else {
    const t = (lum - 0.5) * 2;
    dr = 206 + (120 - 206) * t; dg = 36 + (242 - 36) * t; db = 150 + (255 - 150) * t;
  }
  const mix = 0.62;
  return [nr * (1 - mix) + dr * mix, ng * (1 - mix) + dg * mix, nb * (1 - mix) + db * mix];
}

/** One pixel of Classic Print: teal pushed into the shadows, orange into
 *  the highlights, print contrast on top. */
function printPixel(r, g, b) {
  let [nr, ng, nb] = saturate(contrast(r, 1.12), contrast(g, 1.12), contrast(b, 1.12), 1.12);
  const lum = (0.299 * nr + 0.587 * ng + 0.114 * nb) / 255;
  const teal = Math.pow(1 - lum, 2) * 0.34;
  nr = nr * (1 - teal) + 12 * teal;
  ng = ng * (1 - teal) + 66 * teal;
  nb = nb * (1 - teal) + 74 * teal;
  const amber = Math.pow(lum, 2) * 0.22;
  nr = nr * (1 - amber) + 255 * amber;
  ng = ng * (1 - amber) + 158 * amber;
  nb = nb * (1 - amber) + 64 * amber;
  return [nr, ng, nb];
}

const PIXEL_FN = { vice: vicePixel, neon: neonPixel, print: printPixel };

/** Widest a photo is graded at: plenty for a 1920px cover, kind to the CPU. */
const GRADE_MAX_W = 1000;

export function gradedCanvasFor(photo, gradeId) {
  if (!photo.graded) photo.graded = {};
  if (photo.graded[gradeId]) return photo.graded[gradeId];

  const src = photo.img;
  const scale = Math.min(1, GRADE_MAX_W / src.naturalWidth);
  const w = Math.max(1, Math.round(src.naturalWidth * scale));
  const h = Math.max(1, Math.round(src.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);

  const fn = PIXEL_FN[gradeId] ?? vicePixel;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = fn(px[i], px[i + 1], px[i + 2]);
    px[i] = clamp255(r);
    px[i + 1] = clamp255(g);
    px[i + 2] = clamp255(b);
  }
  ctx.putImageData(data, 0, 0);
  photo.graded[gradeId] = canvas;
  return canvas;
}

// ------------------------------------------------------------------- grain

let grainTile = null;

/** A small tile of monochrome noise, drawn as an overlay for film grain
 *  (strong under Classic Print, a whisper under the other grades). */
export function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 140;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  // A fixed seed keeps every render of the same cover identical.
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  grainTile = canvas;
  return canvas;
}
