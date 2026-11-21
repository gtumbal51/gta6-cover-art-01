// PNG export: render the cover once, offscreen, at the exact size the
// user picked, and hand the browser a download. The render is the same
// drawCover the preview uses, minus the editor's selection outline.

import { drawCover, SIZES } from './render.js';

/** Paints the cover onto a fresh canvas at w x h and returns it. */
export function renderCoverCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, { ...state, showSelection: false });
  return canvas;
}

/** The cover at w x h as a PNG data URL (used by tooling and tests). */
export function coverDataURL(state, w, h) {
  return renderCoverCanvas(state, w, h).toDataURL('image/png');
}

/** One-click download of the cover at the state's chosen export size. */
export function downloadCover(state, onDone) {
  const size = SIZES[state.sizeKey] ?? SIZES['1080x1350'];
  const canvas = renderCoverCanvas(state, size.w, size.h);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-heat-cover-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (onDone) onDone(a.download);
  }, 'image/png');
}
