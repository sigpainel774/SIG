'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings2,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'

// ─── Tokens visuais do Gabinete Cívico Contemporâneo ───────────────
const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'
const FUNDO = '#F6F9FC'
const TEXTO_PRINCIPAL = '#102D50'
const BORDA = '#DCE7F2'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

const navItems: NavItem[] = [
  { href: '/portal-aluno/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/portal-aluno/mensagens', label: 'Mensagens', icon: MessageSquareText },
  { href: '/portal-aluno/solicitacoes', label: 'Solicitações', icon: FileCheck2 },
]

interface PortalPaisLayoutProps {
  children: React.ReactNode
  /** Nome do responsável logado para saudação */
  nomeResponsavel?: string
  /** Iniciais para o avatar */
  iniciais?: string
  /** Callback de logout */
  onLogout?: () => void
  /** Subtítulo do header (ex: "Boletim de Alexandre") */
  headerSubtitle?: string
  /** Número de notificações não lidas */
  notificacoes?: number
}

export default function PortalPaisLayout({
  children,
  nomeResponsavel = 'Responsável',
  iniciais,
  onLogout,
  headerSubtitle,
  notificacoes = 0,
}: PortalPaisLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const primeiroNome = nomeResponsavel.split(' ')[0]
  const avatarIniciais =
    iniciais ??
    nomeResponsavel
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div
      className="min-h-screen text-[#102D50]"
      style={{ backgroundColor: FUNDO, fontFamily: 'var(--font-source-sans), sans-serif' }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[278px] flex-col border-r bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ borderColor: BORDA }}
      >
        {/* Cabeçalho da sidebar */}
        <div
          className="flex h-[72px] items-center justify-between border-b px-5"
          style={{ borderColor: BORDA }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white shadow-sm"
              style={{ backgroundColor: AZUL }}
            >
              P
            </div>
            <div className="leading-tight">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: LARANJA }}
              >
                Portal dos Pais
              </p>
              <p className="text-[14px] font-extrabold" style={{ color: TEXTO_PRINCIPAL }}>
                Sapeaçu
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu lateral"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Perfil do responsável */}
        <div className="px-4 pt-5">
          <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: '#F4F8FC' }}>
            <div
              className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
              style={{ backgroundColor: AZUL }}
            >
              {avatarIniciais}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-bold"
                style={{ color: '#17375D' }}
              >
                {nomeResponsavel}
              </p>
              <p className="text-xs text-slate-500">Responsável familiar</p>
            </div>
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="Online" />
          </div>
        </div>

        {/* Navegação principal */}
        <nav className="mt-7 flex-1 px-4" aria-label="Navegação do portal">
          <p className="px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Menu principal
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-all duration-150 ${
                    active ? 'text-white' : 'text-[#58718D] hover:bg-[#F2F7FC] hover:text-[#0B4FB3]'
                  }`}
                  style={active ? { backgroundColor: AZUL, boxShadow: '0 8px 18px rgba(11,79,179,0.22)' } : {}}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={`size-[18px] ${active ? 'text-[#FFB466]' : 'text-slate-400 group-hover:text-[#0B4FB3]'}`}
                    aria-hidden="true"
                  />
                  {item.label}
                  {item.badge && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
                        active ? 'bg-white/15 text-white' : 'text-[#D96507]'
                      }`}
                      style={!active ? { backgroundColor: '#FFF1E5' } : {}}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="my-6 h-px" style={{ backgroundColor: '#E8EFF6' }} />

          <p className="px-3 pb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Precisa de ajuda?
          </p>
          <Link
            href="/portal-aluno/ajuda"
            onClick={() => setMobileOpen(false)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-all duration-150 ${
              isActive('/portal-aluno/ajuda')
                ? 'text-white'
                : 'text-[#58718D] hover:bg-[#FFF6EE] hover:text-[#D96507]'
            }`}
            style={
              isActive('/portal-aluno/ajuda')
                ? { backgroundColor: LARANJA, boxShadow: '0 8px 18px rgba(244,124,18,0.22)' }
                : {}
            }
          >
            <CircleHelp
              className={`size-[18px] ${
                isActive('/portal-aluno/ajuda') ? 'text-white' : 'text-slate-400 group-hover:text-[#F47C12]'
              }`}
              aria-hidden="true"
            />
            Central de ajuda
          </Link>
        </nav>

        {/* Banner de destaque */}
        <div
          className="m-4 rounded-2xl p-4 text-white"
          style={{
            background: `linear-gradient(135deg, rgba(11,79,179,0.98), rgba(8,57,132,0.96))`,
            boxShadow: '0 12px 22px rgba(11,79,179,0.16)',
          }}
        >
          <Sparkles className="mb-2 size-4 text-[#FFB466]" aria-hidden="true" />
          <p className="text-sm font-extrabold">Tudo em um só lugar</p>
          <p className="mt-1 text-[11px] leading-relaxed text-blue-100">
            Acompanhe a vida escolar dos seus filhos com mais tranquilidade.
          </p>
        </div>

        {/* Botão de sair */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="mx-4 mb-4 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-[#0B4FB3]"
            aria-label="Sair do portal"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            Sair do portal
          </button>
        )}
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[#082E62]/25 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Conteúdo principal ── */}
      <div className="lg:pl-[278px]">
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b px-4 backdrop-blur-xl sm:px-7"
          style={{ borderColor: '#E3ECF4', backgroundColor: 'rgba(255,255,255,0.92)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu lateral"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: LARANJA }}
              >
                {headerSubtitle ?? 'Portal dos Pais'}
              </p>
              <h1
                className="text-[19px] font-extrabold tracking-tight sm:text-[22px]"
                style={{ color: TEXTO_PRINCIPAL, fontFamily: 'var(--font-manrope), sans-serif' }}
              >
                Olá, {primeiroNome}
                <span className="hidden font-medium text-slate-400 sm:inline"> — bem-vindo(a).</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label={notificacoes > 0 ? `${notificacoes} notificações não lidas` : 'Notificações'}
              className="relative grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-[#F2F7FC] hover:text-[#0B4FB3]"
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              {notificacoes > 0 && (
                <span
                  className="absolute right-2 top-1.5 size-2 rounded-full border-2 border-white"
                  style={{ backgroundColor: LARANJA }}
                />
              )}
            </button>
            <div className="hidden h-7 w-px bg-[#E3ECF4] sm:block" />
            <div
              className="grid size-9 place-items-center rounded-xl text-xs font-extrabold text-white"
              style={{ backgroundColor: AZUL }}
              aria-label={`Avatar de ${nomeResponsavel}`}
            >
              {avatarIniciais}
            </div>
          </div>
        </header>

        {/* Área de conteúdo com animação de entrada */}
        <main
          className="relative overflow-hidden px-4 py-6 sm:px-7 sm:py-8"
          style={{
            animation: 'portalRiseIn 380ms cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {/* Luz de fundo decorativa */}
          <div
            className="pointer-events-none absolute -right-24 -top-20 size-[380px] rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(220,235,250,0.5)' }}
          />
          {children}
        </main>
      </div>

      {/* Keyframes da animação de entrada — injetados inline para isolamento */}
      <style>{`
        @keyframes portalRiseIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="portalRiseIn"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
