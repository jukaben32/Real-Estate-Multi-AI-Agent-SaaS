# EstateCall — Backend

Backend en **Node.js + Express + TypeScript + PostgreSQL (Prisma)** para la plataforma
"Real Estate Multi AI Agent Platform": llamadas de IA, calificación de leads, reserva de
citas, portal de clientes, pagos con Stripe y sitio web embebible — recreado a partir del
video tutorial (originalmente Next.js + Supabase) con Express + Postgres, según lo pedido.

## Funcionalidades implementadas

- **Auth dual**: JWT separado para agentes (dashboard) y clientes (portal), incluyendo el
  flujo de "creá tu cuenta con el mismo email que usaste para reservar".
- **Propiedades**: CRUD completo, contadores por estado (Available/Pending/Sold), feed
  público filtrado por `aiAgentId` para que el agente de IA solo hable de lo permitido
  (`visibleToAiAgent`), carga de imágenes (vía URLs — conectar a S3/Cloudinary).
- **AI Agents**: perfiles de agentes de llamada (nombre, especialidad, guion de saludo,
  voz, personalidad), asignables a propiedades. Endpoint de "runtime context" protegido
  con API key para que el orquestador de voz/LLM arme el system prompt.
- **Citas (appointments)**: reserva (por IA o widget del sitio), slots disponibles,
  confirmar, cancelar, reprogramar (con estado `RESCHEDULE_REQUESTED` pendiente de
  aprobación, igual que en el video), pago en efectivo o marcado tras pago online.
- **Pagos**: Stripe PaymentIntents para pagar la cita, webhook para confirmar el pago y
  notificar por email, suscripción mensual para el website builder ($29/mes en el demo).
- **Llamadas**: registro de cada llamada (call log) con transcripción, duración y
  resultado, listado para el dashboard.
- **Clientes**: vista del agente con historial de citas por cliente.
- **Soporte**: tickets y chat cliente-agente.
- **Website builder**: configuración de micro-sitio (tema, hero, agente de IA activo),
  publicación, requiere suscripción activa.
- Emails transaccionales en cada paso (reserva, confirmación, cancelación, reprogramación,
  pago, invitación al portal) vía Nodemailer/SMTP.

## Instalación

```bash
cd estatecall-backend
npm install
cp .env.example .env   # completá DATABASE_URL, JWT secrets, Stripe, SMTP
npx prisma migrate dev --name init
npm run seed            # crea un agente demo + los 4 listados del video
npm run dev
```

Login de prueba tras el seed: `agent@estatecall.com` / `password123`

## Estructura

```
src/
  config/        # env vars, cliente Prisma
  middleware/     # auth (JWT agente/cliente/servicio), manejo de errores
  modules/
    auth/         # registro/login de agentes y clientes
    properties/   # listados
    agents/       # perfiles de AI agent (llamadas)
    appointments/  # reservas, confirmación, cancelación, reprogramación
    calls/        # call log
    clients/      # vista de clientes del agente
    support/      # tickets de soporte
    payments/     # Stripe (intents, webhook, suscripción)
    website/      # website builder
  routes/         # router principal /api
  app.ts          # Express app + middlewares
  index.ts        # arranque del servidor
prisma/
  schema.prisma   # modelo de datos completo
  seed.ts         # datos de ejemplo
```

## Autenticación

Dos audiencias de JWT independientes (secrets distintos):

- **Agente** (dashboard): `Authorization: Bearer <token>` obtenido en
  `POST /api/auth/agent/login`.
- **Cliente** (portal): mismo header, token de `POST /api/auth/client/login`.
- **Servicio** (orquestador de voz IA / webhooks internos): header
  `x-service-key: <AI_SERVICE_KEY>` — agregalo a tu `.env` para las rutas de
  `runtime-context` y logging de llamadas.

## Próximos pasos sugeridos

1. **Almacenamiento de imágenes**: conectar `POST /properties/:id/images` a S3/Cloudinary
   antes de guardar las URLs (hoy el endpoint espera URLs ya subidas).
2. **Orquestación de voz**: este backend expone todo lo que un orquestador de voz (Twilio +
   LLM, Vapi, Retell, etc.) necesita — `GET /ai-agents/:id/runtime-context` para el
   contexto y `POST /appointments` + `POST /calls` para registrar resultados — pero no
   incluye la integración de telefonía en sí.
3. **Stripe**: crear el producto/precio del website builder en el dashboard de Stripe y
   configurar `STRIPE_WEBSITE_PRICE_ID`, y apuntar el webhook a
   `POST /api/payments/webhook`.
4. **Migraciones en producción**: usar `prisma migrate deploy` en el pipeline de CI/CD.
