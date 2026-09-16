'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import {
  ArrowLeft,
  Search,
  Loader2,
  UserPlus,
  Clock,
  Heart,
  AlertCircle,
  CheckCircle2,
  FileText,
  Filter,
  Sparkles,
  User,
  CalendarDays
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { getAvatarUrl } from '@/lib/photoHelper'
import { ESPECIALIDADES_CANONICAS } from '@/components/modals/modal-matricula-emaee/components/ModalVincularProfissionalAlunoAEE'

export default function FilaEsperaPage() {
  const { escolaAtivaId, funcionario } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const [fila, setFila] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('TODAS')
  const [filtroTipoFila, setFiltroTipoFila] = useState<'TODAS' | 'GERAL' | 'PARCIAL'>('TODAS')
  const [admitindo, setAdmitindo] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Controle do modal de admissão
  const [selectedPaciente, setSelectedPaciente] = useState<any | null>(null)
  const [statusAdmissao, setStatusAdmissao] = useState<'ATIVO' | 'EM_INVESTIGACAO'>('ATIVO')

  const carregarFila = async () => {
    setCarregando(true)
    const supabase = createClient()
    try {
      const isEmaeeUnit = selectedEscola?.tipo === 'EMAEE' || /emaee/i.test(selectedEscola?.nome ?? '')

      const selectCompleto = `
        *,
        alunos (
          id,
          nome,
          cpf,
          telefone,
          data_nascimento,
          foto_url,
          foto_avatar_path,
          foto_visualizacao_path,
          foto_updated_at
        ),
        escola_origem_fora_rede,
        escola_origem_nome,
        escola_origem_municipio,
        escola_origem_uf,
        escolas:escola_regular_id (
          nome
        ),
        especialidades:emaee_especialidades_vinculadas (
          id,
          status,
          especialidade,
          especialidade_outros,
          prioridade,
          motivo_fila,
          data_solicitacao,
          profissional_id,
          ativo,
          frequencia,
          dia_semana,
          horario_inicio,
          horario_fim,
          data_inicio,
          funcionarios:profissional_id (
            id,
            nome,
            cargo,
            foto_url
          )
        )
      `

      let q = supabase
        .from('emaee_matriculas')
        .select(selectCompleto)
        .is('deleted_at', null)
        .order('data_matricula', { ascending: true })

      if (escolaAtivaId && isEmaeeUnit) {
        q = q.eq('escola_atendimento_id', escolaAtivaId)
      }

      let data: any[] | null = null
      let error: any = null

      const resCompleta: any = await q
      data = resCompleta.data
      error = resCompleta.error

      // Fallback seguro caso as colunas opcionais status/motivo_fila/prioridade ainda não existam no banco (erro 42703)
      if (error && (error.code === '42703' || error.message?.includes('status') || error.message?.includes('prioridade') || error.message?.includes('motivo_fila'))) {
        const selectFallback = `
          *,
          alunos (
            id,
            nome,
            cpf,
            telefone,
            data_nascimento,
            foto_url,
            foto_avatar_path,
            foto_visualizacao_path,
            foto_updated_at
          ),
          escola_origem_fora_rede,
          escola_origem_nome,
          escola_origem_municipio,
          escola_origem_uf,
          escolas:escola_regular_id (
            nome
          ),
          especialidades:emaee_especialidades_vinculadas (
            id,
            especialidade,
            especialidade_outros,
            profissional_id,
            ativo,
            frequencia,
            dia_semana,
            horario_inicio,
            horario_fim,
            data_inicio,
            funcionarios:profissional_id (
              id,
              nome,
              cargo,
              foto_url
            )
          )
        `
        let qFallback = supabase
          .from('emaee_matriculas')
          .select(selectFallback)
          .is('deleted_at', null)
          .order('data_matricula', { ascending: true })

        if (escolaAtivaId && isEmaeeUnit) {
          qFallback = qFallback.eq('escola_atendimento_id', escolaAtivaId)
        }

        const resFallback: any = await qFallback
        data = resFallback.data
        error = resFallback.error
      }

      if (error) throw error

      if (isMounted.current) {
        // Aluno está na fila se status geral for FILA_ESPERA OU possuir qualquer especialidade ativa em espera
        const apenasFila = (data ?? []).filter((m: any) => {
          const isFilaGlobal = m.status === 'FILA_ESPERA'
          const temDemandaFila = (m.especialidades || []).some(
            (e: any) => e.ativo && (e.status === 'FILA_ESPERA' || !e.profissional_id)
          )
          return isFilaGlobal || temDemandaFila
        })
        setFila(apenasFila)
      }
    } catch (err: any) {
      console.error('Erro ao carregar fila de espera:', err)
      toast.error('Erro ao obter os registros da fila de espera.')
      if (isMounted.current) {
        setFila([])
      }
    } finally {
      if (isMounted.current) {
        setCarregando(false)
      }
    }
  }

  useEffect(() => {
    carregarFila()
  }, [escolaAtivaId, selectedEscola?.id])

  const totalPendentesEspecialidade = useMemo(() => {
    return fila.filter((item) => {
      const espFila = (item.especialidades || []).filter(
        (e: any) => e.ativo && (e.status === 'FILA_ESPERA' || (!e.status && !e.profissional_id))
      )
      return espFila.length === 0
    }).length
  }, [fila])

  const filaFiltrada = useMemo(() => {
    return fila.filter((item) => {
      const nomeAluno = (item.alunos?.nome ?? '').toLowerCase()
      const cpfAluno = (item.alunos?.cpf ?? '').toLowerCase()
      const escolaNome = (item.escola_origem_nome ?? item.escolas?.nome ?? '').toLowerCase()
      const txtBusca = busca.toLowerCase().trim()

      const matchBusca = nomeAluno.includes(txtBusca) || cpfAluno.includes(txtBusca) || escolaNome.includes(txtBusca)
      if (!matchBusca) return false

      const espAtivas = (item.especialidades || []).filter(
        (e: any) => e.ativo && (e.status === 'EM_ATENDIMENTO' || (!e.status && e.profissional_id))
      )
      const espFila = (item.especialidades || []).filter(
        (e: any) => e.ativo && (e.status === 'FILA_ESPERA' || (!e.status && !e.profissional_id))
      )

      // Filtro de Tipo de Fila (Geral vs Parcial)
      if (filtroTipoFila === 'GERAL') {
        if (espAtivas.length > 0) return false
      } else if (filtroTipoFila === 'PARCIAL') {
        if (espAtivas.length === 0 || espFila.length === 0) return false
      }

      // Filtro de Especialidade Específica
      if (filtroEspecialidade !== 'TODAS') {
        if (filtroEspecialidade === 'PENDENTE_ESPECIALIDADE') {
          if (espFila.length > 0) return false
        } else {
          const matchEsp = espFila.some(
            (e: any) => (e.especialidade || '').toLowerCase() === filtroEspecialidade.toLowerCase()
          )
          if (!matchEsp) return false
        }
      }

      return true
    })
  }, [fila, busca, filtroEspecialidade, filtroTipoFila])

  const handleAdmitir = async () => {
    if (!selectedPaciente) return
    setAdmitindo(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('emaee_matriculas')
        .update({ status: statusAdmissao })
        .eq('id', selectedPaciente.id)

      if (error) throw error

      // Log de Auditoria
      try {
        const auditRes = await fetch('/api/audit/log-e-notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolaId: selectedPaciente?.escola_atendimento_id ?? escolaAtivaId ?? null,
            titulo: 'Admissão do EMAEE',
            mensagem: `${funcionario?.nome ?? 'Profissional'} admitiu o aluno ${selectedPaciente.alunos?.nome ?? 'Desconhecido'} na fila de espera com status: ${statusAdmissao === 'ATIVO' ? 'Em Atendimento' : 'Em Investigação'}.`,
            tipoNotificacao: 'matricula',
            entidade: 'emaee_matriculas',
            entidadeId: selectedPaciente.id,
            acao: 'UPDATE',
            executadoPor: {
              id: funcionario?.id ?? null,
              name: funcionario?.nome ?? 'Usuário',
              email: funcionario?.email ?? 'sem-email@sig.com',
              cargo: funcionario?.cargo ?? undefined
            },
            newData: { status: statusAdmissao }
          })
        })
        if (!auditRes.ok) {
          console.warn('Aviso: endpoint de auditoria retornou status não-200:', auditRes.status)
        }
      } catch (auditErr) {
        console.warn('Falha na comunicação de auditoria:', auditErr)
      }

      toast.success(`${selectedPaciente.alunos?.nome ?? 'Aluno'} admitido com sucesso!`)
      setSelectedPaciente(null)
      carregarFila()
    } catch (err: any) {
      console.error('Erro ao admitir aluno:', err)
      toast.error('Erro ao admitir o aluno da fila de espera: ' + (err.message ?? 'Tente novamente.'))
    } finally {
      if (isMounted.current) {
        setAdmitindo(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/emaee/pacientes">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Clock className="w-7 h-7 text-[#0090ff]" />
              Fila de Espera por Especialidade
            </h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe a demanda reprimida por área e admita pacientes conforme a disponibilidade de vagas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm">
            Total em Fila: <strong className="text-foreground">{filaFiltrada.length}</strong>
          </span>
          {totalPendentesEspecialidade > 0 && (
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Pendentes de Especialidade: <strong>{totalPendentesEspecialidade}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Segmentação */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3.5 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Pesquisar paciente por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-background border border-border text-foreground rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-primary/50 transition-colors placeholder-muted-foreground/50"
          />
        </div>

        {/* Filtro por Especialidade */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filtroEspecialidade}
            onChange={(e) => setFiltroEspecialidade(e.target.value)}
            className="bg-background border border-border text-foreground rounded-xl px-3 py-2 text-xs font-medium outline-none cursor-pointer focus:border-primary/50"
          >
            <option value="TODAS">Todas as Especialidades</option>
            <option value="PENDENTE_ESPECIALIDADE">⚠️ Pendente de Especialidade ({totalPendentesEspecialidade})</option>
            {ESPECIALIDADES_CANONICAS.map((esp) => (
              <option key={esp} value={esp}>
                {esp}
              </option>
            ))}
          </select>
        </div>

        {/* Segmentação de Tipo de Fila */}
        <div className="flex items-center bg-muted/60 dark:bg-[#181818] p-1 rounded-xl border border-border gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFiltroTipoFila('TODAS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filtroTipoFila === 'TODAS'
                ? 'bg-card dark:bg-[#222226] text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipoFila('GERAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filtroTipoFila === 'GERAL'
                ? 'bg-card dark:bg-[#222226] text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fila Geral
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipoFila('PARCIAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filtroTipoFila === 'PARCIAL'
                ? 'bg-card dark:bg-[#222226] text-amber-500 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Fila Parcial
          </button>
        </div>
      </div>

      {/* Listagem */}
      {carregando ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card/50 rounded-2xl border border-border text-muted-foreground shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">Carregando lista de espera...</span>
        </div>
      ) : filaFiltrada.length === 0 ? (
        <div className="text-center py-20 bg-card/50 rounded-2xl border border-border text-muted-foreground flex flex-col items-center gap-3 shadow-sm">
          <Heart className="w-12 h-12 text-muted-foreground/30" />
          <span className="text-sm">Nenhum paciente aguardando na fila de espera com os filtros selecionados.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filaFiltrada.map((paciente) => {
            const dataCadastro = paciente.data_matricula
              ? new Date(`${paciente.data_matricula}T00:00:00`).toLocaleDateString('pt-BR')
              : 'Não informada'

            const avatarUrl = getAvatarUrl(paciente.alunos)
            const espAtivas = (paciente.especialidades || []).filter(
              (e: any) => e.ativo && (e.status === 'EM_ATENDIMENTO' || (!e.status && e.profissional_id))
            )
            const espFila = (paciente.especialidades || []).filter(
              (e: any) => e.ativo && (e.status === 'FILA_ESPERA' || (!e.status && !e.profissional_id))
            )

            return (
              <Card
                key={paciente.id}
                className="bg-card border border-border hover:border-primary/30 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-sm relative group"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2.5 border-b border-border pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={paciente.alunos?.nome ?? 'Aluno'}
                          className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {paciente.alunos?.nome?.substring(0, 2).toUpperCase() ?? 'AL'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate" title={paciente.alunos?.nome}>
                          {paciente.alunos?.nome ?? 'Sem nome'}
                        </h3>
                        <span className="text-[10px] text-muted-foreground block">
                          Cadastro: {dataCadastro}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Demanda de Especialidade */}
                    <div className="flex items-center gap-1.5">
                      {espFila.length === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Pendente de Especialidade
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                          Fila de Especialidade
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-normal text-muted-foreground">
                    {paciente.cid_codigo && (
                      <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>CID-10: {paciente.cid_codigo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">
                        Escola: {paciente.escola_origem_fora_rede && paciente.escola_origem_nome
                          ? `${paciente.escola_origem_nome}${paciente.escola_origem_municipio ? ` (${paciente.escola_origem_municipio} - ${paciente.escola_origem_uf ?? 'BA'})` : ''}`
                          : (paciente.escolas?.nome ?? 'Sem escola vinculada')}
                      </span>
                    </div>

                    {/* Bloco de Especialidades em Fila */}
                    <div className="pt-2 border-t border-border space-y-1.5">
                      <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Aguardando Vaga em:
                      </p>
                      {espFila.length === 0 ? (
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Pendente de Especialidade (Aguardando Triagem)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {espFila.map((ef: any) => (
                            <span
                              key={ef.id}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1"
                            >
                              <span>{ef.especialidade}</span>
                              {ef.prioridade && ef.prioridade !== 'NORMAL' && (
                                <span className={`text-[8px] px-1 rounded uppercase ${
                                  ef.prioridade === 'JUDICIAL' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {ef.prioridade}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bloco de Especialidades Já em Atendimento (Fila Parcial) */}
                    {espAtivas.length > 0 && (
                      <div className="pt-2 border-t border-dashed border-border space-y-1">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Já em Atendimento:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {espAtivas.map((ea: any) => (
                            <span
                              key={ea.id}
                              className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]"
                            >
                              {ea.especialidade} ({ea.funcionarios?.nome?.split(' ')[0] ?? 'Profissional'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {paciente.principal_queixa && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg border border-border text-[11px] leading-relaxed text-muted-foreground max-h-[64px] overflow-y-auto">
                        <strong>Queixa:</strong> {paciente.principal_queixa}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-3.5">
                  <Link href={`/emaee/pacientes/${paciente.id}`}>
                    <Button
                      variant="outline"
                      className="w-full border-border text-foreground hover:bg-muted text-xs rounded-xl font-bold py-2 shadow-sm gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-primary" /> Abrir Prontuário / Alocar
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de confirmação de admissão geral */}
      <StandardDialog
        open={!!selectedPaciente}
        onOpenChange={(open) => {
          if (!open) setSelectedPaciente(null)
        }}
        title="Admitir Paciente da Lista de Espera"
        description={`Selecione o destino de triagem pedagógica/clínica para ${selectedPaciente?.alunos?.nome ?? 'o aluno'}.`}
        maxWidth="sm:max-w-[460px]"
        footer={
          <div className="flex items-center justify-between w-full pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setSelectedPaciente(null)}
              disabled={admitindo}
              className="border-border hover:bg-muted rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAdmitir}
              disabled={admitindo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
            >
              {admitindo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Admitindo...
                </>
              ) : (
                'Confirmar Admissão'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status de Admissão</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatusAdmissao('ATIVO')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                statusAdmissao === 'ATIVO'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border bg-background text-muted-foreground hover:border-borderCustom'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">Em Atendimento</span>
              <p className="text-[10px] opacity-80 mt-1">
                Iniciar consultas e evolução clínica regular.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusAdmissao('EM_INVESTIGACAO')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                statusAdmissao === 'EM_INVESTIGACAO'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-border bg-background text-muted-foreground hover:border-borderCustom'
              }`}
            >
              <Clock className="w-6 h-6 mb-2" />
              <span className="text-xs font-bold">Em Investigação</span>
              <p className="text-[10px] opacity-80 mt-1">
                Acolhimento clínico inicial e diagnóstico.
              </p>
            </button>
          </div>
        </div>
      </StandardDialog>
    </div>
  )
}

