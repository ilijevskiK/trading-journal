// A small lightweight-charts pane primitive that draws filled, translucent
// rectangles for Smart Money Concepts order blocks. Line series alone can't
// fill a region between two arbitrary price levels, so this draws directly
// on the pane's canvas instead.

class OrderBlockPaneRenderer {
  constructor(rects) {
    this._rects = rects;
  }

  draw() {}

  drawBackground(target) {
    target.useMediaCoordinateSpace(({ context }) => {
      this._rects.forEach((r) => {
        if (r.x1 == null || r.x2 == null || r.y1 == null || r.y2 == null) return;
        const x = Math.min(r.x1, r.x2);
        const width = Math.max(1, Math.abs(r.x2 - r.x1));
        // Order blocks are a single candle's high/low range, which can be
        // just 1-2px tall once zoomed out over the trade's full history —
        // enforce a minimum visible thickness, centered on the true zone,
        // so the box never effectively disappears.
        const rawTop = Math.min(r.y1, r.y2);
        const rawBottom = Math.max(r.y1, r.y2);
        const centerY = (rawTop + rawBottom) / 2;
        const height = Math.max(8, rawBottom - rawTop);
        const y = centerY - height / 2;
        context.fillStyle = r.color;
        context.fillRect(x, y, width, height);
        context.strokeStyle = r.borderColor;
        context.lineWidth = 1;
        context.strokeRect(x, y, width, height);
      });
    });
  }
}

class OrderBlockPaneView {
  constructor(source) {
    this._source = source;
  }

  zOrder() {
    return "bottom";
  }

  renderer() {
    return new OrderBlockPaneRenderer(this._source._screenRects);
  }
}

export class OrderBlockPrimitive {
  constructor() {
    this._boxes = [];
    this._screenRects = [];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [new OrderBlockPaneView(this)];
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
  }

  // boxes: [{ left, right, top, bottom, color, borderColor }]
  setBoxes(boxes) {
    this._boxes = boxes;
    this.updateAllViews();
    this._requestUpdate?.();
  }

  updateAllViews() {
    if (!this._chart || !this._series) {
      this._screenRects = [];
      return;
    }
    const timeScale = this._chart.timeScale();
    this._screenRects = this._boxes.map((b) => ({
      x1: timeScale.timeToCoordinate(b.left),
      x2: timeScale.timeToCoordinate(b.right),
      y1: this._series.priceToCoordinate(b.top),
      y2: this._series.priceToCoordinate(b.bottom),
      color: b.color,
      borderColor: b.borderColor,
    }));
  }

  paneViews() {
    return this._paneViews;
  }
}
