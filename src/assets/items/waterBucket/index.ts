import type { ItemAssetScript } from '../../types';
const asset: ItemAssetScript = { inventory: {}, dropped: { persistent: false }, renderInventory(c) {
    c.fillStyle = '#77878d'; c.fillRect(6, 11, 18, 13);
    c.strokeStyle = '#b5c2c6'; c.strokeRect(9, 5, 12, 10);
    c.fillStyle = '#54aee4'; c.fillRect(8, 12, 14, 4);
} };
export default asset;
