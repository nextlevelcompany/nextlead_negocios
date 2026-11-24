"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  MessageSquare,
  Target,
  Receipt,
  ShoppingBag,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNavigationBar() {
  const pathname = usePathname()

  const navItems = [
    {
      label: "Inicio",
      href: "/dashboard/analytics",
      icon: Home,
      isActive: pathname.startsWith("/dashboard"),
    },
    {
      label: "WhatsApp",
      href: "/applications/chatbox",
      icon: MessageSquare,
      isActive: pathname.startsWith("/applications/chatbox"),
    },
    {
      label: "Oportunidades",
      href: "/opportunities/view",
      icon: Target,
      isActive: pathname.startsWith("/opportunities"),
    },
    {
      label: "Ventas",
      href: "/ventas/view",
      icon: Receipt,
      isActive: pathname.startsWith("/ventas"),
    },
    {
      label: "Productos",
      href: "/eCommerce/product-list",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/eCommerce") || pathname.startsWith("/productos"),
    },
  ]

  return (
    <nav
      aria-label="Navegación Móvil Inferior"
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] h-16"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.label}
            href={item.href}
            prefetch={false}
            className={cn(
              "flex flex-1 flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors select-none",
              item.isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Icon className={cn("size-5 transition-transform", item.isActive && "scale-110")} />
              {item.isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1 line-clamp-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
