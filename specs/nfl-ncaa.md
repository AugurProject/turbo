
# Table of Contents

1.  [Specs](#orge269cc3)
    1.  [NFL](#org30ab402)
        1.  [Market Creation](#orgf112b83)
        2.  [Market Resolution](#org537f51a)
    2.  [NCAA Football](#orgef70766)


<a id="orge269cc3"></a>

# Specs


<a id="org30ab402"></a>

## NFL

Sport ID: 2
Notes

-   Games can tie/draw.
    This is bundled into the No Contest outcome so half-points aren't used for spread and over-under.
    This only affects the contacts; the adapter can just pass along scores.

Run two cron jobs: creation and resolution.

These are the values to get from the API.

| Value                  | Rundown API Path                                            | Use                                             |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| `eventId`              | `event.event_id`                                            | referencing the event                           |
| `homeTeamId`           | `event.teams_normalized[].team_id where .is_home == true`   | UI maps to team name                            |
| `awayTeamId`           | `event.teams_normalized[].team_id where .is_away == true`   | UI maps to team name                            |
| `startTimestamp`       | `Date.parse(event.event_date)`                              | UI shows date                                   |
| `moneylineHome`        | `event.lines[9].moneyline.moneyline_home`                   | initial odds for head-to-head market            |
| `moneylineAway`        | `event.lines[9].moneyline.moneyline_away`                   | initial odds for head-to-head market            |
| `homeSpread`           | `event.lines[9].spread.points_spread_home`                  | target score for spread market resolution       |
| `totalScore`           | `event.lines[9].total.total_over`                           | target score for over-under market resolution   |
| `homeScore`            | `event.score.score_home`                                    | resolving markets                               |
| `awayScore`            | `event.score.score_away`                                    | resolving markets                               |
| `eventStatus`          | `event.score.event_status`                                  | resolving markets                               |
| `eventStatusDetails`   | `event.score.event_status_details`                          | if TBD then do not create markets               |

| API Status         | Contract Enum Value |
|--------------------|---------------------|
| `<unused>`         | `0`                 |                                                                                                                                                      
| `STATUS_SCHEDULED` | `1`                 |                                                                                                                                                      
| `STATUS_FINAL`     | `2`                 |                                                                                                                                                      
| `STATUS_POSTPONED` | `3`                 |                                                                                                                                                      
| `STATUS_CANCELED`  | `4`                 |


### Market Creation

This cron job runs at least once per day.

Get every event matching these criteria:

1.  Occurs no more than 7 days in the future.
2.  Occurs at least one day in the future.
3.  Its moneylineHome, moneylineAway, homeSpread, and toalScore lines have values that are NOT `0.0001`.
4.  Its eventStatusDetails is NOT `"TBD"`.
5.  Neither homeTeamId nor awayTeamId are the TBD team, which is the team with id `2756`.
6.  The event has not already been used to create markets.

Then for each remaining event, make this call:

    contract.createMarket(
      eventId,
      homeTeamId,
      awayTeamId,
      startTimestamp,
      moneylineHome,
      moneylineAway,
      homeSpread,
      totalScore,
    )


<a id="org537f51a"></a>

### Market Resolution

This cron job runs every two hours.

1.  Get the list of potentially resolvable events from the contract:
    
        contract.listResolvableEvents()
2.  Query the API for each event.
3.  Filter out events whose eventStatus is `STATUS_SCHEDULED`.
4.  For each remaining event, make this call:
    
        contract.trustedResolveMarkets(
          eventId,
          eventStatus,
          homeScore,
          awayScore
        )


<a id="orgef70766"></a>

## NCAA Football

Sport ID: 1

From the perspective of the adapter, the spec for NCAA Football is *exactly* the same as for the NFL except for the Sport ID.
The contracts however must ensure that there are half-points for spread and over-under.

