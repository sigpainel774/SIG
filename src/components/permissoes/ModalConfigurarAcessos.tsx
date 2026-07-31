'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabaseClient'
import { invalidarCachePerfil } from '@/lib/invalidarCachePerfil'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Sparkles, UserCheck, FileText, UserPlus, Send, RefreshCw } from 'lucide-react'

export interface ToggleItem {
  chave: string
  label: string
  descricao: string
}

export interface GrupoToggle {
  grupo: string
  icone: any
  itens: ToggleItem[]
}

const GRUPOS_PERMISSOES: GrupoToggle[] = [
  {
    grupo: 'Alunos',
    icone: UserCheck,
    itens: [
      { chave: 'alunos.consultar', label: 'Consultar alunos', descricao: 'Ver lista, ficha e dados cadastrais dos estudantes' },
      { chave: 'alunos.cadastrar', label: 'Cadastrar aluno', descricao: 'Criar novos cadastros ou pré-matrículas' },
      { chave: 'alunos.editar', label: 'Editar ficha do aluno', descricao: 'Alterar dados cadastrais de alunos cadastrados' },
      { chave: 'alunos.anexos', label: 'Gerenciar anexos', descricao: 'Enviar e remover documentos da ficha do estudante' },
      { chave: 'alunos.solicitar_desbloqueio', label: 'Solicitar desbloqueio', descricao: 'Solicitar liberação de ficha assinada para edição' },
    ],
  },
  {
    grupo: 'Documentos',
    icone: FileText,
    itens: [
      { chave: 'documentos.imprimir_ficha', label: 'Imprimir ficha', descricao: 'Gerar e imprimir ficha individual de matrícula' },
      { chave: 'documentos.imprimir_comprovante', label: 'Imprimir comprovante', descricao: 'Emitir comprovante oficial de matrícula' },
    ],
  },
  {
    grupo: 'Matrículas',
    icone: UserPlus,
    itens: [
      { chave: 'matriculas.realizar', label: 'Realizar / renovar matrícula', descricao: 'Concluir novas matrículas e renovações anuais' },
    ],
  },
  {
    grupo: 'Atividades',
    icone: Send,
    itens: [
      { chave: 'atividades.ver_fila', label: 'Ver fila de atividades', descricao: 'Consultar atividades enviadas pelos professores' },
      { chave: 'atividades.imprimir', label: 'Imprimir atividades', descricao: 'Baixar/abrir arquivo e registrar impressão' },
      { chave: 'atividades.atualizar_status', label: 'Atualizar andamento', descricao: 'Mover entre recebida, em impressão, impressa e entregue' },
    ],
  },
  {
    grupo: 'Secretaria',
    icone: ShieldCheck,
    itens: [
      { chave: 'secretaria.emitir_documentos', label: 'Emitir documentos escolares', descricao: 'Atestados, declarações e documentos acadêmicos' },
      { chave: 'relatorios.servidores', label: 'Relatório de Servidores', descricao: 'Visualizar relatório e estatísticas de servidores da escola' },
    ],
  },
  {
    grupo: 'Transferências',
    icone: RefreshCw,
    itens: [
      { chave: 'transferencias.criar_solicitacao', label: 'Criar solicitações', descricao: 'Preparar minuta de transferência (aprovação fica com Direção)' },
    ],
  },
]

interface ModalConfigurarAcessosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  acessoUsuarioId: string
  funcionarioNome: string
  escolaNome: string
  funcionarioId?: string
  onSalvo?: () => void
}

export function ModalConfigurarAcessos({
  open,
  onOpenChange,
  acessoUsuarioId,
  funcionarioNome,
  escolaNome,
  funcionarioId,
  onSalvo,
}: ModalConfigurarAcessosProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Carrega permissões atuais do banco
  useEffect(() => {
    if (!open || !acessoUsuarioId) return

    let isMounted = true
    async function carregarPermissoes() {
      setCarregando(true)
      try {
        const supabase = createClient()
        const { data, error } = await (supabase as any)
          .from('acessos_usuarios_permissoes')
          .select('permissao, permitido')
          .eq('acesso_usuario_id', acessoUsuarioId)

        if (!error && data) {
          const mapa: Record<string, boolean> = {}
          data.forEach((p: any) => {
            mapa[p.permissao] = p.permitido
          })
          if (isMounted) setToggles(mapa)
        }
      } catch (err) {
        console.error('Erro ao carregar permissões granulares:', err)
        toast.error('Erro ao carregar permissões do secretário.')
      } finally {
        if (isMounted) setCarregando(false)
      }
    }

    carregarPermissoes()
    return () => {
      isMounted = false
    }
  }, [open, acessoUsuarioId])

  const handleToggleChange = (chave: string, checked: boolean) => {
    setToggles((prev) => ({
      ...prev,
      [chave]: checked,
    }))
  }

  // Perfis Rápidos (Presets)
  const aplicarPreset = (tipo: 'matricula' | 'documentos' | 'avaliacoes' | 'total') => {
    const novoMapa: Record<string, boolean> = {}

    // Desmarca todos inicialmente
    GRUPOS_PERMISSOES.forEach((g) => g.itens.forEach((i) => (novoMapa[i.chave] = false)))

    if (tipo === 'matricula') {
      novoMapa['alunos.consultar'] = true
      novoMapa['alunos.cadastrar'] = true
      novoMapa['alunos.editar'] = true
      novoMapa['matriculas.realizar'] = true
      novoMapa['documentos.imprimir_comprovante'] = true
    } else if (tipo === 'documentos') {
      novoMapa['alunos.consultar'] = true
      novoMapa['documentos.imprimir_ficha'] = true
      novoMapa['documentos.imprimir_comprovante'] = true
      novoMapa['secretaria.emitir_documentos'] = true
    } else if (tipo === 'avaliacoes') {
      novoMapa['atividades.ver_fila'] = true
      novoMapa['atividades.imprimir'] = true
      novoMapa['atividades.atualizar_status'] = true
    } else if (tipo === 'total') {
      GRUPOS_PERMISSOES.forEach((g) => g.itens.forEach((i) => (novoMapa[i.chave] = true)))
    }

    setToggles(novoMapa)
    toast.info('Perfil rápido aplicado com sucesso!')
  }

  // Salvar alterações no Supabase
  const handleSalvar = async () => {
    if (!acessoUsuarioId) return
    setSalvando(true)

    try {
      const supabase = createClient()

      // Converte mapa de toggles para array de inserção/update
      const payload: { acesso_usuario_id: string; permissao: string; permitido: boolean }[] = []

      GRUPOS_PERMISSOES.forEach((grupo) => {
        grupo.itens.forEach((item) => {
          payload.push({
            acesso_usuario_id: acessoUsuarioId,
            permissao: item.chave,
            permitido: toggles[item.chave] ?? false,
          })
        })
      })

      const { error } = await (supabase as any)
        .from('acessos_usuarios_permissoes')
        .upsert(payload, { onConflict: 'acesso_usuario_id, permissao' })

      if (error) throw error

      // Invalida cache de perfil do usuário se o ID for informado
      if (funcionarioId) {
        invalidarCachePerfil(funcionarioId)
      }

      toast.success('Permissões granulares salvas com sucesso!')
      onOpenChange(false)
      if (onSalvo) onSalvo()
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err)
      toast.error('Não foi possível salvar as permissões do secretário.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar Acessos do Secretário"
      description={`Defina quais ações ${funcionarioNome ?? 'o funcionário'} poderá realizar em ${escolaNome ?? 'sua escola'}.`}
      maxWidth="sm:max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={carregando || salvando}
            className="bg-[#0090ff] hover:bg-[#0077d4] text-white font-medium cursor-pointer"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Permissões'
            )}
          </Button>
        </div>
      }
    >
      {carregando ? (
        <div className="flex items-center justify-center py-12 gap-3 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#0090ff]" />
          <span>Carregando toggles de permissão...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Perfis Rápidos (Presets) */}
          <div className="bg-surface-2 border border-borderCustom rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Perfis Rápidos (Predefinições)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => aplicarPreset('matricula')}
                className="text-xs border-borderCustom hover:border-[#0090ff] hover:text-[#0090ff] cursor-pointer"
              >
                Secretário de Matrícula
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => aplicarPreset('documentos')}
                className="text-xs border-borderCustom hover:border-[#0090ff] hover:text-[#0090ff] cursor-pointer"
              >
                Secretário de Documentos
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => aplicarPreset('avaliacoes')}
                className="text-xs border-borderCustom hover:border-[#0090ff] hover:text-[#0090ff] cursor-pointer"
              >
                Secretário de Avaliações
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => aplicarPreset('total')}
                className="text-xs border-borderCustom hover:border-emerald-500 hover:text-emerald-400 cursor-pointer"
              >
                Selecionar Todos
              </Button>
            </div>
          </div>

          {/* Grupos de Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GRUPOS_PERMISSOES.map((grupo) => {
              const IconeGrupo = grupo.icone
              return (
                <div key={grupo.grupo} className="bg-surface-2 border border-borderCustom rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-borderCustom">
                    <IconeGrupo className="w-4 h-4 text-[#0090ff]" />
                    <span className="font-semibold text-sm text-foreground">{grupo.grupo}</span>
                  </div>

                  <div className="space-y-3">
                    {grupo.itens.map((item) => {
                      const isChecked = !!toggles[item.chave]
                      return (
                        <div key={item.chave} className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 pr-2">
                            <Label htmlFor={item.chave} className="text-xs font-medium text-foreground cursor-pointer">
                              {item.label}
                            </Label>
                            <p className="text-[11px] text-muted-foreground leading-tight">{item.descricao}</p>
                          </div>

                          {/* Toggle Switch customizado */}
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              id={item.chave}
                              checked={isChecked}
                              onChange={(e) => handleToggleChange(item.chave, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0090ff]"></div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </StandardDialog>
  )
}
