
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

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">


<colgroup>
<col  class="org-left" />

<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<thead>
<tr>
<th scope="col" class="org-left">Value</th>
<th scope="col" class="org-left">Rundown API Path</th>
<th scope="col" class="org-left">Use</th>
</tr>
</thead>

<tbody>
<tr>
<td class="org-left">`eventId`</td>
<td class="org-left">`event.event_id`</td>
<td class="org-left">referencing the event</td>
</tr>


<tr>
<td class="org-left">`homeTeamId`</td>
<td class="org-left">`event.teams_normalized[].team_id where .is_home == true`</td>
<td class="org-left">UI maps to team name</td>
</tr>


<tr>
<td class="org-left">`awayTeamId`</td>
<td class="org-left">`event.teams_normalized[].team_id where .is_away == true`</td>
<td class="org-left">UI maps to team name</td>
</tr>


<tr>
<td class="org-left">`startTimestamp`</td>
<td class="org-left">`Date.parse(event.event_date)`</td>
<td class="org-left">UI shows date</td>
</tr>


<tr>
<td class="org-left">`moneylineHome`</td>
<td class="org-left">`event.lines[9].moneyline.moneyline_home`</td>
<td class="org-left">initial odds for head-to-head market</td>
</tr>


<tr>
<td class="org-left">`moneylineAway`</td>
<td class="org-left">`event.lines[9].moneyline.moneyline_away`</td>
<td class="org-left">initial odds for head-to-head market</td>
</tr>


<tr>
<td class="org-left">`homeSpread`</td>
<td class="org-left">`event.lines[9].spread.points_spread_home`</td>
<td class="org-left">target score for spread market resolution</td>
</tr>


<tr>
<td class="org-left">`totalScore`</td>
<td class="org-left">`event.lines[9].total.total_over`</td>
<td class="org-left">target score for over-under market resolution</td>
</tr>


<tr>
<td class="org-left">`homeScore`</td>
<td class="org-left">`event.score.score_home`</td>
<td class="org-left">resolving markets</td>
</tr>


<tr>
<td class="org-left">`awayScore`</td>
<td class="org-left">`event.score.score_away`</td>
<td class="org-left">resolving markets</td>
</tr>


<tr>
<td class="org-left">`eventStatus`</td>
<td class="org-left">`event.score.event_status`</td>
<td class="org-left">resolving markets</td>
</tr>


<tr>
<td class="org-left">`eventStatusDetails`</td>
<td class="org-left">`event.score.event_status_details`</td>
<td class="org-left">if TBD then do not create markets</td>
</tr>
</tbody>
</table>

<table border="2" cellspacing="0" cellpadding="6" rules="groups" frame="hsides">


<colgroup>
<col  class="org-left" />

<col  class="org-left" />
</colgroup>
<thead>
<tr>
<th scope="col" class="org-left">API Status</th>
<th scope="col" class="org-left">Contract Enum Value</th>
</tr>
</thead>

<tbody>
<tr>
<td class="org-left">`<unused>`</td>
<td class="org-left">`0`</td>
</tr>


<tr>
<td class="org-left">`STATUS_SCHEDULED`</td>
<td class="org-left">`1`</td>
</tr>


<tr>
<td class="org-left">`STATUS_FINAL`</td>
<td class="org-left">`2`</td>
</tr>


<tr>
<td class="org-left">`STATUS_POSTPONED`</td>
<td class="org-left">`3`</td>
</tr>


<tr>
<td class="org-left">`STATUS_CANCELED`</td>
<td class="org-left">`4`</td>
</tr>
</tbody>
</table>


<a id="orgf112b83"></a>

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

