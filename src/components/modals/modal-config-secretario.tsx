'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserCheck, Loader2, Save } from 'lucide-react'

interface ModalConfigSecretarioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export function ModalConfigSecretario({
  open,
  onOpenChange,
  onSuccess
}: ModalConfigSecretarioProps) {
  const supabase = createClient()
  const [secretarioNome, setSecretarioNome] = useState('')
  const [cargoSecretario, setCargoSecretario] = useState('Secretário(a) de Educação')
  const [nomeRede, setNomeRede] = useState('Secretaria Municipal de Educação de Sapeaçu')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    let isMounted = true

    const fetchConfig = async () => {
      setLoading(true)
      try {
        const { data, error } = await (supabase as any)
          .from('configuracoes_rede')
          .select('*')
          .eq('id', SETTINGS_ID)
          .maybeSingle()

        if (!isMounted) return

        if (error) {
          console.error('Erro ao carregar configurações da secretaria:', error)
          toast.error('Não foi possível carregar as configurações atuais.')
        } else if (data) {
          setSecretarioNome(data.secretario_educacao ?? '')
          setCargoSecretario(data.cargo_secretario ?? 'Secretário(a) de Educação')
          setNomeRede(data.nome_rede ?? 'Secretaria Municipal de Educação de Sapeaçu')
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchConfig()

    return () => {
      isMounted = false
    }
  }, [open])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const nomeFormatado = secretarioNome.trim()
    if (!nomeFormatado) {
      toast.error('Informe o nome do(a) Secretário(a) de Educação.')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('configuracoes_rede')
        .upsert({
          id: SETTINGS_ID,
          secretario_educacao: nomeFormatado,
          cargo_secretario: cargoSecretario.trim() || 'Secretário(a) de Educação',
          nome_rede: nomeRede.trim() || 'Secretaria Municipal de Educação de Sapeaçu',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Configurações do Secretário de Educação atualizadas com sucesso!')
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar nome do Secretário:', err)
      toast.error(`Falha ao salvar: ${err.message || 'Erro de conexão.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Secretaria de Educação — Titularidade"
      description="Configure o nome do(a) Secretário(a) de Educação para chancela em boletins e documentos oficiais da rede."
      maxWidth="sm:max-w-[500px]"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-sm">Carregando dados atuais...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secretario_nome" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Nome do(a) Secretário(a) de Educação *
            </Label>
            <Input
              id="secretario_nome"
              type="text"
              value={secretarioNome}
              onChange={(e) => setSecretarioNome(e.target.value)}
              placeholder="Ex: MARCUS ALANO CORREIA OLIVEIRA"
              className="bg-[#17171a] border-[#27272a] text-white focus:border-purple-500 uppercase font-semibold text-sm h-10"
              required
            />
            <p className="text-[11px] text-zinc-500">
              Este nome aparecerá nos boletins escolares e documentos chancelados pela Secretaria.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <Label htmlFor="cargo_secretario" className="text-xs font-bold text-zinc-300">
              Título do Cargo
            </Label>
            <Input
              id="cargo_secretario"
              type="text"
              value={cargoSecretario}
              onChange={(e) => setCargoSecretario(e.target.value)}
              placeholder="Secretário(a) de Educação"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_rede" className="text-xs font-bold text-zinc-300">
              Nome da Secretaria / Órgão Municipal
            </Label>
            <Input
              id="nome_rede"
              type="text"
              value={nomeRede}
              onChange={(e) => setNomeRede(e.target.value)}
              placeholder="Secretaria Municipal de Educação de Sapeaçu"
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#26262a]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      )}
    </StandardDialog>
  )
}
