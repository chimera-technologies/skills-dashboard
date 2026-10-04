import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

it('S1 harness: App renders the Skills dashboard heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Skills dashboard' })).toBeTruthy();
});
