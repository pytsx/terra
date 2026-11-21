export type Material = 'GRASS' | 'DIRT' | 'SAND' | 'AIR' | 'WOOD';

export interface Habitat {
  readonly depth: number;
  readonly face: number;
  readonly night: boolean;
  readonly rainy: boolean;
  readonly homeDistance: number;
  readonly depthBelowHome: number;
  readonly clock: number;
  rememberHome(): void;
  flee(species: string, radius: number): boolean;
  is(dx: number, dy: number, material: Material): boolean;
  change(dx: number, dy: number, from: Material, to: Material): boolean;
  hunt(species: string, radiusInTiles: number, damage: number): 'chase' | 'digest' | undefined;
}

export type Activity = 'walk' | 'tunnel' | 'rest' | 'turn' | 'flee' | 'chase' | 'digest' |
  'climb' | 'descend' | 'emerge' | 'return';

export interface Species {
  config: {
    id: string; name: string; width: number; height: number; health: number;
    speed: number; interval: number; activeRadius: number;
    substrate: string[]; spawn: { weight: number };
    diet: import('./Animal').Diet;
  };
  script: {
    act(habitat: Habitat): Activity;
    render(context: CanvasRenderingContext2D, view: Record<string, unknown>): void;
  };
}
