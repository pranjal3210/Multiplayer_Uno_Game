import React from 'react';

export default function LandingScreen({
  form,
  connected,
  queue,
  message,
  onRoomChange,
  onJoinRoom,
  onFindMatch,
  user,
  onLogout,
}) {
  return (
    <section className="screen screen-landing">
      <div className="container landing">
        <div>
          <div className="badge">
            <span className="dot" />
            Welcome, {user?.username || 'Player'}
          </div>
          <h1 className="title">
            UNO
            <br />
            Multiplayer
          </h1>
          <p className="subtitle">
            Bold lobby, live table, reconnect flow, and clean rate-limited gameplay. It should
            feel like a small product, not just a demo.
          </p>
          <div className="hero-cards">
            <div className="feature glass">
              <div className="feature-kicker">Realtime</div>
              <div className="feature-title">Live</div>
              <div className="feature-copy">Socket.IO sync keeps every tab aligned.</div>
            </div>
            <div className="feature glass">
              <div className="feature-kicker">Persistence</div>
              <div className="feature-title">Redis</div>
              <div className="feature-copy">Rooms, queue, ratings, and reconnect state survive restarts.</div>
            </div>
            <div className="feature glass">
              <div className="feature-kicker">Matchmaking</div>
              <div className="feature-title">Queue</div>
              <div className="feature-copy">Fast lobby flow with bot-filled tables when needed.</div>
            </div>
          </div>
        </div>

        <div className="panel glass">
          <div className="profile-strip">
            <div>
              <div className="hand-title">Player Profile</div>
              <div className="player-name">Welcome, {user?.username || form.name || 'Player'}</div>
            </div>
            <div className="status-pill good">Rating: {user?.rating ?? 1200}</div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="roomInput">Room ID</label>
            <input
              id="roomInput"
              className="input"
              value={form.roomId}
              onChange={(event) => onRoomChange(event.target.value)}
              placeholder="room1"
              onKeyDown={(event) => event.key === 'Enter' && onJoinRoom()}
            />
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={onJoinRoom} type="button">
              Join Room
            </button>
            <button className="btn btn-secondary" onClick={onFindMatch} type="button">
              Find Match
            </button>
            <button className="btn btn-secondary" onClick={onLogout} type="button">
              Logout
            </button>
          </div>
          <div className={`queue ${queue.visible ? 'visible' : ''}`}>
            <div className="queue-head">
              <div className="queue-title">Matchmaking Queue</div>
              <div className="queue-status">{queue.message || 'Searching...'}</div>
            </div>
            <div className="queue-slots">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`slot ${i < queue.position ? 'filled' : ''}`}>
                  {i < queue.position ? 'OK' : i + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="message" style={{ marginTop: 12 }}>
            {message}
          </div>
          <div className="chip-grid" style={{ marginTop: 12 }}>
            <div className="chip">{connected ? 'Connected' : 'Offline'}</div>
            <div className="chip">{user?.username || 'Player'}</div>
            <div className="chip">Socket.IO</div>
            <div className="chip">ELO {user?.rating ?? 1200}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
