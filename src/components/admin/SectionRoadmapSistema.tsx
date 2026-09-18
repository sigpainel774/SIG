'use client'

import React, { useState } from 'react'
import {
  Milestone,
  CheckCircle2,
  Clock,
  Rocket,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  roadmapSections,
  ROADMAP_LAST_UPDATE,
  ROADMAP_STATUS_GERAL,
  type RoadmapSection,
  type RoadmapGroup,
  type RoadmapItem,
} from '@/lib/roadmap-data'

/* ─────────────────────────── helpers ────────────────────────── */

function totalItems(section: RoadmapSection): number {
  if (section.groups) {
    return section.groups.reduce((acc, g) => acc + g.items.length, 0)
  }
  return section.items?.length ?? 0
}

/* ─────────────────────────── sub-components ─────────────────── */

function ItemRow({ item }: { item: RoadmapItem }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!item.detail

  return (
    <div className="group/item">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          'w-full flex items-start gap-2.5 py-2 px-3 rounded-lg text-left transition-colors',
          hasDetail
            ? 'hover:bg-muted/60 cursor-pointer'
            : 'cursor-default'
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground leading-snug">
            {item.title}
          </span>
          {hasDetail && (
            <span className="ml-2 inline-flex items-center">
              {open ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          )}
        </div>
      </button>
      {hasDetail && open && (
        <p className="ml-9 mr-3 mb-1.5 text-xs text-muted-foreground leading-relaxed">
          {item.detail}
        </p>
      )}
    </div>
  )
}

function GroupAccordion({ group }: { group: RoadmapGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/60 dark:bg-muted/10 dark:hover:bg-muted/20 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{group.emoji}</span>
          <span className="text-sm font-semibold text-foreground">{group.label}</span>
          <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
            {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <div className="text-muted-foreground shrink-0">
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="px-2 py-2 space-y-0.5">
          {group.items.map((item, i) => (
            <ItemRow key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function InProgressItemRow({ item }: { item: RoadmapItem }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!item.detail

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          'w-full flex items-start gap-2.5 py-2 px-3 rounded-lg text-left transition-colors',
          hasDetail ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'
        )}
      >
        <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground leading-snug">
            {item.title}
          </span>
          {hasDetail && (
            <span className="ml-2 inline-flex items-center">
              {open ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          )}
        </div>
      </button>
      {hasDetail && open && (
        <p className="ml-9 mr-3 mb-1.5 text-xs text-muted-foreground leading-relaxed">
          {item.detail}
        </p>
      )}
    </div>
  )
}

function PlannedItemRow({ item }: { item: RoadmapItem }) {
  const [open, setOpen] = useState(false)
  const hasDetail = !!item.detail

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          'w-full flex items-start gap-2.5 py-2 px-3 rounded-lg text-left transition-colors',
          hasDetail ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'
        )}
      >
        <Rocket className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground leading-snug">
            {item.title}
          </span>
          {hasDetail && (
            <span className="ml-2 inline-flex items-center">
              {open ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          )}
        </div>
      </button>
      {hasDetail && open && (
        <p className="ml-9 mr-3 mb-1.5 text-xs text-muted-foreground leading-relaxed">
          {item.detail}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────── config por status ──────────────────── */

const STATUS_CONFIG = {
  done: {
    label: 'Operacional',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    headerBorder: 'border-emerald-500/20 dark:border-emerald-500/25',
    headerBg: 'bg-emerald-500/5 dark:bg-emerald-950/20',
    dot: 'bg-emerald-500',
  },
  'in-progress': {
    label: 'Em Andamento',
    badgeClass:
      'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    headerBorder: 'border-amber-500/20 dark:border-amber-500/25',
    headerBg: 'bg-amber-500/5 dark:bg-amber-950/20',
    dot: 'bg-amber-500',
  },
  planned: {
    label: 'Planejado',
    badgeClass:
      'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    headerBorder: 'border-sky-500/20 dark:border-sky-500/25',
    headerBg: 'bg-sky-500/5 dark:bg-sky-950/20',
    dot: 'bg-sky-500',
  },
} as const

/* ─────────────────────── SectionAccordion ───────────────────── */

function SectionAccordion({ section }: { section: RoadmapSection }) {
  const [open, setOpen] = useState(section.status === 'done') // concluídos abertos por padrão
  const config = STATUS_CONFIG[section.status]
  const count = totalItems(section)

  return (
    <div
      className={cn(
        'border rounded-2xl overflow-hidden shadow-sm',
        config.headerBorder
      )}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-5 py-4 transition-colors cursor-pointer text-left',
          config.headerBg,
          'hover:brightness-95 dark:hover:brightness-110'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', config.dot)} />
          <span className="text-sm md:text-base font-bold text-foreground tracking-tight">
            {section.title}
          </span>
          <span
            className={cn(
              'hidden sm:inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
              config.badgeClass
            )}
          >
            {config.label}
          </span>
          <span className="hidden md:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {count} {count === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <div className="text-muted-foreground shrink-0">
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Section Body */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out bg-card',
          open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="px-4 py-4">
          {/* Done: sub-accordions por grupo */}
          {section.status === 'done' && section.groups && (
            <div className="space-y-2">
              {section.groups.map((group) => (
                <GroupAccordion key={group.id} group={group} />
              ))}
            </div>
          )}

          {/* In-progress: lista simples com ícone Clock */}
          {section.status === 'in-progress' && section.items && (
            <div className="space-y-0.5">
              {section.items.map((item, i) => (
                <InProgressItemRow key={i} item={item} />
              ))}
            </div>
          )}

          {/* Planned: lista simples com ícone Rocket */}
          {section.status === 'planned' && section.items && (
            <div className="space-y-0.5">
              {section.items.map((item, i) => (
                <PlannedItemRow key={i} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Main Component ─────────────────────── */

export function SectionRoadmapSistema() {
  const doneSections = roadmapSections.filter((s) => s.status === 'done')
  const inProgressSections = roadmapSections.filter((s) => s.status === 'in-progress')
  const plannedSections = roadmapSections.filter((s) => s.status === 'planned')

  const totalDone = doneSections.reduce((acc, s) => acc + totalItems(s), 0)
  const totalInProgress = inProgressSections.reduce((acc, s) => acc + totalItems(s), 0)
  const totalPlanned = plannedSections.reduce((acc, s) => acc + totalItems(s), 0)

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border border-violet-500/20 dark:border-violet-500/30">
            <Milestone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
              Roadmap do Sistema
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-violet-500/10 text-violet-700 border border-violet-500/25 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30 uppercase tracking-wider">
                SIG
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug max-w-xl">
              {ROADMAP_STATUS_GERAL}
            </p>
          </div>
        </div>

        {/* Badges de contagem */}
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {totalDone} concluídos
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            {totalInProgress} em andamento
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-700 border border-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 font-semibold">
            <Rocket className="w-3.5 h-3.5" />
            {totalPlanned} planejados
          </span>
          <span className="hidden sm:inline-flex text-[11px] text-muted-foreground px-2.5 py-1.5 rounded-xl bg-muted border border-border font-medium">
            Atualizado: {ROADMAP_LAST_UPDATE}
          </span>
        </div>
      </div>

      {/* ── Accordion Sections ── */}
      <div className="p-4 space-y-3">
        {roadmapSections.map((section) => (
          <SectionAccordion key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}
