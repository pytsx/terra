export function pixelSprite(rows: string[], palette: Record<string, string>) {
  return (c: CanvasRenderingContext2D, view: Record<string, unknown>) => {
    const w = Number(view.w), h = Number(view.h);
    c.save();
    c.translate(Math.round(Number(view.x)), Math.round(Number(view.y)));
    if (view.face === -1) { c.translate(w, 0); c.scale(-1, 1); }
    const stride = view.vx || view.swimming ? Math.floor(Number(view.phase) * 7) % 2 : 0;
    for (const [y, row] of rows.entries()) for (const [x, pixel] of [...row].entries()) {
      if (pixel === '.') continue;
      c.fillStyle = palette[pixel];
      const left = Math.round(x * w / row.length);
      const top = Math.round(y * h / rows.length);
      const lift = y === rows.length - 1 && x % 3 === stride ? stride : 0;
      c.fillRect(left, top - lift, Math.round((x + 1) * w / row.length) - left,
        Math.round((y + 1) * h / rows.length) - top);
    }
    c.restore();
  };
}
