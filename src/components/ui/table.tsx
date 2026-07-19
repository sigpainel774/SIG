"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

export interface TableColumn<T> {
  header: React.ReactNode
  accessor: (item: T, index: number) => React.ReactNode
  className?: string
  headClassName?: string
}

export interface StandardTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  keyExtractor: (item: T, index: number) => string
  emptyMessage?: string
  loading?: boolean
  loadingMessage?: string
  className?: string
  tableClassName?: string
  rowClassName?: string | ((item: T, index: number) => string)
}

export function StandardTable<T,>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "Nenhum registro encontrado.",
  loading = false,
  loadingMessage = "Carregando dados...",
  className,
  tableClassName,
  rowClassName,
}: StandardTableProps<T>) {
  return (
    <div className={cn("rounded-2xl border border-borderCustom overflow-hidden bg-[#121212] shadow-md", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow className="border-b border-borderCustom bg-[#0d0d0d] text-zinc-400 hover:bg-transparent">
            {columns.map((col, index) => (
              <TableHead
                key={index}
                className={cn("p-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground", col.headClassName)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-8 text-center text-zinc-500">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                  <span>{loadingMessage}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-8 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const customRowClass = typeof rowClassName === "function" ? rowClassName(item, index) : rowClassName
              return (
                <TableRow
                  key={keyExtractor(item, index)}
                  className={cn("hover:bg-hoverCustom/30 transition-colors border-b border-borderCustom/50", customRowClass)}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className={cn("p-3.5", col.className)}>
                      {col.accessor(item, index)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
