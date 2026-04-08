const { Deck } = require('../src/engine/Deck');

test('deck has 108 cards', () => {
  const deck = new Deck();
  expect(deck.size).toBe(108);
});

test('shuffle keeps 108 cards', () => {
  const deck = new Deck().shuffle();
  expect(deck.size).toBe(108);
});

test('draw removes cards from deck', () => {
  const deck = new Deck();
  const drawn = deck.draw(7);
  expect(drawn.length).toBe(7);
  expect(deck.size).toBe(101);
});
