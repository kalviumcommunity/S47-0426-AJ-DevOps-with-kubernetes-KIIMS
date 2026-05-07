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
