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
      <div className="mesh-bg"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="glass-card wide-card">
        <header className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <div>
            <span className="badge">Medical Intelligence Dashboard</span>
            <h1>Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h1>
            <p className="text-secondary">Track your health progress and manage upcoming specialist consultations.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/book-appointment" className="btn-primary !w-auto !py-3 !px-8 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              New Booking
            </Link>
            <button onClick={() => void logout()} className="btn-ghost flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </header>

        {appointmentsQuery.isError && (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl text-accent mb-8 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {appointmentsQuery.error instanceof Error ? appointmentsQuery.error.message : 'System synchronization error.'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Appointments */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h3 className="mb-6 flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Upcoming Consultations
              </h3>
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt) => {
                    const id = getAppointmentId(apt);
                    return (
                      <div key={id} className="slot-btn !cursor-default group !flex-row !justify-between !items-center">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center font-bold text-primary">
                            {apt.specialty.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="slot-time-hero">{apt.specialty}</div>
                            <div className="slot-dr-hero">{formatDateTime(apt.scheduledAt)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => id && void cancelMutation.mutate(id)}
                          disabled={cancelMutation.isPending}
                          className="p-3 hover:bg-accent/20 text-accent rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="Cancel Appointment"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-16 border-2 border-dashed border-white/5 rounded-3xl text-center">
                    <div className="text-4xl mb-4">🍃</div>
                    <p className="text-secondary italic">Your schedule is currently clear.</p>
                    <Link to="/book-appointment" className="text-primary font-bold mt-4 inline-block hover:underline">Book a session now</Link>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-6 opacity-50">Visit History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAppointments.map((apt) => (
                  <div key={getAppointmentId(apt)} className="p-6 bg-white/2 rounded-2xl border border-white/5 flex justify-between items-center opacity-40 hover:opacity-100 transition-all">
                    <div>
                      <div className="font-bold">{apt.specialty}</div>
                      <div className="text-sm text-secondary">{new Date(apt.scheduledAt).toLocaleDateString()}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Profile Summary */}
          <div className="space-y-8">
            <div className="p-8 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl border border-white/10">
              <h3 className="text-lg mb-4">Patient Profile</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Name</span>
                  <span className="font-bold">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Email</span>
                  <span className="font-bold">{user?.email}</span>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="text-xs text-secondary mb-2 uppercase tracking-widest">Health Wellness Score</div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/2 rounded-3xl border border-white/5">
              <h3 className="text-lg mb-4">Portal Notices</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Stay updated with the latest health advisories and portal features. Secure messaging with your primary physician is now active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}