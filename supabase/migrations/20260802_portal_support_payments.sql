-- ============================================================================
-- MIGRACIÓN ADITIVA — Portal de Cliente, Soporte, Reagendamiento y Pagos
-- ----------------------------------------------------------------------------
-- Segura de re-ejecutar (idempotente). NO elimina columnas, tablas ni datos.
-- Lo único que se reemplaza son políticas RLS que estaban rotas (ver bloque 1)
-- y el CHECK de `appointments.status`, que se amplía sin quitar valores.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. FIX CRÍTICO: RLS de soporte comparaba auth.uid() contra clients.id
-- ----------------------------------------------------------------------------
-- `support_tickets.client_id` referencia `clients(id)`, NO `auth.users(id)`.
-- Por eso `auth.uid() = client_id` nunca era verdadero y ningún cliente podía
-- ver ni crear sus propios tickets. El patrón correcto (ya usado en
-- `appointments`) es resolver vía `clients.auth_user_id`.
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists "Clients can view their own tickets"   on support_tickets;
drop policy if exists "Clients can create tickets"           on support_tickets;

create policy "Clients can view their own tickets"
  on support_tickets for select using (
    exists (
      select 1 from clients c
      where c.id = support_tickets.client_id and c.auth_user_id = auth.uid()
    )
  );

create policy "Clients can create tickets"
  on support_tickets for insert with check (
    exists (
      select 1 from clients c
      where c.id = support_tickets.client_id and c.auth_user_id = auth.uid()
    )
  );

-- Un cliente puede cerrar/reabrir su propio ticket, pero no reasignarlo.
drop policy if exists "Clients can update their own tickets" on support_tickets;
create policy "Clients can update their own tickets"
  on support_tickets for update
  using (
    exists (
      select 1 from clients c
      where c.id = support_tickets.client_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from clients c
      where c.id = support_tickets.client_id and c.auth_user_id = auth.uid()
    )
    and status in ('open', 'closed')
  );


drop policy if exists "Clients can view messages on their own tickets" on support_messages;
drop policy if exists "Clients can send messages on their own tickets" on support_messages;

create policy "Clients can view messages on their own tickets"
  on support_messages for select using (
    exists (
      select 1 from support_tickets t
      join clients c on c.id = t.client_id
      where t.id = support_messages.ticket_id and c.auth_user_id = auth.uid()
    )
  );

create policy "Clients can send messages on their own tickets"
  on support_messages for insert with check (
    sender = 'client'
    and exists (
      select 1 from support_tickets t
      join clients c on c.id = t.client_id
      where t.id = support_messages.ticket_id and c.auth_user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 2. SUPPORT_TICKETS — metadatos para ordenar la bandeja del agente
-- ────────────────────────────────────────────────────────────────────────────

alter table support_tickets add column if not exists priority        text not null default 'normal';
alter table support_tickets add column if not exists last_message_at timestamptz;
alter table support_tickets add column if not exists closed_at       timestamptz;

do $$ begin
  alter table support_tickets drop constraint if exists support_tickets_priority_check;
  alter table support_tickets add constraint support_tickets_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'));
end $$;

create index if not exists idx_support_tickets_status
  on support_tickets (business_id, status, last_message_at desc);

-- Mantiene `last_message_at` al día sin que la app tenga que acordarse.
create or replace function bump_ticket_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update support_tickets
     set last_message_at = new.created_at,
         updated_at      = now()
   where id = new.ticket_id;
  return new;
end $$;

drop trigger if exists trg_bump_ticket_last_message on support_messages;
create trigger trg_bump_ticket_last_message
  after insert on support_messages
  for each row execute function bump_ticket_last_message();

-- Backfill para tickets que ya existan.
update support_tickets t
   set last_message_at = coalesce(
     (select max(m.created_at) from support_messages m where m.ticket_id = t.id),
     t.created_at
   )
 where t.last_message_at is null;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS — reagendamiento con confirmación del agente
-- ────────────────────────────────────────────────────────────────────────────

alter table appointments add column if not exists rescheduled_from        timestamptz;
alter table appointments add column if not exists requested_scheduled_at  timestamptz;
alter table appointments add column if not exists reschedule_requested_at timestamptz;
alter table appointments add column if not exists confirmed_by_agent_at   timestamptz;
alter table appointments add column if not exists cancelled_at            timestamptz;
alter table appointments add column if not exists cancellation_reason     text;
alter table appointments add column if not exists cancelled_by            text;

do $$ begin
  alter table appointments drop constraint if exists appointments_cancelled_by_check;
  alter table appointments add constraint appointments_cancelled_by_check
    check (cancelled_by is null or cancelled_by in ('client', 'business', 'system'));
end $$;

-- Amplía el CHECK de status SIN quitar ninguno de los 4 valores existentes.
do $$ begin
  alter table appointments drop constraint if exists appointments_status_check;
  alter table appointments add constraint appointments_status_check
    check (status in ('scheduled', 'pending_confirmation', 'completed', 'cancelled', 'no_show'));
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. APPOINTMENTS — pago por cita vía Stripe Checkout
-- ────────────────────────────────────────────────────────────────────────────

alter table appointments add column if not exists payment_status            text not null default 'not_required';
alter table appointments add column if not exists payment_amount            numeric(10,2);
alter table appointments add column if not exists payment_currency          text not null default 'usd';
alter table appointments add column if not exists stripe_checkout_session_id text;
alter table appointments add column if not exists stripe_payment_intent_id  text;
alter table appointments add column if not exists paid_at                   timestamptz;

do $$ begin
  alter table appointments drop constraint if exists appointments_payment_status_check;
  alter table appointments add constraint appointments_payment_status_check
    check (payment_status in ('not_required', 'pending', 'paid', 'cash', 'refunded'));
end $$;

create unique index if not exists idx_appointments_checkout_session
  on appointments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_appointments_payment_status
  on appointments (business_id, payment_status);


-- ────────────────────────────────────────────────────────────────────────────
-- 5. RLS: el cliente puede pedir reagendar o cancelar SU cita
-- ----------------------------------------------------------------------------
-- El WITH CHECK limita los estados que el cliente puede dejar, así que no
-- puede marcar una cita como `completed` ni `no_show` por su cuenta.
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists "Clients can request changes on their own appointments" on appointments;
create policy "Clients can request changes on their own appointments"
  on appointments for update
  using (
    exists (
      select 1 from clients c
      where c.id = appointments.client_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from clients c
      where c.id = appointments.client_id and c.auth_user_id = auth.uid()
    )
    and status in ('scheduled', 'pending_confirmation', 'cancelled')
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 6. CLIENTS — trazabilidad de la invitación al portal
-- ────────────────────────────────────────────────────────────────────────────

alter table clients add column if not exists portal_invited_at  timestamptz;
alter table clients add column if not exists portal_last_seen_at timestamptz;

-- Un cliente necesita poder actualizar su propio perfil desde el portal.
drop policy if exists "Clients can update their own record" on clients;
create policy "Clients can update their own record"
  on clients for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 7. Lectura acotada para el portal
-- ----------------------------------------------------------------------------
-- El cliente necesita ver el nombre/logo del negocio y el título de la
-- propiedad de su cita, sin exponer el resto del tenant.
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists "Clients can view businesses they belong to" on businesses;
create policy "Clients can view businesses they belong to"
  on businesses for select using (
    exists (
      select 1 from clients c
      where c.business_id = businesses.id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Clients can view listings tied to their appointments" on listings;
create policy "Clients can view listings tied to their appointments"
  on listings for select using (
    exists (
      select 1
        from appointments a
        join clients c on c.id = a.client_id
       where a.listing_id = listings.id and c.auth_user_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS — nuevos tipos usados por soporte, reagendamiento y pagos
-- ----------------------------------------------------------------------------
-- Se amplía el CHECK sin quitar ninguno de los 5 valores originales. Sin esto,
-- los inserts de notificación de los flujos nuevos fallarían.
-- ────────────────────────────────────────────────────────────────────────────

do $$ begin
  alter table notifications drop constraint if exists notifications_type_check;
  alter table notifications add constraint notifications_type_check
    check (type in (
      'new_lead',
      'appointment_booked',
      'appointment_cancelled',
      'appointment_rescheduled',
      'support_ticket',
      'payment_received',
      'subscription',
      'system'
    ));
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. APPOINTMENTS — control de recordatorios
-- ----------------------------------------------------------------------------
-- Sin esta marca, el cron reenviaría el mismo recordatorio en cada pasada.
-- ────────────────────────────────────────────────────────────────────────────

alter table appointments add column if not exists reminder_sent_at timestamptz;

create index if not exists idx_appointments_reminder_pending
  on appointments (scheduled_at)
  where reminder_sent_at is null and status = 'scheduled';
