'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
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
  ShieldCheck,
  Printer,
  Copy,
  ExternalLink,
  Trash2,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const PrintDocumentoEscolar = dynamic(
  () => import('@/components/print/print-documento-escolar').then((m) => m.PrintDocumentoEscolar),
  { ssr: false }
)

function ArquivosContent() {
  const router = useRouter()
  const supabase = createClient()
  const { escolaAtivaId } = useAuthStore()
  const { selectedEscola, selectedSecretaria } = useSchoolStore()

  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const isEducacao = (!selectedEscola && !selectedSecretaria) || (!secNome || /educa/i.test(secNome))
  const isSaude = !isEducacao && (/sa[uú]de/i.test(secNome) || selectedEscola?.tipo === 'SAUDE' || selectedEscola?.tipo === 'UNIDADE_SAUDE')

  // Estados locais
  const [activeTab, setActiveTab] = useState<'oficios' | 'alunos' | 'funcionarios'>(isSaude ? 'oficios' : 'alunos')
  const [searchTerm, setSearchTerm] = useState('')
  const [arquivados, setArquivados] = useState<any[]>([])
  const [oficiosAssinados, setOficiosAssinados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedArq, setSelectedArq] = useState<any>(null)
  const [selectedOficio, setSelectedOficio] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [oficioImprimir, setOficioImprimir] = useState<any | null>(null)

  const handleDeleteOficio = async (id: string, token: string) => {
    if (!confirm(`Tem certeza que deseja excluir o Ofício com a Chave ${token} do histórico?`)) return
    try {
      const { error } = await supabase
        .from('assinatura')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success(`Ofício ${token} excluído com sucesso.`)
      setModalOpen(false)
      setSelectedOficio(null)
      loadDados()
    } catch (err: any) {
      console.error('Erro ao excluir ofício:', err)
      toast.error('Erro ao excluir ofício: ' + err.message)
    }
  }

  // Sincronizar aba ativa quando muda entre Saúde e Educação
  useEffect(() => {
    if (isSaude && activeTab === 'alunos') {
      setActiveTab('oficios')
    } else if (!isSaude && activeTab === 'oficios') {
      setActiveTab('alunos')
    }
  }, [isSaude, activeTab])

  const loadDados = async () => {
    setLoading(true)

    try {
      if (isSaude) {
        // 1. Buscar Ofícios / Documentos Assinados
        const { data: assinaturasData, error: assErr } = await supabase
          .from('assinatura')
          .select('*')
          .order('criado_em', { ascending: false })

        if (assErr) {
          console.error('Erro ao carregar assinaturas:', assErr)
        } else {
          const oficiosList = (assinaturasData || []).filter((a: any) => 
            a.tipo_documento === 'oficio' || !a.aluno_id
          )
          setOficiosAssinados(oficiosList)
        }

        // 2. Buscar Servidores Arquivados da Saúde
        const { data: arqData, error: arqErr } = await supabase
          .from('arquivados')
          .select(`
            *,
            arquivado_por_user:funcionarios!arquivado_por(nome)
          `)
          .in('tipo', ['FUNCIONARIO', 'FUNCIONARIO_TRANSFERIDO', 'OFICIO'])
          .order('created_at', { ascending: false })

        if (arqErr) {
          console.error('Erro ao carregar arquivados:', arqErr)
        } else {
          setArquivados(arqData || [])
        }
      } else {
        if (!escolaAtivaId) {
          setArquivados([])
          setLoading(false)
          return
        }

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
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error)
      toast.error('Erro ao buscar arquivos históricos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDados()
  }, [escolaAtivaId, isSaude])

  // Filtragem dos registros
  const getOficiosFiltrados = () => {
    if (!searchTerm) return oficiosAssinados
    const search = searchTerm.toLowerCase()
    return oficiosAssinados.filter((of) => {
      const token = (of.token_verificacao || '').toLowerCase()
      const tipo = (of.tipo_documento || '').toLowerCase()
      const disp = (of.dispositivo_funcionario || '').toLowerCase()
      const ip = (of.ip_funcionario || '').toLowerCase()
      return token.includes(search) || tipo.includes(search) || disp.includes(search) || ip.includes(search)
    })
  }

  const getArquivadosFiltrados = () => {
    return arquivados.filter((arq) => {
      // 1. Filtro de Aba
      if (isSaude) {
        if (activeTab !== 'funcionarios') return false
      } else {
        const isAlunoTab = activeTab === 'alunos'
        const matchTipo = isAlunoTab 
          ? (arq.tipo === 'ALUNO' || arq.tipo === 'ALUNO_TRANSFERIDO')
          : (arq.tipo === 'FUNCIONARIO' || arq.tipo === 'FUNCIONARIO_TRANSFERIDO')

        if (!matchTipo) return false
      }

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

  const oficiosItems = getOficiosFiltrados()
  const arquivadosItems = getArquivadosFiltrados()

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
      // Funcionário / Servidor
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
      {/* Visualização e Reimpressão de Ofício */}
      {oficioImprimir && (
        <PrintDocumentoEscolar
          aluno={{ id: 'oficio', nome: 'Ofício Oficial' }}
          docType="oficio"
          dadosOficio={oficioImprimir.dados_documento ?? undefined}
          tokenExistente={oficioImprimir.token_verificacao}
          onClose={() => setOficioImprimir(null)}
        />
      )}

      {/* Modal de Detalhes (Ofício ou Ficha) */}
      {modalOpen && (selectedOficio || selectedArq) && (
        <StandardDialog
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open)
            if (!open) {
              setSelectedOficio(null)
              setSelectedArq(null)
            }
          }}
          title={selectedOficio ? "Detalhes do Ofício Oficial Assinado" : `Visualizar Ficha Histórica — ${selectedArq?.tipo}`}
          description={selectedOficio ? "Registro criptográfico e metadados de autenticidade jurídica do documento emitido." : "Snapshot dos dados gravados no momento em que o registro foi transferido ou arquivado."}
          maxWidth="sm:max-w-[600px]"
          footer={
            <div className="flex items-center justify-between w-full pt-3 border-t border-borderCustom">
              {selectedOficio ? (
                <div className="flex items-center gap-2 w-full justify-between flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = `${window.location.origin}/verificar/${selectedOficio.token_verificacao}`
                        navigator.clipboard.writeText(url)
                        toast.success('Link de verificação copiado!')
                      }}
                      className="border-borderCustom text-foreground hover:bg-muted text-xs font-semibold gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteOficio(selectedOficio.id, selectedOficio.token_verificacao)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-semibold gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      setOficioImprimir(selectedOficio)
                      setModalOpen(false)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Reimprimir Ofício
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={() => setModalOpen(false)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground text-xs ml-auto"
                >
                  Fechar Ficha
                </Button>
              )}
            </div>
          }
        >
          {selectedOficio ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>DOCUMENTO ASSINADO E REGISTRADO ELETRONICAMENTE</span>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  Este ofício foi gerado e autenticado digitalmente pelo sistema. Todos os registros criptográficos encontram-se armazenados.
                </p>
              </div>

              {/* Informações do Ofício (se disponíveis) */}
              {selectedOficio.dados_documento && (
                <div className="space-y-2 bg-blue-50/70 dark:bg-[#18181b] border border-sky-500/20 rounded-xl p-3.5 text-xs">
                  <div className="font-bold text-sky-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dados do Documento Redigido</span>
                  </div>
                  {selectedOficio.dados_documento.numeroOficio && (
                    <div className="grid grid-cols-3 border-b border-borderCustom pb-1.5 pt-1">
                      <span className="text-muted-foreground font-medium">Número:</span>
                      <span className="col-span-2 font-bold text-foreground">{selectedOficio.dados_documento.numeroOficio}</span>
                    </div>
                  )}
                  {selectedOficio.dados_documento.destinatario && (
                    <div className="grid grid-cols-3 border-b border-borderCustom pb-1.5">
                      <span className="text-muted-foreground font-medium">Destinatário:</span>
                      <span className="col-span-2 font-medium text-zinc-200">{selectedOficio.dados_documento.destinatario}</span>
                    </div>
                  )}
                  {selectedOficio.dados_documento.assunto && (
                    <div className="grid grid-cols-3 border-b border-borderCustom pb-1.5">
                      <span className="text-muted-foreground font-medium">Assunto:</span>
                      <span className="col-span-2 font-medium text-zinc-200">{selectedOficio.dados_documento.assunto}</span>
                    </div>
                  )}
                  {selectedOficio.dados_documento.conteudoHtml && (
                    <div className="pt-1">
                      <span className="text-muted-foreground font-medium block mb-1">Resumo do Texto:</span>
                      <div className="p-2 bg-muted/60 border border-borderCustom rounded-lg text-[11px] text-foreground/80 line-clamp-4 italic">
                        {selectedOficio.dados_documento.conteudoHtml.replace(/<[^>]*>?/gm, '')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5 bg-muted/60 border border-borderCustom rounded-xl p-4 text-xs">
                <div className="grid grid-cols-3 border-b border-borderCustom pb-2">
                  <span className="text-muted-foreground">Tipo de Documento:</span>
                  <span className="col-span-2 font-bold text-foreground uppercase">Ofício Oficial</span>
                </div>
                <div className="grid grid-cols-3 border-b border-borderCustom pb-2">
                  <span className="text-muted-foreground">Chave de Verificação:</span>
                  <span className="col-span-2 font-mono font-bold text-sky-400">{selectedOficio.token_verificacao}</span>
                </div>
                <div className="grid grid-cols-3 border-b border-borderCustom pb-2">
                  <span className="text-muted-foreground">Hash SHA-256:</span>
                  <span className="col-span-2 font-mono text-[10px] text-foreground/80 truncate">{selectedOficio.hash_sha256}</span>
                </div>
                <div className="grid grid-cols-3 border-b border-borderCustom pb-2">
                  <span className="text-muted-foreground">Data de Emissão:</span>
                  <span className="col-span-2 font-semibold text-foreground">
                    {selectedOficio.data_funcionario ? new Date(selectedOficio.data_funcionario).toLocaleString('pt-BR') : (selectedOficio.criado_em ? new Date(selectedOficio.criado_em).toLocaleString('pt-BR') : '-')}
                  </span>
                </div>
                <div className="grid grid-cols-3 border-b border-borderCustom pb-2">
                  <span className="text-muted-foreground">Dispositivo Emissor:</span>
                  <span className="col-span-2 text-foreground">{selectedOficio.dispositivo_funcionario ?? 'Computador'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-muted-foreground">Endereço IP:</span>
                  <span className="col-span-2 font-mono text-muted-foreground">{selectedOficio.ip_funcionario ?? '127.0.0.1'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-3">
              {/* Snapshot da Ficha */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#3ea6ff]" />
                  <span>Ficha Cadastral (Snapshot)</span>
                </h4>
                <div className="bg-muted/60 border border-borderCustom rounded-xl p-3.5 space-y-2.5 text-xs">
                  {getFichaDetalhes(selectedArq).map((d, index) => (
                    <div key={index} className="grid grid-cols-3 border-b border-borderCustom/50 pb-2 last:border-b-0 last:pb-0">
                      <span className="text-muted-foreground font-medium">{d.label}</span>
                      <span className="col-span-2 text-foreground font-semibold truncate">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Justificativa e Motivo */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Justificativa / Motivo</span>
                </h4>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 leading-relaxed italic">
                  "{selectedArq.motivo}"
                </div>
              </div>

              {/* Auditoria */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Auditoria</span>
                </h4>
                <div className="bg-muted/60 border border-borderCustom p-3.5 rounded-xl text-xs space-y-1">
                  <p className="text-muted-foreground">Status: <span className="text-foreground font-semibold">{selectedArq.status}</span></p>
                  <p className="text-muted-foreground">Data de Registro: <span className="text-foreground font-semibold">{selectedArq.created_at ? new Date(selectedArq.created_at).toLocaleString('pt-BR') : '-'}</span></p>
                  <p className="text-muted-foreground">Processado por: <span className="text-foreground font-semibold">{selectedArq.arquivado_por_user?.nome ?? 'Sistema / Root'}</span></p>
                </div>
              </div>
            </div>
          )}
        </StandardDialog>
      )}

      {/* Título da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 rounded-2xl bg-[#e0f2fe] text-[#185FA5] dark:bg-[#1b253b] dark:text-[#3ea6ff] border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {isSaude ? 'Arquivo Geral — Secretaria de Saúde' : 'Arquivo Escolar'}
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 ml-1">
            {isSaude 
              ? 'Consulta e histórico de ofícios, documentos oficiais emitidos e registros de servidores arquivados na Secretaria de Saúde.' 
              : 'Pesquisa e visualização das fichas históricas de alunos e funcionários transferidos ou arquivados nesta unidade.'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadDados} 
            disabled={loading}
            className="bg-card border-borderCustom text-foreground hover:bg-muted h-11"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid Central */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filtros e Abas do Painel Lateral */}
        <div className="bg-card border border-borderCustom p-4 rounded-2xl space-y-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Categorias</span>
            
            {isSaude ? (
              <>
                <button
                  onClick={() => setActiveTab('oficios')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'oficios' ? 'bg-sky-600/10 text-sky-700 dark:text-sky-400 font-bold border border-sky-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <FileText className="w-4 h-4" />
                  Documentos & Ofícios Emitidos
                </button>
                <button
                  onClick={() => setActiveTab('funcionarios')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'funcionarios' ? 'bg-sky-600/10 text-sky-700 dark:text-sky-400 font-bold border border-sky-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <Building2 className="w-4 h-4" />
                  Servidores Arquivados
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('alunos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'alunos' ? 'bg-sky-600/10 text-sky-700 dark:text-sky-400 font-bold border border-sky-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <User className="w-4 h-4" />
                  Alunos Arquivados
                </button>
                <button
                  onClick={() => setActiveTab('funcionarios')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'funcionarios' ? 'bg-sky-600/10 text-sky-700 dark:text-sky-400 font-bold border border-sky-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <Building2 className="w-4 h-4" />
                  Funcionários Arquivados
                </button>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-borderCustom space-y-2">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Filtro Rápido</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder={isSaude ? (activeTab === 'oficios' ? "Buscar por token de verificação..." : "Buscar por nome ou CPF...") : "Buscar por nome ou CPF..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-input border-borderCustom text-foreground text-xs h-9 rounded-xl focus-visible:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Arquivados ou Ofícios */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-borderCustom rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-borderCustom bg-muted/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 m-0">
                {isSaude 
                  ? (activeTab === 'oficios' ? 'Documentos e Ofícios Oficiais Emitidos' : 'Servidores em Arquivo Histórico')
                  : 'Fichas em Arquivo Histórico'}
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {isSaude && activeTab === 'oficios' ? oficiosItems.length : arquivadosItems.length}
                </span>
              </h3>
            </div>

            {isSaude && activeTab === 'oficios' ? (
              /* Tabela de Ofícios Assinados */
              <Table>
                <TableHeader className="bg-muted/50 border-b border-borderCustom">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[#ccc] font-semibold">Documento / Chave de Verificação</TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Data de Registro</TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Dispositivo / Origem</TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Validade Jurídica</TableHead>
                    <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oficiosItems.map((of) => (
                    <TableRow key={of.id} className="border-b border-borderCustom hover:bg-muted/50">
                      <TableCell>
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{of.dados_documento?.numeroOficio ? `Ofício Nº ${of.dados_documento.numeroOficio}` : 'Ofício Oficial'}</span>
                        </div>
                        {of.dados_documento?.destinatario && (
                          <div className="text-xs text-foreground/80 font-medium truncate max-w-[260px] mt-0.5" title={of.dados_documento.destinatario}>
                            {of.dados_documento.destinatario}
                          </div>
                        )}
                        <div className="text-xs font-mono text-sky-400 font-semibold mt-0.5">
                          Chave: {of.token_verificacao}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {of.data_funcionario ? new Date(of.data_funcionario).toLocaleString('pt-BR') : of.criado_em ? new Date(of.criado_em).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80">
                        {of.dispositivo_funcionario ?? 'Computador'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Assinado & Válido
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedOficio(of)
                              setModalOpen(true)
                            }}
                            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 h-8 px-2.5 rounded-lg"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Visualizar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteOficio(of.id, of.token_verificacao)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2 rounded-lg"
                            title="Excluir do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {oficiosItems.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-[#888] text-sm">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-zinc-600" />
                          <span>Nenhum ofício ou documento oficial emitido foi encontrado no histórico.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Buscando histórico de ofícios...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              /* Tabela de Arquivados (Servidores / Alunos) */
              <Table>
                <TableHeader className="bg-muted/50 border-b border-borderCustom">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[#ccc] font-semibold">
                      {isSaude ? 'Servidor' : (activeTab === 'alunos' ? 'Aluno' : 'Funcionário')}
                    </TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Motivo do Registro</TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Arquivado Em</TableHead>
                    <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                    <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivadosItems.map((arq) => {
                    const payload = arq.payload_completo || {}
                    const nome = payload.nome ?? 'Sem nome'
                    const subinfo = isSaude
                      ? (payload.cargo ?? 'Servidor da Saúde')
                      : (activeTab === 'alunos' 
                          ? (payload.cpf ? `CPF: ${payload.cpf}` : `Série: ${payload.serie ?? '-'}`)
                          : (payload.cargo ?? 'Funcionário'))
                    
                    return (
                      <TableRow key={arq.id} className="border-b border-borderCustom hover:bg-muted/50">
                        <TableCell>
                          <div className="font-bold text-foreground">{nome}</div>
                          <div className="text-xs text-[#888]">{subinfo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-[#ccc] max-w-[240px] truncate" title={arq.motivo}>
                            {arq.motivo}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
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
                  {arquivadosItems.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-[#888] text-sm">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-zinc-600" />
                          <span>{isSaude ? 'Nenhum servidor localizado no arquivo histórico.' : 'Nenhum documento ou ficha localizado no arquivo escolar.'}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Buscando arquivos históricos...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ArquivosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando arquivo geral...</div>}>
      <ArquivosContent />
    </Suspense>
  )
}
