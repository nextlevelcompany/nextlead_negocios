"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface DataTablePaginationProps {
  currentPage: number; // 1-based
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = "registros",
  className = "",
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 bg-card border-t text-xs text-muted-foreground w-full select-none ${className}`}
    >
      {/* Informative text */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Mostrando</span>
        <span className="font-semibold text-foreground font-mono">
          {startItem.toLocaleString("es-PE")}
        </span>
        <span>a</span>
        <span className="font-semibold text-foreground font-mono">
          {endItem.toLocaleString("es-PE")}
        </span>
        <span>de</span>
        <span className="font-semibold text-foreground font-mono">
          {totalItems.toLocaleString("es-PE")}
        </span>
        <span>{itemName}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Filas:
            </span>
            <select
              className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground shadow-2xs font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            title="Primera página"
          >
            <ChevronsLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            title="Página anterior"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <div className="px-2 text-xs font-medium text-foreground whitespace-nowrap">
            Pág. <span className="font-bold">{safePage}</span> de{" "}
            <span className="font-bold">{totalPages}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            title="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            title="Última página"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
