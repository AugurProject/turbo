export function mapOverObject<V1, V2>(
  o: { [k: string]: V1 },
  fn: (k: string, v: V1) => [string, V2]
): { [k: string]: V2 } {
  const o2: { [k: string]: V2 } = {};
  for (const key in o) {
    const value = o[key];
    const [k, v] = fn(key, value);
    o2[k] = v;
  }
  return o2;
}

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
