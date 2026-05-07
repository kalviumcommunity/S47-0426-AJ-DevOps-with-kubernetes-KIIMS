import React from 'react'
import BookAppointmentPage from './pages/BookAppointmentPage'

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>Patient Portal</h1>
        <p>Manage your health journey with ease.</p>
      </header>
      <main>
        <BookAppointmentPage />
      </main>
    </div>
  )
}
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/book-appointment" element={<BookAppointmentPage />} />
    </Routes>
  );
}

export default App;
