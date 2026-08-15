'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import {
  GraduationCap,
  School,
  ArrowRight,
  ShieldAlert,
  Loader2,
  BookOpen,
  MessageSquareText,
  CalendarDays,
  FileText,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

// ─── Tipos ────────────────────────────────────────────────────────────────
interface Escola {
  id: string
  nome: string
  portal_pais_ativo: boolean
}

interface Turma {
  id: string
  nome: string
  turno: string | null
}

interface Filho {
  vinculo_id: string
  parentesco: string
  id: string
  nome: string
  numero_matricula: string | null
  foto_url: string | null
  turma: Turma | null
  escola: Escola | null
}

interface Responsavel {
  id: string
  nome: string
  email: string
}

// Timestamp de sessão para cache-busting de imagens (ES-22)
const sessionTs = Date.now()

// Card de filho/dependente
function ChildCard({ filho, portalAtivo }: { filho: Filho; portalAtivo: boolean }) {
  const iniciais = filho.nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  // ES-22: cache-busting + fallback onError
  const [imgError, setImgError] = useState(false)
  const fotoUrl = filho.foto_url && !imgError
    ? `${filho.foto_url.split('?')[0]}?t=${sessionTs}`
    : null

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition-all duration-200 ${
        portalAtivo
          ? 'hover:border-[#BDD5ED] hover:shadow-[0_8px_20px_rgba(18,45,76,0.07)] cursor-pointer'
          : 'opacity-70'
      }`}
      style={{ borderColor: '#E5EDF5' }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white overflow-hidden"
          style={{ backgroundColor: '#0B4FB3' }}
        >
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={filho.nome}
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            iniciais
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <p className="truncate text-sm font-extrabold" style={{ color: '#17375D' }}>
              {filho.nome}
            </p>
            <span className="w-fit rounded-full bg-[#EEF7EE] px-2 py-0.5 text-[10px] font-extrabold text-[#438450]">
              Vínculo ativo
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
            {filho.turma?.nome ?? 'Sem Turma'}
            <span className="text-slate-300">•</span>
            {filho.escola?.nome ?? 'Escola Municipal'}
          </p>
        </div>
      </div>

      {/* Rodapé do card */}
      <div
        className="mt-3 flex items-center justify-between border-t pt-3"
        style={{ borderColor: '#EDF2F7' }}
      >
        {portalAtivo ? (
          <Link href={`/portal-aluno/dashboard/${filho.id}`} className="w-full">
            <span className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-extrabold transition hover:bg-[#E6F0FB]" style={{ backgroundColor: '#F4F8FC', color: '#0B4FB3' }}>
              Acessar boletim
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 py-1 text-xs text-amber-600">
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>Portal desativado nesta escola</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Card de métricas do painel
function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string
  detail: string
  accent: string
  href?: string
}) {
  const content = (
    <div
      className="rounded-2xl border border-l-4 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(18,45,76,0.10)] cursor-pointer h-full flex flex-col justify-between"
      style={{
        borderColor: '#E5EDF5',
        borderLeftColor: accent,
        boxShadow: '0 12px 30px rgba(18,45,76,0.05)',
      }}
    >
      <div>
        <div className="flex items-start justify-between">
          <div
            className="grid size-10 place-items-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </div>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-[#50709A]" style={{ backgroundColor: '#F1F6FC' }}>
            Acessar
          </span>
        </div>
        <p className="mt-4 text-[13px] font-semibold text-slate-500">{label}</p>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-[26px] font-extrabold tracking-[-0.04em]"
          style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
        >
          {value}
        </span>
        <span className="text-xs font-semibold text-[#55708D]">{detail}</span>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }
  return content
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function PortalAlunoDashboardPage() {
  const router = useRouter()
  // ES-07: createClient estável com useMemo
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [responsavel, setResponsavel] = useState<Responsavel | null>(null)
  const [filhos, setFilhos] = useState<Filho[]>([])
  const [totalOcorrenciasPendentes, setTotalOcorrenciasPendentes] = useState<number>(0)
  const [totalSolicitacoes, setTotalSolicitacoes] = useState<number>(0)
  const [totalMensagens, setTotalMensagens] = useState<number>(0)

  useEffect(() => {
    // ES-06: flag de montagem para evitar setState em componente desmontado
    let active = true

    async function carregarDadosPortal() {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/portal-aluno/login')
          return
        }

        // 1. Buscar dados do responsável (apenas campos necessários)
        const { data: respData, error: respErr } = await supabase
          .from('responsaveis')
          .select('id, nome, email')
          .eq('auth_user_id', user.id)
          // ES-07 melhorado: verificar ativo
          .eq('ativo', true)
          .maybeSingle()

        if (respErr) throw respErr

        if (!respData) {
          if (active) {
            toast.error('Cadastro de responsável não localizado ou desativado. Procure a secretaria escolar.')
          }
          return
        }

        if (active) setResponsavel(respData)

        // 2. Buscar vínculos com alunos
        const { data: vinculosData, error: vincErr } = await supabase
          .from('responsaveis_alunos')
          .select(`
            id,
            parentesco,
            aluno:aluno_id (
              id,
              nome,
              numero_matricula,
              foto_url,
              turma:turma_id (id, nome, turno),
              escola:escola_id (id, nome, portal_pais_ativo)
            )
          `)
          .eq('responsavel_id', respData.id)

        if (vincErr) throw vincErr

        // ES-12: filtrar vínculos onde o aluno é null (aluno excluído/sem escola)
        const listaFilhos: Filho[] = (vinculosData ?? [])
          .filter((v: any) => v.aluno !== null)
          .map((v: any) => ({
            vinculo_id: v.id,
            parentesco: v.parentesco,
            ...v.aluno,
          }))

        if (active) setFilhos(listaFilhos)

        const alunoIds = listaFilhos.map((f) => f.id)

        // 3. Buscar métricas adicionais (ocorrências, solicitações, comunicações)
        if (alunoIds.length > 0) {
          const [ocoRes, solRes, msgRes] = await Promise.all([
            supabase
              .from('ocorrencias')
              .select('id, status_pais', { count: 'exact' })
              .in('aluno_id', alunoIds),
            (supabase as any)
              .from('solicitacoes_responsaveis')
              .select('id', { count: 'exact' })
              .eq('responsavel_id', respData.id)
              .is('deleted_at', null),
            (supabase as any)
              .from('mensagens_responsaveis')
              .select('id', { count: 'exact' })
              .in('aluno_id', alunoIds)
              .is('deleted_at', null),
          ])

          if (active) {
            const pendentes = (ocoRes.data ?? []).filter((o: any) => o.status_pais !== 'Cientes').length
            setTotalOcorrenciasPendentes(pendentes)
            setTotalSolicitacoes(solRes.count ?? solRes.data?.length ?? 0)
            setTotalMensagens(msgRes.count ?? msgRes.data?.length ?? 0)
          }
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar dashboard do portal:', err)
        if (active) {
          toast.error('Erro ao carregar dados dos seus dependentes.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    carregarDadosPortal()

    // ES-06: cleanup
    return () => {
      active = false
    }
    // ES-08: apenas [] — supabase e router são estáveis
  }, [supabase, router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Sessão encerrada com sucesso.')
      router.push('/portal-aluno/login')
    } catch (err: unknown) {
      console.error('Erro ao encerrar sessão:', err)
      toast.error('Falha ao encerrar sessão. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F6F9FC' }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#0B4FB3' }} />
          <p className="text-sm text-slate-500">Carregando informações escolares...</p>
        </div>
      </div>
    )
  }

  // ES-10: todasDesativadas só conta escolas que existem e têm portal desativado
  const todasDesativadas =
    filhos.length > 0 &&
    filhos.every((f) => f.escola !== null && !f.escola.portal_pais_ativo)

  // Métricas derivadas
  const totalFilhos = filhos.length
  const filhosComPortal = filhos.filter((f) => f.escola?.portal_pais_ativo).length

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
    >
      {/* Faixa institucional */}
      <div
        className="mb-5 flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_8px_22px_rgba(18,45,76,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{ borderColor: '#DCE7F2' }}
      >
        <div className="flex items-center gap-3">
          <GraduationCap className="size-8 shrink-0" style={{ color: '#0B4FB3' }} aria-hidden="true" />
          <p className="text-xs font-semibold leading-relaxed text-[#58718D]">
            Serviço digital oficial para acompanhamento escolar —{' '}
            <span className="font-extrabold" style={{ color: '#0B4FB3' }}>
              Secretaria Municipal de Educação de Sapeaçu
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#0B4FB3' }}>
          <span className="size-2 rounded-full bg-emerald-500" />
          Portal seguro
        </div>
      </div>

      {/* ── Hero banner ── */}
      <section
        className="relative overflow-hidden rounded-[22px] shadow-[0_18px_45px_rgba(11,79,179,0.18)]"
        style={{
          background: 'linear-gradient(90deg, rgba(8,59,138,0.97) 0%, rgba(11,79,179,0.90) 48%, rgba(11,79,179,0.55) 100%)',
        }}
      >
        <div className="relative px-6 py-8 sm:px-9 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold text-blue-50 ring-1 ring-white/15" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <span className="size-1.5 rounded-full" style={{ backgroundColor: '#FFB466' }} />
            Acompanhamento escolar
          </span>
          <h2
            className="mt-5 max-w-[470px] text-[27px] font-extrabold leading-[1.1] tracking-[-0.04em] text-white sm:text-[35px]"
            style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Seu acompanhamento escolar, mais claro e próximo.
          </h2>
          <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-blue-100">
            Consulte frequência, boletins, ocorrências e faça solicitações de documentos em um só lugar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => document.getElementById('filhos-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#F47C12', boxShadow: '0 8px 18px rgba(244,124,18,0.28)' }}
            >
              Ver estudantes
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            <Link
              href="/portal-aluno/solicitacoes"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white bg-white/15 hover:bg-white/25 transition"
            >
              <FileCheck2 className="size-4 text-[#FFB466]" />
              Pedir Declaração Bolsa Família
            </Link>
          </div>
        </div>
      </section>

      {/* ── Métricas com navegação direta ── */}
      <div className="relative mt-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em]" style={{ color: '#F47C12' }}>
            Painel de acompanhamento
          </p>
          <h2
            className="mt-1 text-[22px] font-extrabold tracking-[-0.03em]"
            style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Como estão seus filhos?
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={GraduationCap}
          label="Filhos matriculados"
          value={String(totalFilhos)}
          detail="ativos na rede"
          accent="#0B4FB3"
          href="#filhos-section"
        />
        <MetricCard
          icon={MessageSquareText}
          label="Comunicações"
          value={totalMensagens > 0 ? String(totalMensagens) : 'Canal'}
          detail={totalMensagens > 0 ? 'mensagens enviadas' : 'falar com a escola'}
          accent="#083B8A"
          href="/portal-aluno/comunicacoes"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Ocorrências"
          value={totalOcorrenciasPendentes > 0 ? `${totalOcorrenciasPendentes} pend.` : 'Em dia'}
          detail={totalOcorrenciasPendentes > 0 ? 'requer sua ciência' : 'histórico disciplinar'}
          accent={totalOcorrenciasPendentes > 0 ? '#F47C12' : '#2C7CBE'}
          href="/portal-aluno/ocorrencias"
        />
        <MetricCard
          icon={FileCheck2}
          label="Solicitações Escolares"
          value={totalSolicitacoes > 0 ? String(totalSolicitacoes) : 'Pedir'}
          detail={totalSolicitacoes > 0 ? 'solicitações ativas' : 'Bolsa Família / Declarações'}
          accent="#102D50"
          href="/portal-aluno/solicitacoes"
        />
      </div>

      {/* ── Banner de Ações Rápidas ── */}
      <div className="mt-6 rounded-2xl bg-white border border-[#DCE7F2] p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-[#102D50] flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#0B4FB3]" />
              Precisa de Declaração para Bolsa Família ou Documentos?
            </h3>
            <p className="text-xs text-slate-500">
              Solicite atestados de matrícula e comprovantes para o CRAS sem precisar ir à escola antecipadamente.
            </p>
          </div>
          <Link href="/portal-aluno/solicitacoes">
            <Button
              className="font-bold text-white rounded-xl text-xs h-9 px-4 gap-2 cursor-pointer"
              style={{ backgroundColor: '#0B4FB3' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Fazer Solicitação Online
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Listagem de filhos ── */}
      <section id="filhos-section" className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-[17px] font-extrabold"
              style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Seus filhos e dependentes
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Acesse o acompanhamento individual de cada estudante.
            </p>
          </div>
        </div>

        {todasDesativadas ? (
          /* Tela amigável quando portal está desativado */
          <div
            className="max-w-lg mx-auto text-center rounded-2xl border bg-white p-8 space-y-5 shadow-sm"
            style={{ borderColor: '#DCE7F2' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
            >
              <ShieldAlert className="w-8 h-8 text-amber-600" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold" style={{ color: '#102D50' }}>
                Portal Temporariamente Indisponível
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                O acompanhamento escolar online ainda não está habilitado para a unidade escolar do seu filho(a).
              </p>
            </div>
            <div
              className="p-4 rounded-xl text-xs text-left space-y-1.5"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #DCE7F2' }}
            >
              <p className="font-semibold" style={{ color: '#102D50' }}>O que você pode fazer:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>Suas credenciais continuam válidas e salvas com segurança.</li>
                <li>Para notas, boletins ou declarações, procure a secretaria escolar.</li>
              </ul>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              style={{ borderColor: '#DCE7F2' }}
            >
              Sair da conta
            </button>
          </div>
        ) : filhos.length === 0 ? (
          /* Empty state */
          <div
            className="max-w-md mx-auto text-center rounded-2xl border bg-white p-8 space-y-4 shadow-sm"
            style={{ borderColor: '#DCE7F2' }}
          >
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" aria-hidden="true" />
            <h3 className="text-lg font-bold" style={{ color: '#102D50' }}>
              Nenhum Dependente Localizado
            </h3>
            <p className="text-xs text-slate-500">
              Não encontramos nenhum aluno vinculado ao seu cadastro no momento. Solicite a vinculação na secretaria da escola.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filhos.map((filho) => (
              <ChildCard
                key={filho.id}
                filho={filho}
                portalAtivo={filho.escola?.portal_pais_ativo === true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Rodapé */}
      <footer
        className="mt-10 flex flex-col gap-2 border-t pt-5 text-[11px] font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: '#E2EAF2' }}
      >
        <span>Portal dos Pais • Secretaria Municipal de Educação de Sapeaçu</span>
        <span>Sistema SIG — Gestão Escolar Municipal</span>
      </footer>
    </PortalPaisLayout>
  )
}
