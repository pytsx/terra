import type { ToolAssetScript } from '../../types';

function drawPick(c: CanvasRenderingContext2D) {
  c.fillStyle = '#926d47';
  c.fillRect(-2, -6, 4, 19);
  c.fillStyle = '#c2d2cc';
  c.fillRect(-11, -9, 22, 4);
  c.fillRect(-10, -6, 4, 3);
  c.fillRect(7, -6, 4, 3);
  c.fillStyle = '#edf5ee';
  c.fillRect(-9, -9, 16, 1);
}

const tool: ToolAssetScript = {
  held: { miningMultiplier: 1 },
  inventory: {},
  dropped: { persistent: false },
  renderInventory(c) {
    c.translate(15, 15);
    c.rotate(0.58);
    drawPick(c);
  },
  renderDropped(c) {
    c.rotate(0.58);
    drawPick(c);
  },
  renderHeld(c) {
    c.save();
    c.translate(15, 4);
    c.rotate(Math.PI / 2);
    drawPick(c);
    c.restore();
  },
};

export default tool;
