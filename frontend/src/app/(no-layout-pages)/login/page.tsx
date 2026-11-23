import { LoginForm } from "@/components/login-form"
import { MessageSquare, ShieldCheck, Zap } from "lucide-react"

export const metadata = {
  title: "Iniciar Sesión | NextLead CRM",
  description: "Acceso seguro a la plataforma NextLead CRM & WhatsApp AI",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-foreground">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Branding Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              NextLead <span className="text-emerald-400 font-semibold text-base">CRM</span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Zap className="size-3 text-emerald-400" /> WhatsApp & Inteligencia Artificial
            </p>
          </div>
        </div>

        {/* Login Card */}
        <LoginForm />

        {/* Security badge footer */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span>Protección de acceso NextLead &bull; Todos los derechos reservados</span>
        </div>
      </div>
    </div>
  )
}
