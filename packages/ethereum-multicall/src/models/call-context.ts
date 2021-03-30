export interface CallContext {
  /**
   * Reference to this call context
   */
  reference: string;

  /**
   * your contract method name
   */
  methodName: string;

  /**
   * Method parameters you want it to pass in
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  methodParameters: any[];

  /**
   *  Context is a generic databucket
   */
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  context?: any;
}
