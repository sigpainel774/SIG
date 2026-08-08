'use client'

import { useCallback, useEffect, useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import type { Database } from '@/types/supabase'
import { Info } from 'lucide-react'


interface ModalConfiguracoesNotificacoesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ConfigRule = Pick<
  Database['public']['Tables']['configuracao_notificacoes_niveis']['Row'],
  'id' | 'nivel' | 'cargo_pattern' | 'tipo_notificacao' | 'enviar_web'
>

interface UserLevelItem {
  label: string
  nivel: number | null
  cargo: string | null
}

export function ModalConfiguracoesNotificacoes({
  open,
  onOpenChange
}: ModalConfiguracoesNotificacoesProps) {
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [rules, setRules] = useState<ConfigRule[]>([])

  const userLevels: UserLevelItem[] = [
    { label: 'Nível 1 — Gestor Macro (Prefeito/Secretário)', nivel: 1, cargo: null },
    { label: 'Nível 2 — Diretor Escolar', nivel: 2, cargo: null },
    { label: 'Nível 3 — Vice-Diretor', nivel: 3, cargo: null },
    { label: 'Nível 4 — Coordenador Pedagógico', nivel: 4, cargo: null },
    { label: 'Nível 5 — Chefe de Setor', nivel: 5, cargo: null },
    { label: 'Professores (Cargo c/ "Professor")', nivel: null, cargo: '%Professor%' }
  ]


  const notificationTypes = [
    { key: 'transferencia', label: 'Transferências' },
    { key: 'solicitacao_rh', label: 'RH / Lotação' },
    { key: 'comunicado', label: 'Mural / Comunicados' },
    { key: 'alerta_prazo', label: 'Alertas de Prazos' }
  ]

  const loadConfig = useCallback(async () => {
    await Promise.resolve()
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('configuracao_notificacoes_niveis')
        .select('id, nivel, cargo_pattern, tipo_notificacao, enviar_web')
      if (error) throw error
      setRules(data ?? [])
    } catch (err: unknown) {
      console.error(err)
      toast.error('Erro ao carregar configurações de notificações.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const loadTimer = window.setTimeout(() => void loadConfig(), 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadConfig, open])

  const handleToggle = async (
    nivel: number | null, 
    cargo: string | null, 
    tipo: string, 
    currentVal: boolean
  ) => {
    setUpdating(true)
    const supabase = createClient()
    try {
      // Tenta achar regra existente na lista local
      const existingRule = rules.find(r => 
        (nivel !== null ? r.nivel === nivel : r.cargo_pattern === cargo) && 
        r.tipo_notificacao === tipo
      )

      if (existingRule?.id) {
        const { error } = await supabase
          .from('configuracao_notificacoes_niveis')
          .update({ enviar_web: !currentVal })
          .eq('id', existingRule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('configuracao_notificacoes_niveis')
          .insert({
            nivel,
            cargo_pattern: cargo,
            tipo_notificacao: tipo,
            enviar_web: !currentVal
          })
        if (error) throw error
      }

      toast.success('Configuração de notificação atualizada!')
      void loadConfig()
    } catch (err: unknown) {
      console.error(err)
      toast.error('Erro ao salvar alteração.')
    } finally {
      setUpdating(false)
    }
  }

  const isChecked = (nivel: number | null, cargo: string | null, tipo: string) => {
    const rule = rules.find(r => 
      (nivel !== null ? r.nivel === nivel : r.cargo_pattern === cargo) && 
      r.tipo_notificacao === tipo
    )
    return rule?.enviar_web ?? false
  }

  // Componente de Switch customizado usando Tailwind CSS
  const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <button
      type="button"
      onClick={() => onChange(checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
        checked ? 'bg-primary' : 'bg-muted-foreground/45 dark:bg-zinc-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configuração de Notificações"
      description="Selecione quais tipos de notificações no painel cada nível ou cargo de usuário da rede receberá."
      maxWidth="sm:max-w-5xl"
      footer={
        <div className="flex w-full justify-end pt-2 border-t border-border">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Concluir
          </Button>
        </div>
      }
    >

        <div className="space-y-4 py-2 sm:py-4">
          <StandardTable
            data={userLevels}
            loading={loading}
            loadingMessage="Carregando configurações..."
            tableClassName="min-w-[900px]"
            columns={[
              {
                header: 'Nível / Cargo',
                headClassName: 'min-w-[320px] pl-4',
                className: 'min-w-[320px] pl-4 font-medium text-foreground',
                accessor: (level) => level.label
              },
              ...notificationTypes.map((type): TableColumn<UserLevelItem> => ({
                header: type.label,
                headClassName: 'min-w-[140px] text-center',
                className: 'min-w-[140px] text-center',
                accessor: (level) => {

                  const checked = isChecked(level.nivel, level.cargo, type.key)
                  return (
                    <div className="flex justify-center">
                      <ToggleSwitch 
                        checked={checked} 
                        disabled={updating}
                        onChange={() => handleToggle(level.nivel, level.cargo, type.key, checked)}
                      />
                    </div>
                  )
                }
              }))
            ]}
            keyExtractor={(level, idx) => `${level.nivel ?? level.cargo ?? idx}`}
          />

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">

            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              As alterações feitas nesta matriz entram em vigor imediatamente para todos os funcionários da rede. Desativar uma linha impedirá que o sistema realize o envio físico daquele tipo de aviso no menu de notificações dos usuários correspondentes.
            </p>
          </div>
        </div>
    </StandardDialog>
  )
}
