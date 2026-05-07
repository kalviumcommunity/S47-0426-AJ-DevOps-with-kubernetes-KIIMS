import { Router, Request, Response } from 'express';

const router = Router();

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  specialty: string;
  scheduledAt: string; // ISO
  duration: number;
  notes?: string;
}

const patients: Patient[] = [];
const appointments: Appointment[] = [];

function genId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Patients
router.get('/patients', (_req: Request, res: Response) => {
  res.json({ patients });
});

router.post('/patients', (req: Request, res: Response) => {
  const { email, firstName, lastName, phone } = req.body ?? {};
  if (!email || !firstName || !lastName) {
    res.status(400).json({ error: 'email, firstName and lastName are required' });
    return;
  }

  const existing = patients.find((p) => p.email.toLowerCase() === String(email).toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'Patient with this email already exists', patient: existing });
    return;
  }

  const patient: Patient = { id: genId('p_'), email, firstName, lastName, phone };
  patients.push(patient);
  res.status(201).json({ patient });
});

// Appointments
router.get('/appointments', (_req: Request, res: Response) => {
  res.json({ appointments });
});

router.post('/appointments', (req: Request, res: Response) => {
  const { patientId, specialty, scheduledAt, duration, notes } = req.body ?? {};
  if (!patientId || !specialty || !scheduledAt || !duration) {
    res.status(400).json({ error: 'patientId, specialty, scheduledAt and duration are required' });
    return;
  }

  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }

  const appointment: Appointment = {
    id: genId('a_'),
    patientId,
    specialty,
    scheduledAt: new Date(scheduledAt).toISOString(),
    duration: Number(duration),
    notes,
  };

  appointments.push(appointment);
  res.status(201).json({ appointment });
});

router.delete('/appointments/:id', (req: Request, res: Response) => {
  const idx = appointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const [removed] = appointments.splice(idx, 1);
  res.json({ appointment: removed });
});

export default router;
