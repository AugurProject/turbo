## MMA / UFC
Sport ID: 7
Notes
- The fighter IDs are sent in resolution because if a fighter is substituted, the market resolves as No Contest.
- MMA has only Head-to-Head markets.
- There's no score, just a winner.
- Fighter name and ID are given. Name is used for TBD check but mostly for UI.
  ID is used for resolution since it won't ever be duplicated.
 
Run two cron jobs: creation and resolution.
 
These are the values to get from the API.

| Value                | Rundown API Path                                          | Use                                           |
|----------------------|-----------------------------------------------------------|-----------------------------------------------|
| `eventId`            | `event.event_id`                                          | referencing the event                         |
| `homeFighterName`    | `event.teams_normalized[].name where .is_home == true`    | outcome name, UI                              |
| `homeFighterId`      | `event.teams_normalized[].team_id where .is_home == true` | outcome name, UI                              |
| `awayFighter`        | `event.teams_normalized[].name where .is_away == true`    | outcome name, UI                              |
| `awayFighterId`      | `event.teams_normalized[].team_id where .is_away == true` | outcome name, UI                              |
| `startTimestamp`     | `Date.parse(event.event_date)`                            | UI shows date                                 |
| `moneyLineHome`      | `event.lines[9].moneyline.moneyline_home`                 | initial odds for head-to-head markets         |
| `moneyLineAway`      | `event.lines[9].moneyline.moneyline_away`                 | initial odds for head-to-head markets         |
| `whoWon`             | `event.score.winner_home` and `event.score.winner_away`   | resolving markets                             |
| `eventStatus`        | `event.score.event_status`                                | resolving markets                             |
| `eventStatusDetails` | `event.score.event_status_details`                        | if TBD then do not create markets             |
 
| API Status           | Contract Enum Value   |
| -------------------- | --------------------- |
| `<unused>`           | `0`                   |
| `STATUS_SCHEDULED`   | `1`                   |
| `STATUS_FINAL`       | `2`                   |
| `STATUS_POSTPONED`   | `3`                   |
| `STATUS_CANCELED`    | `4`                   |
 
 
### Market Creation
This cron job runs at least once per day.
 
Get every event matching these criteria:
1. Occurs no more than 7 days in the future.
2. Occurs at least one day in the future.
3. Its moneylineHome and moneylineAway lines have values that are NOT `0.0001`.
4. Its eventStatusDetails is NOT `"TBD"`.
5. Neither homeFighter nor awayFighter are the TBD fighter, which is the fighter with name `Opponent TBA`.
6. The event has not already been used to create markets.

Then for each remaining event, make this call:

```typescript
contract.createMarket(
  eventId,
  homeFighterName,
  homeFighterId,
  awayFighterName,
  awayFighterId,
  startTimestamp,
  moneylineHome,
  moneylineAway
)
```

### Market Resolution
This cron job runs every two hours.

1. Get the list of potentially resolvable events from the contract:

   CreateEvent
   ```typescript
   contract.listResolvableEvents()
   ```
2. Query the API for each event.
3. Filter out events whose eventStatus is `STATUS_SCHEDULED`.
4. Calculate `whoWon` like so:
   - If `event.score.winner_home` is true then it is `1` to indicate that Home won.
   - If `event.score.winner_away` is true then it is `2` to indicate that Away won.
   - If neither is true then it is `3` to indicate a draw / tie.
5. For each remaining event, make this call:

   ```typescript
   contract.trustedResolveMarkets(
     eventId,
     eventStatus,
     homeFighterId,
     awayFighterId,
     whoWon
   )
   ```
