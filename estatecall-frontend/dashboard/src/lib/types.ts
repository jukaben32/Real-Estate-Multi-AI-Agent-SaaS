// Tipos compartidos del dashboard (lo que devuelve la API del backend).
// Los nombres son simples para que sea fácil de leer.

export interface Property {
  id: string;
  title: string;
  price: string;
  city: string;
  beds: number;
  baths: number;
  status: string;
}

export interface Appointment {
  id: string;
  client: string;
  property: string;
  date: string;
  time: string;
  status: string;
}

export interface Call {
  id: string;
  client: string;
  durationSec: number;
  outcome: string;
  date: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  callsToday: number;
  language: string;
}

export interface Stats {
  properties: number;
  appointments: number;
  calls: number;
  clients: number;
}
