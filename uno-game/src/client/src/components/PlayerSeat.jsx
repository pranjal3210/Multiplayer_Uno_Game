import React from 'react';

export default function PlayerSeat({ player, currentPlayerId, totalPlayers }) {
  if (!player) {
    return (
      <div className="player-card empty">
        <div className="avatar">+</div>
        <div className="player-meta">
          <div className="player-name">Open seat</div>
          <div className="player-sub">
            {totalPlayers >= 2 ? 'Waiting for the next player' : 'Waiting for 1 more player'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`player-card ${player.id === currentPlayerId ? 'current' : ''} ${
        player.connected === false ? 'disconnected' : ''
      }`}
    >
      <div className="avatar">{(player.name || '?').charAt(0).toUpperCase()}</div>
      <div className="player-meta">
        <div className="player-name">{player.name || '-'}</div>
        <div className="player-sub">
          {player.connected === false
            ? 'Disconnected'
            : player.id === currentPlayerId
              ? 'Playing now'
              : `${player.cardCount || 0} cards`}
        </div>
      </div>
      <div className="back-cards">
        {Array.from({ length: Math.min(player.cardCount || 0, 8) }).map((_, i) => (
          <div key={i} className="back-card" style={{ marginLeft: i === 0 ? 0 : -7 }} />
        ))}
      </div>
    </div>
  );
}
