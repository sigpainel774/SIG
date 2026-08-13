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

      // 2. Carregar o acesso nivel 1 do usuário (sem .maybeSingle() para evitar PGRST116 se houver registros múltiplos)
      const { data: acRows, error: acError } = await supabase
        .from('acessos_usuarios')
        .select('id, secretarias_ids, ativo')
        .eq('funcionario_id', funcionarioId)
        .eq('nivel', 1)
        .order('created_at', { ascending: false })

      if (acError) throw acError

      const acAtivo = acRows?.find((a: any) => a.ativo === true) || acRows?.[0]

      if (acAtivo) {
        setAcessoUsuarioId(acAtivo.id)
        if (acAtivo.secretarias_ids && acAtivo.secretarias_ids.length > 0) {
          setSelectedIds(acAtivo.secretarias_ids)
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

    setSalvando(true)
    try {
      const finalIds = todos || selectedIds.length === 0 ? null : selectedIds

      if (acessoUsuarioId) {
        const { error } = await supabase
          .from('acessos_usuarios')
          .update({ secretarias_ids: finalIds, ativo: true })
          .eq('funcionario_id', funcionarioId)
          .eq('nivel', 1)

        if (error) throw error
      } else {
        // Se o usuário ainda não possui o registro Nível 1 em acessos_usuarios, insere com Nível 1
        const { error } = await supabase
          .from('acessos_usuarios')
          .insert({
            funcionario_id: funcionarioId,
            nivel: 1,
            ativo: true,
            secretarias_ids: finalIds,
            pode_mural: true,
            pode_turmas: true,
            pode_funcionarios: true,
            pode_matriculas: true,
            pode_alunos: true,
            pode_ocorrencias: true,
            pode_atestados: true
          })

        if (error) throw error
      }

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
        <div className="py-6 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl border border-border">
          <Building2 className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
          <p>O usuário <strong>{funcionarioNome}</strong> é um administrador <strong>ROOT</strong>.</p>
          <p className="mt-1">Ele já possui acesso irrestrito a todas as secretarias.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {!acessoUsuarioId && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              ⚠️ Este usuário não possui um registro de Nível 1 ativo. Ao salvar as secretarias, o Nível 1 será atribuído automaticamente a ele.
            </div>
          )}
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="todas" 
              checked={todos || selectedIds.length === 0} 
              onChange={() => setTodos(true)}
              className="w-4 h-4 accent-[#0090ff]"
            />
            <label htmlFor="todas" className="text-sm text-foreground font-medium cursor-pointer">
              Todas as Secretarias (Acesso Global)
            </label>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {secretarias.map(sec => {
              const isChecked = !todos && selectedIds.includes(sec.id)
              return (
                <div 
                  key={sec.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-[#0090ff]/10 border-[#0090ff]/30' : 'bg-muted/40 border-border hover:border-border'}`}
                  onClick={() => handleToggle(sec.id)}
                >
                  <span className={`text-sm ${isChecked ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
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
