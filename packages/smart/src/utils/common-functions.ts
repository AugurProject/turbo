export function mapOverObject<V1, V2>(
  o: { [k: string]: V1 },
  fn: (k: string, v: V1) => [string, V2] | void
): { [k: string]: V2 } {
  const o2: { [k: string]: V2 } = {};
  for (const key in o) {
    const value = o[key];
    const kv = fn(key, value);
    if (kv === undefined) continue;
    const [k, v] = kv;
    if (k !== undefined) {
      o2[k] = v;
    }
  }
  return o2;
}

export async function sleep(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export function flatten<T>(...arrays: T[][]): T[] {
  return arrays.reduce((flat, array) => flat.concat(array), []);
}

export type TypeOfClassMethod<T, M extends keyof T> = T[M] extends Function ? T[M] : never;

export function repeat<T>(thing: T, n: number): T[] {
  return Array.from({length: n}).map(() => thing);
}