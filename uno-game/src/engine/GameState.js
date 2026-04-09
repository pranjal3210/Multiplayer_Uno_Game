class GameState {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.discardPile = [];
    this.drawPile = [];
    this.declaredColor = null;
    this.status = 'waiting';
    this.winner = null;
  }

  get topCard() {
    return this.discardPile[this.discardPile.length - 1];
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn(skip = false) {
    if (this.players.length === 0) {
      return;
    }

    const step = skip ? 2 : 1;
    this.currentPlayerIndex =
      (this.currentPlayerIndex + step * this.direction + this.players.length * 2) %
      this.players.length;
  }

  reverseDirection() {
    this.direction *= -1;
  }
}

module.exports = { GameState };
