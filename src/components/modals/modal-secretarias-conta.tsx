'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Loader2, Building2, Check } from 'lucide-react'

interface ModalSecretariasContaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funcionarioId: string
  funcionarioNome: string
  isSuperAdmin: boolean
}

export function ModalSecretariasConta({
  open,
  onOpenChange,
  funcionarioId,
  funcionarioNome,
  isSuperAdmin
}: ModalSecretariasContaProps) {
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [secretarias, setSecretarias] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [acessoUsuarioId, setAcessoUsuarioId] = useState<string | null>(null)
  const [todos, setTodos] = useState(true) // Se true, o array no banco é null (todas)

  const supabase = createClient()

  useEffect(() => {
    if (open && funcionarioId) {
      loadData()
    }
  }, [open, funcionarioId])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Carregar secretarias ativas
      const { data: secData, error: secError } = await supabase
        .from('secretarias')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome')

      if (secError) throw secError
      setSecretarias(secData || [])

      // 2. Carregar o acesso nivel 1 do usuário
      const { data: acData, error: acError } = await supabase
        .from('acessos_usuarios')
        .select('id, secretarias_ids')
        .eq('funcionario_id', funcionarioId)
        .eq('nivel', 1)
        .eq('ativo', true)
        .maybeSingle()

      if (acError) throw acError

      if (acData) {
        setAcessoUsuarioId(acData.id)
        if (acData.secretarias_ids && acData.secretarias_ids.length > 0) {
          setSelectedIds(acData.secretarias_ids)
          setTodos(false)
        } else {
          setSelectedIds([])
          setTodos(true)
        }
      } else {
        setAcessoUsuarioId(null)
        setSelectedIds([])
        setTodos(true)
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados de secretarias:', error)
      toast.error('Erro ao carregar vinculações de secretarias.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    if (todos) {
      setTodos(false)
      setSelectedIds([id])
    } else {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      )
    }
  }

  const handleSalvar = async () => {
    if (isSuperAdmin) {
      toast.info('Usuários ROOT já possuem acesso irrestrito a todas as secretarias.')
      onOpenChange(false)
      return
    }

    if (!acessoUsuarioId) {
      toast.error('Este usuário não possui um Nível 1 ativo para vincular secretarias. Atribua o nível 1 a ele primeiro.')
      return
    }

    setSalvando(true)
    try {
      const finalIds = todos || selectedIds.length === 0 ? null : selectedIds

      const { error } = await supabase
        .from('acessos_usuarios')
        .update({ secretarias_ids: finalIds })
        .eq('id', acessoUsuarioId)

      if (error) throw error

      toast.success('Acesso a secretarias atualizado com sucesso!')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar secretarias:', error)
      toast.error('Erro ao salvar acessos.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Secretarias de ${funcionarioNome}`}
      description="Selecione as secretarias que este usuário nível 1 pode acessar."
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSalvar} 
            disabled={loading || salvando || isSuperAdmin}
            className="bg-[#0090ff] text-white hover:bg-[#0077d4]"
          >
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Salvar Acessos'}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#0090ff]" />
        </div>
      ) : isSuperAdmin ? (
        <div className="py-6 text-center text-sm text-zinc-400 bg-black/20 rounded-xl border border-zinc-800">
          <Building2 className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
          <p>O usuário <strong>{funcionarioNome}</strong> é um administrador <strong>ROOT</strong>.</p>
          <p className="mt-1">Ele já possui acesso irrestrito a todas as secretarias.</p>
        </div>
      ) : !acessoUsuarioId ? (
        <div className="py-6 text-center text-sm text-zinc-400 bg-black/20 rounded-xl border border-zinc-800">
          <p>Este usuário não possui o <strong>Nível 1</strong> ativo.</p>
          <p className="mt-1">Apenas usuários com Nível 1 podem ter acessos granulares a secretarias.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="todas" 
              checked={todos || selectedIds.length === 0} 
              onChange={() => setTodos(true)}
              className="w-4 h-4 accent-[#0090ff]"
            />
            <label htmlFor="todas" className="text-sm text-white font-medium cursor-pointer">
              Todas as Secretarias (Acesso Global)
            </label>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {secretarias.map(sec => {
              const isChecked = !todos && selectedIds.includes(sec.id)
              return (
                <div 
                  key={sec.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-[#0090ff]/10 border-[#0090ff]/30' : 'bg-black/20 border-zinc-800 hover:border-zinc-700'}`}
                  onClick={() => handleToggle(sec.id)}
                >
                  <span className={`text-sm ${isChecked ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                    {sec.nome}
                  </span>
                  {isChecked && <Check className="w-4 h-4 text-[#0090ff]" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </StandardDialog>
  )
}
