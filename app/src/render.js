// The cover renderer: one function that paints the whole poster.
//
// drawCover(ctx, W, H, state) is used for the live preview and for every
// exported PNG, so the editor never lies about the result. Layers, back
// to front: gradient sky, sun disc, skyline and palm silhouettes, the
// dark panel backdrop, the graded photos clipped into their panels,
// the headline lettering, the subtitle pill, the footer strip, and a
// finishing vignette + grain pass in the grade's character.

import { LAYOUTS } from './panels.js';
import { GRADES, gradedCanvasFor, getGrainTile } from './grade.js';

export const SIZES = {
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350 · Portrait poster' },
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080 · Square' },
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080 · Wide banner' },
};

/** The poster's panel area and furniture geometry for a W x H canvas. */
export function coverGeometry(W, H, titleSize) {
  const margin = W * 0.045;
  const titleBaseline = H * 0.03 + titleSize * 0.8;
  const subtitleY = titleBaseline + H * 0.055;
  const areaTop = subtitleY + H * 0.05;
  const stripH = H * 0.045;
  const areaBottom = H - stripH - H * 0.018;
  return {
    margin,
    titleBaseline,
    subtitleY,
    stripY: areaBottom + stripH * 0.68,
    area: { x: margin, y: areaTop, w: W - margin * 2, h: areaBottom - areaTop },
    gutter: Math.max(10, W * 0.013),
  };
}

/** Panel rectangles for the state's layout on a W x H canvas. */
export function panelRects(W, H, state) {
  const titleSize = Math.min(W * 0.165, H * 0.24);
  const geo = coverGeometry(W, H, titleSize);
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.classic;
  return { geo, rects: layout.rects(geo.area, geo.gutter) };
}

// ------------------------------------------------------------------- sky

function drawSky(ctx, W, H, grade) {
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  grade.sky.forEach((stop, i) => grad.addColorStop(i / (grade.sky.length - 1), stop));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Below the horizon line the sky falls off into deep dusk so the
  // backdrop and footer sit on something calm.
  const dusk = ctx.createLinearGradient(0, H * 0.5, 0, H);
  dusk.addColorStop(0, 'rgba(16,5,32,0)');
  dusk.addColorStop(1, 'rgba(10,3,24,0.92)');
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, W, H);
}

function drawSun(ctx, cx, cy, r, grade, gradeId) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sunGlow + 'aa');
  glow.addColorStop(1, grade.sunGlow + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);

  if (gradeId === 'neon') {
    // Neon Nights gets a ringed sign sun: bright core, magenta and
    // cyan rings floating off it.
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = grade.sunCore;
    ctx.fill();
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = grade.accent2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = grade.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  // Retro disc with horizontal cuts that widen toward the bottom.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(0.65, grade.sunGlow);
  disc.addColorStop(1, grade.accent);
  ctx.fillStyle = disc;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(24,6,44,0.85)';
  let y = cy + r * 0.08;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.16;
    thick *= 1.55;
  }
  ctx.restore();
}

/** A flat palm silhouette: curved trunk, five fronds. (x, y) is the base. */
function drawPalm(ctx, x, y, s, flip, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * s, s);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Trunk.
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.1, -0.55, 0.34, -1.0);
  ctx.stroke();
  // Fronds from the crown.
  const cx = 0.34;
  const cy = -1.0;
  ctx.lineWidth = 0.07;
  const fronds = [
    [-0.62, -0.28, -0.95, 0.18],
    [-0.4, -0.44, -0.55, 0.28],
    [0.05, -0.52, 0.28, 0.2],
    [0.5, -0.4, 0.85, 0.22],
    [0.62, -0.16, 1.0, 0.34],
    [-0.05, -0.34, -0.1, 0.42],
  ];
  for (const [qx, qy, ex, ey] of fronds) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + qx, cy + qy, cx + ex, cy + ey);
    ctx.stroke();
  }
  // Two coconuts.
  ctx.beginPath();
  ctx.arc(cx - 0.06, cy + 0.1, 0.07, 0, Math.PI * 2);
  ctx.arc(cx + 0.1, cy + 0.12, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A deterministic little skyline that sits on the backdrop's top edge. */
function drawSkyline(ctx, x0, x1, baseY, maxH, colour) {
  const heights = [0.42, 0.7, 0.3, 0.9, 0.55, 0.78, 0.36, 0.64, 0.95, 0.48, 0.72, 0.33, 0.6, 0.85, 0.44, 0.68, 0.52, 0.8, 0.38, 0.58];
  const span = x1 - x0;
  const step = span / heights.length;
  ctx.fillStyle = colour;
  heights.forEach((f, i) => {
    const h = maxH * f;
    ctx.fillRect(x0 + i * step + step * 0.12, baseY - h, step * 0.76, h + 2);
    if (f > 0.75) ctx.fillRect(x0 + i * step + step * 0.4, baseY - h - maxH * 0.12, step * 0.2, maxH * 0.12);
  });
}

// ----------------------------------------------------------------- panels

function drawPhotoPanel(ctx, rect, img, pan) {
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * (pan?.zoom ?? 1.15);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const rangeX = Math.max(0, (dw - rect.w) / 2);
  const rangeY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + (pan?.ox ?? 0) * rangeX;
  const dy = rect.y + (rect.h - dh) / 2 + (pan?.oy ?? 0) * rangeY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  // Depth: a whisper of shade at the foot of each panel, a hairline of
  // light at its head — the cheap trick that makes a grid feel printed.
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.72, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(8,2,18,0)');
  shade.addColorStop(1, 'rgba(8,2,18,0.30)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(rect.x, rect.y, rect.w, Math.max(2, rect.h * 0.006));
  ctx.restore();
}

// ------------------------------------------------------------------ title

function fitTitleSize(ctx, title, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Black', Impact, sans-serif`;
  const width = ctx.measureText(title).width;
  if (width > maxWidth) size = Math.floor(size * (maxWidth / width));
  ctx.font = `${size}px Anton, 'Arial Black', Impact, sans-serif`;
  return size;
}

function drawTitle(ctx, W, geo, state, grade) {
  const title = (state.title || 'VICE HEAT').toUpperCase();
  const size = fitTitleSize(ctx, title, Math.min(W * 0.165, 260), W * 0.94);
  ctx.save();
  ctx.translate(W / 2, geo.titleBaseline);
  ctx.rotate(((state.tilt ?? -2) * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Layered poster lettering: soft glow, fat dark stroke, gradient fill.
  ctx.font = `${size}px Anton, 'Arial Black', Impact, sans-serif`;
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = size * 0.22;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = '#180631';
  ctx.strokeText(title, 0, size * 0.1);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(16,3,36,0.55)';
  ctx.fillText(title, size * 0.045, size * 0.1 + size * 0.07);
  const fill = ctx.createLinearGradient(0, -size * 0.72, 0, size * 0.12);
  grade.titleStops.forEach((stop, i) => fill.addColorStop(i / (grade.titleStops.length - 1), stop));
  ctx.fillStyle = fill;
  ctx.fillText(title, 0, size * 0.1);
  ctx.restore();
  return size;
}

function drawSubtitle(ctx, W, geo, state, grade) {
  const text = (state.subtitle || '').toUpperCase().trim();
  if (!text) return;
  const size = Math.max(15, W * 0.031);
  ctx.save();
  ctx.font = `${size}px Anton, 'Arial Black', Impact, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.32)}px`; } catch { /* older canvas: no tracking */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width + size * 1.7;
  const height = size * 1.85;
  const x = (W - width) / 2;
  const y = geo.subtitleY - height / 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fillStyle = 'rgba(10,3,26,0.78)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = grade.accent;
  ctx.stroke();
  ctx.fillStyle = '#fff7ea';
  ctx.fillText(text, W / 2, geo.subtitleY + size * 0.06);
  ctx.restore();
}

// ------------------------------------------------------------------- main

export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] ?? GRADES.vice;
  const titleSize = Math.min(W * 0.165, H * 0.24);
  const geo = coverGeometry(W, H, titleSize);
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.classic;
  const rects = layout.rects(geo.area, geo.gutter);

  drawSky(ctx, W, H, grade);
  drawSun(ctx, W * 0.79, geo.area.y * 0.52, Math.min(W, H) * 0.135, grade, state.grade);

  // Silhouettes framing the headline zone.
  const silhouette = 'rgba(14,4,30,0.88)';
  drawSkyline(ctx, geo.margin * 0.4, W - geo.margin * 0.4, geo.area.y - H * 0.008, H * 0.045, silhouette);
  drawPalm(ctx, W * 0.055, geo.area.y + H * 0.01, H * 0.16, 1, silhouette);
  drawPalm(ctx, W * 0.965, geo.area.y + H * 0.012, H * 0.135, -1, silhouette);

  // The backdrop the panels sit in: near-black plum with a neon rim.
  const pad = geo.gutter * 0.85;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(geo.area.x - pad, geo.area.y - pad, geo.area.w + pad * 2, geo.area.h + pad * 2, Math.max(8, W * 0.012));
  ctx.fillStyle = '#12081f';
  ctx.fill();
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.stroke();
  ctx.restore();

  // Photos.
  rects.forEach((rect, i) => {
    const pan = state.panels[i] ?? {};
    const photo = state.photos.find((p) => p.id === pan.photo) ?? state.photos[0];
    if (!photo) return;
    drawPhotoPanel(ctx, rect, gradedCanvasFor(photo, state.grade), pan);
  });

  // Editor-only selection outline (never in an export).
  if (state.showSelection) {
    const rect = rects[state.selected ?? 0];
    if (rect) {
      ctx.save();
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeStyle = grade.accent;
      ctx.setLineDash([W * 0.016, W * 0.01]);
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
      ctx.setLineDash([]);
      const tag = `PANEL ${(state.selected ?? 0) + 1}`;
      const tagSize = Math.max(14, W * 0.02);
      ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
      const tw = ctx.measureText(tag).width + tagSize;
      ctx.fillStyle = grade.accent;
      ctx.fillRect(rect.x - 3, rect.y - 3 - tagSize * 1.5, tw, tagSize * 1.5);
      ctx.fillStyle = '#14041f';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, rect.x - 3 + tagSize * 0.5, rect.y - 3 - tagSize * 0.72);
      ctx.restore();
    }
  }

  drawTitle(ctx, W, geo, state, grade);
  drawSubtitle(ctx, W, geo, state, grade);

  // Footer strip.
  ctx.save();
  ctx.font = `${Math.max(13, W * 0.021)}px Anton, 'Arial Black', sans-serif`;
  try { ctx.letterSpacing = `${Math.round(W * 0.006)}px`; } catch { /* no tracking */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grade.strip;
  ctx.globalAlpha = 0.92;
  ctx.fillText('★ AN ORIGINAL COVER · MADE WITH VICE HEAT STUDIO ★', W / 2, geo.stripY);
  ctx.restore();

  // Finishing pass: vignette, then grain (heavier for Classic Print,
  // plus a faint halftone dot screen in its sky).
  const vig = ctx.createRadialGradient(W / 2, H * 0.44, Math.min(W, H) * 0.42, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(8,2,18,0)');
  vig.addColorStop(1, 'rgba(8,2,18,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = state.grade === 'print' ? 0.16 : 0.07;
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (state.grade === 'print') {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000';
    const step = Math.max(9, W * 0.011);
    for (let y = step / 2; y < geo.area.y; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, step * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
