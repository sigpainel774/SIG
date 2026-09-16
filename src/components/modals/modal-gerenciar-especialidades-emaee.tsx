'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabaseClient'
import {
  Stethoscope,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Loader2,
  Check,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ESPECIALIDADES_CANONICAS_PADRAO,
  deduzirEspecialidadeDeCargo,
  obterEspecialidadesEmaee,
  salvarEspecialidadesEmaee
} from '@/lib/emaeeEspecialidades'

interface ModalGerenciarEspecialidadesEmaeeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escola: {
    id: string
    nome: string
    especialidades_disponiveis?: string[]
  } | null
  onSuccess?: () => void
}

export function ModalGerenciarEspecialidadesEmaee({
  open,
  onOpenChange,
  escola,
  onSuccess
}: ModalGerenciarEspecialidadesEmaeeProps) {
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [totalProfsAee, setTotalProfsAee] = useState<number>(0)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarDados = async () => {
    if (!escola?.id) return
    setLoading(true)
    const supabase = createBrowserClient()

    try {
      // 1. Carregar especialidades da unidade
      const lista = await obterEspecialidadesEmaee(escola.id)
      if (isMounted.current) {
        setEspecialidades(lista)
      }

      // 2. Contar profissionais AEE ativos
      const { count } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact', head: true })
        .eq('is_profissional_aee', true)
        .eq('status', 'ativo')
        .is('deleted_at', null)

      if (isMounted.current && count !== null) {
        setTotalProfsAee(count)
      }
    } catch (err) {
      console.error('Erro ao carregar especialidades do EMAEE:', err)
      toast.error('Erro ao consultar as especialidades da unidade.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (open && escola?.id) {
      setNovaEspecialidade('')
      carregarDados()
    }
  }, [open, escola?.id])

  const handleAdicionar = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const nomeLimpo = novaEspecialidade.trim()
    if (!nomeLimpo) return

    const jaExiste = especialidades.some(
      (esp) => esp.toLowerCase() === nomeLimpo.toLowerCase()
    )

    if (jaExiste) {
      toast.error(`A especialidade "${nomeLimpo}" já está na lista.`)
      return
    }

    setEspecialidades((prev) => [...prev, nomeLimpo])
    setNovaEspecialidade('')
    toast.success(`"${nomeLimpo}" adicionada à lista.`)
  }

  const handleRemover = (index: number) => {
    const itemRemovido = especialidades[index]
    setEspecialidades((prev) => prev.filter((_, i) => i !== index))
    toast.info(`"${itemRemovido}" removida da lista.`)
  }

  const handleMover = (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1
    if (novoIndex < 0 || novoIndex >= especialidades.length) return

    setEspecialidades((prev) => {
      const copy = [...prev]
      const [removido] = copy.splice(index, 1)
      copy.splice(novoIndex, 0, removido)
      return copy
    })
  }

  const handleSincronizarProfissionais = async () => {
    setSincronizando(true)
    const supabase = createBrowserClient()

    try {
      const { data: profs, error } = await supabase
        .from('funcionarios')
        .select('cargo')
        .eq('is_profissional_aee', true)
        .eq('status', 'ativo')
        .is('deleted_at', null)

      if (error) throw error

      if (!profs || profs.length === 0) {
        toast.info('Nenhum profissional AEE ativo encontrado no momento.')
        return
      }

      let novosAdicionados = 0
      const novaLista = [...especialidades]

      profs.forEach((p) => {
        if (p.cargo) {
          const espNome = deduzirEspecialidadeDeCargo(p.cargo)
          const existe = novaLista.some(
            (item) => item.toLowerCase() === espNome.toLowerCase()
          )
          if (!existe) {
            novaLista.push(espNome)
            novosAdicionados++
          }
        }
      })

      setEspecialidades(novaLista)

      if (novosAdicionados > 0) {
        toast.success(`${novosAdicionados} nova(s) especialidade(s) sincronizada(s) a partir dos profissionais!`)
      } else {
        toast.success('Todas as especialidades dos profissionais AEE já constam na lista!')
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar profissionais:', err)
      toast.error('Falha ao obter lista de profissionais AEE.')
    } finally {
      if (isMounted.current) {
        setSincronizando(false)
      }
    }
  }

  const handleRestaurarPadroes = () => {
    const confirm = window.confirm(
      'Deseja restaurar a lista com as especialidades canônicas padrão do EMAEE?'
    )
    if (!confirm) return

    setEspecialidades(Array.from(ESPECIALIDADES_CANONICAS_PADRAO))
    toast.success('Lista restaurada para as especialidades canônicas padrão.')
  }

  const handleSalvar = async () => {
    if (!escola?.id) return
    if (especialidades.length === 0) {
      toast.error('A lista de especialidades não pode ficar vazia.')
      return
    }

    setSalvando(true)
    try {
      const res = await salvarEspecialidadesEmaee(escola.id, especialidades)

      if (!res.success) {
        throw res.error
      }

      toast.success('Especialidades do EMAEE atualizadas e salvas com sucesso!')
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar especialidades:', err)
      toast.error('Erro ao salvar as especialidades no banco de dados.')
    } finally {
      if (isMounted.current) {
        setSalvando(false)
      }
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Especialidades do EMAEE"
      description={`Gerenciamento das especialidades clínicas e pedagógicas ofertadas em ${escola?.nome ?? 'EMAEE'}.`}
      maxWidth="sm:max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestaurarPadroes}
              disabled={salvando || loading}
              className="text-xs text-muted-foreground hover:text-foreground border-border rounded-xl gap-1.5 h-8.5"
              title="Restaurar lista para o padrão inicial"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
              className="text-xs text-muted-foreground hover:text-foreground rounded-xl h-8.5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={salvando || loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl gap-1.5 h-8.5 px-4 shadow-sm cursor-pointer"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Especialidades</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Banner Informativo & Ações Rápidas */}
        <div className="p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                Catálogo de Especialidades da Unidade
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3 text-sky-500" />
                <span>
                  <strong>{totalProfsAee}</strong> profissionais AEE cadastrados na rede
                </span>
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSincronizarProfissionais}
            disabled={sincronizando || loading}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl gap-1.5 h-8.5 shrink-0 shadow-sm cursor-pointer"
            title="Adiciona automaticamente as especialidades dos profissionais AEE cadastrados"
          >
            {sincronizando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Sincronizar dos Profissionais</span>
          </Button>
        </div>

        {/* Formulário para Adicionar Nova Especialidade */}
        <form onSubmit={handleAdicionar} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Digite uma nova especialidade (ex: Musicoterapia, Equoterapia)..."
              value={novaEspecialidade}
              onChange={(e) => setNovaEspecialidade(e.target.value)}
              className="bg-background border-border text-foreground text-xs rounded-xl h-9 pr-3"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!novaEspecialidade.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl gap-1 h-9 px-3 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </Button>
        </form>

        {/* Listagem de Especialidades */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold">
              Especialidades Cadastradas ({especialidades.length})
            </span>
            <span className="text-[11px]">
              Alimenta filtros de Fila de Espera e Prontuários
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center space-y-2 border border-border rounded-xl bg-card">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Carregando catálogo de especialidades...</p>
            </div>
          ) : especialidades.length === 0 ? (
            <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
              <Stethoscope className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">Nenhuma especialidade cadastrada.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRestaurarPadroes}
                className="text-xs rounded-xl"
              >
                Carregar Lista Padrão
              </Button>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-card">
              {especialidades.map((esp, idx) => (
                <div
                  key={`${esp}-${idx}`}
                  className="p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground truncate">
                      {esp}
                    </span>
                    {esp === 'Outros' && (
                      <Badge variant="outline" className="text-[9px] bg-muted/60 text-muted-foreground px-1 py-0">
                        Curinga
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMover(idx, 'cima')}
                      disabled={idx === 0}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMover(idx, 'baixo')}
                      disabled={idx === especialidades.length - 1}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemover(idx)}
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      title="Remover especialidade"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  )
}
