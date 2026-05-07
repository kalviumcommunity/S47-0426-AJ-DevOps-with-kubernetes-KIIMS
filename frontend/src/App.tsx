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
