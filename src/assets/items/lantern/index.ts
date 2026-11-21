import type { ToolAssetScript } from '../../types';

function drawLantern(c: CanvasRenderingContext2D) {
  c.fillStyle = '#554b3c';
  c.fillRect(-7, -8, 14, 3);
  c.fillRect(-8, -5, 3, 14);
  c.fillRect(5, -5, 3, 14);
  c.fillStyle = '#93845c';
  c.fillRect(-9, 8, 18, 3);
  c.fillStyle = '#7edfd4';
  c.fillRect(-5, -5, 10, 13);
  c.fillStyle = '#d7fff3';
  c.fillRect(-3, -3, 3, 8);
}

const lantern: ToolAssetScript = {
  held: { lightRadius: 220 },
  inventory: {},
  dropped: { persistent: false },
  renderInventory(c) {
    c.translate(15, 15);
    drawLantern(c);
  },
  renderDropped(c) {
    drawLantern(c);
  },
  renderHeld(c) {
    c.save();
    c.translate(17, 2);
    drawLantern(c);
    c.restore();
  },
};

export default lantern;
