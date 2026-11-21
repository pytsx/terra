import type { BlockAssetScript } from '../../types';

const block: BlockAssetScript = {
  placed: { render: (context) => context.clearRect(0, 0, 24, 24) },
  inventory: {},
  dropped: { persistent: false },
};

export default block;
