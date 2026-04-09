const { UnoEngine } = require('../src/engine/UnoEngine');
const { Card } = require('../src/engine/Card');

test('startGame deals 7 cards to each player and starts play', () => {
  const engine = new UnoEngine();
  engine.addPlayer('p1', 'A');
  engine.addPlayer('p2', 'B');

  engine.startGame();

  expect(engine.state.status).toBe('playing');
  expect(engine.state.players[0].hand).toHaveLength(7);
  expect(engine.state.players[1].hand).toHaveLength(7);
  expect(engine.state.topCard.isWild()).toBe(false);
});

test('getStateFor hides opponent cards', () => {
  const engine = new UnoEngine();
  engine.state.players = [
    { id: 'p1', name: 'A', hand: [new Card('red', '1')], handCount: () => 1 },
    { id: 'p2', name: 'B', hand: [new Card('blue', '2'), new Card('green', '3')], handCount: () => 2 },
  ];
  engine.state.currentPlayerIndex = 0;

  const state = engine.getStateFor('p1');

  expect(state.myHand).toHaveLength(1);
  expect(state.players).toEqual([
    { id: 'p1', name: 'A', cardCount: 1, isCurrentTurn: true },
    { id: 'p2', name: 'B', cardCount: 2, isCurrentTurn: false },
  ]);
});

test('drawCard adds one card and advances the turn', () => {
  const engine = new UnoEngine();
  engine.addPlayer('p1', 'A');
  engine.addPlayer('p2', 'B');
  engine.startGame();

  const before = engine.state.players[0].hand.length;
  const currentPlayerId = engine.state.currentPlayer.id;
  const result = engine.drawCard(currentPlayerId);

  expect(result.success).toBe(true);
  expect(engine.state.players[0].hand.length).toBe(before + 1);
  expect(engine.state.currentPlayer.id).toBe('p2');
});

test('wild keeps declared color for the next player', () => {
  const engine = new UnoEngine();
  engine.addPlayer('p1', 'A');
  engine.addPlayer('p2', 'B');

  engine.state.status = 'playing';
  engine.state.players[0].hand = [new Card('wild', 'wild'), new Card('red', '2')];
  engine.state.players[1].hand = [new Card('blue', '3')];
  engine.state.discardPile = [new Card('red', '5')];
  engine.state.drawPile = [new Card('yellow', '9')];
  engine.state.currentPlayerIndex = 0;

  const result = engine.playCard('p1', 1, 'blue');

  expect(result.success).toBe(true);
  expect(engine.state.declaredColor).toBe('blue');
  expect(engine.state.currentPlayer.id).toBe('p2');
});

test('playing the last wild card ends the game and keeps declared color', () => {
  const engine = new UnoEngine();
  engine.addPlayer('p1', 'A');
  engine.addPlayer('p2', 'B');

  engine.state.status = 'playing';
  engine.state.players[0].hand = [new Card('wild', 'wild')];
  engine.state.players[1].hand = [new Card('blue', '3')];
  engine.state.discardPile = [new Card('red', '5')];
  engine.state.drawPile = [new Card('yellow', '9')];
  engine.state.currentPlayerIndex = 0;

  const result = engine.playCard('p1', 0, 'blue');

  expect(result.success).toBe(true);
  expect(engine.state.status).toBe('finished');
  expect(engine.state.winner).toBe('p1');
  expect(engine.state.declaredColor).toBe('blue');
});

test('toJSON and fromJSON round-trip engine state', () => {
  const engine = new UnoEngine();
  engine.addPlayer('p1', 'A');
  engine.addPlayer('p2', 'B');

  engine.state.status = 'playing';
  engine.state.currentPlayerIndex = 1;
  engine.state.direction = -1;
  engine.state.declaredColor = 'green';
  engine.state.discardPile = [new Card('red', '4')];
  engine.state.drawPile = [new Card('yellow', '8')];
  engine.state.players[0].hand = [new Card('blue', '1')];
  engine.state.players[1].hand = [new Card('wild', 'wild')];

  const serialized = engine.toJSON();
  const restored = UnoEngine.fromJSON(serialized);

  expect(restored.state.status).toBe('playing');
  expect(restored.state.currentPlayerIndex).toBe(1);
  expect(restored.state.direction).toBe(-1);
  expect(restored.state.declaredColor).toBe('green');
  expect(restored.state.discardPile[0]).toBeInstanceOf(Card);
  expect(restored.state.players[1].hand[0]).toBeInstanceOf(Card);
  expect(restored.state.players[0].hand[0].color).toBe('blue');
});
