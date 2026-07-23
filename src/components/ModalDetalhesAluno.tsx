'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { Phone, Calendar, ClipboardList, Plus, MessageCircle, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { ModalNovaOcorrencia } from './ModalNovaOcorrencia'

interface ModalDetalhesAlunoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluno: any // Objeto do aluno
  turma: any // Objeto da turma (para pegar id, nome, ano_letivo)
}

export function ModalDetalhesAluno({
  open,
  onOpenChange,
  aluno,
  turma
}: ModalDetalhesAlunoProps) {
  const [frequenciaPct, setFrequenciaPct] = useState<string>('S/R')
  const [mediaGlobal, setMediaGlobal] = useState<string>('S/R')
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [novaOcorrenciaOpen, setNovaOcorrenciaOpen] = useState(false)

  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)
  const isProfessor = useAuthStore((state) => state.isProfessor())

  const fetchStatsAndOcorrencias = async () => {
    if (!aluno?.id || !turma?.id) return
    setLoadingStats(true)

    try {
      // 1. Calcular Frequência
      const { data: freqs } = await supabase
        .from('frequencias')
        .select('presenca')
        .eq('aluno_id', aluno.id)
        .eq('turma_id', turma.id)

      if (freqs && freqs.length > 0) {
        const presencas = freqs.filter(f => f.presenca).length
        const pct = Math.round((presencas / freqs.length) * 100)
        setFrequenciaPct(`${pct}%`)
      } else {
        setFrequenciaPct('S/R')
      }

      // 2. Calcular Média Global
      const { data: notas } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', aluno.id)
        .eq('turma_id', turma.id)

      const { data: recs } = await supabase
        .from('recuperacoes_finais')
        .select('*')
        .eq('aluno_id', aluno.id)
        .eq('turma_id', turma.id)

      const recsMap: Record<string, number> = {}
      if (recs) {
        recs.forEach((r: any) => {
          recsMap[r.materia_id] = Number(r.nota)
        })
      }

      if (notas && notas.length > 0) {
        // Agrupar médias por matéria e por unidade
        const notasMateria: Record<string, Record<number, number>> = {}
        
        notas.forEach((n: any) => {
          if (!notasMateria[n.materia_id]) {
            notasMateria[n.materia_id] = {}
          }
          const n1 = n.nota1 !== null ? Number(n.nota1) : null
          const n2 = n.nota2 !== null ? Number(n.nota2) : null
          const n3 = n.nota3 !== null ? Number(n.nota3) : null

          const validas = [n1, n2, n3].filter((v): v is number => v !== null && !isNaN(v))
          if (validas.length > 0) {
            const val1 = n1 ?? 0
            const val2 = n2 ?? 0
            const val3 = n3 ?? 0
            const mediaUnidade = (val1 + val2 + val3) / 3
            notasMateria[n.materia_id][n.unidade] = mediaUnidade
          }
        })

        const mediasFinaisMateria: number[] = []

        Object.entries(notasMateria).forEach(([materiaId, unidades]) => {
          const m1 = unidades[1] ?? null
          const m2 = unidades[2] ?? null
          const m3 = unidades[3] ?? null
          
          const mediasValidas = [m1, m2, m3].filter((m): m is number => m !== null)
          if (mediasValidas.length > 0) {
            const soma = mediasValidas.reduce((a, b) => a + b, 0)
            let mediaFinal = soma / mediasValidas.length
            
            // Se a média final for < 5.0, houver recuperação e todas as 3 unidades já estiverem lançadas
            const todasUnidades = m1 !== null && m2 !== null && m3 !== null
            if (todasUnidades && mediaFinal < 5.0 && recsMap[materiaId] !== undefined) {
              mediaFinal = recsMap[materiaId]
            }
            
            mediasFinaisMateria.push(mediaFinal)
          }
        })

        if (mediasFinaisMateria.length > 0) {
          const somaMedias = mediasFinaisMateria.reduce((a, b) => a + b, 0)
          const global = (somaMedias / mediasFinaisMateria.length).toFixed(1)
          setMediaGlobal(global)
        } else {
          setMediaGlobal('S/R')
        }
      } else {
        setMediaGlobal('S/R')
      }

      // 3. Buscar Ocorrências
      const { data: ocos } = await supabase
        .from('ocorrencias')
        .select('*, funcionarios:registrado_por(nome)')
        .eq('aluno_id', aluno.id)
        .order('data', { ascending: false })

      setOcorrencias(ocos || [])
    } catch (err) {
      console.error('Erro ao calcular estatísticas do aluno:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStatsAndOcorrencias()
    }
  }, [open, aluno, turma])

  if (!aluno) return null

  // Processar Contatos Rápidos baseando-se no dados_matricula ou telefone direto
  const dm = aluno.dados_matricula || {}
  const contatos: Array<{ label: string; numero: string }> = []

  // 1. Contato da Mãe
  const telMae = dm.telMaeAluno || null
  const maeNome = dm.maeAluno || aluno.nome_mae || null
  if (telMae && telMae.trim()) {
    contatos.push({
      label: maeNome ? `MÃE - ${maeNome}` : 'TELEFONE DA MÃE',
      numero: telMae.trim()
    })
  }

  // 2. Contato do Pai
  const telPai = dm.telPaiAluno || null
  const paiNome = dm.paiAluno || aluno.nome_pai || null
  if (telPai && telPai.trim()) {
    contatos.push({
      label: paiNome ? `PAI - ${paiNome}` : 'TELEFONE DO PAI',
      numero: telPai.trim()
    })
  }

  // 3. Telefone Geral / do Aluno (como fallback se tiver menos de 2 contatos e for diferente)
  const telGeral = aluno.telefone || dm.telefoneAluno || null
  if (telGeral && telGeral.trim()) {
    const limpoGeral = telGeral.replace(/\D/g, '')
    const jaAdicionado = contatos.some(c => c.numero.replace(/\D/g, '') === limpoGeral)
    if (!jaAdicionado && contatos.length < 2) {
      contatos.push({
        label: 'TELEFONE DE CONTATO',
        numero: telGeral.trim()
      })
    }
  }

  const formatarWhatsAppUrl = (telefone: string) => {
    const limpo = telefone.replace(/\D/g, '')
    // Higienizar link WhatsApp com código do país (55) e DDD
    if (limpo.length === 11) {
      return `https://wa.me/55${limpo}`
    } else if (limpo.length === 9 || limpo.length === 8) {
      return `https://wa.me/5575${limpo}` // Fallback para DDD 75 da Bahia
    }
    return `https://wa.me/${limpo}`
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Detalhes do Aluno"
        maxWidth="sm:max-w-[450px]"
        footer={
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full bg-muted text-foreground border border-border hover:bg-muted/80 font-bold h-11 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </Button>
        }
      >
        {/* Perfil e Avatar */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-20 h-20 rounded-full bg-[#3ea6ff]/10 border-2 border-[#3ea6ff]/30 text-[#3ea6ff] text-2xl font-bold flex items-center justify-center overflow-hidden shadow-inner mb-3">
            {aluno.foto_url ? (
              <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
            ) : (
              aluno.nome.substring(0, 2).toUpperCase()
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">{aluno.nome}</h3>
          <p className="text-muted-foreground text-xs mt-1">{turma.nome} ({turma.ano_letivo})</p>
        </div>

        {/* Estatísticas (Frequência e Média Global) */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-surface-2 rounded-xl p-4 text-center border border-borderCustom">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">% Frequência</p>
            <p className="text-xl font-bold text-foreground mt-1.5">{loadingStats ? '...' : frequenciaPct}</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 text-center border border-borderCustom">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Média Global</p>
            <p className="text-xl font-bold text-foreground mt-1.5">{loadingStats ? '...' : mediaGlobal}</p>
          </div>
        </div>

        {/* Contatos Rápidos (Oculto para Professores) */}
        {!isProfessor && (
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Contatos Rápidos
            </h4>
            
            {contatos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1 pl-1">Nenhum telefone de contato cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {contatos.map((cont, index) => (
                  <div key={index} className="bg-surface-2 border border-borderCustom p-3 rounded-xl flex items-center justify-between">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
                        {cont.label}
                      </span>
                      <span className="text-sm font-bold text-foreground mt-1">
                        {cont.numero}
                      </span>
                    </div>
                    <a
                      href={formatarWhatsAppUrl(cont.numero)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Últimas Ocorrências */}
        <div className="space-y-3 mt-6 border-t border-borderCustom pt-5">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Últimas Ocorrências
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNovaOcorrenciaOpen(true)}
              className="bg-surface-2 text-muted-foreground border-borderCustom hover:bg-hoverCustom hover:text-foreground rounded-lg px-2.5 h-8 gap-1 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </Button>
          </div>

          {loadingStats ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando ocorrências...</p>
          ) : ocorrencias.length === 0 ? (
            <div className="bg-surface-2/50 border border-dashed border-borderCustom text-center text-xs text-muted-foreground py-6 rounded-xl">
              Nenhuma ocorrência disciplinar recente.
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {ocorrencias.map((oco) => (
                <div key={oco.id} className="bg-surface-2 border border-borderCustom p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      oco.gravidade === 'Leve' 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : oco.gravidade === 'Média'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {oco.tipo} ({oco.gravidade})
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {oco.data ? new Date(oco.data).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed pl-0.5">{oco.descricao}</p>
                  <div className="text-[10px] text-muted-foreground text-right">
                    Por: {oco.funcionarios?.nome || 'Sistema'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </StandardDialog>

      <ModalNovaOcorrencia
        open={novaOcorrenciaOpen}
        onOpenChange={setNovaOcorrenciaOpen}
        alunoId={aluno.id}
        turmaId={turma.id}
        escolaId={escolaAtivaId || ''}
        onSuccess={fetchStatsAndOcorrencias}
      />
    </>
  )
}
