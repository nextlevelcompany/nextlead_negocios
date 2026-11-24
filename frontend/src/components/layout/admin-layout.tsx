"use client"

import { useEffect, useState } from "react"
import { Menu } from "@boxicons/react"

import { AppSidebar } from "@/components/app-sidebar"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { AppLauncherDropdown } from "@/components/appLauncher-dropdown"
import { ThemeToggle } from "@/components/theme-toggle"
import { GlobalSearch } from "@/components/global-search"
import { UserDropdown } from "@/components/UserDropdown"
import { MobileHeader } from "@/components/layout/MobileHeader"
import { BottomNavigationBar } from "@/components/layout/BottomNavigationBar"
import { MobileDrawerMenu } from "@/components/layout/MobileDrawerMenu"

import Footer from "@/components/layout/Footer"

import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function LayoutContent({
  children,
  scrolled,
  onOpenMobileDrawer,
}: {
  children: React.ReactNode
  scrolled: boolean
  onOpenMobileDrawer: () => void
}) {
  const { toggleSidebar } = useSidebar()

  return (
    <SidebarInset className="min-w-0 max-w-full overflow-x-hidden print:w-full print:m-0 print:p-0 print:border-none print:shadow-none print:overflow-visible print:bg-white print:block">
      {/* Mobile Sticky Header */}
      <MobileHeader />

      {/* Desktop Sticky Header (Optimized for 14" Laptops and Desktops) */}
      <header
        className={cn(
          "sticky top-0 z-40 hidden md:flex h-14 xl:h-16 w-full shrink-0 items-center gap-2 border-b px-4 xl:px-6 shadow-xs transition-colors duration-150 print:hidden",
          scrolled
            ? "bg-background/95 backdrop-blur-sm shadow-xs"
            : "bg-background"
        )}
      >
        {/* Left */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Alternar barra lateral"
            className="h-9 w-9 rounded-md hover:bg-muted/60 transition-colors"
          >
            <Menu className="size-5 block shrink-0" />
          </Button>

          <GlobalSearch />
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AppLauncherDropdown />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </header>

      {/* Main Content Area - Responsive padding and bottom clearance for Mobile Nav */}
      <main className="flex flex-1 flex-col p-3 sm:p-4 lg:p-4 xl:p-6 bg-muted min-w-0 max-w-full pb-20 md:pb-6 print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
        {children}
      </main>

      {/* Bottom Navigation Bar on Mobile */}
      <BottomNavigationBar onOpenDrawer={onOpenMobileDrawer} />

      {/* Desktop Footer */}
      <div className="hidden md:block print:hidden">
        <Footer />
      </div>
    </SidebarInset>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Sidebar states
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)

  const isExpanded = open || hovered

  // Header scroll effect with threshold check to avoid unnecessary state updates
  useEffect(() => {
    let ticking = false

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 15
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev))
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Responsive sidebar:
  // On screens >= 1440px -> default expanded
  // On 14" laptops (1024px - 1439px) -> default collapsed to icon mode to give maximum space
  // On mobile (< 768px) -> handled by mobile bottom bar & drawer
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1440) {
        setOpen(true)
      } else if (window.innerWidth >= 1024) {
        setOpen(false) // Icon mode on 14" screens for maximum canvas width
      } else {
        setOpen(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <SidebarProvider
      open={isExpanded}
      onOpenChange={setOpen}
      className="print:block print:w-full print:min-h-0 print:m-0 print:p-0"
    >
      <div className="hidden md:block print:hidden">
        <AppSidebar onHoverChange={setHovered} />
      </div>

      <LayoutContent
        scrolled={scrolled}
        onOpenMobileDrawer={() => setDrawerOpen(true)}
      >
        {children}
      </LayoutContent>

      {/* Global Mobile Drawer */}
      <MobileDrawerMenu
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </SidebarProvider>
  )
}
