import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientPortalAPI, Appointment } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorAlert from '../components/ErrorAlert';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getAppointmentId(appointment: Appointment): string {
  return appointment._id ?? appointment.id ?? '';
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: () => patientPortalAPI.getMyAppointments(),
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => patientPortalAPI.cancelAppointment(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return (appointmentsQuery.data ?? []).filter((appointment) => {
      return appointment.status === 'scheduled' && new Date(appointment.scheduledAt).getTime() >= now;
    });
  }, [appointmentsQuery.data]);

  const pastAppointments = useMemo(() => {
    const now = Date.now();
    return (appointmentsQuery.data ?? []).filter((appointment) => {
      return appointment.status !== 'scheduled' || new Date(appointment.scheduledAt).getTime() < now;
    });
  }, [appointmentsQuery.data]);

  if (authLoading) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page-shell">
      <div className="page-card wide-card dashboard-layout">
        <div className="page-heading-row">
          <div>
            <div className="auth-mark">Patient dashboard</div>
            <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''}</h1>
            <p>Review upcoming visits, look back at past appointments, and cancel scheduled care when needed.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="secondary-link" to="/book-appointment">Book appointment</Link>
            <button type="button" className="secondary-button" onClick={() => void logout()}>Sign out</button>
          </div>
        </div>

        {appointmentsQuery.isLoading ? <p className="muted-copy">Loading appointments...</p> : null}
        {appointmentsQuery.isError ? <ErrorAlert message={appointmentsQuery.error instanceof Error ? appointmentsQuery.error.message : 'Unable to load appointments.'} /> : null}

        <section className="panel-section">
          <h2>Upcoming appointments</h2>
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => {
              const appointmentId = getAppointmentId(appointment);
              return (
                <article key={appointmentId || `${appointment.doctorId}-${appointment.scheduledAt}`} className="appointment-card">
                  <div>
                    <strong>{appointment.specialty}</strong>
                    <p>{formatDateTime(appointment.scheduledAt)}</p>
                    <p>Doctor ID: {appointment.doctorId}</p>
                  </div>
                  <div className="appointment-card-actions">
                    <span className="status-pill">{appointment.status}</span>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={!appointmentId || cancelMutation.isPending}
                      onClick={() => appointmentId ? void cancelMutation.mutateAsync(appointmentId) : undefined}
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="muted-copy">No upcoming appointments scheduled.</p>
          )}
        </section>

        <section className="panel-section">
          <h2>Past appointments</h2>
          {pastAppointments.length > 0 ? (
            pastAppointments.map((appointment) => (
              <article key={getAppointmentId(appointment) || `${appointment.doctorId}-${appointment.scheduledAt}`} className="appointment-card muted-card">
                <div>
                  <strong>{appointment.specialty}</strong>
                  <p>{formatDateTime(appointment.scheduledAt)}</p>
                  <p>Status: {appointment.status}</p>
                </div>
              </article>
            ))
          ) : (
            <p className="muted-copy">Past appointments will appear here once you have completed visits.</p>
          )}
        </section>

      </div>
    </div>
  );
}