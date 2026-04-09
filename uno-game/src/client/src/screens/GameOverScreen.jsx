import React from 'react';
import { formatTime } from '../utils/uno';

export default function GameOverScreen({
  winnerName,
  formName,
  lastElo,
  cardsPlayed,
  turnsTaken,
  elapsedSeconds,
  onPlayAgain,
  onBack,
}) {
  return (
    <section className="screen screen-gameover">
      <div className="container" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div className="gameover-card glass">
          <div className="badge">
            <span className="dot" />
            Game Over
          </div>
          <h2 className="gameover-title">{winnerName || formName || 'Winner'}</h2>
          <p className="gameover-text">The table is quiet now. Here is the result of the last round.</p>
          {lastElo && (
            <div className="result-box visible">
              <div className="result-label">ELO Update</div>
              <div className={`result-rating ${lastElo.delta >= 0 ? 'positive' : 'negative'}`}>
                {(lastElo.delta >= 0 ? '+' : '') + lastElo.delta}
              </div>
              <div className="result-delta">{`${lastElo.oldRating} -> ${lastElo.newRating} ELO`}</div>
            </div>
          )}
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{cardsPlayed}</div>
              <div className="stat-label">Cards Played</div>
            </div>
            <div className="stat">
              <div className="stat-value">{turnsTaken}</div>
              <div className="stat-label">Turns Taken</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatTime(elapsedSeconds)}</div>
              <div className="stat-label">Match Time</div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'center', width: '100%' }}>
            <button className="btn btn-primary" onClick={onPlayAgain} type="button">
              Play Again
            </button>
            <button className="btn btn-secondary" onClick={onBack} type="button">
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
