import { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patientPortalAPI, TimeSlot } from '../api/client';
import { useAuth } from '../context/AuthContext';

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
    if (!values.doctorId.trim()) nextErrors.doctorId = 'Doctor selection is required';
    if (!values.scheduledAt.trim()) nextErrors.scheduledAt = 'Time is required';
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
      setErrors({ form: error instanceof Error ? error.message : 'System synchronization failed.' });
    }
  }

  if (authLoading) return <div className="page-shell"><p>Synchronizing session...</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="booking-split">
      {/* Visual Experience Side */}
      <aside className="booking-hero !flex-[0.8]">
        <div className="hero-content">
          <div className="badge !bg-white/10 !text-white !border-white/20">Premium Care</div>
          <h2 className="!text-5xl">Elite Medical <br/>Selection</h2>
          <p className="text-white/40 mt-6 leading-relaxed">
            Every appointment is handled with the highest level of priority and medical excellence.
          </p>
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-primary transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="text-sm font-bold tracking-wide">Verified Specialists</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-primary transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <span className="text-sm font-bold tracking-wide">Priority Scheduling</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Form Experience Side */}
      <main className="booking-form-side !flex-[1.2] !bg-[#0a0a0a]">
        <header className="flex justify-between items-center mb-16">
          <Link to="/dashboard" className="group flex items-center gap-3 text-sm font-bold tracking-widest uppercase hover:text-primary transition-colors">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-primary transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </div>
            Exit Booking
          </Link>
          <div className="flex gap-2">
            {[1, 2, 3].map(step => (
              <div key={step} className={`w-8 h-1 rounded-full ${step === 1 ? 'bg-primary' : 'bg-white/10'}`}></div>
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate className="max-w-3xl mx-auto">
          {/* Section 01: Logistics */}
          <div className="luxury-step">
            <h3 className="!text-4xl mb-12 flex items-center gap-4">
              <span className="text-primary font-black opacity-20">01</span>
              Logistic Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="input-group !mb-0">
                <span className="step-label !mb-2">Consultation Date</span>
                <input
                  type="date"
                  className="input-field !py-4"
                  value={values.date}
                  onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
                />
                {errors.date && <span className="text-accent text-[10px] mt-2 block font-black uppercase tracking-tighter">{errors.date}</span>}
              </div>
              <div className="input-group !mb-0">
                <span className="step-label !mb-2">Care Stream</span>
                <select
                  className="input-field !py-4"
                  value={values.specialty}
                  onChange={(event) => setValues((current) => ({ ...current, specialty: event.target.value }))}
                >
                  <option value="">Select Stream</option>
                  {DEFAULT_SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.specialty && <span className="text-accent text-[10px] mt-2 block font-black uppercase tracking-tighter">{errors.specialty}</span>}
              </div>
            </div>
          </div>

          {/* Section 02: Selection */}
          <div className="luxury-step">
            <h3 className="!text-4xl mb-12 flex items-center gap-4">
              <span className="text-primary font-black opacity-20">02</span>
              Specialist & Time
            </h3>
            <div className="slot-container !mt-0">
              {slotsQuery.isLoading ? (
                <div className="p-20 text-center border border-white/5 rounded-[2rem] bg-white/[0.02] animate-pulse">
                  <div className="text-primary text-sm font-black uppercase tracking-[0.3em]">Syncing Global Network</div>
                </div>
              ) : availableSlotLabels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {availableSlotLabels.map((label) => (
                    <div 
                      key={label} 
                      className={`choice-card !p-8 !rounded-[2rem] border-2 ${values.doctorId === label.split(': ')[0] ? 'border-primary bg-primary/5' : 'border-white/5 hover:border-white/20'}`}
                      onClick={() => setValues(prev => ({ ...prev, doctorId: label.split(': ')[0] }))}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="choice-time !text-2xl">{label.split(': ')[1]}</div>
                        {values.doctorId === label.split(': ')[0] && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-primary">DR</div>
                        <div className="choice-meta !text-white/80 font-bold uppercase tracking-wider">{label.split(': ')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center border border-dashed border-white/10 rounded-[2rem] opacity-30 italic">
                  Select your logistics to reveal available specialists.
                </div>
              )}
            </div>
          </div>

          {/* Section 03: Finalization */}
          <div className="luxury-step">
            <h3 className="!text-4xl mb-12 flex items-center gap-4">
              <span className="text-primary font-black opacity-20">03</span>
              Final Directives
            </h3>
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="input-group !mb-0">
                  <span className="step-label !mb-2">Precise Schedule</span>
                  <input
                    type="datetime-local"
                    className="input-field !py-4"
                    value={values.scheduledAt}
                    onChange={(event) => setValues((current) => ({ ...current, scheduledAt: event.target.value }))}
                  />
                  {errors.scheduledAt && <span className="text-accent text-[10px] mt-2 block font-black uppercase tracking-tighter">{errors.scheduledAt}</span>}
                </div>
                <div className="input-group !mb-0">
                  <span className="step-label !mb-2">Session Block</span>
                  <select
                    className="input-field !py-4"
                    value={values.duration}
                    onChange={(event) => setValues((current) => ({ ...current, duration: event.target.value }))}
                  >
                    <option value="15">15 Minute Consultation</option>
                    <option value="30">30 Minute Consultation</option>
                    <option value="60">60 Minute Extended Session</option>
                  </select>
                </div>
              </div>
              <div className="input-group !mb-0">
                <span className="step-label !mb-2">Clinical Notes & Context</span>
                <textarea
                  placeholder="Provide any background information for our specialists..."
                  className="input-field !py-6 min-h-[120px] resize-none"
                  value={values.notes}
                  onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="pt-16">
            {errors.form && (
              <div className="p-6 bg-accent/10 border border-accent/20 rounded-3xl text-accent mb-10 flex items-center gap-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div className="font-bold text-sm uppercase tracking-wider">{errors.form}</div>
              </div>
            )}
            <button 
              type="submit" 
              disabled={bookingMutation.isPending} 
              className="btn-confirm !py-6 !rounded-[1.5rem] !bg-primary !text-black !text-base shadow-[0_20px_50px_rgba(0,210,255,0.3)]"
            >
              {bookingMutation.isPending ? 'Processing Secure Reservation...' : 'Establish Secure Reservation'}
            </button>
            <p className="text-center text-[10px] text-white/20 mt-8 uppercase tracking-[0.2em] font-bold">
              Secure 256-bit Encrypted Medical Environment
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
