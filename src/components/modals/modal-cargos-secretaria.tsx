'use client'

import { useState, useEffect, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Loader2, Briefcase, Plus, Edit, Trash2 } from 'lucide-react'
import { ModalCargo } from '@/components/modals/modal-cargo'
import { executeWithToast } from '@/lib/action-handler'
import { useAuthStore } from '@/store/useAuthStore'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'

interface ModalCargosSecretariaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretariaId: string
  secretariaNome: string
}

export function ModalCargosSecretaria({
  open,
  onOpenChange,
  secretariaId,
  secretariaNome
}: ModalCargosSecretariaProps) {
  const [loading, setLoading] = useState(false)
  const [cargos, setCargos] = useState<any[]>([])
  const { funcionario } = useAuthStore()

  const [modalCargoOpen, setModalCargoOpen] = useState(false)
  const [cargoToEdit, setCargoToEdit] = useState<any | null>(null)

  const supabase = createClient()

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    if (open && secretariaId) {
      loadCargos()
    }
    return () => {
      isMounted.current = false
    }
  }, [open, secretariaId])

  const loadCargos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('secretaria_id', secretariaId)
        .is('deleted_at', null)
        .order('nivel', { ascending: true })

      if (error) throw error
      if (isMounted.current) {
        setCargos(data || [])
      }
    } catch (error: any) {
      console.error('Erro ao carregar cargos:', error)
      if (isMounted.current) toast.error('Erro ao carregar os cargos desta secretaria.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  const handleNovoCargo = () => {
    setCargoToEdit({ secretaria_id: secretariaId }) // Pre-fill
    setModalCargoOpen(true)
  }

  const handleEditarCargo = (cargo: any) => {
    setCargoToEdit(cargo)
    setModalCargoOpen(true)
  }

  const handleExcluirCargo = async (cargo: any) => {
    const confirm = window.confirm(`Deseja realmente mover o cargo "${cargo.nome}" para a Lixeira Global?`)
    if (!confirm) return

    await executeWithToast({
      action: () => softDeleteToTrash({
        supabase,
        tableName: 'cargos',
        recordId: cargo.id,
        recordSummary: cargo.nome,
        recordPayload: cargo,
        performedBy: {
          id: funcionario?.id ?? null,
          name: funcionario?.nome || 'Administrador',
          email: funcionario?.email || 'admin@super.com'
        }
      }),
      setLoading,
      successMessage: 'Cargo enviado para a Lixeira Global!',
      errorMessage: 'Erro ao excluir cargo',
      onSuccess: () => {
        loadCargos()
      }
    })
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Cargos: ${secretariaNome}`}
        description="Gerencie os cargos pertencentes a esta secretaria."
        maxWidth="sm:max-w-xl"
        footer={
          <div className="flex justify-end gap-2 w-full pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button 
              type="button" 
              onClick={handleNovoCargo} 
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Cargo
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : cargos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground bg-muted/30 rounded-xl border border-border">
            <Briefcase className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
            <p>Nenhum cargo cadastrado para esta secretaria.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 mt-2">
            {cargos.map(cargo => (
              <div 
                key={cargo.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-card border-border hover:border-zinc-400 dark:hover:border-zinc-700 gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {cargo.nome}
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] uppercase font-bold tracking-wider border border-purple-500/30">
                      Nível {cargo.nivel}
                    </span>
                  </h4>
                  {cargo.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cargo.descricao}</p>
                  )}
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {cargo.salario_base ? `Salário Base: R$ ${Number(cargo.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Salário não definido'}
                  </p>
                </div>

                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditarCargo(cargo)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 h-8 px-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleExcluirCargo(cargo)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </StandardDialog>

      {/* Modal Cargo para Criação / Edição */}
      {modalCargoOpen && (
        <ModalCargo
          open={modalCargoOpen}
          onOpenChange={setModalCargoOpen}
          cargoToEdit={cargoToEdit}
          onSuccess={loadCargos}
        />
      )}
    </>
  )
}
