export function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function cardLabel(card) {
  return (
    {
      skip: 'SKIP',
      reverse: 'REV',
      draw2: '+2',
      wild: 'WILD',
      wild_draw4: '+4',
    }[card?.value] || card?.value || ''
  );
}

export function cardClass(card) {
  return `color-${card?.color || 'wild'}`;
}

export function canPlay(card, top, declared) {
  if (!card || !top) return true;
  if (card.color === 'wild') return true;
  const color = declared || top.color;
  return card.color === color || card.value === top.value;
}
