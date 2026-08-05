'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import {
  Heart,
  Plus,
  Search,
  Filter,
  User,
  Clock,
  Briefcase,
  AlertTriangle,
  FolderOpen,
  MapPin,
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { StandardDialog } from '@/components/ui/standard-dialog'

export default function PacientesPage() {
  const { escolaAtivaId } = useAuthStore()
  const [prontuarios, setProntuarios] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroZona, setFiltroZona] = useState('todos')

  useEffect(() => {
    let isMounted = true
    async function carregarProntuarios() {
      setCarregando(true)
      const supabase = createClient()
      try {
        let query = supabase
          .from('emaee_matriculas')
          .select(`
            *,
            alunos!inner (
              nome,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              cpf,
              telefone
            ),
            escolas:escola_regular_id (
              nome
            )
          `)
          .is('deleted_at', null)

        if (escolaAtivaId) {
          query = query.eq('escola_atendimento_id', escolaAtivaId)
        }

        const { data, error } = await query

        if (error) throw error

        if (isMounted && data) {
          setProntuarios(data)
        }
      } catch (err) {
        console.error('Erro ao carregar prontuários do EMAEE:', err)
        toast.error('Erro ao carregar prontuários')
      } finally {
        if (isMounted) setCarregando(false)
      }
    }

    carregarProntuarios()
    return () => {
      isMounted = false
    }
  }, [escolaAtivaId])

  const prontuariosFiltrados = prontuarios.filter(p => {
    const nomeAluno = (p.alunos?.nome || '').toLowerCase()
    const cpfAluno = (p.alunos?.cpf || '').toLowerCase()
    const txtBusca = busca.toLowerCase()
    const matchesBusca = nomeAluno.includes(txtBusca) || cpfAluno.includes(txtBusca)
    const matchesStatus = filtroStatus === 'todos' || p.status === filtroStatus
    const matchesZona = filtroZona === 'todos' || p.localizacao_atendimento === filtroZona

    return matchesBusca && matchesStatus && matchesZona
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-primary stroke-[2.5]" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Pastas de Alunos / Saúde (EMAEE)
            </h1>
            <p className="text-xs text-muted-foreground">
              Acolhimento clínico, prontuários de saúde e evolução multidisciplinar
            </p>
          </div>
        </div>

        <Link href="/emaee/fila-espera">
          <Button className="bg-primary hover:bg-hoverCustom text-white rounded-xl gap-2 font-semibold text-xs py-2.5 shadow-md">
            <Plus className="w-4 h-4" /> Admitir da Fila de Espera
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por nome do aluno ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-secondary border border-border text-foreground rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-secondary border border-border text-foreground rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="FILA_ESPERA">Fila de Espera</option>
            <option value="EM_INVESTIGACAO">Em Investigação</option>
            <option value="ATIVO">Em Atendimento</option>
            <option value="ALTA">Alta Médica</option>
            <option value="INATIVO">Inativo</option>
          </select>

          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="bg-secondary border border-border text-foreground rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="todos">Todas as Zonas</option>
            <option value="Urbana">Zona Urbana</option>
            <option value="Rural">Zona Rural</option>
          </select>
        </div>
      </div>

      {/* Grid de Pacientes */}
      {carregando ? (
        <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground text-sm animate-pulse">
          Carregando prontuários do EMAEE...
        </div>
      ) : prontuariosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground text-sm">
          Nenhum prontuário clínico encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prontuariosFiltrados.map((paciente) => {
            const regularEscola = paciente.escolas?.nome ?? 'Sem Escola Regular';
            return (
              <div
                key={paciente.id}
                className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-sm relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {paciente.alunos?.nome?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                          {paciente.alunos?.nome}
                        </h3>
                        <span className="text-[10px] text-muted-foreground">
                          Matrícula: {paciente.numero_matricula_emaee ?? 'Investigando'}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      paciente.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      paciente.status === 'EM_INVESTIGACAO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {paciente.status === 'ATIVO' ? 'Em Atendimento' :
                       paciente.status === 'EM_INVESTIGACAO' ? 'Em Investigação' : 'Fila de Espera'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-normal text-muted-foreground pt-3">
                    {paciente.cid_codigo && (
                      <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>CID: {paciente.cid_codigo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{regularEscola} ({paciente.ano_escolarizacao ?? 'Ano não inf.'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span>Localidade: {paciente.localizacao_atendimento}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-3.5 flex items-center justify-between gap-2">
                  <Link href={`/emaee/pacientes/${paciente.id}`} className="w-full">
                    <Button variant="outline" className="w-full text-xs rounded-xl font-bold py-1.5 border-border hover:bg-hoverCustom">
                      Ver Prontuário Completo
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
