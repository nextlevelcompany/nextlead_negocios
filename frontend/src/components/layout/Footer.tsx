export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex h-14 px-6 items-center justify-between text-sm text-muted-foreground">
        <span>
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-foreground">NextLead CRM</span>. Todos los derechos reservados.
        </span>
        <span>
          Sistema de Gestión Comercial & WhatsApp Cloud
        </span>
      </div>
    </footer>
  )
}
