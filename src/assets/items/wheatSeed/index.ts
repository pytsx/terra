import type { ItemAssetScript } from '../../types';
const asset: ItemAssetScript = { inventory: {}, dropped: { persistent: false }, renderInventory(c) {
    c.fillStyle = '#bd914d'; c.fillRect(8, 12, 12, 6);
} };
export default asset;
