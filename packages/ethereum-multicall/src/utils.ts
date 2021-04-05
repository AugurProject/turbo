export class Utils {
  /**
   * Deep clone a object
   * @param object The object
   */
  public static deepClone<T>(object: T): T {
    // const cloned = JSON.parse(JSON.stringify(object)) as T;
    // cloning causes data loss
    return object;
  }
}
