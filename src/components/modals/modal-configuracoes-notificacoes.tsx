'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { Bell, ShieldAlert, Sliders, Loader2, Info } from 'lucide-react'

interface ModalConfiguracoesNotificacoesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ConfigRule {
  id?: string
  nivel: number | null
  cargo_pattern: string | null
  tipo_notificacao: string
  enviar_web: boolean
}

export function ModalConfiguracoesNotificacoes({
  open,
  onOpenChange
}: ModalConfiguracoesNotificacoesProps) {
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [rules, setRules] = useState<ConfigRule[]>([])

  const userLevels = [
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

  const loadConfig = async () => {
    setLoading(true)
    const supabase = createClient() as any
    try {
      const { data, error } = await supabase
        .from('configuracao_notificacoes_niveis')
        .select('*')
      if (error) throw error
      setRules(data ?? [])
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar configurações de notificações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  const handleToggle = async (
    nivel: number | null, 
    cargo: string | null, 
    tipo: string, 
    currentVal: boolean
  ) => {
    setUpdating(true)
    const supabase = createClient() as any
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
      loadConfig()
    } catch (err: any) {
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
    return rule ? rule.enviar_web : false
  }

  // Componente de Switch customizado usando Tailwind CSS
  const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
    <button
      type="button"
      onClick={() => onChange(checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-purple-600' : 'bg-zinc-700'
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
      maxWidth="sm:max-w-[700px]"
      footer={
        <div className="flex justify-end w-full pt-2 border-t border-[#27272a]">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
          >
            Concluir
          </Button>
        </div>
      }
    >

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              <span>Carregando configurações...</span>
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] overflow-hidden bg-black/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#18181b] border-b border-[#27272a] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Nível / Cargo</th>
                    {notificationTypes.map(t => (
                      <th key={t.key} className="p-3.5 text-center">{t.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-sm">
                  {userLevels.map((level, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/10">
                      <td className="p-3.5 pl-4 font-medium text-white">{level.label}</td>
                      {notificationTypes.map(type => {
                        const checked = isChecked(level.nivel, level.cargo, type.key)
                        return (
                          <td key={type.key} className="p-3.5 text-center">
                            <div className="flex justify-center">
                              <ToggleSwitch 
                                checked={checked} 
                                disabled={updating}
                                onChange={() => handleToggle(level.nivel, level.cargo, type.key, checked)}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 flex gap-2.5 items-start text-xs text-zinc-400 leading-normal">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p>
              As alterações feitas nesta matriz entram em vigor imediatamente para todos os funcionários da rede. Desativar uma linha impedirá que o sistema realize o envio físico daquele tipo de aviso no menu de notificações dos usuários correspondentes.
            </p>
          </div>
        </div>
    </StandardDialog>
  )
}
