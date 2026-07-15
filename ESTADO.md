# ESTATECALL — ESTADO DEL PROYECTO

## RESUMEN RÁPIDO
Backend (Real Estate Multi AI Agent SaaS) COMPLETO y verificado. Siguiente fase:
crear un FRONTEND hermoso.

---

## ✅ BACKEND — TERMINADO (no tocar salvo bugfix)
- Ruta: C:\Users\IA Power Engine\Documents\MisProyectos\estatecall-backend
- Stack: Node + Express + TypeScript + Prisma + Supabase + Stripe + JWT.
- Repo GitHub: https://github.com/jukaben32/Real-Estate-Multi-AI-Agent-SaaS (rama main)
- Commits: 8aed993 (feat conexión), 680bab3 (fix build).
- `npm run build` en VERDE (exit 0). Login + endpoints probados end-to-end.

### Conexión a Supabase (la parte difícil, ya resuelta)
- Red del usuario (Tricom RD) no enruta IPv6 → host directo no conecta.
- Pooler TCP da "tenant/user not found" (bug proyecto pausado/restaurado).
- SOLUCIÓN: adapter HTTP. El SQL de Prisma se envía a la API SQL de Supabase por HTTPS.
  - src/config/supabase-pg-pool.ts: Pool de pg redirigido a
    https://api.supabase.com/v1/projects/<ref>/database/query (Bearer token + UA navegador).
  - src/config/db.ts: PrismaClient con @prisma/adapter-pg@5.22 (misma versión que client).
  - src/config/env-adapter-config.ts: lee SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF de .env.
- Supabase ref: elrvxpgxlnyvfsfufnoq (us-west-2, PG17). Credenciales SOLO en .env (protegido por .gitignore).

### API del backend (para el frontend)
- Base URL local: http://localhost:4000/api
- Puerto: 4000. Arranca con `npm run dev` (tsx watch).
- Health: GET /api/health
- Auth: POST /api/auth/agent/login  body {email, password} → {success, data:{token, agent}}
        POST /api/auth/agent/register, /api/auth/client/login, /api/auth/client/register
- Rutas protegidas: header "Authorization: Bearer <token>"
  - GET /api/properties (lista con paginación {items})
  - GET /api/ai-agents
  - /api/appointments, /api/calls, /api/clients, /api/payments, /api/support, /api/website
- Datos seed: agente demo agent@estatecall.com / password123 (OWNER, sub ACTIVE),
  AI agent "Alexis", 4 propiedades.

---

## 🎯 SIGUIENTE FASE: FRONTEND — DECISIÓN TOMADA (opción C)
- El usuario quiere un frontend HERMOSO. ELIGIÓ OPCIÓN C:
  1º) LANDING pública preciosa en HTML + CSS + Tailwind + JS puro (lo que él domina).
  2º) DASHBOARD del agente en Next.js (React) + Tailwind (como el de Micheline, deploy Vercel).
- EMPEZAR POR LA LANDING. No saltar al dashboard hasta que la landing esté aprobada.
- Stack/preferencias usuario: principiante, explicar paso a paso en español, código
  comentado en español, simple > complejo. Es trabajo VISUAL/creativo: NO correr linters/tests
  hasta que al usuario le guste el resultado o antes de commit (regla de UI creativa).
- Sugerencia landing: hero impactante, secciones (features del AI calling agent, cómo funciona,
  propiedades demo, pricing, CTA login/registro). Considerar skills creativas disponibles
  (claude-design, popular-web-designs, sketch) para inspiración/calidad.
- Debe consumir la API del backend (login de agente, listar propiedades, agendar citas, etc.).
- CORS: el backend ya usa cors(); revisar CLIENT_DASHBOARD_URL en .env si hace falta.
- ¿Dónde crear la landing? Carpeta nueva hermana, p.ej.
  Documents/MisProyectos/estatecall-frontend/ (o estatecall-landing/). Preguntar/confirmar.

## PENDIENTES MENORES
- Tarea #5 vieja: "personalizar/branding" — se puede fusionar con el diseño del frontend.
- SEGURIDAD: el usuario debe REVOCAR el GitHub PAT que pegó en el chat (github_pat_11BP...).
- Token de Supabase y PAT de GitHub NO rotar en código; están en .env / se usan solo para push.

## NOTAS DE TRABAJO
- Windows, terminal bash (git-bash). Matar node en puerto 4000:
  powershell -Command "Stop-Process -Id <PID> -Force"  (obtener PID con netstat -ano | grep :4000)
- El usuario hace /compress seguido para liberar contexto; guardar estado aquí antes.
- Preferencia usuario: COMMIT + PUSH PROACTIVO para no perder trabajo.

## VISIÓN A LARGO PLAZO (clave, no perder)
El usuario quiere que EstateCall NO sea solo "SaaS de bienes raíces", sino una
BASE REUTILIZABLE (white-label / multi-vertical) adaptable a varias industrias:
  - Bienes raíces → Alexis (agenda visitas)
  - Barberías / Salones de belleza → agenda cortes/manicuras
  - Dealer de carros → agenda test-drives
  - Clínicas dentales → agenda citas
  - etc.
O sea: el frontend y el backend deben ser CONFIGURABLES por vertical
(nombre de marca, colores, tipo de agente IA, "propiedades" -> "servicios/items",
textos). El video original del starter ya mostraba un "website builder" con
theming y agentes por industria. META FINAL: tener la app PERFECTAMENTE
FUNCIONAL primero (bienes raíces), y luego convertirla en plantilla adaptable.
Cuando termine la webpage/app funcional, retomar esta idea de "casi una habilidad"
(plantilla multi-industria).
