// Datos de demostración. Se usan solo cuando el backend no está disponible,
// para que el dashboard se vea completo aunque no haya conexión.

import { Property, Appointment, Call, Client, Agent, Stats } from './types';

export const DEMO_STATS: Stats = {
  properties: 4,
  appointments: 3,
  calls: 18,
  clients: 6,
};

export const DEMO_PROPERTIES: Property[] = [
  { id: '1', title: 'Casa 3 hab. · Gazcue', price: '$189,000', city: 'Santo Domingo', beds: 3, baths: 2, status: 'Disponible' },
  { id: '2', title: 'Apartamento · Piantini', price: '$245,000', city: 'Santo Domingo', beds: 2, baths: 2, status: 'Disponible' },
  { id: '3', title: 'Villa · Punta Cana', price: '$520,000', city: 'La Altagracia', beds: 4, baths: 3, status: 'Reservada' },
  { id: '4', title: 'Local · Bella Vista', price: '$310,000', city: 'Santo Domingo', beds: 0, baths: 1, status: 'Disponible' },
];

export const DEMO_APPOINTMENTS: Appointment[] = [
  { id: '1', client: 'María R.', property: 'Casa Gazcue', date: '2026-07-17', time: '4:00 PM', status: 'Confirmada' },
  { id: '2', client: 'Carlos M.', property: 'Apartamento Piantini', date: '2026-07-18', time: '11:00 AM', status: 'Pendiente' },
  { id: '3', client: 'Lucía P.', property: 'Villa Punta Cana', date: '2026-07-19', time: '3:30 PM', status: 'Confirmada' },
];

export const DEMO_CALLS: Call[] = [
  { id: '1', client: 'María R.', durationSec: 134, outcome: 'Cita agendada', date: '2026-07-15' },
  { id: '2', client: 'Pedro T.', durationSec: 47, outcome: 'No interesa', date: '2026-07-15' },
  { id: '3', client: 'Ana G.', durationSec: 201, outcome: 'Cita agendada', date: '2026-07-14' },
  { id: '4', client: 'José L.', durationSec: 88, outcome: 'Llamar después', date: '2026-07-14' },
];

export const DEMO_CLIENTS: Client[] = [
  { id: '1', name: 'María R.', email: 'maria@correo.com', phone: '809-000-1111', interest: 'Casa Gazcue' },
  { id: '2', name: 'Carlos M.', email: 'carlos@correo.com', phone: '809-000-2222', interest: 'Apto Piantini' },
  { id: '3', name: 'Lucía P.', email: 'lucia@correo.com', phone: '809-000-3333', interest: 'Villa Punta Cana' },
  { id: '4', name: 'Pedro T.', email: 'pedro@correo.com', phone: '809-000-4444', interest: 'Local Bella Vista' },
];

export const DEMO_AGENTS: Agent[] = [
  { id: '1', name: 'Alexis', type: 'Voz IA · Cualificación', status: 'Activo', callsToday: 12, language: 'ES / EN' },
  { id: '2', name: 'Sofía', type: 'Voz IA · Seguimiento', status: 'Activo', callsToday: 6, language: 'ES' },
];
