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
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { getAvatarUrl } from '@/lib/photoHelper'

export default function FilaEsperaPage() {
  const { escolaAtivaId, funcionario } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const [fila, setFila] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
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

      let query = supabase
        .from('emaee_matriculas')
        .select(`
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
          )
        `)
        .eq('status', 'FILA_ESPERA')
        .is('deleted_at', null)
        .order('data_matricula', { ascending: true })

      if (escolaAtivaId && isEmaeeUnit) {
        query = query.eq('escola_atendimento_id', escolaAtivaId)
      }

      const { data, error } = await query

      if (error) throw error
      if (isMounted.current) {
        setFila(data ?? [])
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

  const filaFiltrada = useMemo(() => {
    return fila.filter((item) => {
      const nomeAluno = (item.alunos?.nome ?? '').toLowerCase()
      const cpfAluno = (item.alunos?.cpf ?? '').toLowerCase()
      const escolaNome = (item.escola_origem_nome ?? item.escolas?.nome ?? '').toLowerCase()
      const txtBusca = busca.toLowerCase().trim()
      return nomeAluno.includes(txtBusca) || cpfAluno.includes(txtBusca) || escolaNome.includes(txtBusca)
    })
  }, [fila, busca])

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
      <div className="flex items-center gap-3">
        <Link href="/emaee/pacientes">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-[#0090ff]" />
            Fila de Espera (Acolhimento)
          </h1>
          <p className="text-xs text-muted-foreground">
            Pacientes aguardando triagem pedagógica ou atendimento clínico no EMAEE.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Pesquisar paciente por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-background border border-border text-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder-muted-foreground/50"
          />
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
          <span className="text-sm">Nenhum paciente aguardando na fila de espera no momento.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filaFiltrada.map((paciente) => {
            const dataCadastro = paciente.data_matricula
              ? new Date(`${paciente.data_matricula}T00:00:00`).toLocaleDateString('pt-BR')
              : 'Não informada'

            const avatarUrl = getAvatarUrl(paciente.alunos)

            return (
              <Card
                key={paciente.id}
                className="bg-card border border-border hover:border-primary/30 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-sm relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={paciente.alunos?.nome ?? 'Aluno'}
                          className="w-10 h-10 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {paciente.alunos?.nome?.substring(0, 2).toUpperCase() ?? 'AL'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate max-w-[160px]" title={paciente.alunos?.nome}>
                          {paciente.alunos?.nome ?? 'Sem nome'}
                        </h3>
                        <span className="text-[10px] text-muted-foreground block">
                          Cadastro: {dataCadastro}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-normal text-muted-foreground pt-3.5">
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
                    {paciente.principal_queixa && (
                      <div className="mt-2.5 p-2 bg-muted/50 rounded-lg border border-border text-[11px] leading-relaxed text-muted-foreground max-h-[64px] overflow-y-auto">
                        <strong>Queixa Principal:</strong> {paciente.principal_queixa}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-3.5">
                  <Button
                    onClick={() => {
                      setSelectedPaciente(paciente)
                      setStatusAdmissao('ATIVO')
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl font-bold py-2 shadow-md gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" /> Admitir Paciente
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
 
      {/* Modal de confirmação de admissão */}
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

