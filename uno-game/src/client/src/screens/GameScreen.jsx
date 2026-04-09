import React from 'react';
import CardView from '../components/CardView';
import PlayerSeat from '../components/PlayerSeat';
import { canPlay } from '../utils/uno';

export default function GameScreen({
  connected,
  game,
  myId,
  isMyTurn,
  rateLimited,
  discardTop,
  myHand,
  boardPlayers,
  playerCount,
  openSeats,
  currentPlayer,
  timerSeconds,
  gameMessage,
  onDrawCard,
  onPlayCard,
  onBack,
  onUno,
}) {
  return (
    <section className="screen screen-game">
      <div className="container game-shell">
        <div className="panel glass game-panel">
          <div className="topbar">
            <div className="row">
              <div className={`status-pill ${game?.status === 'finished' ? 'warn' : 'good'}`}>
                {game?.status === 'finished' ? 'Finished' : 'Playing'}
              </div>
              <div className="badge">
                <span className="dot" />
                Live table
              </div>
            </div>
            <div className={`status-pill ${connected ? 'good' : 'warn'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="board">
            <div className="seat top">
              <PlayerSeat player={boardPlayers[0]} currentPlayerId={game?.currentPlayerId} totalPlayers={playerCount} />
            </div>
            <div className="seat left">
              <PlayerSeat player={boardPlayers[1]} currentPlayerId={game?.currentPlayerId} totalPlayers={playerCount} />
            </div>
            <div className="table glass">
              <div className="table-meta">
                <div className="turn-arrow">{game?.direction === -1 ? 'CCW' : 'CW'}</div>
                <div>Color: {game?.declaredColor || game?.topCard?.color || '-'}</div>
              </div>
              <div className="pile-row">
                <button
                  className={`pile draw-pile ${rateLimited || !isMyTurn ? 'disabled' : ''}`}
                  onClick={onDrawCard}
                  type="button"
                  disabled={!isMyTurn || rateLimited}
                >
                  <div className="draw-count">{game?.drawPileCount ?? 0}</div>
                  <div className="draw-label">Draw</div>
                </button>
                <div className="pile">{discardTop ? <CardView card={discardTop} disabled /> : null}</div>
              </div>
            </div>
            <div className="seat right">
              <PlayerSeat player={boardPlayers[2]} currentPlayerId={game?.currentPlayerId} totalPlayers={playerCount} />
            </div>
          </div>

          <div className="bottom">
            <div className="hand-shell glass">
              <div className="hand-head">
                <div>
                  <div className="hand-title">Your Hand</div>
                  <div className="hand-count">
                    {myHand.length} card{myHand.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className={`turn-chip ${isMyTurn ? 'visible' : ''}`}>Your turn</div>
              </div>
              <div className="timer">
                <div
                  className={`timer-bar ${timerSeconds <= 5 ? 'urgent' : ''}`}
                  style={{ width: `${(timerSeconds / 15) * 100}%` }}
                />
              </div>
              <div className="hand">
                {myHand.map((card, index) => {
                  const playable =
                    game?.status === 'playing' &&
                    isMyTurn &&
                    canPlay(card, discardTop, game?.declaredColor) &&
                    !rateLimited;
                  return (
                    <div key={`${card.color}_${card.value}_${index}`} className="hand-card-wrap">
                      <CardView card={card} playable={playable} disabled={!playable} onClick={() => onPlayCard(index)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="actions glass">
              <button className="btn btn-primary" onClick={onDrawCard} disabled={!isMyTurn || rateLimited} type="button">
                Draw Card
              </button>
              <button className="btn btn-secondary" onClick={onUno} type="button">
                UNO!
              </button>
              <button className="btn btn-secondary" onClick={onBack} type="button">
                Back to Lobby
              </button>
              <div className="ticker">
                <span className="dot-live" />
                <span>
                  {game?.status === 'finished'
                    ? 'Round complete.'
                    : isMyTurn
                      ? `Play a matching card, or draw one if needed. ${game?.drawPileCount ?? 0} cards left in deck.`
                      : openSeats > 0
                        ? `Waiting for ${openSeats} player${openSeats === 1 ? '' : 's'} to join.`
                        : `Waiting for ${currentPlayer} to take their turn.`}
                </span>
              </div>
              <div className="message">{gameMessage}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
