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
  Users 
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

export default function AdminIndicadoresPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingAlerts, setSendingAlerts] = useState(false)

  // Configuração de prazos
  const [unidadeSel, setUnidadeSel] = useState<number>(1)
  const [dataLimite, setDataLimite] = useState<string>('')
  const [prazos, setPrazos] = useState<Prazo[]>([])

  // Indicadores calculados
  const [escolasStatus, setEscolasStatus] = useState<EscolaStatus[]>([])
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [totalPendentes, setTotalPendentes] = useState(0)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Carregar prazos gerais da rede (escola_id is null)
      const { data: prazosData } = await supabase
        .from('prazos_unidades')
        .select('*')
        .is('escola_id', null)
      
      setPrazos(prazosData ?? [])

      // Setar data limite padrão se já existir para a unidade selecionada
      const prazoAtual = prazosData?.find((p: any) => p.unidade === unidadeSel)
      if (prazoAtual) {
        setDataLimite(prazoAtual.data_limite)
      } else {
        setDataLimite('')
      }

      // 2. Carregar indicadores via RPC compilada no Supabase (O(1) no cliente)
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
      toast.error('Erro ao carregar dados dos indicadores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeSel])

  // Salvar prazo de encerramento
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
        // Update
        const { error } = await supabase
          .from('prazos_unidades')
          .update({ data_limite: dataLimite })
          .eq('id', existing.id)
        if (error) throw error
        toast.success(`Prazo da ${unidadeSel}ª Unidade atualizado!`)
      } else {
        // Insert
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

      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar prazo.')
    } finally {
      setSaving(false)
    }
  }

  // Mudar unidade selecionada
  const handleUnidadeChange = (unid: number) => {
    setUnidadeSel(unid)
    const prazo = prazos.find(p => p.unidade === unid)
    if (prazo) {
      setDataLimite(prazo.data_limite)
    } else {
      setDataLimite('')
    }
  }

  // Disparar Alertas de Prazo para a rede
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
      // 1. Obter níveis habilitados para receber alerta_prazo
      const { data: regras } = await supabase
        .from('configuracao_notificacoes_niveis')
        .select('nivel, cargo_pattern')
        .eq('tipo_notificacao', 'alerta_prazo')
        .eq('enviar_web', true)

      if (!regras || regras.length === 0) {
        toast.error('Nenhum nível de usuário está ativado para receber alertas de prazo nas configurações de notificações.')
        setSendingAlerts(false)
        return
      }

      // 2. Buscar funcionários ativos
      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo')
        .is('deleted_at', null)

      if (!funcionarios) return

      // Buscar vínculos de acessos para cruzar níveis
      const { data: acessos } = await supabase
        .from('acessos_usuarios')
        .select('funcionario_id, nivel')
        .eq('ativo', true)

      // Identificar quais funcionários devem receber com base nas regras
      const idsParaNotificar = new Set<string>()

      funcionarios.forEach((f: any) => {
        const acessoFunc = acessos?.filter((a: any) => a.funcionario_id === f.id) ?? []
        
        regras.forEach((r: any) => {
          if (r.nivel !== null) {
            // Regra por nível administrativo
            if (acessoFunc.some((a: any) => a.nivel === r.nivel)) {
              idsParaNotificar.add(f.id)
            }
          } else if (r.cargo_pattern && f.cargo) {
            // Regra por cargo (ex: Professor)
            try {
              const patternClean = (r.cargo_pattern || '').replace(/%/g, '.*')
              const regex = new RegExp(patternClean, 'i')
              if (f.cargo && regex.test(f.cargo)) {
                idsParaNotificar.add(f.id)
              }
            } catch {
              if (f.cargo && r.cargo_pattern && f.cargo.toLowerCase().includes(r.cargo_pattern.replace(/%/g, '').toLowerCase())) {
                idsParaNotificar.add(f.id)
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

      // 3. Inserir notificações em lote (lotes para mitigar concorrência)
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

  // Computar dias restantes
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            Indicadores e Prazos do Trimestre
          </h2>
          <p className="text-[#aaa] text-sm mt-1">
            Controle de prazos de encerramento das unidades letivas e auditoria de notas pendentes da rede municipal.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Configuração de Prazos */}
        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Prazos de Lançamento
          </h3>
          <p className="text-xs text-zinc-400">
            Defina a data limite para fechamento e consolidação de notas para toda a rede escolar.
          </p>

          {/* Seletor de Unidade */}
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

        {/* Coluna 2 e 3: Quadro Geral e Indicadores */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Alerta Crítico */}
          {prazoInfo.isCritical && totalPendentes > 0 ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start gap-4 text-white">
              <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-base text-rose-400">Aviso Crítico de Pendências</h4>
                <p className="text-sm text-zinc-300">
                  Faltam {prazoInfo.dias <= 0 ? '0' : prazoInfo.dias} dia(s) para expirar o prazo da {unidadeSel}ª Unidade e ainda existem **{totalPendentes}** alunos com notas em atraso na rede municipal.
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

          {/* Cards de Métricas Rápidas */}
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

          {/* Tabela de Escolas */}
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
    </div>
  )
}

