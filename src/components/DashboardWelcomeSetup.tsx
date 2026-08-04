import Link from 'next/link'
import {
  Building2,
  House,
  Mic,
  Code2,
  CalendarCheck,
  MessagesSquare,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

type SetupStep = {
  number: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  cta: string
  href: string
  complete: boolean
}

export function DashboardWelcomeSetup({
  businessName,
  listingsDone,
  agentDone,
  widgetDone,
}: {
  businessName: string
  listingsDone: boolean
  agentDone: boolean
  widgetDone: boolean
}) {
  const steps: SetupStep[] = [
    {
      number: '01',
      icon: House,
      title: 'Agrega tus propiedades',
      description:
        'Sube tus propiedades disponibles con fotos, precios y características. La IA usa estos datos para responder con precisión a las consultas de los clientes.',
      cta: 'Agregar propiedades',
      href: '/dashboard/listings',
      complete: listingsDone,
    },
    {
      number: '02',
      icon: Mic,
      title: 'Crea un agente de voz IA',
      description:
        'Elige una voz, personalidad y saludo. Asígnalo a una propiedad específica o configúralo como tu recepcionista general de agencia.',
      cta: 'Crear agente',
      href: '/dashboard/ai-agents',
      complete: agentDone,
    },
    {
      number: '03',
      icon: Code2,
      title: 'Insértalo en tu sitio web',
      description:
        'Copia una sola línea de código y pégala en tu sitio. Tus clientes podrán llamar a tu IA al instante, 24/7.',
      cta: 'Obtener código',
      href: '/dashboard/widget',
      complete: widgetDone,
    },
  ]

  const completedCount = steps.filter((s) => s.complete).length
  const nextStep = steps.find((s) => !s.complete) ?? steps[0]

  return (
    <div className="space-y-6">
      <section className="card-surface p-6 lg:p-8 bg-[var(--teal-900)] text-white">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/10 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="badge bg-[var(--teal-700)] border-transparent text-[var(--teal-50)] mb-2 inline-flex">
                CONFIGURACIÓN REQUERIDA
              </span>
              <h1 className="font-display font-semibold text-2xl">
                Bienvenido a Inmobil<span className="text-[var(--teal-300)]">IA</span>Call, {businessName}
              </h1>
              <p className="text-sm text-white/70 mt-1 max-w-xl">
                A 3 pasos de un recepcionista IA que responde llamadas 24/7, conoce tus
                propiedades y agenda visitas automáticamente.
              </p>
            </div>
          </div>
          <Link
            href={nextStep.href}
            className="btn-primary bg-white text-[var(--teal-900)] hover:bg-white/90 shrink-0"
          >
            Comenzar configuración
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-[var(--text-1)]">
            Completa estos pasos para salir en vivo
          </h2>
          <span className="text-sm text-[var(--text-3)]">{completedCount} / 3 completados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="card-surface p-5 relative overflow-hidden">
                <span className="absolute top-3 right-4 font-display text-4xl font-bold text-[var(--border)] select-none">
                  {step.number}
                </span>
                <div className="grid place-items-center w-10 h-10 rounded-lg bg-[var(--teal-50)] mb-4">
                  {step.complete ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--teal-700)]" />
                  ) : (
                    <Icon className="w-5 h-5 text-[var(--teal-700)]" />
                  )}
                </div>
                <p className="text-xs font-semibold text-[var(--teal-700)] tracking-wide mb-1">PASO {step.number}</p>
                <h3 className="font-display font-semibold text-[var(--text-1)] mb-1.5">{step.title}</h3>
                <p className="text-sm text-[var(--text-3)] mb-3">{step.description}</p>
                {step.complete ? (
                  <span className="text-sm font-medium text-[var(--teal-700)] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Completado
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    className="text-sm font-medium text-[var(--teal-700)] inline-flex items-center gap-1"
                  >
                    {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="card-surface p-5">
        <p className="text-xs font-semibold text-[var(--text-3)] tracking-wide mb-4">
          LO QUE OBTIENES DESPUÉS DE LA CONFIGURACIÓN
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Benefit icon={House} title="Propiedades en vivo" description="La IA responde con tus propiedades reales" />
          <Benefit
            icon={CalendarCheck}
            title="Reserva automática de visitas"
            description="Los clientes agendan mientras hablan"
          />
          <Benefit
            icon={MessagesSquare}
            title="Transcripciones completas"
            description="Cada llamada registrada y buscable"
          />
          <Benefit
            icon={TrendingUp}
            title="Analítica en vivo"
            description="Rastrea llamadas, leads y conversiones"
          />
        </div>
      </section>
    </div>
  )
}

function Benefit({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--bg-raised)] shrink-0">
        <Icon className="w-4 h-4 text-[var(--teal-700)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-1)]">{title}</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{description}</p>
      </div>
    </div>
  )
}
