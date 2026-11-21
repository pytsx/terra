export interface AssetStates {
  placed?: boolean;
  inventory?: boolean;
  dropped?: boolean;
  held?: boolean;
}

export interface BlockAssetScript {
  placed: {
    onInteract?: (context: { x: number; y: number }) => unknown;
    render: (context: CanvasRenderingContext2D, variant: number) => void;
  };
  inventory: Record<string, unknown>;
  dropped: Record<string, unknown> & { persistent?: boolean };
}

export interface ItemAssetScript {
  inventory: Record<string, unknown>;
  dropped: Record<string, unknown> & { persistent?: boolean };
  renderInventory?: (context: CanvasRenderingContext2D) => void;
  renderDropped?: (context: CanvasRenderingContext2D) => void;
}

export interface ToolAssetScript {
  held: Record<string, unknown>;
  inventory: Record<string, unknown>;
  dropped: Record<string, unknown> & { persistent?: boolean };
  renderInventory: (context: CanvasRenderingContext2D) => void;
  renderDropped: (context: CanvasRenderingContext2D) => void;
  renderHeld: (context: CanvasRenderingContext2D) => void;
}
