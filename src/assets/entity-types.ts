export interface EntitySensor {
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly self: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly ground: boolean;
  readonly swimming?: boolean;
  readonly near: (radius: number) => boolean;
  readonly blockAt: (tileX: number, tileY: number) => number;
  readonly solidAt: (tileX: number, tileY: number) => boolean;
  readonly random: () => number;
  readonly deltaTime: number;
}

export interface EntityDecision {
  velocityX?: number;
  velocityY?: number;
  action?: 'idle' | 'jump' | 'chase' | 'wander' | 'breed';
}

export interface EntityBrain {
  decide: (sensor: EntitySensor) => EntityDecision;
}

export interface EntityAssetScript {
  states: {
    world: Record<string, unknown>;
    active: Record<string, unknown>;
    dormant: Record<string, unknown>;
    dead: Record<string, unknown>;
  };
  brain: EntityBrain;
  render: (context: CanvasRenderingContext2D, view: Record<string, unknown>) => void;
  interact?: (kind: string, sensor: EntitySensor) => EntityDecision;
}
