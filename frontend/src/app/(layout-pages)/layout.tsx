import { TooltipProvider } from "@/components/ui/tooltip"
import AdminLayout from "@/components/layout/admin-layout"
import { Toaster } from "sonner"
import ThemeCustomizer from "@/components/theme-customizer"
import { AuthGuard } from "@/components/auth/AuthGuard"

export default function LayoutPages({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <AuthGuard>
        <AdminLayout>
          {children}
          <div className="print:hidden">
            <Toaster
              position="top-right"
              richColors
              closeButton
            />
            <ThemeCustomizer />
          </div>
        </AdminLayout>
      </AuthGuard>
    </TooltipProvider>
  )
}
