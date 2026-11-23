"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

interface NavItemProps {
  item: any
  pathname: string
}

// Checks if a given target URL matches the current route or module
function isUrlMatching(targetUrl: string, currentPath: string): boolean {
  if (!targetUrl || targetUrl === "#") return false
  if (currentPath === targetUrl || currentPath.startsWith(targetUrl + "/")) return true

  const targetSeg = targetUrl.split("/").filter(Boolean)[0]
  const pathSeg = currentPath.split("/").filter(Boolean)[0]
  if (targetSeg && pathSeg && targetSeg === pathSeg) {
    return true
  }
  return false
}

// Exact match for the leaf link active styling
function isLinkActive(targetUrl: string, currentPath: string): boolean {
  if (!targetUrl || targetUrl === "#") return false
  return currentPath === targetUrl || currentPath.startsWith(targetUrl + "/")
}

function NavSubItem({ subItem, pathname }: { subItem: any; pathname: string }) {
  const hasChildren = Array.isArray(subItem.items) && subItem.items.length > 0
  const isChildActive =
    hasChildren && subItem.items.some((child: any) => isUrlMatching(child.url, pathname))

  const [open, setOpen] = useState(isChildActive)

  // Submenu only expands when active, collapses when moving away
  useEffect(() => {
    setOpen(isChildActive)
  }, [pathname, isChildActive])

  if (hasChildren) {
    return (
      <SidebarMenuSubItem>
        <Collapsible open={open} onOpenChange={setOpen} className="group w-full">
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton className="group h-8 min-h-8 pl-6 cursor-pointer" isActive={isChildActive}>
              <span>{subItem.title}</span>
              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {subItem.items.map((child: any) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isLinkActive(child.url, pathname)}
                    className="h-8 min-h-8 pl-6"
                  >
                    <Link href={child.url}>
                      {child.title}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={isLinkActive(subItem.url, pathname)}
        className="h-8 min-h-8 pl-6"
      >
        <Link href={subItem.url || "#"}>
          {subItem.title}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function NavItem({ item, pathname }: NavItemProps) {
  const isParentActive = (): boolean => {
    if (!item.items || item.items.length === 0) return false
    return item.items.some((sub: any) => {
      if (sub.items && Array.isArray(sub.items)) {
        return sub.items.some((child: any) => isUrlMatching(child.url, pathname))
      }
      return isUrlMatching(sub.url, pathname)
    })
  }

  const hasChildren = Array.isArray(item.items) && item.items.length > 0
  const parentActive = isParentActive()
  const [open, setOpen] = useState(parentActive)

  // Only deploy / stay open after mounting on client and when the route matches
  useEffect(() => {
    setOpen(parentActive)
  }, [pathname, parentActive])

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isLinkActive(item.url, pathname)}>
          <Link href={item.url || "#"}>
            {item.icon}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group w-full">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="group cursor-pointer" isActive={parentActive}>
            {item.icon}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem: any) => (
              <NavSubItem key={subItem.title} subItem={subItem} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export interface NavGroup {
  label?: string
  items: any[]
}

export function NavMain({
  groups,
  items,
}: {
  groups?: NavGroup[]
  items?: any[]
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="space-y-4 px-3 py-2 animate-pulse" aria-hidden="true">
        <div className="space-y-1.5">
          <div className="h-3 w-16 bg-muted-foreground/15 rounded px-2" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-muted-foreground/15 rounded px-2" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-muted-foreground/15 rounded px-2" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
          <div className="h-8 w-full bg-muted-foreground/10 rounded-md" />
        </div>
      </div>
    )
  }

  if (groups && groups.length > 0) {
    return (
      <div className="space-y-2 py-1">
        {groups.map((group, gIdx) => (
          <SidebarGroup key={group.label || gIdx} className="p-0 px-3">
            {group.label && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 h-6 select-none">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item: any) => (
                  <NavItem key={item.title} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </div>
    )
  }

  return (
    <SidebarMenu className="px-3 py-2">
      {(items || []).map((item: any) => (
        <NavItem key={item.title} item={item} pathname={pathname} />
      ))}
    </SidebarMenu>
  )
}
