const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { UnoEngine } = require('../engine/UnoEngine');
const { saveState, loadState } = require('./gameStore');
const { enqueue, dequeue, tryMatch, getQueueLength } = require('../matchmaking/queue');
const { BotPlayer } = require('../matchmaking/botPlayer');
const { updateRatingsMultiplayer } = require('../ratings/elo');
const {
  getLeaderboard,
  getMultipleRatings,
  setRating,
  updateLeaderboard,
} = require('../ratings/ratingStore');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(express.static('src/client'));

app.get('/leaderboard', async (req, res) => {
  try {
    const board = await getLeaderboard(10);
    res.json(board);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Unable to load leaderboard' });
  }
});

const rooms = new Map();
const socketMeta = new Map();

function safeString(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function createRoom(roomId, mode = 'manual', engine = null) {
  const nextRoom = {
    roomId,
    mode,
    engine: engine || new UnoEngine(),
    bots: [],
    botTurnRunning: false,
    gameOverHandled: false,
  };

  rooms.set(roomId, nextRoom);
  return nextRoom;
}

function hydrateBots(room) {
  room.bots = room.engine.state.players
    .filter((player) => player.id.startsWith('bot_'))
    .map((player) => {
      const bot = new BotPlayer(room.roomId, room.engine);
      bot.botId = player.id;
      bot.name = player.name;
      return bot;
    });
}

async function getOrCreateRoom(roomId, mode = 'manual') {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const savedState = await loadState(roomId);
  if (savedState) {
    const room = createRoom(
      roomId,
      savedState.players?.some((player) => player.id.startsWith('bot_')) ? 'match' : mode,
      UnoEngine.fromJSON(savedState)
    );
    room.gameOverHandled = room.engine.state.status === 'finished';
    hydrateBots(room);
    return room;
  }

  return createRoom(roomId, mode);
}

async function persistRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  await saveState(roomId, room.engine.toJSON());
}

function getVisiblePlayers(room) {
  return room.engine.state.players.map((player) => ({
    id: player.id,
    name: player.name,
  }));
}

function getHumanPlayers(room) {
  return room.engine.state.players.filter((player) => !player.id.startsWith('bot_'));
}

function clearBotTimer(room) {
  if (room.botTimer) {
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }
}

async function handleGameOver(roomId, engineJSON) {
  const engine = UnoEngine.fromJSON(engineJSON);
  const humanPlayers = engine.state.players.filter((player) => !player.id.startsWith('bot_'));

  if (humanPlayers.length === 0) {
    return;
  }

  const ratingsByName = await getMultipleRatings(humanPlayers.map((player) => player.name));
  const playersForElo = humanPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    rating: ratingsByName[player.name],
    isWinner: player.id === engine.state.winner,
  }));

  const results = updateRatingsMultiplayer(playersForElo);

  for (const player of humanPlayers) {
    const result = results[player.id];
    if (!result) {
      continue;
    }

    await setRating(player.name, result.newRating);
    await updateLeaderboard(player.name, result.newRating);

    io.to(player.id).emit('elo_update', {
      oldRating: result.oldRating,
      newRating: result.newRating,
      delta: result.delta,
      isWinner: player.id === engine.state.winner,
    });
  }

  console.log(`Game over in ${roomId}. ELO updated.`);
}

async function scheduleBotTurn(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.engine.state.status !== 'playing') {
    return;
  }

  const currentPlayer = room.engine.state.currentPlayer;
  if (!currentPlayer || !currentPlayer.id.startsWith('bot_')) {
    clearBotTimer(room);
    return;
  }

  if (room.botTurnRunning) {
    return;
  }

  const bot = room.bots.find((entry) => entry.botId === currentPlayer.id);
  if (!bot) {
    return;
  }

  clearBotTimer(room);
  room.botTurnRunning = true;

  try {
    const result = await bot.takeTurn();
    room.botTurnRunning = false;

    if (result.acted) {
      await broadcastState(roomId);
    }
  } catch (error) {
    room.botTurnRunning = false;
    console.error(`Bot turn failed for ${roomId}:`, error);
  }
}

async function broadcastRoomUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  io.to(roomId).emit('room_update', {
    players: getVisiblePlayers(room),
    canStart: room.engine.state.players.length >= 2 && room.engine.state.status === 'waiting',
    status: room.engine.state.status,
  });

  await persistRoom(roomId);
}

async function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const engine = room.engine;
  const engineJSON = engine.toJSON();

  await persistRoom(roomId);

  if (engine.state.status === 'finished' && !room.gameOverHandled) {
    room.gameOverHandled = true;
    await handleGameOver(roomId, engineJSON);
  }

  for (const player of getHumanPlayers(room)) {
    io.to(player.id).emit('state_update', engine.getStateFor(player.id));
  }

  if (engine.state.status === 'playing') {
    await scheduleBotTurn(roomId);
  }
}

async function addOrReconnectPlayer(room, socket, playerName) {
  const existingPlayer = room.engine.state.players.find((player) => player.name === playerName);

  if (existingPlayer) {
    existingPlayer.id = socket.id;
    return { reconnected: true };
  }

  if (room.engine.state.status !== 'waiting') {
    throw new Error('Game already in progress');
  }

  room.engine.addPlayer(socket.id, playerName);
  return { reconnected: false };
}

async function startMatchFromQueue(ioInstance, match) {
  const { roomId, players } = match;
  const room = createRoom(roomId, 'match');

  for (const player of players) {
    room.engine.addPlayer(player.socketId, player.playerName);
  }

  const botsNeeded = Math.max(0, 4 - players.length);
  for (let i = 0; i < botsNeeded; i += 1) {
    const bot = new BotPlayer(roomId, room.engine);
    room.engine.addPlayer(bot.botId, bot.name);
    room.bots.push(bot);
  }

  room.engine.startGame();
  await persistRoom(roomId);

  for (const player of players) {
    const playerSocket = ioInstance.sockets.sockets.get(player.socketId);
    if (!playerSocket) {
      continue;
    }

    socketMeta.set(player.socketId, {
      name: player.playerName,
      roomId,
      mode: 'match',
    });
    playerSocket.join(roomId);
    playerSocket.emit('match_found', {
      roomId,
      players: players.map((entry) => entry.playerName),
    });
  }

  await broadcastState(roomId);
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('join_room', async ({ roomId, playerName }) => {
    const safeRoomId = safeString(roomId, 'room1');
    const safeName = safeString(playerName, 'Player');

    try {
      const room = await getOrCreateRoom(safeRoomId, 'manual');
      const result = await addOrReconnectPlayer(room, socket, safeName);

      socketMeta.set(socket.id, {
        name: safeName,
        roomId: safeRoomId,
        mode: 'manual',
      });

      socket.join(safeRoomId);
      await broadcastRoomUpdate(safeRoomId);

      if (result.reconnected && room.engine.state.status === 'playing') {
        socket.emit('reconnected', { message: 'Welcome back!' });
        socket.emit('state_update', room.engine.getStateFor(socket.id));
        await scheduleBotTurn(safeRoomId);
        return;
      }

      if (room.engine.state.status === 'playing') {
        socket.emit('state_update', room.engine.getStateFor(socket.id));
        await scheduleBotTurn(safeRoomId);
      }
    } catch (error) {
      console.error(error);
      socket.emit('error', error.message);
    }
  });

  socket.on('find_match', async ({ playerName }) => {
    const safeName = safeString(playerName, 'Player');

    try {
      socketMeta.set(socket.id, {
        name: safeName,
        roomId: null,
        mode: 'queue',
      });

      await enqueue(socket.id, safeName);

      const queueLength = await getQueueLength();
      socket.emit('queue_update', {
        position: queueLength,
        message: 'Opponent dhundh rahe hain...',
      });

      const match = await tryMatch();
      if (!match) {
        return;
      }

      await startMatchFromQueue(io, match);
    } catch (error) {
      console.error(error);
      socket.emit('error', error.message);
    }
  });

  socket.on('start_game', async () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.roomId) {
      return;
    }

    try {
      const room = await getOrCreateRoom(meta.roomId, meta.mode || 'manual');
      if (room.engine.state.status !== 'waiting') {
        return;
      }

      room.engine.startGame();
      room.gameOverHandled = false;
      await broadcastState(meta.roomId);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('play_card', async ({ cardIndex, declaredColor }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.roomId) {
      return;
    }

    try {
      const room = await getOrCreateRoom(meta.roomId, meta.mode || 'manual');
      const result = room.engine.playCard(socket.id, cardIndex, declaredColor);

      if (!result.success) {
        socket.emit('invalid_move', result.error);
        return;
      }

      await broadcastState(meta.roomId);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('draw_card', async () => {
    const meta = socketMeta.get(socket.id);
    if (!meta?.roomId) {
      return;
    }

    try {
      const room = await getOrCreateRoom(meta.roomId, meta.mode || 'manual');
      const result = room.engine.drawCard(socket.id);

      if (!result.success) {
        socket.emit('invalid_move', result.error);
        return;
      }

      await broadcastState(meta.roomId);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', async () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) {
      return;
    }

    console.log(`disconnected: ${socket.id}`);

    if (meta.mode === 'queue') {
      await dequeue(socket.id);
      socketMeta.delete(socket.id);
      return;
    }

    if (meta.roomId) {
      const room = rooms.get(meta.roomId);
      if (room) {
        room.engine.removePlayer(socket.id);
        socketMeta.delete(socket.id);

        if (getHumanPlayers(room).length === 0) {
          clearBotTimer(room);
          rooms.delete(meta.roomId);
          return;
        }

        await broadcastRoomUpdate(meta.roomId);

        if (room.engine.state.status === 'playing' || room.engine.state.status === 'finished') {
          await broadcastState(meta.roomId);
        }
      } else {
        socketMeta.delete(socket.id);
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server ready: http://localhost:3000');
});
