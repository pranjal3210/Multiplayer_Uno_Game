import React, { useState } from 'react';

export default function Login({ message, onSubmit, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <section className="screen screen-landing">
      <div className="container auth-layout">
        <div>
          <div className="badge">
            <span className="dot" />
            Account required
          </div>
          <h1 className="title">UNO Multiplayer</h1>
          <p className="subtitle">
            Sign in to keep your username, reconnect state, and ELO rating tied to your account.
          </p>
        </div>

        <form className="panel glass auth-panel" onSubmit={submit}>
          <div className="hand-title">Login</div>
          <div className="field">
            <label htmlFor="loginEmail">Email</label>
            <input
              id="loginEmail"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="loginPassword">Password</label>
            <input
              id="loginPassword"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Login
          </button>
          <button className="btn btn-secondary" type="button" onClick={onSwitch}>
            Create Account
          </button>
          <div className="message">{message}</div>
        </form>
      </div>
    </section>
  );
}
