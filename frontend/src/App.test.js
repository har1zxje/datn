import { render, screen } from '@testing-library/react';
import App from './App';

test('renders NutriGro brand', () => {
  render(<App />);
  const linkElement = screen.getByText(/NutriGro/i);
  expect(linkElement).toBeInTheDocument();
});