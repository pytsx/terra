import type { ItemAssetScript } from '../../types';
const asset: ItemAssetScript = { inventory: {}, dropped: { persistent: false }, renderInventory(c) {
    c.fillStyle = '#92714e'; c.fillRect(13, 5, 3, 21);
    c.fillStyle = '#adc0be'; c.fillRect(6, 5, 12, 4);
} };
export default asset;
