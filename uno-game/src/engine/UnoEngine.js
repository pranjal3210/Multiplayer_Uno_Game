const { Deck } = require('./Deck');
const { GameState } = require('./GameState');
const { Player } = require('./Player');

function shuffleCards(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

class UnoEngine {
  constructor() {
    this.state = new GameState();
  }

  toJSON() {
    return {
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        hand: player.hand.map((card) => ({
          color: card.color,
          value: card.value,
        })),
      })),
      currentPlayerIndex: this.state.currentPlayerIndex,
      direction: this.state.direction,
      discardPile: this.state.discardPile.map((card) => ({
        color: card.color,
        value: card.value,
      })),
      drawPile: this.state.drawPile.map((card) => ({
        color: card.color,
        value: card.value,
      })),
      declaredColor: this.state.declaredColor,
      status: this.state.status,
      winner: this.state.winner,
    };
  }

  static fromJSON(data) {
    const { Card } = require('./Card');
    const { Player } = require('./Player');

    const engine = new UnoEngine();
    const nextState = engine.state;

    nextState.players = (data.players || []).map((playerData) => {
      const player = new Player(playerData.id, playerData.name);
      player.hand = (playerData.hand || []).map(
        (cardData) => new Card(cardData.color, cardData.value)
      );
      return player;
    });

    nextState.currentPlayerIndex = data.currentPlayerIndex ?? 0;
    nextState.direction = data.direction ?? 1;
    nextState.discardPile = (data.discardPile || []).map(
      (cardData) => new Card(cardData.color, cardData.value)
    );
    nextState.drawPile = (data.drawPile || []).map(
      (cardData) => new Card(cardData.color, cardData.value)
    );
    nextState.declaredColor = data.declaredColor ?? null;
    nextState.status = data.status || 'waiting';
    nextState.winner = data.winner ?? null;

    return engine;
  }

  addPlayer(id, name) {
    if (this.state.status !== 'waiting') {
      throw new Error('Game already started');
    }

    if (this.state.players.length >= 4) {
      throw new Error('Room full');
    }

    if (this.state.players.some((player) => player.id === id)) {
      throw new Error('Player already joined');
    }

    this.state.players.push(new Player(id, name));
  }

  removePlayer(playerId) {
    const index = this.state.players.findIndex((player) => player.id === playerId);
    if (index === -1) {
      return false;
    }

    this.state.players.splice(index, 1);

    if (this.state.players.length === 0) {
      this.state = new GameState();
      return true;
    }

    if (this.state.status === 'finished') {
      if (this.state.winner === playerId) {
        this.state.winner = null;
      }
      return true;
    }

    if (this.state.players.length < 2) {
      this.state.status = 'waiting';
      this.state.currentPlayerIndex = 0;
      this.state.direction = 1;
      this.state.declaredColor = null;
      this.state.winner = null;
      return true;
    }

    if (index < this.state.currentPlayerIndex) {
      this.state.currentPlayerIndex -= 1;
    } else if (index === this.state.currentPlayerIndex) {
      this.state.currentPlayerIndex %= this.state.players.length;
    }

    return true;
  }

  startGame() {
    if (this.state.players.length < 2) {
      throw new Error('Need at least 2 players');
    }

    this.initializeRound(this.state.players);
  }

  initializeRound(players) {
    const nextState = new GameState();
    nextState.players = players;
    nextState.status = 'playing';

    const deck = new Deck().shuffle();
    nextState.drawPile = deck.cards;

    for (const player of nextState.players) {
      player.hand = [];
      player.addCards(nextState.drawPile.splice(0, 7));
    }

    let firstCard = nextState.drawPile.shift();
    while (firstCard && firstCard.isWild()) {
      nextState.drawPile.push(firstCard);
      shuffleCards(nextState.drawPile);
      firstCard = nextState.drawPile.shift();
    }

    if (!firstCard) {
      throw new Error('Unable to start game');
    }

    nextState.discardPile.push(firstCard);
    this.state = nextState;
  }

  ensureDrawPile() {
    if (this.state.drawPile.length > 0) {
      return;
    }

    if (this.state.discardPile.length <= 1) {
      return;
    }

    const topCard = this.state.discardPile.pop();
    const recycled = [...this.state.discardPile];
    this.state.discardPile = [topCard];
    this.state.drawPile = shuffleCards(recycled);
  }

  playCard(playerId, cardIndex, declaredColor = null) {
    const state = this.state;

    if (state.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    const player = state.players.find((entry) => entry.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (state.currentPlayer?.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const card = player.hand[cardIndex];
    if (!card) {
      return { success: false, error: 'Card not found' };
    }

    if (!card.canPlayOn(state.topCard, state.declaredColor)) {
      return { success: false, error: 'Invalid move' };
    }

    if (card.isWild() && !['red', 'yellow', 'green', 'blue'].includes(declaredColor)) {
      return { success: false, error: 'Must declare color for wild' };
    }

    player.removeCard(cardIndex);
    state.discardPile.push(card);
    state.declaredColor = card.isWild() ? declaredColor : null;
    const events = [];

    if (player.hand.length === 0) {
      state.status = 'finished';
      state.winner = player.id;
      return { success: true, events: ['game_over'] };
    }

    if (card.value === 'skip') {
      state.nextTurn(true);
      events.push('skip');
    } else if (card.value === 'reverse') {
      state.reverseDirection();
      if (state.players.length === 2) {
        state.nextTurn(true);
      } else {
        state.nextTurn();
      }
      events.push('reverse');
    } else if (card.value === 'draw2') {
      state.nextTurn();
      const nextPlayer = state.currentPlayer;
      this.ensureDrawPile();
      const drawn = state.drawPile.splice(0, 2);
      nextPlayer.addCards(drawn);
      state.nextTurn();
      events.push('draw2');
    } else if (card.value === 'wild_draw4') {
      state.nextTurn();
      const nextPlayer = state.currentPlayer;
      this.ensureDrawPile();
      const drawn = state.drawPile.splice(0, 4);
      nextPlayer.addCards(drawn);
      state.nextTurn();
      state.declaredColor = declaredColor;
      events.push('wild_draw4');
    } else {
      state.nextTurn();
    }

    return { success: true, events };
  }

  drawCard(playerId) {
    const state = this.state;

    if (state.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    if (state.currentPlayer?.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const player = state.players.find((entry) => entry.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    this.ensureDrawPile();
    if (state.drawPile.length === 0) {
      return { success: false, error: 'Draw pile empty' };
    }

    const card = state.drawPile.shift();
    player.addCards([card]);
    state.nextTurn();

    return { success: true, card };
  }

  getStateFor(playerId) {
    const state = this.state;
    const me = state.players.find((player) => player.id === playerId);

    return {
      status: state.status,
      topCard: state.topCard || null,
      declaredColor: state.declaredColor,
      currentPlayerId: state.currentPlayer ? state.currentPlayer.id : null,
      winner: state.winner,
      myHand: me ? me.hand : [],
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        cardCount: player.handCount(),
        isCurrentTurn: state.currentPlayer ? state.currentPlayer.id === player.id : false,
      })),
    };
  }
}

module.exports = { UnoEngine };
