import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getAvailableSlotsMock: vi.fn(),
  bookAppointmentMock: vi.fn(),
}));

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    patientPortalAPI: {
      ...actual.patientPortalAPI,
      getAvailableSlots: mocks.getAvailableSlotsMock,
      bookAppointment: mocks.bookAppointmentMock,
      getMyAppointments: vi.fn(),
    },
  };
});

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../context/AuthContext')>('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'patient-1', email: 'jane@example.com', firstName: 'Jane' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    }),
  };
});

import BookAppointmentPage from './BookAppointmentPage';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookAppointmentPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BookAppointmentPage', () => {
  beforeEach(() => {
    mocks.getAvailableSlotsMock.mockResolvedValue([]);
    mocks.bookAppointmentMock.mockReset();
  });

  it('shows field-level validation errors and does not submit on missing fields', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: /book appointment/i }));

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByText('Specialty is required')).toBeInTheDocument();
    expect(screen.getByText('Doctor ID is required')).toBeInTheDocument();
    expect(mocks.bookAppointmentMock).not.toHaveBeenCalled();
  });

  it('renders a human-readable API error message', async () => {
    const user = userEvent.setup();
    mocks.bookAppointmentMock.mockRejectedValueOnce(new Error('This time slot is already booked'));

    renderPage();

    await user.type(screen.getByLabelText('Date'), '2026-05-08');
    await user.selectOptions(screen.getByLabelText('Specialty'), 'Cardiology');
    await user.type(screen.getByLabelText('Doctor ID'), '507f1f77bcf86cd799439011');
    await user.type(screen.getByLabelText('Appointment time'), '2026-05-08T12:00');
    await user.click(screen.getByRole('button', { name: /book appointment/i }));

    await waitFor(() => {
      expect(screen.getByText('This time slot is already booked')).toBeInTheDocument();
    });
  });
});