const COLORS = ['red', 'yellow', 'green', 'blue'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_TYPES = ['wild', 'wild_draw4'];

class Card {
  constructor(color, value) {
    this.color = color;
    this.value = value;
  }

  isWild() {
    return this.color === 'wild';
  }

  canPlayOn(topCard, declaredColor = null) {
    if (this.isWild()) return true;
    if (this.color === (declaredColor || topCard.color)) return true;
    if (this.value === topCard.value) return true;
    return false;
  }

  toString() {
    return `${this.color}-${this.value}`;
  }
}

module.exports = { Card, COLORS, VALUES, WILD_TYPES };
