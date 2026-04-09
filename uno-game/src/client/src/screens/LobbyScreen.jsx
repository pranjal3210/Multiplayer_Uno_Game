import React from 'react';

export default function LobbyScreen({
  roomId,
  roomPlayers,
  roomStatus,
  connected,
  message,
  canStart,
  onStartGame,
  onBack,
}) {
  return (
    <section className="screen screen-lobby">
      <div className="container hud">
        <div className="panel glass" style={{ display: 'grid', gap: 16 }}>
          <div className="topbar">
            <div className="row">
              <div className={`status ${roomStatus === 'playing' ? 'good' : 'warn'}`}>{roomStatus}</div>
              <div className="badge">
                <span className="dot" />
                Lobby
              </div>
            </div>
            <div className={`status ${connected ? 'good' : 'warn'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="hand-title">Room</div>
              <div className="player-name">{roomId || 'room1'}</div>
            </div>
            <div>
              <div className="hand-title">Players</div>
              <div className="player-name">{roomPlayers.length}/4</div>
            </div>
          </div>

          <div className="hero-cards" style={{ gridTemplateColumns: '1fr', marginTop: 0 }}>
            {(roomPlayers || []).map((player) => (
              <div key={player.id} className="feature glass">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="badge" style={{ marginBottom: 8 }}>
                    <span className="dot" />
                    Player
                  </div>
                  <div className="status-pill">{String(player.id || '').slice(0, 6)}</div>
                </div>
                <div className="row">
                  <div className="avatar">{(player.name || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="player-name">{player.name || '-'}</div>
                    <div className="player-sub">Ready to play</div>
                  </div>
                </div>
              </div>
            ))}
            {!roomPlayers.length && <div className="feature glass">No players yet.</div>}
          </div>

          <div className="row">
            <button
              className="btn btn-primary"
              onClick={onStartGame}
              disabled={!canStart || roomStatus === 'playing'}
              type="button"
            >
              {roomStatus === 'playing' ? 'Game Started' : 'Start Game'}
            </button>
            <button className="btn btn-secondary" onClick={onBack} type="button">
              Back to Lobby
            </button>
          </div>

          <div className="message">{message}</div>
        </div>
      </div>
    </section>
  );
}
