const { Card, COLORS, VALUES, WILD_TYPES } = require('./Card');

class Deck {
  constructor() {
    this.cards = [];
    this._build();
  }

  _build() {
    for (const color of COLORS) {
      this.cards.push(new Card(color, '0'));
      for (const value of VALUES.slice(1)) {
        this.cards.push(new Card(color, value));
        this.cards.push(new Card(color, value));
      }
    }

    for (const type of WILD_TYPES) {
      for (let i = 0; i < 4; i++) {
        this.cards.push(new Card('wild', type));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  draw(n = 1) {
    if (this.cards.length < n) {
      throw new Error('Deck empty!');
    }
    return this.cards.splice(0, n);
  }

  get size() {
    return this.cards.length;
  }
}

module.exports = { Deck };
