'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { 
  BarChart3, 
  Calendar, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Loader2, 
  Save, 
  Building2, 
  Users,
  BookOpen,
  UserCheck,
  ShieldAlert,
  GraduationCap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StandardTable } from '@/components/ui/table'

interface Prazo {
  id?: string
  unidade: number
  data_limite: string
}

interface EscolaStatus {
  id: string
  nome: string
  alunosCont: number
  pendentesCont: number
}

interface FrequenciaPendente {
  escola_id: string
  escola_nome: string
  diretor_id: string | null
  diretor_nome: string
  diretor_auth_id: string | null
  professor_id: string
  professor_nome: string
  professor_auth_id: string | null
  turma_id: string
  turma_nome: string
  materia_id: string
  materia_nome: string
  data_aula: string
  dias_decorridos: number
  dias_restantes: number
  status_prazo: 'EXPIRADO' | 'CRITICO' | 'ALERTA'
}

export default function AdminIndicadoresPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()
  const supabase = createClient() as any

  // Aba Ativa: 'notas' | 'frequencias'
  const [activeTab, setActiveTab] = useState<'notas' | 'frequencias'>('frequencias')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingAlerts, setSendingAlerts] = useState(false)

  // ── 1. Seção de Notas (Prazos por Unidade) ──
  const [unidadeSel, setUnidadeSel] = useState<number>(1)
  const [dataLimite, setDataLimite] = useState<string>('')
  const [prazos, setPrazos] = useState<Prazo[]>([])
  const [escolasStatus, setEscolasStatus] = useState<EscolaStatus[]>([])
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [totalPendentes, setTotalPendentes] = useState(0)

  // ── 2. Seção de Frequências (Prazo dos Professores) ──
  const [prazoFreqDias, setPrazoFreqDias] = useState<number>(15)
  const [savingPrazoFreq, setSavingPrazoFreq] = useState(false)
  const [frequenciasPendentes, setFrequenciasPendentes] = useState<FrequenciaPendente[]>([])
  const [loadingFreq, setLoadingFreq] = useState(false)
  const [sendingFreqAlerts, setSendingFreqAlerts] = useState(false)

  // Carregar dados de Notas
  const loadNotasData = async () => {
    setLoading(true)
    try {
      // 1. Carregar prazos gerais da rede (escola_id is null)
      const { data: prazosData } = await supabase
        .from('prazos_unidades')
        .select('*')
        .is('escola_id', null)
      
      setPrazos(prazosData ?? [])

      const prazoAtual = prazosData?.find((p: any) => p.unidade === unidadeSel)
      if (prazoAtual) {
        setDataLimite(prazoAtual.data_limite)
      } else {
        setDataLimite('')
      }

      // 2. Carregar indicadores via RPC
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc(
        'get_indicadores_pendencias_notas',
        { p_unidade: unidadeSel }
      )

      if (rpcErr) throw rpcErr

      if (rpcData) {
        let totalAl = 0
        let totalPend = 0

        const statusMapeado: EscolaStatus[] = (rpcData as any[]).map((r: any) => {
          const alCont = Number(r.total_alunos ?? 0)
          const pendCont = Number(r.alunos_pendentes ?? 0)
          totalAl += alCont
          totalPend += pendCont

          return {
            id: r.escola_id,
            nome: r.escola_nome,
            alunosCont: alCont,
            pendentesCont: pendCont
          }
        })

        setEscolasStatus(statusMapeado)
        setTotalAlunos(totalAl)
        setTotalPendentes(totalPend)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar dados dos indicadores de notas.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar dados de Frequência
  const loadFrequenciaData = async (diasParam?: number) => {
    setLoadingFreq(true)
    try {
      // 1. Carregar prazo configurado na rede
      const { data: configData } = await supabase
        .from('configuracoes_rede')
        .select('prazo_frequencia_dias')
        .limit(1)
        .maybeSingle()

      const diasEfetivo = diasParam ?? configData?.prazo_frequencia_dias ?? 15
      setPrazoFreqDias(diasEfetivo)

      // 2. Carregar pendências de frequência via RPC
      const { data: rpcFreqData, error: rpcFreqErr } = await supabase.rpc(
        'get_indicadores_pendencias_frequencia',
        { p_prazo_dias: diasEfetivo }
      )

      if (rpcFreqErr) throw rpcFreqErr
      setFrequenciasPendentes(rpcFreqData ?? [])
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar pendências de frequência.')
    } finally {
      setLoadingFreq(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'notas') {
      loadNotasData()
    } else {
      loadFrequenciaData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, unidadeSel])

  // Salvar prazo de notas
  const handleSavePrazo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataLimite) {
      toast.error('Selecione uma data limite.')
      return
    }

    setSaving(true)
    try {
      const existing = prazos.find(p => p.unidade === unidadeSel)

      if (existing?.id) {
        const { error } = await supabase
          .from('prazos_unidades')
          .update({ data_limite: dataLimite })
          .eq('id', existing.id)
        if (error) throw error
        toast.success(`Prazo da ${unidadeSel}ª Unidade atualizado!`)
      } else {
        const { error } = await supabase
          .from('prazos_unidades')
          .insert({
            unidade: unidadeSel,
            data_limite: dataLimite,
            escola_id: null
          })
        if (error) throw error
        toast.success(`Prazo da ${unidadeSel}ª Unidade cadastrado!`)
      }

      loadNotasData()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar prazo.')
    } finally {
      setSaving(false)
    }
  }

  // Salvar prazo de frequência em dias
  const handleSavePrazoFreq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prazoFreqDias || prazoFreqDias < 1) {
      toast.error('Informe um prazo em dias válido.')
      return
    }

    setSavingPrazoFreq(true)
    try {
      const { data: configExistente } = await supabase
        .from('configuracoes_rede')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (configExistente?.id) {
        const { error } = await supabase
          .from('configuracoes_rede')
          .update({ prazo_frequencia_dias: prazoFreqDias })
          .eq('id', configExistente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('configuracoes_rede')
          .insert({ prazo_frequencia_dias: prazoFreqDias })
        if (error) throw error
      }

      toast.success(`Prazo limite de frequência atualizado para ${prazoFreqDias} dias!`)
      loadFrequenciaData(prazoFreqDias)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar prazo de frequência.')
    } finally {
      setSavingPrazoFreq(false)
    }
  }

  const handleUnidadeChange = (unid: number) => {
    setUnidadeSel(unid)
    const prazo = prazos.find(p => p.unidade === unid)
    if (prazo) {
      setDataLimite(prazo.data_limite)
    } else {
      setDataLimite('')
    }
  }

  // Disparar Alertas de Notas
  const handleTriggerAlerts = async () => {
    if (totalPendentes === 0) {
      toast.info('Não há pendências de notas para a unidade selecionada.')
      return
    }

    const prazo = prazos.find(p => p.unidade === unidadeSel)
    if (!prazo) {
      toast.error('Cadastre um prazo limite para esta unidade antes de disparar os alertas.')
      return
    }

    const confirm = window.confirm(
      `Deseja realmente disparar alertas de notificação para todos os professores e diretores configurados?`
    )
    if (!confirm) return

    setSendingAlerts(true)
    try {
      const { data: regras } = await supabase
        .from('configuracao_notificacoes_niveis')
        .select('nivel, cargo_pattern')
        .eq('tipo_notificacao', 'alerta_prazo')
        .eq('enviar_web', true)

      if (!regras || regras.length === 0) {
        toast.error('Nenhum nível de usuário está ativado para receber alertas nas configurações.')
        setSendingAlerts(false)
        return
      }

      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo, auth_user_id')
        .is('deleted_at', null)

      if (!funcionarios) return

      const { data: acessos } = await supabase
        .from('acessos_usuarios')
        .select('funcionario_id, nivel')
        .eq('ativo', true)

      const idsParaNotificar = new Set<string>()

      funcionarios.forEach((f: any) => {
        if (!f.auth_user_id) return
        const acessoFunc = acessos?.filter((a: any) => a.funcionario_id === f.id) ?? []
        
        regras.forEach((r: any) => {
          if (r.nivel !== null) {
            if (acessoFunc.some((a: any) => a.nivel === r.nivel)) {
              idsParaNotificar.add(f.auth_user_id)
            }
          } else if (r.cargo_pattern && f.cargo) {
            try {
              const patternClean = (r.cargo_pattern || '').replace(/%/g, '.*')
              const regex = new RegExp(patternClean, 'i')
              if (f.cargo && regex.test(f.cargo)) {
                idsParaNotificar.add(f.auth_user_id)
              }
            } catch {
              if (f.cargo && r.cargo_pattern && f.cargo.toLowerCase().includes(r.cargo_pattern.replace(/%/g, '').toLowerCase())) {
                idsParaNotificar.add(f.auth_user_id)
              }
            }
          }
        })
      })

      if (idsParaNotificar.size === 0) {
        toast.info('Nenhum funcionário ativo corresponde aos papéis habilitados.')
        setSendingAlerts(false)
        return
      }

      const dataPrazoFormat = prazo.data_limite ? prazo.data_limite.split('-').reverse().join('/') : ''
      const msg = `O prazo limite para fechamento da ${unidadeSel}ª Unidade é dia ${dataPrazoFormat}. Existem notas pendentes de lançamento na rede.`
      
      const { error } = await supabase.rpc('criar_notificacoes', {
        p_destinatarios: Array.from(idsParaNotificar),
        p_title: `Prazo Curto: Fechamento da ${unidadeSel}ª Unidade`,
        p_message: msg,
        p_type: 'WARNING',
        p_link: '/turmas'
      })
      if (error) throw error

      toast.success(`Alertas disparados com sucesso para ${idsParaNotificar.size} funcionários!`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao disparar alertas: ${err.message}`)
    } finally {
      setSendingAlerts(false)
    }
  }

  // ── Disparar Alertas Duplos de Frequência Pendente (Professor + Diretor) ──
  const handleTriggerFrequenciaAlerts = async (itemIndividual?: FrequenciaPendente) => {
    const alvos = itemIndividual ? [itemIndividual] : frequenciasPendentes

    if (alvos.length === 0) {
      toast.info('Nenhuma pendência de frequência encontrada para notificar.')
      return
    }

    const confirmMsg = itemIndividual
      ? `Deseja notificar o professor ${itemIndividual.professor_nome} e a direção da escola ${itemIndividual.escola_nome}?`
      : `Deseja disparar alertas de frequência pendente para os professores e diretores de todas as ${alvos.length} chamadas listadas?`

    if (!window.confirm(confirmMsg)) return

    setSendingFreqAlerts(true)
    try {
      // 1. Buscar fallbacks de diretores caso e.diretor_id não esteja atribuído
      const { data: acessosGestao } = await supabase
        .from('acessos_usuarios')
        .select('escola_id, funcionario:funcionario_id(auth_user_id, nome)')
        .in('nivel', [1, 2, 3])
        .eq('ativo', true)

      let notifProfessoresCount = 0
      let notifDiretoresCount = 0
      const semUserAuth: string[] = []

      // Grupo de batch
      const batchGroupId = crypto.randomUUID()

      for (const item of alvos) {
        const dataAulaFormat = item.data_aula ? item.data_aula.split('-').reverse().join('/') : ''
        
        // a) Notificar PROFESSOR
        if (item.professor_auth_id) {
          const msgProf = `Atenção ${item.professor_nome}: O prazo final para registrar a frequência da turma ${item.turma_nome} (${item.materia_nome}) do dia ${dataAulaFormat} está prestes a expirar. Acesse a área de avaliações/frequências para registrar.`
          
          await supabase.rpc('criar_notificacoes', {
            p_destinatarios: [item.professor_auth_id],
            p_title: `Alerta de Prazo: Chamada Pendente`,
            p_message: msgProf,
            p_type: 'WARNING',
            p_link: '/avaliacoes',
            p_grupo_id: batchGroupId
          })
          notifProfessoresCount++
        } else {
          if (!semUserAuth.includes(item.professor_nome)) semUserAuth.push(item.professor_nome)
        }

        // b) Notificar DIREOTOR
        let directorAuthId = item.diretor_auth_id

        // Fallback se diretor_id da escola estiver null
        if (!directorAuthId && item.escola_id && acessosGestao) {
          const gestor = acessosGestao.find((a: any) => a.escola_id === item.escola_id && a.funcionario?.auth_user_id)
          if (gestor?.funcionario?.auth_user_id) {
            directorAuthId = gestor.funcionario.auth_user_id
          }
        }

        if (directorAuthId) {
          const msgDir = `Alerta de Gestão: O professor ${item.professor_nome} possui chamadas pendentes da turma ${item.turma_nome} (${item.materia_nome}) do dia ${dataAulaFormat} com o prazo de lançamento prestes a expirar.`

          await supabase.rpc('criar_notificacoes', {
            p_destinatarios: [directorAuthId],
            p_title: `Aviso de Frequência Pendente (${item.escola_nome})`,
            p_message: msgDir,
            p_type: 'WARNING',
            p_link: '/admin/indicadores',
            p_grupo_id: batchGroupId
          })
          notifDiretoresCount++
        }
      }

      toast.success(`Notificações enviadas! (${notifProfessoresCount} para Professores, ${notifDiretoresCount} para Diretores)`)

      if (semUserAuth.length > 0) {
        toast.warning(`${semUserAuth.length} professor(es) não possuem login ativo de acesso e não receberam o alerta web: ${semUserAuth.join(', ')}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao disparar notificações de frequência: ${err.message}`)
    } finally {
      setSendingFreqAlerts(false)
    }
  }

  // Computar dias restantes das notas
  const getDiasRestantesInfo = () => {
    const prazo = prazos.find(p => p.unidade === unidadeSel)
    if (!prazo) return { text: 'Sem prazo cadastrado', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', isCritical: false, dias: 999 }

    const limitDate = new Date(prazo.data_limite + 'T23:59:59')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    limitDate.setHours(0, 0, 0, 0)

    const diffTime = limitDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { 
        text: `Prazo expirado há ${Math.abs(diffDays)} dia(s)`, 
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', 
        isCritical: true, 
        dias: diffDays 
      }
    } else if (diffDays === 0) {
      return { 
        text: 'Expira hoje!', 
        color: 'text-rose-400 bg-rose-500/20 border-rose-500/30 animate-pulse', 
        isCritical: true, 
        dias: 0 
      }
    } else if (diffDays <= 2) {
      return { 
        text: `Falta(m) ${diffDays} dia(s) para o fechamento`, 
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', 
        isCritical: true, 
        dias: diffDays 
      }
    } else {
      return { 
        text: `${diffDays} dia(s) restante(s)`, 
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', 
        isCritical: false, 
        dias: diffDays 
      }
    }
  }

  const prazoInfo = getDiasRestantesInfo()

  // Filtros rápidos de pendência de frequência
  const pendenciasCriticasFreq = frequenciasPendentes.filter(f => f.status_prazo === 'CRITICO' || f.status_prazo === 'EXPIRADO')
  const professoresImpactados = new Set(frequenciasPendentes.map(f => f.professor_id)).size

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            Indicadores e Prazos do Sistema
          </h2>
          <p className="text-[#aaa] text-sm mt-1">
            Controle de prazos de encerramento de notas e acompanhamento do limite de lançamento de frequências dos professores.
          </p>
        </div>
        
        <Button 
          variant="outline"
          onClick={() => router.push('/admin')}
          className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Painel Geral
        </Button>
      </div>

      {/* Tabs de Seleção Principal */}
      <div className="flex bg-[#121214] p-1.5 rounded-2xl border border-[#232326] gap-2 max-w-md">
        <button
          onClick={() => setActiveTab('frequencias')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
            activeTab === 'frequencias'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Frequência dos Professores
          {frequenciasPendentes.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {frequenciasPendentes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notas')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
            activeTab === 'notas'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Notas por Trimestre
        </button>
      </div>

      {/* ── VISÃO 1: FREQUÊNCIA DOS PROFESSORES ── */}
      {activeTab === 'frequencias' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Configuração do Prazo de Frequência */}
          <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 shadow-xl space-y-4 h-fit">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Prazo Limite de Frequência
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Defina o tempo limite (em dias) que os professores possuem para registrar a frequência diária após a aplicação da aula.
            </p>

            <form onSubmit={handleSavePrazoFreq} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="prazo-freq-input" className="text-xs text-[#aaa]">
                  Prazo de Tolerância (Dias)
                </Label>
                <Input
                  type="number"
                  id="prazo-freq-input"
                  min={1}
                  max={60}
                  value={prazoFreqDias}
                  onChange={(e) => setPrazoFreqDias(Number(e.target.value))}
                  className="bg-[#18181a] border-[#27272a] text-white w-full font-bold"
                  required
                />
              </div>

              <div className="p-3 bg-[#17171a] rounded-xl border border-[#27272a] space-y-1">
                <p className="text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Regra do Sistema:
                </p>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Após <strong>{prazoFreqDias} dias</strong>, o lançamento no aplicativo do professor é bloqueado, exigindo solicitação à Direção da Escola.
                </p>
              </div>

              <Button
                type="submit"
                disabled={savingPrazoFreq}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold w-full gap-2 cursor-pointer"
              >
                {savingPrazoFreq ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingPrazoFreq ? 'Salvando...' : 'Salvar Regra de Prazo'}
              </Button>
            </form>
          </div>

          {/* Coluna 2 e 3: Métricas e Tabela de Auditoria */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner Alerta Crítico de Frequências */}
            {pendenciasCriticasFreq.length > 0 ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-4 text-white">
                <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h4 className="font-bold text-base text-rose-400">Aviso: Prazo de Frequência prestes a esgotar</h4>
                  <p className="text-sm text-zinc-300">
                    Existem <strong>{pendenciasCriticasFreq.length}</strong> chamadas pendentes em estado crítico ($\le 3$ dias para expirar ou já expiradas), impactando <strong>{professoresImpactados}</strong> professor(es).
                  </p>
                  <div className="pt-1 flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleTriggerFrequenciaAlerts()}
                      disabled={sendingFreqAlerts}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 gap-2 cursor-pointer"
                    >
                      {sendingFreqAlerts ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      Notificar Professores e Diretores
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 flex items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Frequências em Dia</h4>
                    <p className="text-xs text-zinc-400">
                      Não existem chamadas críticas prestes a esgotar o prazo limite de {prazoFreqDias} dias.
                    </p>
                  </div>
                </div>
                {frequenciasPendentes.length > 0 && (
                  <Button
                    onClick={() => handleTriggerFrequenciaAlerts()}
                    disabled={sendingFreqAlerts}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/30 text-xs font-semibold h-9 px-4 gap-2 cursor-pointer"
                  >
                    {sendingFreqAlerts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    Notificar Pendentes
                  </Button>
                )}
              </div>
            )}

            {/* Cards de Métricas de Frequência */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Prazo Tolerância</p>
                <div className="flex items-center gap-2 pt-1">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-extrabold text-white">{prazoFreqDias} Dias</span>
                </div>
              </div>

              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Chamadas Pendentes</p>
                <div className="flex items-center gap-2 pt-1">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-extrabold text-white">{frequenciasPendentes.length}</span>
                </div>
              </div>

              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Professores em Alerta</p>
                <div className="flex items-center gap-2 pt-1">
                  <Users className="w-5 h-5 text-rose-400" />
                  <span className="text-lg font-extrabold text-rose-400">{professoresImpactados}</span>
                </div>
              </div>
            </div>

            {/* Tabela de Auditoria de Chamadas Pendentes */}
            <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  Auditoria de Registro de Frequência por Professor
                </h3>
                <span className="text-xs text-zinc-400 font-medium">
                  {frequenciasPendentes.length} registro(s) encontrado(s)
                </span>
              </div>

              <StandardTable
                data={frequenciasPendentes}
                columns={[
                  {
                    header: 'Professor / Escola',
                    className: 'font-medium text-white',
                    accessor: (item) => (
                      <div>
                        <div className="font-bold text-white text-xs">{item.professor_nome}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          {item.escola_nome}
                        </div>
                      </div>
                    )
                  },
                  {
                    header: 'Turma & Matéria',
                    className: 'text-zinc-300 text-xs',
                    accessor: (item) => (
                      <div>
                        <div className="font-semibold text-zinc-200">{item.turma_nome}</div>
                        <div className="text-[11px] text-purple-400">{item.materia_nome}</div>
                      </div>
                    )
                  },
                  {
                    header: 'Data da Aula',
                    headClassName: 'text-center',
                    className: 'text-center text-xs text-zinc-300 font-medium',
                    accessor: (item) => item.data_aula ? item.data_aula.split('-').reverse().join('/') : '-'
                  },
                  {
                    header: 'Dias Restantes',
                    headClassName: 'text-center',
                    className: 'text-center',
                    accessor: (item) => (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        item.dias_restantes < 0 
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                          : item.dias_restantes <= 3 
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse' 
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {item.dias_restantes < 0 
                          ? `Expirado (${Math.abs(item.dias_restantes)}d)` 
                          : `${item.dias_restantes} dia(s)`}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    headClassName: 'text-center',
                    className: 'text-center',
                    accessor: (item) => (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${
                        item.status_prazo === 'EXPIRADO'
                          ? 'bg-rose-600/20 text-rose-400 border-rose-600/40'
                          : item.status_prazo === 'CRITICO'
                          ? 'bg-amber-600/20 text-amber-400 border-amber-600/40'
                          : 'bg-sky-600/20 text-sky-400 border-sky-600/40'
                      }`}>
                        {item.status_prazo}
                      </span>
                    )
                  },
                  {
                    header: 'Ação',
                    headClassName: 'text-center',
                    className: 'text-center',
                    accessor: (item) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTriggerFrequenciaAlerts(item)}
                        disabled={sendingFreqAlerts}
                        className="h-7 text-[11px] px-2.5 bg-purple-600/10 border-purple-600/30 hover:bg-purple-600 hover:text-white text-purple-300 font-semibold cursor-pointer"
                      >
                        <Bell className="w-3 h-3 mr-1" /> Notificar
                      </Button>
                    )
                  }
                ]}
                keyExtractor={(item, i) => `${item.escola_id}-${item.professor_id}-${item.turma_id}-${item.data_aula}-${i}`}
                loading={loadingFreq}
                loadingMessage="Carregando pendências de frequência..."
                emptyMessage="Nenhuma frequência em atraso encontrada na rede."
              />
            </div>
          </div>
        </div>
      )}

      {/* ── VISÃO 2: NOTAS POR TRIMESTRE ── */}
      {activeTab === 'notas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuração de Prazos de Notas */}
          <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Prazos de Notas (Trimestres)
            </h3>
            <p className="text-xs text-zinc-400">
              Defina a data limite para fechamento e consolidação de notas para toda a rede escolar.
            </p>

            <div className="flex bg-[#18181a] p-1 rounded-xl border border-[#27272a] gap-1">
              {[1, 2, 3].map(un => (
                <button
                  key={un}
                  onClick={() => handleUnidadeChange(un)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    unidadeSel === un 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  U{un}
                </button>
              ))}
            </div>

            <form onSubmit={handleSavePrazo} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="data-limite-input" className="text-xs text-[#aaa]">Data Limite para {unidadeSel}ª Unidade</Label>
                <Input
                  type="date"
                  id="data-limite-input"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                  className="bg-[#18181a] border-[#27272a] text-white w-full"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold w-full gap-2 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar Prazo'}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {prazoInfo.isCritical && totalPendentes > 0 ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-4 text-white">
                <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h4 className="font-bold text-base text-rose-400">Aviso Crítico de Pendências</h4>
                  <p className="text-sm text-zinc-300">
                    Faltam {prazoInfo.dias <= 0 ? '0' : prazoInfo.dias} dia(s) para expirar o prazo da {unidadeSel}ª Unidade e ainda existem <strong>{totalPendentes}</strong> alunos com notas em atraso na rede municipal.
                  </p>
                  <div className="pt-1">
                    <Button
                      onClick={handleTriggerAlerts}
                      disabled={sendingAlerts}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 px-4 gap-2 cursor-pointer"
                    >
                      {sendingAlerts ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      Disparar Alerta Geral
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 flex items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Tudo em Conformidade</h4>
                    <p className="text-xs text-zinc-400">
                      O status de lançamento de notas para a {unidadeSel}ª Unidade está dentro dos limites saudáveis.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleTriggerAlerts}
                  disabled={sendingAlerts || totalPendentes === 0}
                  className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/30 text-xs font-semibold h-9 px-4 gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingAlerts ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  Notificar Pendentes
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Prazo Consolidado</p>
                <div className="flex items-center gap-2 pt-1">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-lg border ${prazoInfo.color}`}>
                    {prazoInfo.text}
                  </span>
                </div>
              </div>

              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Alunos na Rede</p>
                <div className="flex items-center gap-2 pt-1">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-extrabold text-white">{totalAlunos}</span>
                </div>
              </div>

              <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4.5 space-y-1">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notas Pendentes</p>
                <div className="flex items-center gap-2 pt-1">
                  <AlertTriangle className={`w-5 h-5 ${totalPendentes > 0 ? 'text-amber-500' : 'text-zinc-500'}`} />
                  <span className={`text-lg font-extrabold ${totalPendentes > 0 ? 'text-amber-500' : 'text-white'}`}>
                    {totalPendentes}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Auditoria de Lançamento por Unidade Escolar
              </h3>

              <StandardTable
                data={escolasStatus}
                columns={[
                  {
                    header: 'Nome da Escola',
                    className: 'font-semibold text-white',
                    accessor: (esc) => esc.nome
                  },
                  {
                    header: 'Total Alunos',
                    headClassName: 'text-center',
                    className: 'text-center text-zinc-300',
                    accessor: (esc) => esc.alunosCont
                  },
                  {
                    header: 'Alunos s/ Notas',
                    headClassName: 'text-center',
                    className: 'text-center',
                    accessor: (esc) => (
                      <span className={esc.pendentesCont > 0 ? 'text-amber-500 font-bold' : 'text-zinc-500'}>
                        {esc.pendentesCont}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    headClassName: 'text-center',
                    className: 'text-center',
                    accessor: (esc) => esc.pendentesCont === 0 ? (
                      <span className="text-[10px] font-extrabold bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Concluído
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/35 text-amber-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Pendente
                      </span>
                    )
                  }
                ]}
                keyExtractor={(esc, i) => esc.id ?? `esc-${i}`}
                loading={loading}
                loadingMessage="Calculando métricas..."
                emptyMessage="Nenhuma escola encontrada na rede."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


