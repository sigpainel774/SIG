'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { History, Home, RefreshCw, ArrowLeft, Bell, Circle } from 'lucide-react'

const mockHistorico = [
  { id: 1, titulo: 'Transferência Recebida', mensagem: 'O aluno João Pedro foi transferido para sua escola.', data: '15/10/2026 14:30', tipo: 'transferencia', lida: false },
  { id: 2, titulo: 'Bem-vindo ao SIG', mensagem: 'Seu primeiro acesso foi realizado com sucesso.', data: '15/10/2026 10:00', tipo: 'sistema', lida: true },
  { id: 3, titulo: 'Atualização do Sistema', mensagem: 'Novas funcionalidades de ocorrências foram adicionadas.', data: '10/10/2026 08:00', tipo: 'sistema', lida: true },
]

export default function HistoricoNotificacoesPage() {
  const router = useRouter()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('todas')
  const [busca, setBusca] = useState('')

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
        
        <Button 
          variant="outline"
          onClick={() => router.push('/home')}
          className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white"
        >
          <Home className="w-4 h-4 mr-2" /> Menu Inicial
        </Button>
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
        {mockHistorico.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-4 rounded-xl border flex gap-4 ${notif.lida ? 'bg-[#181818] border-[#2f2f33]' : 'bg-[#1f1f23] border-[#3ea6ff]/30'}`}
          >
            <div className="pt-1">
              {notif.lida ? (
                <Bell className="w-5 h-5 text-[#aaa]" />
              ) : (
                <Circle className="w-4 h-4 fill-[#3ea6ff] text-[#3ea6ff] mt-0.5" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-medium">{notif.titulo}</h4>
                <span className="text-xs text-[#aaa] whitespace-nowrap ml-4">{notif.data}</span>
              </div>
              <p className="text-[#ccc] text-sm leading-relaxed">{notif.mensagem}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Botão flutuante para voltar */}
      <button 
        onClick={() => router.push('/home')}
        className="fixed bottom-6 right-6 w-[50px] h-[50px] rounded-full bg-highlight text-black flex items-center justify-center border-none shadow-[0_4px_12px_rgba(0,0,0,0.4)] cursor-pointer z-[9999] hover:bg-highlight/90 transition-transform hover:scale-105"
        title="Voltar ao início"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
    </div>
  )
}
