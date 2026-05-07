import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const loginMock = vi.fn();

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../context/AuthContext')>('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: loginMock,
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('shows field-level validation errors and does not submit on missing fields', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });
});