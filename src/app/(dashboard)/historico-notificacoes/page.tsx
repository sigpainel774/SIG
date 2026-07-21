'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { History, Home, RefreshCw, ArrowLeft, Bell, Circle, Check, Sliders } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfiguracoesNotificacoes } from '@/components/modals/modal-configuracoes-notificacoes'

export default function HistoricoNotificacoesPage() {
  const router = useRouter()
  const { funcionario, isAdminGlobalOrRoot } = useAuthStore()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('todas')
  const [busca, setBusca] = useState('')
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  const canManage = funcionario?.is_superadmin || isAdminGlobalOrRoot?.()

  const loadNotificacoes = async () => {
    if (!funcionario?.auth_user_id) return
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', funcionario.auth_user_id)
      .order('created_at', { ascending: false })

    if (status === 'nao_lidas') query = query.eq('read', false)
    if (status === 'lidas') query = query.eq('read', true)
    if (status === 'transferencias') query = query.eq('type', 'transferencia')

    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`)
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)

    if (busca) {
      query = query.or(`title.ilike.%${busca}%,message.ilike.%${busca}%`)
    }

    try {
      const { data, error } = await query
      if (error) throw error
      if (data) setNotificacoes(data)
    } catch (error) {
      console.error('Erro ao carregar histórico de notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotificacoes()
  }, [funcionario?.auth_user_id, status, dataInicio, dataFim, busca])

  const limparFiltros = () => {
    setDataInicio('')
    setDataFim('')
    setStatus('todas')
    setBusca('')
  }

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-highlight" /> 
          Histórico de Notificações
        </h2>
        
        <div className="flex items-center gap-3">
          {canManage && (
            <Button 
              variant="outline"
              onClick={() => setConfigOpen(true)}
              className="bg-purple-600/10 border-purple-600/30 text-purple-400 hover:bg-purple-600/20 hover:text-purple-300 cursor-pointer"
            >
              <Sliders className="w-4 h-4 mr-2" /> Configurar Regras
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => router.push('/home')}
            className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white"
          >
            <Home className="w-4 h-4 mr-2" /> Menu Inicial
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#1f1f23] border border-[#2f2f33] rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-[#aaa] text-xs mb-1.5 block">Data de Início</Label>
          <Input 
            type="date" 
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-[#121212] border-[#3f3f46] text-white" 
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-[#aaa] text-xs mb-1.5 block">Data de Fim</Label>
          <Input 
            type="date" 
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-[#121212] border-[#3f3f46] text-white" 
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-[#aaa] text-xs mb-1.5 block">Status / Tipo</Label>
          <Select value={status} onValueChange={(val) => val && setStatus(val)}>
            <SelectTrigger className="bg-[#121212] border-[#3f3f46] text-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="lidas">Lidas</SelectItem>
              <SelectItem value="nao_lidas">Não Lidas</SelectItem>
              <SelectItem value="transferencias">Apenas Transferências</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-[2] min-w-[220px]">
          <Label className="text-[#aaa] text-xs mb-1.5 block">Pesquisa rápida</Label>
          <Input 
            type="text" 
            placeholder="Buscar no título ou mensagem..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-[#121212] border-[#3f3f46] text-white" 
          />
        </div>
        <div>
          <Button 
            variant="ghost" 
            onClick={limparFiltros}
            className="h-10 text-[#aaa] hover:bg-[#2f2f33] hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {loading && <div className="text-center py-6 text-sm text-[#aaa]">Carregando...</div>}
        {!loading && notificacoes.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-4 rounded-xl border flex gap-4 ${notif.read ? 'bg-[#181818] border-[#2f2f33]' : 'bg-[#1f1f23] border-[#3ea6ff]/30'}`}
          >
            <div className="pt-1">
              {notif.read ? (
                <Bell className="w-5 h-5 text-[#aaa]" />
              ) : (
                <Circle className="w-4 h-4 fill-[#3ea6ff] text-[#3ea6ff] mt-0.5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-medium">{notif.title}</h4>
                <span className="text-xs text-[#aaa] whitespace-nowrap ml-4">
                  {new Date(notif.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-[#ccc] text-sm leading-relaxed">{notif.message}</p>
            </div>
          </div>
        ))}
        {!loading && notificacoes.length === 0 && (
          <div className="text-center py-6 text-sm text-[#aaa]">Nenhuma notificação encontrada com os filtros selecionados.</div>
        )}
      </div>

      {/* Botão flutuante para voltar */}
      <button 
        onClick={() => router.push('/home')}
        className="fixed bottom-6 right-6 w-[50px] h-[50px] rounded-full bg-highlight text-black flex items-center justify-center border-none shadow-[0_4px_12px_rgba(0,0,0,0.4)] cursor-pointer z-[9999] hover:bg-highlight/90 transition-transform hover:scale-105"
        title="Voltar ao início"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Modal de Configurações */}
      {configOpen && (
        <ModalConfiguracoesNotificacoes
          open={configOpen}
          onOpenChange={setConfigOpen}
        />
      )}
    </div>
  )
}
