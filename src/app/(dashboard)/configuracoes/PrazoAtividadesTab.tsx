'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarClock, Save, Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export function PrazoAtividadesTab() {
  const [prazoDias, setPrazoDias] = useState<number>(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    let active = true

    const fetchConfig = async () => {
      try {
        setLoading(true)
        const { data, error } = await (supabase.from as any)('configuracoes_rede')
          .select('id, prazo_envio_atividades_dias')
          .limit(1)
          .maybeSingle()

        if (error) throw error

        if (active) {
          if (data) {
            setConfigId(data.id)
            setPrazoDias(data.prazo_envio_atividades_dias ?? 5)
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar prazo de envio de atividades:', err)
        toast.error('Erro ao carregar prazo de envio de atividades: ' + err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchConfig()

    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    if (prazoDias < 0) {
      toast.error('O prazo em dias não pode ser negativo.')
      return
    }

    setSaving(true)

    try {
      if (configId) {
        const { error } = await (supabase.from as any)('configuracoes_rede')
          .update({
            prazo_envio_atividades_dias: prazoDias,
            updated_at: new Date().toISOString(),
          })
          .eq('id', configId)

        if (error) throw error
      } else {
        const { data, error } = await (supabase.from as any)('configuracoes_rede')
          .insert({
            prazo_envio_atividades_dias: prazoDias,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) throw error
        if (data) setConfigId(data.id)
      }

      toast.success(
        prazoDias === 0
          ? 'Trava desativada: Professores podem enviar atividades para qualquer data de aplicação sem antecedência mínima.'
          : `Prazo mínimo para envio de atividades atualizado para ${prazoDias} dia(s) de antecedência com sucesso!`
      )
    } catch (err: any) {
      console.error('Erro ao salvar prazo de envio de atividades:', err)
      toast.error('Erro ao salvar configuração: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border bg-card p-8 text-center flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando configurações de prazo...
        </div>
      </Card>
    )
  }

  return (
    <div className="animate-in fade-in-50 duration-200">
      <Card className="border-border bg-card p-6 space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <CalendarClock className="h-5 w-5 text-primary" />
            Prazo Mínimo para Envio de Atividades à Secretaria
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Defina o prazo mínimo (em dias de antecedência) para que os professores possam cadastrar e enviar atividades para a secretaria.
            Esse tempo garante antecedência suficiente para a secretaria realizar a conferência e impressão do material.
          </p>
        </div>

        <div className="space-y-5 max-w-xl">
          {/* Seleção Rápida */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Seleção Rápida de Prazo:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '3 Dias', value: 3 },
                { label: '5 Dias (Padrão)', value: 5 },
                { label: '7 Dias (1 sem)', value: 7 },
                { label: 'Sem Trava (0)', value: 0 },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPrazoDias(item.value)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    prazoDias === item.value
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de Prazo Customizado */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Prazo Customizado (antecedência em dias):</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={365}
                value={prazoDias}
                onChange={(e) => setPrazoDias(parseInt(e.target.value) || 0)}
                className="w-32 bg-input border-border text-foreground font-bold text-center h-10"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {prazoDias === 0
                  ? 'dias (0 = Envio liberado para qualquer data)'
                  : `dia(s) de antecedência mínima em relação à data de aplicação`}
              </span>
            </div>
          </div>

          {/* Painel Informativo */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Como este prazo funcionará na prática:
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>
                <strong>Professores:</strong> Ao cadastrar uma atividade, a data de aplicação deverá ser no mínimo{' '}
                <span className="font-bold text-foreground">{prazoDias === 0 ? 'sem limite' : `${prazoDias} dia(s)`}</span>{' '}
                no futuro.
              </li>
              <li>
                <strong>Bloqueio Visual:</strong> O seletor de data desabilitará os dias anteriores ao prazo mínimo permitido.
              </li>
              <li>
                <strong>Isenção da Direção &amp; Superadmin:</strong> Diretores e Administradores possuem permissão para agendar atividades de urgência para qualquer data.
              </li>
            </ul>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-6 gap-2 cursor-pointer rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
