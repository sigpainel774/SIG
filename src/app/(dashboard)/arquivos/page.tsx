'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  Archive, 
  Search, 
  Eye, 
  RefreshCw, 
  ArrowLeft, 
  User, 
  Building2, 
  FileText, 
  Calendar,
  AlertCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import Link from 'next/link'

function ArquivosContent() {
  const router = useRouter()
  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()

  // Estados locais
  const [activeTab, setActiveTab] = useState<'alunos' | 'funcionarios'>('alunos')
  const [searchTerm, setSearchTerm] = useState('')
  const [arquivados, setArquivados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedArq, setSelectedArq] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadArquivados = async () => {
    if (!escolaAtivaId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('arquivados')
        .select(`
          *,
          arquivado_por_user:funcionarios!arquivado_por(nome)
        `)
        .eq('escola_origem_id', escolaAtivaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArquivados(data || [])
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error)
      toast.error('Erro ao buscar arquivos históricos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArquivados()
  }, [escolaAtivaId])

  // Filtragem dos registros
  const getArquivadosFiltrados = () => {
    return arquivados.filter((arq) => {
      // 1. Filtro de Aba
      const isAlunoTab = activeTab === 'alunos'
      const matchTipo = isAlunoTab 
        ? (arq.tipo === 'ALUNO' || arq.tipo === 'ALUNO_TRANSFERIDO')
        : (arq.tipo === 'FUNCIONARIO' || arq.tipo === 'FUNCIONARIO_TRANSFERIDO')

      if (!matchTipo) return false

      // 2. Filtro de Busca
      if (!searchTerm) return true
      const payload = arq.payload_completo || {}
      const nome = (payload.nome || '').toLowerCase()
      const cpf = (payload.cpf || '').toLowerCase()
      const motivo = (arq.motivo || '').toLowerCase()
      const search = searchTerm.toLowerCase()

      return nome.includes(search) || cpf.includes(search) || motivo.includes(search)
    })
  }

  const items = getArquivadosFiltrados()

  // Função para retornar dados estruturados do Snapshot da Ficha
  const getFichaDetalhes = (arq: any) => {
    if (!arq) return []
    const payload = arq.payload_completo || {}
    
    if (arq.tipo === 'ALUNO' || arq.tipo === 'ALUNO_TRANSFERIDO') {
      return [
        { label: 'Nome Completo', value: payload.nome },
        { label: 'CPF', value: payload.cpf ?? '-' },
        { label: 'Série / Turma', value: payload.serie ?? '-' },
        { label: 'Data de Nascimento', value: payload.data_nascimento ? new Date(payload.data_nascimento).toLocaleDateString('pt-BR') : '-' },
        { label: 'RG', value: payload.rg ?? '-' },
        { label: 'Nome da Mãe', value: payload.nome_mae ?? '-' },
        { label: 'Nome do Pai', value: payload.nome_pai ?? '-' },
        { label: 'Telefone', value: payload.telefone ?? '-' },
        { label: 'Endereço', value: payload.endereco ?? '-' }
      ]
    } else {
      // Funcionário
      return [
        { label: 'Nome Completo', value: payload.nome },
        { label: 'CPF', value: payload.cpf ?? '-' },
        { label: 'Cargo', value: payload.cargo ?? '-' },
        { label: 'E-mail', value: payload.email ?? '-' },
        { label: 'Telefone', value: payload.telefone ?? '-' },
        { label: 'Escolaridade', value: payload.escolaridade_nivel ?? '-' },
        { label: 'Endereço', value: payload.endereco ?? '-' }
      ]
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-12">
      {/* Modal de Detalhes da Ficha Congelada */}
      {modalOpen && selectedArq && (
        <StandardDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={`Visualizar Ficha Histórica — ${selectedArq.tipo}`}
          description="Visualização do snapshot dos dados gravados no momento em que o registro foi transferido ou arquivado."
          maxWidth="sm:max-w-[600px]"
          footer={
            <div className="flex justify-end w-full pt-3 border-t border-[#26262a]">
              <Button 
                variant="ghost" 
                onClick={() => setModalOpen(false)}
                className="text-[#aaa] hover:bg-[#27272a] hover:text-white"
              >
                Fechar Ficha
              </Button>
            </div>
          }
        >

            <div className="space-y-5 py-3">
              {/* Snapshot da Ficha */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#3ea6ff]" />
                  <span>Ficha Cadastral (Snapshot)</span>
                </h4>
                <div className="bg-[#121212] border border-[#26262a] rounded-xl p-3.5 space-y-2.5 text-xs">
                  {getFichaDetalhes(selectedArq).map((d, index) => (
                    <div key={index} className="grid grid-cols-3 border-b border-[#26262a]/50 pb-2 last:border-b-0 last:pb-0">
                      <span className="text-zinc-400 font-medium">{d.label}</span>
                      <span className="col-span-2 text-white font-semibold truncate">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Justificativa e Motivo */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Justificativa / Motivo</span>
                </h4>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 leading-relaxed italic">
                  "{selectedArq.motivo}"
                </div>
              </div>

              {/* Documentos Anexados (Pasta do Aluno) */}
              {selectedArq.arquivos_anexos && Array.isArray(selectedArq.arquivos_anexos) && selectedArq.arquivos_anexos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Documentos Anexados (Pasta)</span>
                  </h4>
                  <div className="bg-[#121212] border border-[#26262a] rounded-xl p-3.5 space-y-2.5 text-xs">
                    {selectedArq.arquivos_anexos.map((arq: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center border-b border-[#26262a]/50 pb-2 last:border-b-0 last:pb-0">
                        <span className="text-white font-medium">{arq.nome || `Documento ${idx + 1}`}</span>
                        {arq.arquivo_url && (
                          <a 
                            href={arq.arquivo_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                          >
                            Visualizar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registro do Histórico */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Auditoria</span>
                </h4>
                <div className="bg-black/20 border border-[#26262a] p-3.5 rounded-xl text-xs space-y-1">
                  <p className="text-zinc-400">Status: <span className="text-white font-semibold">{selectedArq.status}</span></p>
                  <p className="text-zinc-400">Data de Registro: <span className="text-white font-semibold">{selectedArq.created_at ? new Date(selectedArq.created_at).toLocaleString('pt-BR') : '-'}</span></p>
                  <p className="text-zinc-400">Processado por: <span className="text-white font-semibold">{selectedArq.arquivado_por_user?.nome ?? 'Sistema / Root'}</span></p>
                </div>
              </div>
            </div>

        </StandardDialog>
      )}

      {/* Título da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 rounded-2xl bg-[#e0f2fe] text-[#185FA5] dark:bg-[#1b253b] dark:text-[#3ea6ff] border-[0.5px] border-[#3f3f46] shadow-sm flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Arquivo Escolar</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 ml-1">
            Pesquisa e visualização das fichas históricas de alunos e funcionários transferidos ou arquivados nesta unidade.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadArquivados} 
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-11"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid Central */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filtros e Abas do Painel Lateral */}
        <div className="bg-[#121212] border border-[#3f3f46] p-4 rounded-2xl space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Categorias</span>
            <button
              onClick={() => setActiveTab('alunos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'alunos' ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <User className="w-4 h-4" />
              Alunos Arquivados
            </button>
            <button
              onClick={() => setActiveTab('funcionarios')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'funcionarios' ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <Building2 className="w-4 h-4" />
              Funcionários Arquivados
            </button>
          </div>

          <div className="pt-2 border-t border-[#26262a] space-y-2">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Filtro Rápido</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-[#18181b] border-[#3f3f46] text-white text-xs h-9 rounded-xl focus-visible:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Arquivados */}
        <div className="lg:col-span-3">
          <div className="bg-[#121212] border border-[#3f3f46] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#3f3f46] bg-[#18181b] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                Fichas em Arquivo Histórico
                <span className="bg-[#27272a] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              </h3>
            </div>

            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">{activeTab === 'alunos' ? 'Aluno' : 'Funcionário'}</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Motivo do Registro</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Arquivado Em</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((arq) => {
                  const payload = arq.payload_completo || {}
                  const nome = payload.nome ?? 'Sem nome'
                  const subinfo = activeTab === 'alunos' 
                    ? (payload.cpf ? `CPF: ${payload.cpf}` : `Série: ${payload.serie ?? '-'}`)
                    : (payload.cargo ?? 'Funcionário')
                  
                  return (
                    <TableRow key={arq.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <TableCell>
                        <div className="font-bold text-white">{nome}</div>
                        <div className="text-xs text-[#888]">{subinfo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-[#ccc] max-w-[240px] truncate" title={arq.motivo}>
                          {arq.motivo}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#aaa]">
                        {arq.created_at ? new Date(arq.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            arq.status === 'TRANSFERIDO' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                            arq.status === 'ARQUIVADO' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }
                        >
                          {arq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedArq(arq)
                            setModalOpen(true)
                          }}
                          className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 h-8 px-2.5 rounded-lg"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Ver Ficha
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {items.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#888] text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-6 h-6 text-zinc-600" />
                        <span>Nenhum documento ou ficha localizado no arquivo.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-[#aaa]">
                      Buscando arquivos históricos...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ArquivosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#aaa]">Carregando arquivo escolar...</div>}>
      <ArquivosContent />
    </Suspense>
  )
}
