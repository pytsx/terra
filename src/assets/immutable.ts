export type Immutable<T> = T extends (...args: never[]) => unknown
  ? T : { readonly [K in keyof T]: Immutable<T[K]> };

/** Asset definitions form an acyclic tree of configs and stateless scripts. */
export function immutable<T extends object>(definition: T): Immutable<T> {
  for (const child of Object.values(definition)) {
    if (child !== null && typeof child === 'object') immutable(child);
  }
  return Object.freeze(definition) as Immutable<T>;
}
