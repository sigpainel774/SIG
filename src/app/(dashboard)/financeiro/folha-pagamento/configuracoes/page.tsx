'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Settings, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'

export default function ConfigFolhaPage() {
  const supabase = createClient()
  const { isEditMode } = useEditModeStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  // Form State
  const [diaFechamento, setDiaFechamento] = useState('25')
  const [observacoes, setObservacoes] = useState('')

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('folha_pagamento_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setConfigId(data.id)
        setDiaFechamento(String(data.dia_fechamento))
        setObservacoes(data.observacoes || '')
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar configurações: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) return

    const diaNum = parseInt(diaFechamento)
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      toast.error('O dia de fechamento deve ser um número entre 1 e 31.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        dia_fechamento: diaNum,
        observacoes: observacoes.trim() || null,
        atualizado_por: user?.id || null,
        updated_at: new Date().toISOString()
      }

      let error
      if (configId) {
        const res = await supabase
          .from('folha_pagamento_config')
          .update(payload)
          .eq('id', configId)
        error = res.error
      } else {
        const res = await supabase
          .from('folha_pagamento_config')
          .insert(payload)
          .select('id')
          .single()
        error = res.error
        if (res.data) setConfigId(res.data.id)
      }

      if (error) throw error
      toast.success('Configurações salvas com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar configurações: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#26262a]">
        <Link href="/financeiro/folha-pagamento">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-9 w-9 bg-surface-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-400" />
            Configuração da Folha
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Definição de dia limite para fechamento mensal e notas gerais do processo de pagamento.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      ) : (
        <div className="max-w-2xl bg-[#141416] border border-[#26262a] rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="dia_fechamento" className="text-xs text-[#aaa]">Dia de Fechamento da Folha *</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <Input
                    id="dia_fechamento"
                    type="number"
                    min="1"
                    max="31"
                    value={diaFechamento}
                    onChange={(e) => setDiaFechamento(e.target.value)}
                    className="bg-[#121214] border-[#27272a] text-white w-32 h-10 font-bold text-center"
                    required
                    disabled={!isEditMode}
                  />
                  <span className="text-xs text-slate-400">
                    Dia mensal limite para lançamentos de adicionais e atestados.
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes" className="text-xs text-[#aaa]">Observações / Instruções Internas</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Instruções gerais sobre o processo de folha que aparecerão para os operadores da equipe de finanças."
                  className="bg-[#121214] border-[#27272a] text-white mt-1.5 min-h-[120px]"
                  disabled={!isEditMode}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#26262a]">
              {!isEditMode ? (
                <span className="text-xs text-amber-500 font-semibold">
                  Ative o Modo de Edição no topo para alterar as configurações.
                </span>
              ) : (
                <div />
              )}
              {isEditMode && (
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-10 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Configurações
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
