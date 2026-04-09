import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import ToastLayer from './components/ToastLayer';
import WildColorModal from './components/WildColorModal';
import LandingScreen from './screens/LandingScreen';
import LobbyScreen from './screens/LobbyScreen';
import ReconnectScreen from './screens/ReconnectScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';

const DEFAULT_FORM = { name: 'Player', roomId: 'room1' };
const SCREEN = {
  landing: 'landing',
  lobby: 'lobby',
  reconnect: 'reconnect',
  game: 'game',
  gameover: 'gameover',
};

function loadSession() {
  try {
    const raw = sessionStorage.getItem('uno_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.ts > 2 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(name, roomId) {
  sessionStorage.setItem('uno_session', JSON.stringify({ name, roomId, ts: Date.now() }));
}

function clearSession() {
  sessionStorage.removeItem('uno_session');
}

function clientId() {
  let id = sessionStorage.getItem('uno_client_id');
  if (!id) {
    id = `tab_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('uno_client_id', id);
  }
  return id;
}

export default function App() {
  const socketRef = useRef(null);
  const timersRef = useRef({ timer: null, queue: null, reconnect: null });
  const formRef = useRef(DEFAULT_FORM);
  const reconnectingRef = useRef(false);
  const startAtRef = useRef(null);

  const [screen, setScreen] = useState(SCREEN.landing);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);
  const [form, setForm] = useState(() => loadSession() || DEFAULT_FORM);
  const [roomId, setRoomId] = useState('');
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [canStart, setCanStart] = useState(false);
  const [queue, setQueue] = useState({ visible: false, position: 0, message: '' });
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState('');
  const [gameMessage, setGameMessage] = useState('');
  const [toasts, setToasts] = useState([]);
  const [wildChoiceIndex, setWildChoiceIndex] = useState(null);
  const [wildModalOpen, setWildModalOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectState, setReconnectState] = useState({
    title: 'Reconnecting...',
    text: 'Checking Redis for your saved game state.',
    chips: [],
    message: '',
  });
  const [startAt, setStartAt] = useState(null);
  const [cardsPlayed, setCardsPlayed] = useState(0);
  const [turnsTaken, setTurnsTaken] = useState(0);
  const [lastElo, setLastElo] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  const rateLimited = Date.now() < rateLimitedUntil;
  const isMyTurn = game?.status === 'playing' && game?.currentPlayerId === myId;
  const currentPlayer =
    (game?.players || []).find((player) => player.id === game?.currentPlayerId)?.name || 'next player';
  const playerCount = (game?.players || []).length;
  const openSeats = Math.max(0, 4 - playerCount);
  const discardTop = game?.topCard || null;
  const myHand = game?.myHand || [];
  const boardPlayers = (game?.players || []).filter((player) => player.id !== myId);
  const currentScreen = game?.status === 'playing' ? SCREEN.game : screen;
  const elapsedSeconds = startAt ? Math.max(0, Math.floor((Date.now() - startAt) / 1000)) : 0;
  const winnerName = (game?.players || []).find((player) => player.id === game?.winner)?.name;

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    reconnectingRef.current = reconnecting;
  }, [reconnecting]);

  useEffect(() => {
    startAtRef.current = startAt;
  }, [startAt]);

  function pushToast(messageText, type = 'info') {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message: messageText, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }

  function showMessage(text) {
    setMessage(text || '');
    setGameMessage(text || '');
  }

  function clearTimer() {
    window.clearInterval(timersRef.current.timer);
    timersRef.current.timer = null;
  }

  function drawCard() {
    if (!game || game.status !== 'playing' || game.currentPlayerId !== myId || rateLimited) return;
    setTurnsTaken((current) => current + 1);
    socketRef.current?.emit('draw_card');
  }

  function emitPlay(cardIndex, declaredColor) {
    if (!game || game.currentPlayerId !== myId || rateLimited) return;
    setCardsPlayed((current) => current + 1);
    setTurnsTaken((current) => current + 1);
    socketRef.current?.emit('play_card', { cardIndex, declaredColor });
  }

  function showReconnect() {
    reconnectingRef.current = true;
    setReconnecting(true);
    setReconnectState({
      title: 'Reconnecting...',
      text: 'Checking Redis for your saved game state.',
      chips: [],
      message: '',
    });
    setScreen(SCREEN.reconnect);

    window.clearTimeout(timersRef.current.reconnect);
    timersRef.current.reconnect = window.setTimeout(() => {
      reconnectingRef.current = false;
      setReconnecting(false);
      setReconnectState({
        title: 'Session expired',
        text: 'The saved room could not be restored.',
        chips: [],
        message: 'Try joining again.',
      });
      pushToast('The saved room could not be restored.', 'warn');
    }, 5000);
  }

  function successReconnect() {
    window.clearTimeout(timersRef.current.reconnect);
    reconnectingRef.current = false;
    setReconnecting(false);
    setReconnectState({
      title: 'Back in the game',
      text: 'Your room and hand were recovered from Redis.',
      chips: ['Room restored', 'Turn order intact', 'Discard pile restored', 'ELO preserved'],
      message: '',
    });
  }

  function playCard(index) {
    const card = game?.myHand?.[index];
    if (!card) return;
    if (card.color === 'wild') {
      setWildChoiceIndex(index);
      setWildModalOpen(true);
      return;
    }
    emitPlay(index, null);
  }

  function chooseColor(color) {
    setWildModalOpen(false);
    if (wildChoiceIndex === null) return;
    emitPlay(wildChoiceIndex, color);
    setWildChoiceIndex(null);
  }

  function joinRoom() {
    const name = form.name.trim() || 'Player';
    const nextRoomId = form.roomId.trim() || 'room1';
    setForm({ name, roomId: nextRoomId });
    setRoomId(nextRoomId);
    setRoomPlayers([]);
    setRoomStatus('waiting');
    setCanStart(false);
    setGame(null);
    setStartAt(null);
    setCardsPlayed(0);
    setTurnsTaken(0);
    setLastElo(null);
    setQueue({ visible: false, position: 0, message: '' });
    saveSession(name, nextRoomId);
    showMessage('');
    socketRef.current?.emit('join_room', {
      roomId: nextRoomId,
      playerName: name,
      clientId: clientId(),
    });
    setScreen(SCREEN.lobby);
  }

  function findMatch() {
    const name = form.name.trim() || 'Player';
    setForm((current) => ({ ...current, name }));
    setRoomId('');
    setRoomPlayers([]);
    setRoomStatus('waiting');
    setCanStart(false);
    setGame(null);
    setStartAt(null);
    setCardsPlayed(0);
    setTurnsTaken(0);
    setLastElo(null);
    setQueue({ visible: true, position: 0, message: 'Searching...' });
    saveSession(name, '');
    showMessage('');
    socketRef.current?.emit('find_match', { playerName: name, clientId: clientId() });
  }

  function startGame() {
    socketRef.current?.emit('start_game');
  }

  function backToLanding() {
    clearTimer();
    setGame(null);
    setRoomId('');
    setWildChoiceIndex(null);
    setWildModalOpen(false);
    setStartAt(null);
    setLastElo(null);
    setScreen(SCREEN.landing);
  }

  function playAgain() {
    clearSession();
    clearTimer();
    setGame(null);
    setRoomId('');
    setWildChoiceIndex(null);
    setWildModalOpen(false);
    setStartAt(null);
    setCardsPlayed(0);
    setTurnsTaken(0);
    setLastElo(null);
    setMessage('');
    setGameMessage('');
    setScreen(SCREEN.landing);
  }

  useEffect(() => {
    const socketInstance = io();
    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setConnected(true);
      setMyId(socketInstance.id);

      const saved = loadSession();
      if (saved) setForm({ name: saved.name || 'Player', roomId: saved.roomId || '' });

      if (saved?.roomId) {
        setRoomId(saved.roomId);
        showReconnect();
        socketInstance.emit('join_room', {
          roomId: saved.roomId,
          playerName: saved.name,
          clientId: clientId(),
        });
      } else {
        setScreen(SCREEN.landing);
      }
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      pushToast('Connection lost. Waiting for socket reconnect.', 'warn');
    });

    socketInstance.on('room_update', ({ players, canStart: nextCanStart, status }) => {
      setRoomPlayers(players || []);
      setCanStart(Boolean(nextCanStart));
      setRoomStatus(status || 'waiting');
      setScreen(SCREEN.lobby);
    });

    socketInstance.on('queue_update', ({ position, message: queueMessage }) => {
      setQueue({ visible: true, position: position || 0, message: queueMessage || 'Searching...' });
    });

    socketInstance.on('match_found', ({ roomId: nextRoomId, players }) => {
      setRoomId(nextRoomId);
      saveSession(formRef.current.name || 'Player', nextRoomId);
      setQueue((current) => ({ ...current, message: `Match found: ${(players || []).join(', ')}` }));
      pushToast('Match found. Loading the table...', 'success');
      setScreen(SCREEN.lobby);
    });

    socketInstance.on('reconnected', ({ message: reconnectMessage }) => {
      successReconnect();
      setReconnectState((current) => ({ ...current, message: reconnectMessage || 'Welcome back!' }));
      pushToast(reconnectMessage || 'Welcome back!', 'success');
    });

    socketInstance.on('state_update', (nextGame) => {
      setGame(nextGame);
      setRoomId((current) => current || formRef.current.roomId || 'room1');
      if (!startAtRef.current) {
        const now = Date.now();
        setStartAt(now);
        startAtRef.current = now;
      }
      if (reconnectingRef.current) successReconnect();
      if (nextGame?.status === 'playing') setScreen(SCREEN.game);
      else if (nextGame?.status === 'finished') setScreen(SCREEN.gameover);
    });

    socketInstance.on('invalid_move', (errorMessage) => {
      const text = `Invalid move: ${errorMessage || 'Move rejected'}`;
      showMessage(text);
      pushToast(text, 'error');
    });

    socketInstance.on('rate_limited', ({ event, retryAfter }) => {
      const seconds = retryAfter || 5;
      const text = `Slow down. ${event} is rate-limited. Try again in ${seconds}s.`;
      showMessage(text);
      pushToast(`Slow down. ${event} is rate limited.`, 'warn');
      setRateLimitedUntil(Date.now() + seconds * 1000);
      window.clearTimeout(timersRef.current.queue);
      timersRef.current.queue = window.setTimeout(() => setRateLimitedUntil(0), seconds * 1000);
    });

    socketInstance.on('elo_update', ({ oldRating, newRating, delta }) => {
      setLastElo({ oldRating, newRating, delta });
    });

    socketInstance.on('uno_called', ({ playerId, playerName }) => {
      const text =
        playerId === socketInstance.id
          ? 'UNO!'
          : `${playerName || 'A player'} called UNO!`;
      pushToast(text, 'success');
    });

    socketInstance.on('error', (error) => {
      const text = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
      showMessage(text);
      pushToast(text, 'error');
    });

    return () => {
      window.clearTimeout(timersRef.current.reconnect);
      window.clearTimeout(timersRef.current.queue);
      clearTimer();
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!game || game.status !== 'playing' || game.currentPlayerId !== myId) {
      setTimerSeconds(15);
      return;
    }

    setTimerSeconds(15);
    clearTimer();
    timersRef.current.timer = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          clearTimer();
          pushToast('Time up. Drawing a card...', 'warn');
          drawCard();
          return 15;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [game?.status, game?.currentPlayerId, myId]);

  useEffect(() => {
    if (game?.status === 'finished') {
      clearTimer();
      setScreen(SCREEN.gameover);
    }
  }, [game?.status]);

  return (
    <>
      <ToastLayer toasts={toasts} />
      <WildColorModal open={wildModalOpen} onChoose={chooseColor} />
      <div className="shell">
        {currentScreen === SCREEN.landing && (
          <LandingScreen
            form={form}
            connected={connected}
            queue={queue}
            message={message}
            onNameChange={(name) => setForm((current) => ({ ...current, name }))}
            onRoomChange={(roomIdValue) => setForm((current) => ({ ...current, roomId: roomIdValue }))}
            onJoinRoom={joinRoom}
            onFindMatch={findMatch}
          />
        )}
        {currentScreen === SCREEN.lobby && (
          <LobbyScreen
            roomId={roomId}
            roomPlayers={roomPlayers}
            roomStatus={roomStatus}
            connected={connected}
            message={message}
            canStart={canStart}
            onStartGame={startGame}
            onBack={backToLanding}
          />
        )}
        {currentScreen === SCREEN.reconnect && (
          <ReconnectScreen
            title={reconnectState.title}
            text={reconnectState.text}
            chips={reconnectState.chips}
            message={reconnectState.message}
          />
        )}
        {currentScreen === SCREEN.game && (
          <GameScreen
            connected={connected}
            game={game}
            myId={myId}
            isMyTurn={isMyTurn}
            rateLimited={rateLimited}
            discardTop={discardTop}
            myHand={myHand}
            boardPlayers={boardPlayers}
            playerCount={playerCount}
            openSeats={openSeats}
            currentPlayer={currentPlayer}
            timerSeconds={timerSeconds}
            gameMessage={gameMessage}
            onDrawCard={drawCard}
            onPlayCard={playCard}
            onBack={backToLanding}
            onUno={() => socketRef.current?.emit('game:uno')}
          />
        )}
        {currentScreen === SCREEN.gameover && (
          <GameOverScreen
            winnerName={winnerName}
            formName={form.name}
            lastElo={lastElo}
            cardsPlayed={cardsPlayed}
            turnsTaken={turnsTaken}
            elapsedSeconds={elapsedSeconds}
            onPlayAgain={playAgain}
            onBack={backToLanding}
          />
        )}
      </div>
    </>
  );
}
