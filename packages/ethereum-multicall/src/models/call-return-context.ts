import { CallContext } from './call-context';

export interface CallReturnContext extends CallContext {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  returnValues: any[];
  /**
   * This stats if it could decode the result or not
   */
  decoded: boolean;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export interface Result extends ReadonlyArray<any> {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  readonly [key: string]: any;
}
