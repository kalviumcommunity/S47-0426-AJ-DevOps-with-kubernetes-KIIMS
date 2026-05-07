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
    <div className="auth-shell auth-shell-alt">
      <div className="auth-card">
        <div className="auth-mark">New patient registration</div>
        <h1>Create your account</h1>
        <p>Set up secure access to the patient portal in a few minutes.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid-two">
            <label>
              First name
              <input
                aria-label="First name"
                value={values.firstName}
                onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
              />
              {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
            </label>

            <label>
              Last name
              <input
                aria-label="Last name"
                value={values.lastName}
                onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
              />
              {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
            </label>
          </div>

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

          <label>
            Date of birth
            <input
              aria-label="Date of birth"
              type="date"
              value={values.dateOfBirth}
              onChange={(event) => setValues((current) => ({ ...current, dateOfBirth: event.target.value }))}
            />
            {errors.dateOfBirth ? <span className="field-error">{errors.dateOfBirth}</span> : null}
          </label>

          <label>
            Phone
            <input
              aria-label="Phone"
              value={values.phone}
              placeholder="+12125551234"
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            />
            {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
          </label>

          {errors.form ? <div className="form-banner">{errors.form}</div> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;