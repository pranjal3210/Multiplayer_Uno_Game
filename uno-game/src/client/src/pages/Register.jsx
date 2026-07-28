import React, { useState } from 'react';

export default function Register({ message, onSubmit, onSwitch }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onSubmit({ username, email, password });
  }

  return (
    <section className="screen screen-landing">
      <div className="container auth-layout">
        <div>
          <div className="badge">
            <span className="dot" />
            Start at 1200 ELO
          </div>
          <h1 className="title">Create Account</h1>
          <p className="subtitle">
            Your profile stores your username, email, and rating so multiplayer games no longer
            depend on guest names.
          </p>
        </div>

        <form className="panel glass auth-panel" onSubmit={submit}>
          <div className="hand-title">Register</div>
          <div className="field">
            <label htmlFor="registerUsername">Username</label>
            <input
              id="registerUsername"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={20}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="registerEmail">Email</label>
            <input
              id="registerEmail"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="registerPassword">Password</label>
            <input
              id="registerPassword"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Register
          </button>
          <button className="btn btn-secondary" type="button" onClick={onSwitch}>
            Back to Login
          </button>
          <div className="message">{message}</div>
        </form>
      </div>
    </section>
  );
}
