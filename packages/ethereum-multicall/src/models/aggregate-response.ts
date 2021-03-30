export interface AggregateResponse {
  blockNumber: number;
  results: Array<{
    contractContextIndex: number;
    methodResults: Array<{
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      returnData: any;
      contractMethodIndex: number;
    }>;
  }>;
}
