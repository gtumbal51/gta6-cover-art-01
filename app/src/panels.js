// Panel layouts for the cover poster.
//
// A layout is a pure function of the panel area (the rectangle inside the
// poster's dark backdrop) and the gutter width: it returns one rectangle
// per panel, in reading order. The renderer clips a photo into each
// rectangle; the editor uses the same rectangles for hit-testing, so what
// you drag is exactly what gets exported.

export const LAYOUTS = {
  classic: {
    label: 'Classic Poster',
    hint: 'One tall hero panel with a stacked column beside it',
    count: 4,
    rects(area, g) {
      const heroW = (area.w - g) * 0.56;
      const colX = area.x + heroW + g;
      const colW = area.w - heroW - g;
      const rowH = (area.h - 2 * g) / 3;
      return [
        { x: area.x, y: area.y, w: heroW, h: area.h },
        { x: colX, y: area.y, w: colW, h: rowH },
        { x: colX, y: area.y + rowH + g, w: colW, h: rowH },
        { x: colX, y: area.y + 2 * (rowH + g), w: colW, h: rowH },
      ];
    },
  },

  split3: {
    label: 'Triple Split',
    hint: 'Three equal vertical panels, full height',
    count: 3,
    rects(area, g) {
      const colW = (area.w - 2 * g) / 3;
      return [0, 1, 2].map((i) => ({
        x: area.x + i * (colW + g),
        y: area.y,
        w: colW,
        h: area.h,
      }));
    },
  },

  collage6: {
    label: 'Collage Six',
    hint: 'A six-panel comic grid, three across and two down',
    count: 6,
    rects(area, g) {
      const colW = (area.w - 2 * g) / 3;
      const rowH = (area.h - g) / 2;
      const out = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          out.push({
            x: area.x + col * (colW + g),
            y: area.y + row * (rowH + g),
            w: colW,
            h: rowH,
          });
        }
      }
      return out;
    },
  },

  hero: {
    label: 'Solo Hero',
    hint: 'One full-bleed panel for a single strong shot',
    count: 1,
    rects(area) {
      return [{ x: area.x, y: area.y, w: area.w, h: area.h }];
    },
  },
};

export const LAYOUT_ORDER = ['classic', 'split3', 'collage6', 'hero'];
