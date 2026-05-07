import React, { useEffect, useState } from 'react'

type Patient = { id: string; email: string; firstName: string; lastName: string }
type Appointment = { id: string; patientId: string; specialty: string; scheduledAt: string; duration: number }

export default function BookAppointmentPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const [reg, setReg] = useState({ email: '', firstName: '', lastName: '', phone: '' })
  const [book, setBook] = useState({ patientId: '', specialty: 'General', scheduledAt: '', duration: 30 })

  async function load() {
    const p = await fetch('/api/patients').then((r) => r.json()).catch(() => ({ patients: [] }))
    setPatients(p.patients ?? [])
    const a = await fetch('/api/appointments').then((r) => r.json()).catch(() => ({ appointments: [] }))
    setAppointments(a.appointments ?? [])
  }

  useEffect(() => { load() }, [])

  async function registerPatient(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    })
    if (res.ok) {
      setReg({ email: '', firstName: '', lastName: '', phone: '' })
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Failed to create patient')
    }
  }

  async function bookAppointment(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    })
    if (res.ok) {
      setBook({ patientId: '', specialty: 'General', scheduledAt: '', duration: 30 })
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Failed to book appointment')
    }
  }

  async function cancel(id: string) {
    const ok = confirm('Cancel this appointment?')
    if (!ok) return
    const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    if (res.ok) await load()
    else alert('Failed to cancel')
  }

  return (
    <section>
      <div className="grid-2">
        <div className="glass-panel">
          <h3 style={{ marginBottom: '24px' }}>Register Patient</h3>
          <form onSubmit={registerPatient}>
            <div className="form-group">
              <label>Email</label>
              <input className="input-field" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="patient@example.com" />
            </div>
            <div className="form-group">
              <label>First name</label>
              <input className="input-field" value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} placeholder="John" />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input className="input-field" value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} placeholder="Doe" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input-field" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Patient</button>
            </div>
          </form>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '24px' }}>Book Appointment</h3>
          <form onSubmit={bookAppointment}>
            <div className="form-group">
              <label>Patient</label>
              <select className="input-field" value={book.patientId} onChange={(e) => setBook({ ...book, patientId: e.target.value })}>
                <option value="">-- select patient --</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <input className="input-field" value={book.specialty} onChange={(e) => setBook({ ...book, specialty: e.target.value })} placeholder="General, Cardiology, etc." />
            </div>
            <div className="form-group">
              <label>Scheduled at</label>
              <input className="input-field" type="datetime-local" value={book.scheduledAt} onChange={(e) => setBook({ ...book, scheduledAt: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input className="input-field" type="number" value={book.duration} onChange={(e) => setBook({ ...book, duration: Number(e.target.value) })} />
            </div>
            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Book</button>
            </div>
          </form>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '24px' }}>Appointments</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Specialty</th>
                <th>When</th>
                <th>Duration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const p = patients.find((x) => x.id === a.patientId)
                return (
                  <tr key={a.id}>
                    <td>{p ? `${p.firstName} ${p.lastName}` : a.patientId}</td>
                    <td>{a.specialty}</td>
                    <td>{new Date(a.scheduledAt).toLocaleString()}</td>
                    <td>{a.duration}m</td>
                    <td><button className="btn btn-danger" onClick={() => cancel(a.id)}>Cancel</button></td>
                  </tr>
                )
              })}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No appointments booked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientPortalAPI, TimeSlot } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorAlert from '../components/ErrorAlert';

interface BookingFormValues {
  date: string;
  specialty: string;
  doctorId: string;
  scheduledAt: string;
  duration: string;
  notes: string;
}

interface BookingErrors {
  date?: string;
  specialty?: string;
  doctorId?: string;
  scheduledAt?: string;
  duration?: string;
  form?: string;
}

const DEFAULT_SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'General Practice',
  'Neurology',
  'Pediatrics',
  'Psychiatry',
  'Surgery',
];

const initialValues: BookingFormValues = {
  date: '',
  specialty: '',
  doctorId: '',
  scheduledAt: '',
  duration: '30',
  notes: '',
};

function formatSlot(slot: TimeSlot): string {
  const start = new Date(slot.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const end = new Date(slot.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${start} - ${end}`;
}

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [values, setValues] = useState<BookingFormValues>(initialValues);
  const [errors, setErrors] = useState<BookingErrors>({});

  const slotsQuery = useQuery({
    queryKey: ['available-slots', values.date, values.specialty],
    queryFn: () => patientPortalAPI.getAvailableSlots(values.date, values.specialty),
    enabled: Boolean(values.date && values.specialty),
  });

  const bookingMutation = useMutation({
    mutationFn: (payload: { doctorId: string; specialty: string; scheduledAt: string; duration: number; notes?: string }) =>
      patientPortalAPI.bookAppointment(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/dashboard');
    },
  });

  const slots = slotsQuery.data ?? [];

  const availableSlotLabels = useMemo(
    () => slots.filter((slot) => slot.available).map((slot) => `${slot.doctorId || 'Doctor'}: ${formatSlot(slot)}`),
    [slots]
  );

  function validate(): BookingErrors {
    const nextErrors: BookingErrors = {};
    if (!values.date) nextErrors.date = 'Date is required';
    if (!values.specialty) nextErrors.specialty = 'Specialty is required';
    if (!values.doctorId.trim()) nextErrors.doctorId = 'Doctor ID is required';
    if (!values.scheduledAt.trim()) nextErrors.scheduledAt = 'Appointment time is required';
    if (!values.duration.trim()) nextErrors.duration = 'Duration is required';
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await bookingMutation.mutateAsync({
        doctorId: values.doctorId,
        specialty: values.specialty,
        scheduledAt: values.scheduledAt,
        duration: Number(values.duration),
        notes: values.notes.trim() || undefined,
      });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to book this appointment right now.' });
    }
  }

  if (authLoading) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <p>Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page-shell">
      <div className="page-card wide-card">
        <div className="page-heading-row">
          <div>
            <div className="auth-mark">Book an appointment</div>
            <h1>Find a slot and reserve it</h1>
            <p>Filter available times by date and specialty, then confirm the booking in one step.</p>
          </div>
          <Link className="text-link" to="/dashboard">View dashboard</Link>
        </div>

        <form onSubmit={handleSubmit} noValidate className="stacked-form">
          <div className="grid-two">
            <label>
              Date
              <input
                aria-label="Date"
                type="date"
                value={values.date}
                onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
              />
              {errors.date ? <span className="field-error">{errors.date}</span> : null}
            </label>

            <label>
              Specialty
              <select
                aria-label="Specialty"
                value={values.specialty}
                onChange={(event) => setValues((current) => ({ ...current, specialty: event.target.value }))}
              >
                <option value="">Select specialty</option>
                {DEFAULT_SPECIALTIES.map((specialty) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
              {errors.specialty ? <span className="field-error">{errors.specialty}</span> : null}
            </label>
          </div>

          {slotsQuery.isLoading ? <p className="muted-copy">Loading available slots...</p> : null}
          {slotsQuery.isError ? <ErrorAlert message={slotsQuery.error instanceof Error ? slotsQuery.error.message : 'Unable to load available slots.'} /> : null}

          <div className="slot-list">
            {availableSlotLabels.length > 0 ? (
              availableSlotLabels.map((label) => <div key={label} className="slot-pill">{label}</div>)
            ) : (
              <p className="muted-copy">Choose a date and specialty to see available slots.</p>
            )}
          </div>

          <div className="grid-two">
            <label>
              Doctor ID
              <input
                aria-label="Doctor ID"
                value={values.doctorId}
                onChange={(event) => setValues((current) => ({ ...current, doctorId: event.target.value }))}
              />
              {errors.doctorId ? <span className="field-error">{errors.doctorId}</span> : null}
            </label>

            <label>
              Appointment time
              <input
                aria-label="Appointment time"
                type="datetime-local"
                value={values.scheduledAt}
                onChange={(event) => setValues((current) => ({ ...current, scheduledAt: event.target.value }))}
              />
              {errors.scheduledAt ? <span className="field-error">{errors.scheduledAt}</span> : null}
            </label>
          </div>

          <div className="grid-two">
            <label>
              Duration
              <select
                aria-label="Duration"
                value={values.duration}
                onChange={(event) => setValues((current) => ({ ...current, duration: event.target.value }))}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
              {errors.duration ? <span className="field-error">{errors.duration}</span> : null}
            </label>

            <label>
              Notes
              <input
                aria-label="Notes"
                value={values.notes}
                onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>

          {errors.form ? <ErrorAlert message={errors.form} /> : null}

          <button type="submit" disabled={bookingMutation.isPending}>
            {bookingMutation.isPending ? 'Booking...' : 'Book appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
