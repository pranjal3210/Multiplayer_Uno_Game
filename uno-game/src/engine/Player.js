class Player {
  constructor(id, name, clientId = null) {
    this.id = id;
    this.name = name;
    this.clientId = clientId;
    this.hand = [];
  }

  addCards(cards) {
    this.hand.push(...cards);
  }

  removeCard(cardIndex) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) {
      throw new Error('Invalid card index');
    }

    return this.hand.splice(cardIndex, 1)[0];
  }

  handCount() {
    return this.hand.length;
  }
}

module.exports = { Player };
