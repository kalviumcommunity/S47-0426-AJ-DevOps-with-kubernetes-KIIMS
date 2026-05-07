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
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-mark">Hospital Patient Portal</div>
        <h1>Welcome back</h1>
        <p>Sign in to manage appointments, profile details, and secure sessions.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input
              aria-label="Email"
              type="email"
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>

          <label>
            Password
            <input
              aria-label="Password"
              type="password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            />
            {errors.password ? <span className="field-error">{errors.password}</span> : null}
          </label>

          {errors.form ? <div className="form-banner">{errors.form}</div> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;