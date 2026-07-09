'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  PenTool, 
  Search, 
  Eye, 
  Info,
  Smartphone,
  Laptop,
  Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { restoreAction, purgeAction } from './actions'
import { cn } from '@/lib/utils'
import { PrintRelatorioAssinaturas } from '@/components/print/print-relatorio-assinaturas'

export default function AdminLixeiraPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()
  const supabase = createClient()
  
  // Trash states
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'trash' | 'signatures'>('trash')
  
  // Signature history states
  const [sigLogs, setSigLogs] = useState<any[]>([])
  const [sigLogsLoading, setSigLogsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sigFilter, setSigFilter] = useState<'ALL' | 'RESP' | 'FUNC'>('ALL')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [isPrintOpen, setIsPrintOpen] = useState(false)

  const loadTrash = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trash_bin')
      .select('*')
      .eq('status', 'PENDING')
      .order('deleted_at', { ascending: false })

    if (data) setItems(data)
    if (error) console.error(error)
    setLoading(false)
  }

  const loadSignatureLogs = async () => {
    setSigLogsLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .in('entity', ['alunos_assinatura_responsavel', 'alunos_assinatura_funcionario'])
      .order('created_at', { ascending: false })
      .limit(300)

    if (data) setSigLogs(data)
    if (error) console.error(error)
    setSigLogsLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash()
    } else {
      loadSignatureLogs()
    }
  }, [activeTab])

  const handleRestore = async (item: any) => {
    if (!confirm('Deseja realmente restaurar este registro?')) return
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }
    
    const { success, error } = await restoreAction(item.id, item.table_name, item.record_id, performedBy)
    if (success) {
      toast.success('Registro restaurado com sucesso!')
      loadTrash()
    } else {
      toast.error('Erro ao restaurar registro.')
    }
  }

  const handlePurge = async (item: any) => {
    if (!confirm('ATENÇÃO: A exclusão permanente não pode ser desfeita. Deseja prosseguir?')) return
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }
    
    const { success, error } = await purgeAction(item.id, item.table_name, item.record_id, performedBy)
    if (success) {
      toast.success('Registro expurgado definitivamente!')
      loadTrash()
    } else {
      toast.error('Erro ao expurgar registro.')
    }
  }

  // Filtragem de logs de assinatura
  const filteredSigLogs = sigLogs.filter((log) => {
    const searchLower = searchTerm.toLowerCase()
    const studentName = log.new_data?.student_name || log.old_data?.student_name || ''
    const userName = log.user_name || ''
    const ip = log.ip_address || ''
    const device = log.new_data?.user_agent || ''
    
    const matchesSearch = 
      studentName.toLowerCase().includes(searchLower) ||
      userName.toLowerCase().includes(searchLower) ||
      ip.toLowerCase().includes(searchLower) ||
      device.toLowerCase().includes(searchLower)
      
    if (sigFilter === 'ALL') return matchesSearch
    if (sigFilter === 'RESP') return matchesSearch && log.entity === 'alunos_assinatura_responsavel'
    if (sigFilter === 'FUNC') return matchesSearch && log.entity === 'alunos_assinatura_funcionario'
    
    return matchesSearch
  })

  // Formatador de User Agent
  const formatUserAgent = (ua: string | null | undefined) => {
    if (!ua) return 'Dispositivo desconhecido'
    const lower = ua.toLowerCase()
    
    let device = 'Desktop'
    if (lower.includes('android')) device = 'Celular (Android)'
    else if (lower.includes('iphone')) device = 'Celular (iPhone)'
    else if (lower.includes('ipad')) device = 'Tablet (iPad)'
    
    let browser = 'Navegador'
    if (lower.includes('firefox')) browser = 'Firefox'
    else if (lower.includes('chrome')) browser = 'Chrome'
    else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
    else if (lower.includes('edge')) browser = 'Edge'
    
    return `${device} — ${browser}`
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#232328]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span>Lixeira Global & Auditorias</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {activeTab === 'trash' 
              ? 'Registros apagados e pendentes de restauração ou expurgo.' 
              : 'Histórico de alteração e coleta de assinaturas digitais da rede.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'trash' ? (
            <Button 
              variant="outline"
              onClick={() => router.push('/admin/lixeira/relatorio')}
              className="bg-transparent border-[#27272a] hover:bg-[#1f1f23] text-zinc-300 hover:text-white rounded-xl h-10 px-4 text-xs font-semibold"
            >
              <FileText className="w-4 h-4 mr-2" /> Relatório de Exclusões
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => setIsPrintOpen(true)}
              disabled={filteredSigLogs.length === 0}
              className="bg-transparent border-[#27272a] hover:bg-[#1f1f23] text-zinc-300 hover:text-white rounded-xl h-10 px-4 text-xs font-semibold"
            >
              <Printer className="w-4 h-4 mr-2 text-[#3ea6ff]" /> Imprimir Relatório
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={activeTab === 'trash' ? loadTrash : loadSignatureLogs}
            disabled={loading || sigLogsLoading}
            className="bg-[#121214] border-[#27272a] text-white hover:bg-[#202024] rounded-xl h-10 w-10 flex items-center justify-center p-0"
          >
            <RefreshCw className={cn("w-4 h-4", (loading || sigLogsLoading) ? "animate-spin" : "")} />
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#26262a] gap-2">
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'trash'
              ? "border-[#3ea6ff] text-[#3ea6ff]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Trash2 className="w-4.5 h-4.5" />
          Lixeira Ativa
        </button>
        <button
          onClick={() => setActiveTab('signatures')}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'signatures'
              ? "border-[#3ea6ff] text-[#3ea6ff]"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          <PenTool className="w-4.5 h-4.5" />
          Histórico de Assinaturas
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'trash' ? (
        <div className="rounded-2xl border border-[#26262a] bg-[#121214] overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-[#18181b] border-b border-[#26262a]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Tabela</TableHead>
                <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Registro</TableHead>
                <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Excluído por</TableHead>
                <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Data da Exclusão</TableHead>
                <TableHead className="text-right text-zinc-300 font-bold uppercase tracking-wider text-xs">Ações ROOT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-b border-[#1c1c1f] hover:bg-[#18181b] transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-semibold bg-zinc-500/10 text-zinc-400 border-zinc-500/20 uppercase">
                      {item.table_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white font-medium">{item.record_summary}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-200 font-medium">{item.deleted_by_name}</span>
                      <span className="text-xs text-zinc-500">{item.deleted_by_email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 whitespace-nowrap">
                    {new Date(item.deleted_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(item)}
                      className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-xl h-8 text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePurge(item)}
                      className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl h-8 text-xs font-semibold"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Expurgar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500 font-medium">
                    Nenhum registro pendente na lixeira.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search and Filter Row */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Buscar por aluno, assinante, IP ou dispositivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#121214] border-[#26262a] pl-10 text-white rounded-xl focus-visible:ring-[#3ea6ff] h-10 text-sm placeholder:text-zinc-500"
              />
            </div>
            
            <select
              value={sigFilter}
              onChange={(e: any) => setSigFilter(e.target.value)}
              className="bg-[#121214] border border-[#26262a] text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#3ea6ff] h-10 w-full md:w-56"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="RESP">Apenas Responsável</option>
              <option value="FUNC">Apenas Funcionário</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-2xl border border-[#26262a] bg-[#121214] overflow-hidden shadow-xl">
            <Table>
              <TableHeader className="bg-[#18181b] border-b border-[#26262a]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Aluno / ID</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Tipo</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Ação</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Assinante / Cargo</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Dispositivo & IP</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs">Data / Hora</TableHead>
                  <TableHead className="text-zinc-300 font-bold uppercase tracking-wider text-xs text-center">Assinatura</TableHead>
                  <TableHead className="text-right text-zinc-300 font-bold uppercase tracking-wider text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSigLogs.map((log) => {
                  const studentName = log.new_data?.student_name || log.old_data?.student_name || 'Desconhecido'
                  const sigUrl = log.new_data?.url || log.old_data?.url
                  const isResp = log.entity === 'alunos_assinatura_responsavel'
                  
                  return (
                    <TableRow key={log.id} className="border-b border-[#1c1c1f] hover:bg-[#18181b] transition-colors">
                      <TableCell className="font-semibold text-white">
                        <div>{studentName}</div>
                        <div className="text-[10px] text-zinc-500 font-normal mt-0.5">{log.entity_id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-xs font-semibold border-none rounded-md px-2 py-0.5 uppercase",
                          isResp ? "bg-[#3ea6ff]/10 text-[#3ea6ff]" : "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {isResp ? 'Responsável' : 'Funcionário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-bold uppercase",
                          log.action === 'DELETE' ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-200 font-medium">{log.user_name}</span>
                          <span className="text-xs text-zinc-500">{log.user_email || '-'}</span>
                          <span className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">{log.user_cargo || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-300">{log.ip_address || 'IP não registrado'}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight truncate max-w-[150px]" title={log.new_data?.user_agent}>
                          {formatUserAgent(log.new_data?.user_agent)}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="align-middle text-center">
                        {sigUrl ? (
                          <div className="inline-block border border-[#2a2a2a] rounded-lg bg-[#0d0d0f] p-1 select-none pointer-events-none">
                            <img 
                              src={`${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                              alt="Assinatura" 
                              className="max-h-7 max-w-[80px] object-contain filter brightness-90 invert-[0.1]"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic text-xs">Excluída</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-[#202024] text-zinc-400 hover:text-white rounded-xl h-8 w-8 flex items-center justify-center p-0 cursor-pointer"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                
                {filteredSigLogs.length === 0 && !sigLogsLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-zinc-500 font-medium">
                      Nenhum registro de assinatura encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Printable Report Component */}
      {isPrintOpen && (
        <PrintRelatorioAssinaturas 
          logs={filteredSigLogs} 
          onClose={() => setIsPrintOpen(false)} 
        />
      )}

      {/* Details Audit Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="bg-[#121214] border border-[#26262a] text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#3ea6ff]/40 to-transparent" />
            
            <DialogHeader className="pb-3 border-b border-[#26262a]">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#3ea6ff]" />
                <span>Auditoria Completa de Assinatura</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs mt-1">
                Visualização detalhada dos logs de segurança registrados no banco.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-4 text-sm">
              {/* Informações do Aluno */}
              <div className="grid grid-cols-2 gap-4 bg-[#17171a] p-3.5 rounded-xl border border-[#26262a]">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">Aluno Auditado</span>
                  <span className="font-semibold text-white">{selectedLog.new_data?.student_name || selectedLog.old_data?.student_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">ID do Aluno (UUID)</span>
                  <span className="font-mono text-xs text-zinc-300">{selectedLog.entity_id}</span>
                </div>
              </div>

              {/* Informações do Responsável pelo Upload */}
              <div className="space-y-3 bg-[#17171a] p-3.5 rounded-xl border border-[#26262a]">
                <h4 className="text-xs font-bold text-[#3ea6ff] uppercase tracking-wider pb-1 border-b border-[#26262a]">
                  Detalhes do Operador / Assinante
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Nome</span>
                    <span className="text-white font-medium">{selectedLog.user_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">E-mail</span>
                    <span className="text-white font-medium">{selectedLog.user_email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Cargo / Relação</span>
                    <span className="text-white font-medium">{selectedLog.user_cargo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Ação Realizada</span>
                    <span className={cn(
                      "font-bold uppercase",
                      selectedLog.action === 'DELETE' ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {selectedLog.action === 'DELETE' ? 'Exclusão' : 'Atualização/Assinatura'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações do Dispositivo */}
              <div className="space-y-3 bg-[#17171a] p-3.5 rounded-xl border border-[#26262a]">
                <h4 className="text-xs font-bold text-[#3ea6ff] uppercase tracking-wider pb-1 border-b border-[#26262a]">
                  Dispositivo e Conexão
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Endereço IP</span>
                    <span className="text-white font-mono font-medium">{selectedLog.ip_address || 'IP não registrado'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold shrink-0">User Agent</span>
                    <span className="text-zinc-300 text-right font-medium leading-relaxed max-w-[280px] break-words">
                      {selectedLog.new_data?.user_agent || 'Nenhum cabeçalho de dispositivo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visualização de Assinatura */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Imagem da Assinatura Coletada</span>
                
                {selectedLog.new_data?.url ? (
                  <div className="border border-[#2a2a2a] rounded-2xl bg-[#0d0d0f] p-4 flex items-center justify-center min-h-[120px] shadow-inner">
                    <img 
                      src={`${selectedLog.new_data.url}${selectedLog.new_data.url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                      alt="Assinatura Auditada" 
                      className="max-h-[100px] w-auto object-contain filter brightness-90 invert-[0.1]"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-[#26262a] rounded-2xl p-6 text-center text-zinc-500 italic text-xs">
                    Assinatura foi excluída neste registro de log.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-3.5 border-t border-[#26262a] flex justify-end">
              <Button
                onClick={() => setSelectedLog(null)}
                className="bg-[#27272a] hover:bg-[#3f3f46] text-white font-semibold rounded-xl h-10 px-5 cursor-pointer text-xs"
              >
                Fechar Detalhes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
