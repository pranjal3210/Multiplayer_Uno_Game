import React from 'react';

const COLORS = ['red', 'green', 'blue', 'yellow'];
const COLOR_LABELS = { red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow' };

export default function WildColorModal({ open, onChoose }) {
  return (
    <div className="wild-modal" aria-hidden={!open}>
      <div className="wild-card glass">
        <div className="wild-title">Choose a color</div>
        <div className="wild-sub">
          You played a wild card. Pick the color that should stay active for the next turn.
        </div>
        <div className="color-grid">
          {COLORS.map((color) => (
            <button key={color} className={`color-choice ${color}`} onClick={() => onChoose(color)} type="button">
              {COLOR_LABELS[color]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
