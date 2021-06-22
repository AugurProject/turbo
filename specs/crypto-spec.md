## Crypto
There is one job. It resolves and created all crypto markets.

Scheduling:
- If the cron scheduler can handle daylight savings timezones then set it to 4PM ET.
- Else, set it to run every hour on the hour.

The adapter makes 2 calls:
- Call `nextResolutionTime` to get the time when markets can be resolved and recreated. It is in epoch seconds.
  - If the current block time is at least nextResolutionTime then proceed.
  - If the difference is less than an hour then sleep for that long.
  - Else, stop. This is the typical result when running hourly but shouldn't ever happen when running at 4PM ET specifically.
- Call `createAndResolveMarkets` to resolve open markets and create new ones.
  - It takes one argument: the block time for the next resolution.
  - The block time must be correct for the ET timezone at resolution. So it must handle daylight savings.

### Notes
- The on-chain price feed will be updated at the appropriate time but this isn't instant.
  The price will remain stable for minutes at least unless there's a large price swing.
  So it is fine for it to take a few blocks to call createAndResolveMarkets.
- We use block time not block number out of a desire to always resolve at 4PM ET. 

### An alternative:
If the adapter can run a long time and be recreated easily if it dies for maintenance etc, then the cron job is unnecessary.
Instead, automatically start the adapter and have it sleep until shortly before nextResolutionTime.
