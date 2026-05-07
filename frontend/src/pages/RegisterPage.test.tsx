import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

const registerMock = vi.fn();

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../context/AuthContext')>('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: vi.fn(),
      register: registerMock,
      logout: vi.fn(),
      refreshSession: vi.fn(),
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it('shows field-level validation errors and does not submit on missing fields', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });
});