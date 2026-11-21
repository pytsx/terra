import type { ToolAssetScript } from '../../types';

function drawSword(c: CanvasRenderingContext2D) {
  c.fillStyle = '#aabbd1';
  c.fillRect(-2, -12, 4, 21);
  c.fillStyle = '#dce8ee';
  c.fillRect(-1, -14, 2, 19);
  c.fillStyle = '#8b6844';
  c.fillRect(-7, 8, 14, 3);
  c.fillRect(-2, 10, 4, 7);
}

const sword: ToolAssetScript = {
  held: { miningMultiplier: 0.5 },
  inventory: {},
  dropped: { persistent: false },
  renderInventory(c) {
    c.translate(15, 15);
    c.rotate(-0.72);
    drawSword(c);
  },
  renderDropped(c) {
    c.rotate(-0.72);
    drawSword(c);
  },
  renderHeld(c) {
    c.save();
    c.translate(16, 1);
    c.rotate(Math.PI / 2);
    drawSword(c);
    c.restore();
  },
};

export default sword;
