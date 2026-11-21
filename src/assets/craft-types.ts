export interface CraftAsset {
  pattern: readonly (readonly (string | null)[])[];
  output: { item: string; amount: number };
  station?: 'inventory' | 'workbench';
}
