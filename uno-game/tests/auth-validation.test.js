const { validateLogin, validateRegistration } = require('../src/server/auth/validation');

describe('auth validation', () => {
  test('accepts valid registration payloads', () => {
    const result = validateRegistration({
      username: 'Player_123',
      email: 'Player@Example.com',
      password: 'password123',
    });

    expect(result.valid).toBe(true);
    expect(result.value.email).toBe('player@example.com');
    expect(result.value.username).toBe('Player_123');
  });

  test('rejects invalid registration payloads', () => {
    const result = validateRegistration({
      username: 'no',
      email: 'not-an-email',
      password: 'short',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Username'),
        expect.stringContaining('Email'),
        expect.stringContaining('Password'),
      ])
    );
  });

  test('rejects login without a valid email or password', () => {
    const result = validateLogin({ email: 'bad', password: '' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Email'),
        expect.stringContaining('Password'),
      ])
    );
  });
});
