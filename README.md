# UNO Multiplayer

Realtime UNO built with a Node/Express + Socket.IO server and a React/Vite client.

The app supports:
- Direct room join
- Matchmaking queue
- Bot-filled tables
- Reconnect flow
- Rate-limited actions
- ELO updates
- Persistent game state when Redis is enabled

## Tech Stack

- React 19
- Vite
- Socket.IO
- Express
- Node.js
- Redis via `ioredis`
- Jest for tests

## Project Structure

```text
uno-game/
  src/
    client/
      index.html
      src/
        App.jsx
        main.jsx
        styles.css
        components/
        screens/
        utils/
    engine/
    matchmaking/
    ratings/
    server/
  tests/
```

## Requirements

- Node.js 18+ recommended
- Redis optional, but recommended if you want persistence across restarts

If Redis is not configured, the app falls back to an in-memory store for the current process only.

## Setup

From the `uno-game` folder:

```bash
npm install
```

## Run The App

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

`npm start` runs the Vite build first, then starts the Express server.

Open the app at:

- `http://localhost:3000` for the server
- `http://localhost:5173` if you are using Vite dev mode

## Optional Redis Setup

The app uses Redis automatically when one of these is set:

- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_ENABLE=true`

Example:

```bash
set REDIS_URL=redis://localhost:6379
npm start
```

On PowerShell:

```powershell
$env:REDIS_URL="redis://localhost:6379"
npm start
```

If Redis is not enabled, the app still runs, but room state and ratings reset when the server restarts.

## Available Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - build the React client into `src/client/dist`
- `npm start` - build the client and launch the Express/Socket.IO server
- `npm test` - run Jest tests

## Features

### Landing and Lobby

- Join a room by name and room ID
- Find a match through the queue
- See connected players and room state

### Game Table

- Play matching cards
- Draw cards
- Choose a color after wild cards
- Call UNO
- See turn direction, discard pile, and draw pile count

### Reconnect Flow

- Rejoin a room after reconnecting
- Restore the previous state when persistence is available

### Ratings

- ELO updates are applied after a finished match
- The leaderboard is exposed through an HTTP endpoint

## HTTP Endpoints

### `GET /leaderboard`

Returns the top 10 ELO entries.

There is no `/health` endpoint in the current server.

## Socket Events

### Client to Server

- `find_match` - join matchmaking
- `join_room` - join a specific room
- `start_game` - start a room when enough players are present
- `play_card` - play a card by index
- `draw_card` - draw from the pile
- `game:uno` - call UNO

### Server to Client

- `queue_update` - matchmaking queue status
- `match_found` - match has been created
- `room_update` - lobby state update
- `state_update` - filtered game state for the current player
- `reconnected` - reconnect succeeded
- `invalid_move` - rejected action
- `rate_limited` - action was rate-limited
- `elo_update` - rating change after a game
- `uno_called` - someone called UNO

## Game Flow

1. Open the app.
2. Enter a name.
3. Join a room or use matchmaking.
4. Start the game once enough players are present.
5. Play cards, draw cards, or call UNO.
6. When a round ends, ELO updates are sent automatically.

## Testing

```bash
npm test
```

## Notes

- The client is a React app bundled by Vite.
- The Express server serves the built client in production.
- The UI is split into screen and component modules under `src/client/src`.
- The engine logic stays in `src/engine` and is separate from the UI.

