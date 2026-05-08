import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginCredentials } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface LoginErrors {
  email?: string;
  password?: string;
  form?: string;
}

const initialValues: LoginCredentials = {
  email: '',
  password: '',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginCredentials>(initialValues);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): LoginErrors {
    const nextErrors: LoginErrors = {};
    if (!values.email.trim()) {
      nextErrors.email = 'Email is required';
    }
    if (!values.password.trim()) {
      nextErrors.password = 'Password is required';
    }
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
      await login(values);
      navigate('/dashboard');
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Unable to sign in right now.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mesh-bg"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="glass-card !max-w-xl">
        <div className="badge">Secure Access</div>
        <h1>Portal Login</h1>
        <p className="text-secondary mb-12">Sign in to your medical intelligence dashboard to manage your health journey.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="input-group">
            <span className="input-label">Email Address</span>
            <input
              placeholder="name@healthcare.com"
              type="email"
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            />
            {errors.email && <span className="text-accent text-sm mt-2 block">{errors.email}</span>}
          </div>

          <div className="input-group">
            <span className="input-label">Security Password</span>
            <input
              placeholder="••••••••"
              type="password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            />
            {errors.password && <span className="text-accent text-sm mt-2 block">{errors.password}</span>}
          </div>

          {errors.form && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl text-accent flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errors.form}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </form>

        <p className="mt-12 text-center text-secondary text-sm">
          New to the portal? <Link to="/register" className="text-primary font-bold hover:underline">Request an account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;