import React from 'react';
import { cardClass, cardLabel } from '../utils/uno';

export default function CardView({ card, playable, disabled, onClick }) {
  const label = cardLabel(card);
  const classes = ['card', cardClass(card)];
  if (playable) classes.push('playable');
  if (disabled) classes.push('disabled');

  return (
    <div className={classes.join(' ')} onClick={playable ? onClick : undefined}>
      <div className="corner tl">{label}</div>
      <div className={`card-value${label.length > 3 ? ' small' : ''}`}>{label}</div>
      <div className="corner br">{label}</div>
    </div>
  );
}
