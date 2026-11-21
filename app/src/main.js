// Vice Heat Studio — the editor.
//
// State is one plain object: the photo library, the layout and grade,
// the headline words, and one {photo, zoom, ox, oy} record per panel.
// Every control writes into that object and calls redraw(); the canvas
// is repainted by the same drawCover that exports use, so the preview
// is the product. A photo can be dropped anywhere on the stage, clicked
// into the selected panel from the thumbnail strip, or assigned from
// the per-panel dropdown; dragging inside a panel pans its photo.

import { LAYOUTS, LAYOUT_ORDER } from './panels.js';
import { GRADES, GRADE_ORDER } from './grade.js';
import { drawCover, panelRects, SIZES } from './render.js';
import { coverDataURL, downloadCover, renderCoverCanvas } from './export.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

let photoSeq = 0;
const nextPhotoId = () => `photo-${++photoSeq}`;

const state = {
  photos: [],
  layout: 'classic',
  grade: 'vice',
  title: 'VICE HEAT',
  subtitle: 'WELCOME TO NEON SHORES',
  tilt: -2,
  sizeKey: '1080x1350',
  // Six panel records: enough for the largest layout. Each layout uses
  // the first N, so switching layouts keeps your framing work.
  panels: Array.from({ length: 6 }, () => ({ photo: null, zoom: 1.15, ox: 0, oy: 0 })),
  selected: 0,
  showSelection: true,
};

// Sensible opening framing: the portrait sample leads, the boulevard
// backs it up, and repeats are reframed rather than duplicated flatly.
const OPENING = [
  { sample: 'portrait', zoom: 1.12, ox: 0, oy: -0.25 },
  { sample: 'boulevard', zoom: 1.25, ox: -0.3, oy: 0 },
  { sample: 'portrait', zoom: 1.9, ox: 0.25, oy: -0.55 },
  { sample: 'boulevard', zoom: 1.7, ox: 0.45, oy: 0.1 },
  { sample: 'portrait', zoom: 2.3, ox: -0.2, oy: -0.7 },
  { sample: 'boulevard', zoom: 2.1, ox: 0, oy: -0.2 },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addPhoto(img, name) {
  const photo = { id: nextPhotoId(), name, img, graded: {} };
  state.photos.push(photo);
  buildThumbs();
  buildPanelPhotoOptions();
  return photo;
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const photo = await addPhoto(img, file.name.replace(/\.[^.]+$/, '') || 'My photo');
    assignToSelected(photo.id);
    setStatus(`Added "${photo.name}" to panel ${state.selected + 1}.`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
}

// ------------------------------------------------------------- rendering

function previewSize() {
  const size = SIZES[state.sizeKey];
  const scale = Math.min(1, 920 / size.w, 980 / size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  drawCover(ctx, w, h, state);
}

// ------------------------------------------------------------------ UI

function setStatus(text) {
  $('status').textContent = text;
}

function buildThumbs() {
  const strip = $('thumbs');
  strip.innerHTML = '';
  for (const photo of state.photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Put "${photo.name}" in panel ${state.selected + 1}`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const cap = document.createElement('span');
    cap.textContent = photo.name;
    btn.append(img, cap);
    btn.addEventListener('click', () => assignToSelected(photo.id));
    strip.appendChild(btn);
  }
}

function buildSegButtons(containerId, order, table, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const key of order) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-btn' + (key === current ? ' active' : '');
    btn.dataset.key = key;
    const name = document.createElement('strong');
    name.textContent = table[key].label;
    const hint = document.createElement('small');
    hint.textContent = table[key].hint ?? table[key].blurb ?? '';
    btn.append(name, hint);
    btn.addEventListener('click', () => onPick(key));
    box.appendChild(btn);
  }
}

function markSeg(containerId, current) {
  for (const btn of $(containerId).querySelectorAll('.seg-btn')) {
    btn.classList.toggle('active', btn.dataset.key === current);
  }
}

function panelCount() {
  return LAYOUTS[state.layout].count;
}

function buildPanelChips() {
  const box = $('panelChips');
  box.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (i === state.selected ? ' active' : '');
    chip.textContent = `Panel ${i + 1}`;
    chip.addEventListener('click', () => selectPanel(i));
    box.appendChild(chip);
  }
}

function buildPanelPhotoOptions() {
  const select = $('panelPhoto');
  select.innerHTML = '';
  for (const photo of state.photos) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  syncPanelControls();
}

function syncPanelControls() {
  const pan = state.panels[state.selected];
  if (!pan) return;
  $('panelPhoto').value = pan.photo ?? '';
  $('zoom').value = Math.round((pan.zoom ?? 1.15) * 100);
  $('zoomVal').textContent = `${Math.round((pan.zoom ?? 1.15) * 100)}%`;
  for (const chip of $('panelChips').children) {
    chip.classList.toggle('active', chip.textContent === `Panel ${state.selected + 1}`);
  }
}

function selectPanel(i) {
  state.selected = Math.max(0, Math.min(i, panelCount() - 1));
  syncPanelControls();
  redraw();
}

function assignToSelected(photoId) {
  state.panels[state.selected].photo = photoId;
  syncPanelControls();
  redraw();
}

function setLayout(key) {
  state.layout = key;
  markSeg('layoutSeg', key);
  if (state.selected >= panelCount()) state.selected = 0;
  buildPanelChips();
  syncPanelControls();
  redraw();
}

function setGrade(key) {
  state.grade = key;
  markSeg('gradeSeg', key);
  redraw();
}

// -------------------------------------------------------------- wiring

function wire() {
  buildSegButtons('layoutSeg', LAYOUT_ORDER, LAYOUTS, state.layout, setLayout);
  buildSegButtons('gradeSeg', GRADE_ORDER, GRADES, state.grade, setGrade);
  buildPanelChips();

  $('photoFiles').addEventListener('change', async (e) => {
    for (const file of e.target.files) await addPhotoFile(file);
    e.target.value = '';
  });

  const stage = $('stage');
  stage.addEventListener('dragover', (e) => {
    e.preventDefault();
    stage.classList.add('dropping');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    stage.classList.remove('dropping');
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) await addPhotoFile(file);
    }
  });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('tilt').addEventListener('input', (e) => {
    state.tilt = Number(e.target.value);
    $('tiltVal').textContent = `${state.tilt}°`;
    redraw();
  });
  $('panelPhoto').addEventListener('change', (e) => assignToSelected(e.target.value));
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    $('zoomVal').textContent = `${e.target.value}%`;
    redraw();
  });
  $('sizeSelect').addEventListener('change', (e) => { state.sizeKey = e.target.value; redraw(); });

  const doExport = () => downloadCover(state, (name) => setStatus(`Saved ${name} — check your downloads.`));
  $('exportBtn').addEventListener('click', doExport);
  $('exportBtnTop').addEventListener('click', doExport);

  // Drag inside a panel to pan its photo; a plain click selects it.
  let drag = null;
  const toCanvasPoint = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvasPoint(e);
    const { rects } = panelRects(canvas.width, canvas.height, state);
    const idx = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (idx < 0) return;
    selectPanel(idx);
    drag = { idx, startX: e.clientX, startY: e.clientY, ox: state.panels[idx].ox, oy: state.panels[idx].oy, rect: rects[idx] };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / r.width) * canvas.width;
    const dy = ((e.clientY - drag.startY) / r.height) * canvas.height;
    const pan = state.panels[drag.idx];
    // Pan range in the renderer is half the overflow; invert it so the
    // photo follows the pointer one-to-one.
    const img = gradedPeek(pan);
    if (img) {
      const scale = Math.max(drag.rect.w / img.width, drag.rect.h / img.height) * pan.zoom;
      const rangeX = Math.max(1, (img.width * scale - drag.rect.w) / 2);
      const rangeY = Math.max(1, (img.height * scale - drag.rect.h) / 2);
      pan.ox = clamp(drag.ox + dx / rangeX, -1, 1);
      pan.oy = clamp(drag.oy + dy / rangeY, -1, 1);
    }
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

function gradedPeek(pan) {
  const photo = state.photos.find((p) => p.id === pan.photo) ?? state.photos[0];
  if (!photo) return null;
  return photo.graded?.[state.grade] ?? photo.img;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- boot

async function boot() {
  wire();
  const portrait = await addPhoto(await loadImage('samples/portrait.jpg'), 'Cast — The Driver');
  const boulevard = await addPhoto(await loadImage('samples/boulevard.jpg'), 'Scene — Neon Boulevard');
  const bySample = { portrait, boulevard };
  OPENING.forEach((o, i) => {
    Object.assign(state.panels[i], { photo: bySample[o.sample].id, zoom: o.zoom, ox: o.ox, oy: o.oy });
  });
  buildPanelPhotoOptions();
  syncPanelControls();

  // Screenshot hooks: a fixed scene can be requested with query params
  // (?layout=&grade=&title=&subtitle=&tilt=&size=) and the finished
  // render is exposed for capture. Harmless in normal use.
  const q = new URLSearchParams(location.search);
  if (q.get('layout') && LAYOUTS[q.get('layout')]) setLayout(q.get('layout'));
  if (q.get('grade') && GRADES[q.get('grade')]) setGrade(q.get('grade'));
  if (q.get('title')) { state.title = q.get('title'); $('titleInput').value = state.title; }
  if (q.get('subtitle')) { state.subtitle = q.get('subtitle'); $('subtitleInput').value = state.subtitle; }
  if (q.get('tilt')) { state.tilt = Number(q.get('tilt')); $('tilt').value = state.tilt; }
  if (q.get('size') && SIZES[q.get('size')]) { state.sizeKey = q.get('size'); $('sizeSelect').value = state.sizeKey; }

  try {
    await document.fonts.load('80px Anton');
    await document.fonts.ready;
  } catch { /* the fallback stack still renders a heavy headline */ }
  redraw();
  setStatus('Ready — the samples are loaded. Drop your own photo to make it yours.');
  window.__viceHeat = { state, coverDataURL, renderCoverCanvas };
  window.__shotReady = true;
}

boot();
