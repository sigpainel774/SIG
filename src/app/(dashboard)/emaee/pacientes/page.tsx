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
  FileSpreadsheet,
  FileText,
  Printer
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ModalMatriculaEmaee } from '@/components/modals/modal-matricula-emaee'
import { PrintFichaInscricaoEmaee } from '@/components/print/print-ficha-inscricao-emaee'
import { PrintComprovanteMatriculaEmaee } from '@/components/print/print-comprovante-matricula-emaee'
import { getAvatarUrl } from '@/lib/photoHelper'

export default function PacientesPage() {
  const { escolaAtivaId } = useAuthStore()
  const [prontuarios, setProntuarios] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroZona, setFiltroZona] = useState('todos')
  const [refreshKey, setRefreshKey] = useState(0)

  // Estados de Visualização de Impressão
  const [fichaInscricaoProntuario, setFichaInscricaoProntuario] = useState<any | null>(null)
  const [comprovanteMatriculaProntuario, setComprovanteMatriculaProntuario] = useState<any | null>(null)

  useEffect(() => {
    let isMounted = true
    async function carregarProntuarios() {
      setCarregando(true)
      const supabase = createClient()
      try {
        const { selectedEscola } = useSchoolStore.getState()
        const isEmaeeUnit = selectedEscola?.tipo === 'EMAEE' || /emaee/i.test(selectedEscola?.nome || '')

        let query = supabase
          .from('emaee_matriculas')
          .select(`
            *,
            alunos (
              id,
              nome,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              foto_updated_at,
              cpf,
              rg,
              nis,
              inep,
              identif_unica_censo,
              cartao_sus,
              certidao_nascimento,
              data_nascimento,
              sexo,
              cor_raca,
              nome_mae,
              profissao_mae,
              nome_pai,
              profissao_pai,
              telefone,
              endereco,
              latitude,
              longitude,
              zona_residencial,
              nome_contato_emergencia,
              dados_matricula
            ),
            escolas:escola_regular_id (
              nome
            )
          `)
          .is('deleted_at', null)

        if (escolaAtivaId && isEmaeeUnit) {
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
  }, [escolaAtivaId, refreshKey])

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

        <div className="flex items-center gap-3">
          <Link href="/emaee/fila-espera">
            <Button variant="outline" className="border-border text-foreground hover:bg-hoverCustom rounded-xl gap-2 font-semibold text-xs py-2.5 shadow-sm">
              Fila de Espera
            </Button>
          </Link>
          
          <ModalMatriculaEmaee 
            escolaEmaeeId={escolaAtivaId || ''} 
            onSuccess={() => setRefreshKey(prev => prev + 1)}
            trigger={
              <Button className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] rounded-xl gap-2 font-bold text-xs py-2.5 shadow-md">
                <Plus className="w-4 h-4" /> Nova Matrícula EMAEE
              </Button>
            }
          />
        </div>
      </div>

      {/* Barra de Filtro e Pesquisa */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome do paciente ou CPF..."
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
            const avatarUrl = getAvatarUrl(paciente.alunos);
            return (
              <div
                key={paciente.id}
                className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-sm relative group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden border border-border/50">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={paciente.alunos?.nome || 'Foto 3x4'} className="w-full h-full object-cover" />
                        ) : (
                          paciente.alunos?.nome?.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate" title={paciente.alunos?.nome}>
                          {paciente.alunos?.nome}
                        </h3>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          Matrícula: {paciente.numero_matricula_emaee ?? 'Não gerada'}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${
                      paciente.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      paciente.status === 'EM_INVESTIGACAO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      paciente.status === 'ALTA' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      paciente.status === 'INATIVO' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}>
                      {paciente.status === 'ATIVO' ? 'Em Atendimento' :
                       paciente.status === 'EM_INVESTIGACAO' ? 'Em Investigação' :
                       paciente.status === 'ALTA' ? 'Alta Médica / AEE' :
                       paciente.status === 'INATIVO' ? 'Inativo / Desligado' : 'Fila de Espera'}
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

                {/* Botões Rápidos no Rodapé do Card */}
                <div className="border-t border-border/50 pt-3 flex items-center gap-2">
                  {/* Botão Ver Ficha de Inscrição */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFichaInscricaoProntuario(paciente)}
                    className="shrink-0 text-[#3ea6ff] border-[#3ea6ff]/30 hover:bg-[#3ea6ff]/10 text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5"
                    title="Ver e Imprimir Ficha de Inscrição Completa com Minimapa"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ficha</span>
                  </Button>

                  {/* Botão Imprimir Comprovante de Matrícula Rápido */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setComprovanteMatriculaProntuario(paciente)}
                    className="shrink-0 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5"
                    title="Imprimir Comprovante de Matrícula para o Responsável Assinar"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Comprovante</span>
                  </Button>

                  {/* Link Prontuário Completo */}
                  <Link href={`/emaee/pacientes/${paciente.id}`} className="flex-1 min-w-0">
                    <Button variant="outline" className="w-full text-xs rounded-xl font-bold py-1.5 border-border hover:bg-hoverCustom truncate">
                      Prontuário
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal / Portal de Visualização e Impressão da Ficha de Inscrição EMAEE */}
      {fichaInscricaoProntuario && (
        <PrintFichaInscricaoEmaee
          prontuario={fichaInscricaoProntuario}
          onClose={() => setFichaInscricaoProntuario(null)}
        />
      )}

      {/* Modal / Portal de Visualização e Impressão do Comprovante de Matrícula EMAEE */}
      {comprovanteMatriculaProntuario && (
        <PrintComprovanteMatriculaEmaee
          prontuario={comprovanteMatriculaProntuario}
          onClose={() => setComprovanteMatriculaProntuario(null)}
        />
      )}
    </div>
  )
}
