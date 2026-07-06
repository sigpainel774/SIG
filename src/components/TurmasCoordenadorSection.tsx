import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface Turma {
  id: string
  nome: string
  ano_letivo: number
}

interface VinculoTurma {
  id: string
  turma_id: string
}

interface TurmasCoordenadorSectionProps {
  funcionarioId: string
  escolaId: string
}

export function TurmasCoordenadorSection({ funcionarioId, escolaId }: TurmasCoordenadorSectionProps) {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [vinculos, setVinculos] = useState<VinculoTurma[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [selecionadas, setSelecionadas] = useState<string[]>([])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const [resTurmas, resVinculos] = await Promise.all([
          supabase.from('turmas').select('id, nome, ano_letivo').eq('escola_id', escolaId).is('deleted_at', null).order('nome'),
          supabase.from('vinculos_turmas').select('id, turma_id').eq('funcionario_id', funcionarioId).eq('escola_id', escolaId).eq('tipo', 'coordenador')
        ])

        if (resTurmas.error) throw resTurmas.error
        if (resVinculos.error) throw resVinculos.error

        setTurmas(resTurmas.data || [])
        setVinculos(resVinculos.data || [])
        setSelecionadas((resVinculos.data || []).map(v => v.turma_id))
      } catch (err) {
        console.error(err)
        toast.error('Erro ao carregar turmas da escola')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioId, escolaId])

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      // Remover vínculos desmarcados
      const paraRemover = vinculos.filter(v => !selecionadas.includes(v.turma_id))
      if (paraRemover.length > 0) {
        await supabase.from('vinculos_turmas').delete().in('id', paraRemover.map(v => v.id))
      }

      // Adicionar novos vínculos
      const existentes = vinculos.map(v => v.turma_id)
      const paraAdicionar = selecionadas.filter(id => !existentes.includes(id))
      if (paraAdicionar.length > 0) {
        await supabase.from('vinculos_turmas').insert(
          paraAdicionar.map(turmaId => ({
            funcionario_id: funcionarioId,
            escola_id: escolaId,
            turma_id: turmaId,
            tipo: 'coordenador'
          }))
        )
      }

      toast.success('Turmas atualizadas com sucesso')
      
      // Recarregar os vínculos atualizados
      const resVinculos = await supabase.from('vinculos_turmas').select('id, turma_id').eq('funcionario_id', funcionarioId).eq('escola_id', escolaId).eq('tipo', 'coordenador')
      setVinculos(resVinculos.data || [])
      
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar turmas')
    } finally {
      setSalvando(false)
    }
  }

  const handleToggle = (turmaId: string) => {
    setSelecionadas(prev => prev.includes(turmaId) ? prev.filter(id => id !== turmaId) : [...prev, turmaId])
  }

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#3ea6ff]" />
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-[#3ea6ff]">
        <BookOpen className="w-4 h-4" />
        Turmas sob Coordenação
      </h4>
      <div className="text-xs text-zinc-400">Selecione as turmas vinculadas a este coordenador.</div>
      
      {turmas.length === 0 ? (
        <div className="text-sm text-zinc-500">Nenhuma turma encontrada nesta escola.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {turmas.map(turma => (
            <div key={turma.id} className="flex items-center space-x-2 bg-[#121216] p-2 rounded-lg border border-[#2e2e33]">
              <input 
                type="checkbox"
                id={`turma-${turma.id}`} 
                checked={selecionadas.includes(turma.id)}
                onChange={() => handleToggle(turma.id)}
                className="w-4 h-4 rounded border-zinc-500 bg-[#121216] checked:bg-[#3ea6ff] checked:border-[#3ea6ff] accent-[#3ea6ff] cursor-pointer"
              />
              <label htmlFor={`turma-${turma.id}`} className="text-sm font-medium leading-none cursor-pointer text-white">
                {turma.nome} ({turma.ano_letivo})
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar Turmas
        </Button>
      </div>
    </div>
  )
}
