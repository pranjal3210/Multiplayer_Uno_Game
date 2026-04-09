const logger = require('../server/logger');

class BotPlayer {
  constructor(roomId, engine) {
    this.botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = 'UNO Bot';
    this.roomId = roomId;
    this.engine = engine;
    this.thinkDelay = 1500;
  }

  async takeTurn() {
    await this._delay(this.thinkDelay);

    const state = this.engine.state;
    if (state.currentPlayer?.id !== this.botId || state.status !== 'playing') {
      return { acted: false };
    }

    const player = state.players.find((entry) => entry.id === this.botId);
    if (!player) {
      return { acted: false };
    }

    const topCard = state.topCard;
    const effectiveColor = state.declaredColor || topCard.color;
    const cardIndex = this._chooseCard(player.hand, topCard, effectiveColor);

    if (cardIndex !== -1) {
      const card = player.hand[cardIndex];
      const declaredColor = card.isWild() ? this._mostCommonColor(player.hand) : null;
      const result = this.engine.playCard(this.botId, cardIndex, declaredColor);

      if (result.success) {
        logger.debug('Bot', `Bot played ${card.toString()}`);
        return { acted: true, move: 'play' };
      }
      return { acted: false };
    }

    const drawResult = this.engine.drawCard(this.botId);
    if (drawResult.success) {
      logger.debug('Bot', 'Bot drew a card');
      return { acted: true, move: 'draw' };
    }

    return { acted: false };
  }

  _chooseCard(hand, topCard, effectiveColor) {
    for (let i = 0; i < hand.length; i += 1) {
      const card = hand[i];
      if (!card.isWild() && card.color === effectiveColor) {
        return i;
      }
    }

    for (let i = 0; i < hand.length; i += 1) {
      const card = hand[i];
      if (!card.isWild() && card.value === topCard.value) {
        return i;
      }
    }

    for (let i = 0; i < hand.length; i += 1) {
      if (hand[i].isWild()) {
        return i;
      }
    }

    return -1;
  }

  _mostCommonColor(hand) {
    const counts = { red: 0, yellow: 0, green: 0, blue: 0 };

    for (const card of hand) {
      if (!card.isWild() && counts[card.color] !== undefined) {
        counts[card.color] += 1;
      }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'red';
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { BotPlayer };
