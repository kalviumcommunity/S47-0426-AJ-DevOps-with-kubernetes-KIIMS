import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterCredentials } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface RegisterErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  form?: string;
}

const initialValues: RegisterCredentials = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  phone: '',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [values, setValues] = useState<RegisterCredentials>(initialValues);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): RegisterErrors {
    const nextErrors: RegisterErrors = {};
    if (!values.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!values.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!values.email.trim()) nextErrors.email = 'Email is required';
    if (!values.password.trim()) nextErrors.password = 'Password is required';
    if (!values.dateOfBirth.trim()) nextErrors.dateOfBirth = 'Date of birth is required';
    if (!values.phone.trim()) nextErrors.phone = 'Phone number is required';
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
      setIsSubmitting(true);
      await register(values);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to create account right now.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mesh-bg"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="glass-card wide-card">
        <div className="badge">Digital Onboarding</div>
        <h1>Create Patient Profile</h1>
        <p className="text-secondary mb-12">Join our elite healthcare network. Please provide your legal identification and contact details.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="input-group">
              <span className="input-label">Legal First Name</span>
              <input
                placeholder="Anushka"
                value={values.firstName}
                onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
              />
              {errors.firstName && <span className="text-accent text-sm mt-2 block">{errors.firstName}</span>}
            </div>
            <div className="input-group">
              <span className="input-label">Legal Last Name</span>
              <input
                placeholder="Poonia"
                value={values.lastName}
                onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
              />
              {errors.lastName && <span className="text-accent text-sm mt-2 block">{errors.lastName}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="input-group">
              <span className="input-label">Email Address</span>
              <input
                placeholder="jane.doe@healthcare.com"
                type="email"
                value={values.email}
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              />
              {errors.email && <span className="text-accent text-sm mt-2 block">{errors.email}</span>}
            </div>
            <div className="input-group">
              <span className="input-label">Mobile Number</span>
              <input
                placeholder="+918302575195"
                value={values.phone}
                onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              />
              {errors.phone && <span className="text-accent text-sm mt-2 block">{errors.phone}</span>}
              <span className="text-[10px] text-secondary mt-1 uppercase tracking-widest block opacity-50">Requires E.164 format (e.g. +91...)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="input-group">
              <span className="input-label">Date of Birth</span>
              <input
                type="date"
                value={values.dateOfBirth}
                onChange={(event) => setValues((current) => ({ ...current, dateOfBirth: event.target.value }))}
              />
              {errors.dateOfBirth && <span className="text-accent text-sm mt-2 block">{errors.dateOfBirth}</span>}
            </div>
            <div className="input-group">
              <span className="input-label">Secure Access Password</span>
              <input
                placeholder="••••••••"
                type="password"
                value={values.password}
                onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              />
              {errors.password && <span className="text-accent text-sm mt-2 block">{errors.password}</span>}
            </div>
          </div>

          {errors.form && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl text-accent flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errors.form}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Processing Registration...' : 'Establish Profile'}
          </button>
        </form>

        <p className="mt-12 text-center text-secondary text-sm">
          Already registered? <Link to="/login" className="text-primary font-bold hover:underline">Sign in to session</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;