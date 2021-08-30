// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./Sport.sol";
import "./ManagedByLink.sol";

abstract contract ResolvesByFiat is Sport, ManagedByLink {
    function resolveEvent(
        uint256 _eventId,
        SportsEventStatus _eventStatus,
        uint256 _homeTeamId, // for verifying team stability
        uint256 _awayTeamId, // for verifying team stability
        uint256 _whoWon
    ) public onlyLinkNode {
        SportsEvent storage _event = sportsEvents[_eventId];

        require(_event.status == SportsEventStatus.Scheduled);
        require(SportsEventStatus(_eventStatus) != SportsEventStatus.Scheduled);

        if (eventIsNoContest(_event, _eventStatus, _homeTeamId, _awayTeamId, _whoWon)) {
            resolveInvalidEvent(_eventId);
        } else {
            resolveValidEvent(_event, _whoWon);
        }

        sportsEvents[_eventId].status = _eventStatus;
    }

    function resolveValidEvent(SportsEvent memory _event, uint256 _whoWon) internal virtual;
}
