'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  Loader2,
  Plus,
  Trash2,
  Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { useAuthStore } from '@/store/useAuthStore'
import { SchoolSelector } from '@/components/SchoolSelector'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function GradeCurricularTab() {
  const { escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [materias, setMaterias] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [baseCurricular, setBaseCurricular] = useState<'comum' | 'diversificada'>('comum')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [editingBase, setEditingBase] = useState<'comum' | 'diversificada'>('comum')

  const fetchMaterias = async () => {
    if (!escolaAtivaId) return
    setLoading(true)
    const supabase = createClient() as any
    try {
      const { data, error } = await supabase
        .from('grade_curricular_escola')
        .select('*')
        .eq('escola_id', escolaAtivaId)
        .order('nome', { ascending: true })
      if (error) throw error
      setMaterias(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar matérias: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterias()
  }, [escolaAtivaId])

  const handleAddMateria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada. Por favor, selecione uma escola.')
      return
    }
    if (!nome.trim()) {
      toast.error('Digite o nome da matéria.')
      return
    }

    setLoading(true)
    const supabase = createClient() as any
    try {
      const { error } = await supabase
        .from('grade_curricular_escola')
        .insert({
          escola_id: escolaAtivaId,
          nome: nome.trim(),
          base_curricular: baseCurricular
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta matéria já está cadastrada nesta escola.')
        } else {
          throw error
        }
        return
      }

      toast.success('Matéria adicionada com sucesso!')
      setNome('')
      setBaseCurricular('comum')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao cadastrar matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMateria = async (id: string) => {
    if (!editingNome.trim()) {
      toast.error('Digite o nome da matéria.')
      return
    }

    setLoading(true)
    const supabase = createClient() as any
    try {
      const { error } = await supabase
        .from('grade_curricular_escola')
        .update({
          nome: editingNome.trim(),
          base_curricular: editingBase
        })
        .eq('id', id)

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta matéria já está cadastrada nesta escola.')
        } else {
          throw error
        }
        return
      }

      toast.success('Matéria atualizada com sucesso!')
      setEditingId(null)
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao atualizar matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMateria = async (id: string, nomeMateria: string) => {
    if (!escolaAtivaId) return

    setLoading(true)
    const supabase = createClient() as any
    try {
      const { count, error: checkError } = await supabase
        .from('materias')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaAtivaId)
        .eq('nome', nomeMateria)

      if (checkError) throw checkError

      if (count && count > 0) {
        toast.error(`Não é possível excluir a matéria "${nomeMateria}" pois ela está sendo utilizada em ${count} turma(s).`)
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('grade_curricular_escola')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Matéria removida com sucesso!')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao remover matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreencherPadrao = async () => {
    if (!escolaAtivaId) return
    setLoading(true)
    const supabase = createClient() as any

    const materiasPadrao = [
      { escola_id: escolaAtivaId, nome: 'Língua Portuguesa', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Matemática', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'História', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Geografia', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Ciências', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Arte', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Educação Física', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Ensino Religioso', base_curricular: 'comum' },
    ]

    try {
      const { data: existentes } = await supabase
        .from('grade_curricular_escola')
        .select('nome')
        .eq('escola_id', escolaAtivaId)

      const nomesExistentes = (existentes || []).map((e: any) => e.nome.toLowerCase().trim())
      const aInserir = materiasPadrao.filter(m => !nomesExistentes.includes(m.nome.toLowerCase().trim()))

      if (aInserir.length === 0) {
        toast.info('Todas as matérias padrão já estão cadastradas nesta escola.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('grade_curricular_escola')
        .insert(aInserir)

      if (error) throw error

      toast.success(`${aInserir.length} matérias padrão cadastradas com sucesso!`)
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao popular matérias padrão: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-borderCustom/50 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-foregroundCustom flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-highlight" />
            Grade Curricular da Escola
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre as matérias oferecidas por sua escola e defina se pertencem à Base Comum ou Diversificada.
          </p>
        </div>
        {escolaAtivaId && materias.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePreencherPadrao}
            disabled={loading}
            className="border-borderCustom text-zinc-300 hover:bg-hoverCustom hover:text-white"
          >
            Preencher com Matérias Padrão
          </Button>
        )}
      </div>

      {isAdminGlobalOrRoot() && (
        <div className="flex flex-col gap-2 p-4 bg-surface-2 rounded-xl border border-borderCustom max-w-md">
          <span className="text-xs font-semibold text-foregroundCustom">Selecione a Escola para configurar:</span>
          <SchoolSelector />
        </div>
      )}

      {!escolaAtivaId ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium max-w-md">
          Por favor, selecione uma escola para visualizar e gerenciar a grade curricular.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário */}
          <div className="lg:col-span-1 border border-dashed border-[#3f3f46] bg-[#121214] rounded-2xl p-4 h-fit space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingId ? 'Editar Matéria' : 'Nova Matéria'}
            </h3>

            <form
              onSubmit={
                editingId
                  ? (e) => { e.preventDefault(); handleUpdateMateria(editingId) }
                  : handleAddMateria
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Nome da Matéria</label>
                <Input
                  type="text"
                  placeholder="Ex: Geografia, Robótica..."
                  value={editingId ? editingNome : nome}
                  onChange={(e) => editingId ? setEditingNome(e.target.value) : setNome(e.target.value)}
                  className="bg-input border-borderCustom text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Base Curricular</label>
                <Select
                  value={editingId ? editingBase : baseCurricular}
                  onValueChange={(val: string | null) =>
                    editingId
                      ? setEditingBase((val ?? 'comum') as 'comum' | 'diversificada')
                      : setBaseCurricular((val ?? 'comum') as 'comum' | 'diversificada')
                  }
                >
                  <SelectTrigger className="bg-input border-borderCustom text-white focus:ring-[#3ea6ff]">
                    <SelectValue placeholder="Selecione o tipo de base" />
                  </SelectTrigger>
                  <SelectContent className="bg-input border-borderCustom text-white">
                    <SelectItem value="comum">Base Comum</SelectItem>
                    <SelectItem value="diversificada">Base Diversificada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setEditingId(null); setEditingNome('') }}
                    className="flex-1 text-zinc-400 hover:text-white"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-highlight text-background hover:bg-highlight/90 font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingId ? (
                    'Salvar'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Listagem */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-borderCustom overflow-hidden bg-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderCustom bg-[#121214] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="p-4 font-medium">Nome da Matéria</th>
                    <th className="p-4 font-medium">Base Curricular</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCustom text-sm">
                  {materias.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-zinc-500">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          'Nenhuma matéria cadastrada nesta escola.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    materias.map((mat) => (
                      <tr key={mat.id} className="hover:bg-hoverCustom/30 transition-colors">
                        <td className="p-4 font-medium text-foreground">{mat.nome}</td>
                        <td className="p-4">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                            mat.base_curricular === 'comum'
                              ? 'bg-blue-500/10 border-blue-500/20 text-[#185FA5] dark:text-[#3ea6ff]'
                              : 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                          )}>
                            {mat.base_curricular === 'comum' ? 'Base Comum' : 'Base Diversificada'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(mat.id)
                                setEditingNome(mat.nome)
                                setEditingBase(mat.base_curricular)
                              }}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              disabled={loading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir a matéria "${mat.nome}"?`)) {
                                  handleDeleteMateria(mat.id, mat.nome)
                                }
                              }}
                              className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
