import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('shows the app name as the main heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'fomodoro' })).toBeInTheDocument();
  });

  it.skip('tells the user the timer is coming', () => {
    render(<App />);
    expect(screen.getByText('Timer coming soon.')).toBeInTheDocument();
  });
});
