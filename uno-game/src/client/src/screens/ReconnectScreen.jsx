import React from 'react';

export default function ReconnectScreen({ title, text, chips, message }) {
  return (
    <section className="screen screen-reconnect">
      <div className="container" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div className="reconnect-card glass">
          <div className="spinner" />
          <div className="reconnect-title">{title}</div>
          <div className="reconnect-text">{text}</div>
          {!!chips?.length && (
            <div className="chip-grid">
              {chips.map((chip) => (
                <div key={chip} className="chip">
                  {chip}
                </div>
              ))}
            </div>
          )}
          <div className="message">{message}</div>
        </div>
      </div>
    </section>
  );
}
