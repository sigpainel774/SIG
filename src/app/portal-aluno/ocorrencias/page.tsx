'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  User,
  Building2,
  Calendar,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

const LARANJA = '#F47C12'

interface AlunoDependente {
  id: string
  nome: string
  numero_matricula: string | null
  turma: {
    nome: string
  } | null
  escola: {
    id: string
    nome: string
    portal_pais_ativo: boolean
  } | null
}

interface OcorrenciaItem {
  id: string
  aluno_id: string
  data: string
  tipo: string
  gravidade: string | null
  descricao: string
  status_pais: string | null
  created_at: string | null
  aluno?: {
    id: string
    nome: string
    numero_matricula: string | null
    turma?: { nome: string } | null
    escola?: { nome: string } | null
  }
}

export default function OcorrenciasPaisPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [responsavel, setResponsavel] = useState<{ id: string; nome: string; email: string } | null>(null)
  const [filhos, setFilhos] = useState<AlunoDependente[]>([])
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaItem[]>([])
  
  // Filtros
  const [filhoFiltro, setFilhoFiltro] = useState<string>('todos')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendentes' | 'cientes'>('todos')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [marcandoCienteId, setMarcandoCienteId] = useState<string | null>(null)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData?.user

      if (!authUser) {
        router.push('/portal-aluno/login')
        return
      }

      // 1. Buscar perfil do responsável
      const { data: respData, error: respError } = await supabase
        .from('responsaveis')
        .select('id, nome, email')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (respError || !respData) {
        toast.error('Perfil de responsável não encontrado.')
        return
      }

      if (!isMounted.current) return
      setResponsavel(respData)

      // 2. Buscar dependentes vinculados
      const { data: vinculosData, error: vincError } = await supabase
        .from('responsaveis_alunos')
        .select(`
          aluno_id,
          aluno:aluno_id (
            id,
            nome,
            numero_matricula,
            escola:escola_id (id, nome, portal_pais_ativo),
            turma:turma_id (nome)
          )
        `)
        .eq('responsavel_id', respData.id)

      if (vincError) throw vincError

      const listaFilhos: AlunoDependente[] = (vinculosData ?? [])
        .map((v: any) => v.aluno)
        .filter(Boolean)

      if (!isMounted.current) return
      setFilhos(listaFilhos)

      if (listaFilhos.length === 0) {
        setOcorrencias([])
        return
      }

      const alunoIds = listaFilhos.map((f) => f.id)

      // 3. Buscar ocorrências de todos os filhos
      const { data: ocoData, error: ocoError } = await supabase
        .from('ocorrencias')
        .select(`
          id,
          aluno_id,
          data,
          tipo,
          gravidade,
          descricao,
          status_pais,
          created_at,
          aluno:aluno_id (
            id,
            nome,
            numero_matricula,
            turma:turma_id (nome),
            escola:escola_id (nome)
          )
        `)
        .in('aluno_id', alunoIds)
        .order('data', { ascending: false })

      if (ocoError) throw ocoError

      if (!isMounted.current) return
      setOcorrencias((ocoData as any[]) ?? [])
    } catch (err: unknown) {
      console.error('Erro ao carregar ocorrências:', err)
      toast.error('Erro ao carregar registro de ocorrências.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [supabase, router])

  const handleMarcarCiente = async (ocorrenciaId: string) => {
    setMarcandoCienteId(ocorrenciaId)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status_pais: 'Cientes' } as any)
        .eq('id', ocorrenciaId)

      if (error) throw error

      setOcorrencias((prev) =>
        prev.map((o) => (o.id === ocorrenciaId ? { ...o, status_pais: 'Cientes' } : o))
      )
      toast.success('Ciência registrada com sucesso!')
    } catch (err: unknown) {
      console.error('Erro ao registrar ciência:', err)
      toast.error('Erro ao registrar ciência. Tente novamente.')
    } finally {
      setMarcandoCienteId(null)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err: unknown) {
      console.error('Erro ao sair:', err)
    } finally {
      router.push('/portal-aluno/login')
    }
  }

  // Filtragem local
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((oco) => {
      // Filtro por filho
      if (filhoFiltro !== 'todos' && oco.aluno_id !== filhoFiltro) {
        return false
      }

      // Filtro por status
      if (statusFiltro === 'pendentes' && oco.status_pais === 'Cientes') {
        return false
      }
      if (statusFiltro === 'cientes' && oco.status_pais !== 'Cientes') {
        return false
      }

      // Filtro por texto
      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase()
        const tipoMatch = oco.tipo?.toLowerCase().includes(termo)
        const descMatch = oco.descricao?.toLowerCase().includes(termo)
        const alunoMatch = oco.aluno?.nome?.toLowerCase().includes(termo)
        if (!tipoMatch && !descMatch && !alunoMatch) return false
      }

      return true
    })
  }, [ocorrencias, filhoFiltro, statusFiltro, buscaTexto])

  const pendentesTotal = useMemo(
    () => ocorrencias.filter((o) => o.status_pais !== 'Cientes').length,
    [ocorrencias]
  )

  const getGravidadeBadge = (gravidade: string | null) => {
    const grav = (gravidade ?? '').toLowerCase()
    if (grav.includes('grave') || grav.includes('alta')) {
      return (
        <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 font-bold text-[11px] px-2.5 py-0.5">
          Grave
        </Badge>
      )
    }
    if (grav.includes('méd') || grav.includes('med')) {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 font-bold text-[11px] px-2.5 py-0.5">
          Média
        </Badge>
      )
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-[11px] px-2.5 py-0.5">
        {gravidade ?? 'Leve'}
      </Badge>
    )
  }

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle="Histórico de Ocorrências"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Ocorrências Disciplinares
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Acompanhe advertências, ocorrências pedagógicas e registre ciência dos comunicados.
            </p>
          </div>

          {pendentesTotal > 0 && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shrink-0">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{pendentesTotal} {pendentesTotal === 1 ? 'ocorrência pendente' : 'ocorrências pendentes'} de ciência</span>
            </div>
          )}
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white rounded-2xl border border-[#DCE7F2] p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por tipo, motivo ou descrição..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50/50 border-slate-200 rounded-xl"
            />
          </div>

          {/* Filtro por Filho */}
          {filhos.length > 1 && (
            <div className="sm:w-56 shrink-0">
              <select
                value={filhoFiltro}
                onChange={(e) => setFilhoFiltro(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20"
              >
                <option value="todos">Todos os Filhos</option>
                {filhos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Status */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setStatusFiltro('todos')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                statusFiltro === 'todos'
                  ? 'bg-[#0B4FB3] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({ocorrencias.length})
            </button>
            <button
              onClick={() => setStatusFiltro('pendentes')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                statusFiltro === 'pendentes'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pendentes ({pendentesTotal})
            </button>
            <button
              onClick={() => setStatusFiltro('cientes')}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                statusFiltro === 'cientes'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cientes ({ocorrencias.length - pendentesTotal})
            </button>
          </div>
        </div>

        {/* Lista de Ocorrências */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B4FB3]" />
            <p className="text-sm text-slate-500 font-medium">Carregando histórico de ocorrências...</p>
          </div>
        ) : ocorrenciasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-10 sm:p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#102D50]">
              {buscaTexto || filhoFiltro !== 'todos' || statusFiltro !== 'todos'
                ? 'Nenhuma ocorrência encontrada para os filtros selecionados'
                : 'Nenhuma ocorrência registrada'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {buscaTexto || filhoFiltro !== 'todos' || statusFiltro !== 'todos'
                ? 'Tente alterar os termos da busca ou os filtros aplicados.'
                : 'Parabéns! Seus dependentes não possuem registros disciplinares ou ocorrências pendentes no momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {ocorrenciasFiltradas.map((oco) => {
              const estaCiente = oco.status_pais === 'Cientes'
              const dataFormatada = oco.data
                ? new Date(oco.data + 'T00:00:00').toLocaleDateString('pt-BR')
                : '—'

              return (
                <div
                  key={oco.id}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${
                    !estaCiente
                      ? 'border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.08)] bg-gradient-to-r from-amber-50/20 to-white'
                      : 'border-[#DCE7F2] shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          !estaCiente
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-[#102D50]">{oco.tipo}</h3>
                          {getGravidadeBadge(oco.gravidade)}
                          {!estaCiente && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 tracking-wider">
                              Pendente de Ciência
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1 font-bold text-slate-700">
                            <User className="w-3.5 h-3.5 text-[#0B4FB3]" />
                            {oco.aluno?.nome ?? 'Aluno'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            {oco.aluno?.turma?.nome ?? 'Turma'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {oco.aluno?.escola?.nome ?? 'Escola'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dataFormatada}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      {estaCiente ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Ciência Registrada</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleMarcarCiente(oco.id)}
                          disabled={marcandoCienteId === oco.id}
                          className="font-bold text-white rounded-xl text-xs h-9 px-4 cursor-pointer gap-1.5 shadow-sm"
                          style={{ backgroundColor: LARANJA }}
                        >
                          {marcandoCienteId === oco.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Registrando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Dar Ciência
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Descrição do ocorrido */}
                  <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1">Descrição registrada pela escola:</p>
                    <p className="whitespace-pre-line">{oco.descricao}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PortalPaisLayout>
  )
}
