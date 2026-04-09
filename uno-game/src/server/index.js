const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { UnoEngine } = require('../engine/UnoEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const rooms = {};

app.use(express.static('src/client'));

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('join_room', ({ roomId, playerName }) => {
    const safeRoomId = String(roomId || '').trim() || 'room1';
    const safeName = String(playerName || '').trim() || 'Player';

    if (!rooms[safeRoomId]) {
      rooms[safeRoomId] = new UnoEngine();
    }

    const engine = rooms[safeRoomId];

    try {
      engine.addPlayer(socket.id, safeName);
      socket.join(safeRoomId);
      socket.data.roomId = safeRoomId;

      broadcastRoomUpdate(engine, safeRoomId);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('start_game', () => {
    const roomId = socket.data.roomId;
    const engine = rooms[roomId];
    if (!engine) {
      return;
    }

    try {
      engine.startGame();
      broadcastState(engine);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  socket.on('play_card', ({ cardIndex, declaredColor }) => {
    const roomId = socket.data.roomId;
    const engine = rooms[roomId];
    if (!engine) {
      return;
    }

    const result = engine.playCard(socket.id, cardIndex, declaredColor);
    if (!result.success) {
      socket.emit('invalid_move', result.error);
      return;
    }

    broadcastState(engine);
  });

  socket.on('draw_card', () => {
    const roomId = socket.data.roomId;
    const engine = rooms[roomId];
    if (!engine) {
      return;
    }

    const result = engine.drawCard(socket.id);
    if (!result.success) {
      socket.emit('invalid_move', result.error);
      return;
    }

    broadcastState(engine);
  });

  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);

    const roomId = socket.data.roomId;
    const engine = rooms[roomId];
    if (!engine) {
      return;
    }

    engine.removePlayer(socket.id);

    if (engine.state.players.length === 0) {
      delete rooms[roomId];
      return;
    }

    broadcastRoomUpdate(engine, roomId);
    if (engine.state.status === 'playing' || engine.state.status === 'finished') {
      broadcastState(engine);
    }
  });
});

function broadcastRoomUpdate(engine, roomId) {
  io.to(roomId).emit('room_update', {
    players: engine.state.players.map((player) => ({
      id: player.id,
      name: player.name,
    })),
    canStart: engine.state.players.length >= 2 && engine.state.status === 'waiting',
  });
}

function broadcastState(engine) {
  for (const player of engine.state.players) {
    io.to(player.id).emit('state_update', engine.getStateFor(player.id));
  }
}

server.listen(3000, () => {
  console.log('Server ready: http://localhost:3000');
});
