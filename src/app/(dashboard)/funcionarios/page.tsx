'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Users, 
  Activity, 
  KeyRound, 
  Ban, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw,
  Printer,
  ChevronRight
} from 'lucide-react'
import { ModalFuncionario } from '@/components/modals/modal-funcionario'
import { ModalLogsAcessoUser } from '@/components/modals/modal-logs-acesso-user'
import { ModalResetSenhaUser } from '@/components/modals/modal-reset-senha-user'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export interface Funcionario {
  id: string
  nome: string
  email: string
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  inicial?: string | null
  is_superadmin?: boolean | null
  created_at?: string
}

const mockFuncionariosInicial: Funcionario[] = [
  {
    id: 'usr-1',
    nome: 'adm@super.com',
    email: 'adm@super.com',
    cargo: 'ROOT',
    status: 'ATIVO',
    orgao: 'Administração Central',
    is_superadmin: true
  },
  {
    id: 'usr-2',
    nome: 'Ciro II',
    email: 'ciro2026@gmail.com',
    cargo: 'PROFESSOR',
    status: 'ATIVO',
    orgao: 'Colégio Dr Eraldo Tinoco'
  },
  {
    id: 'usr-3',
    nome: 'dharmasecretario@gmail.com',
    email: 'dharmasecretario@gmail.com',
    cargo: 'DIRETOR / COORDENADOR',
    status: 'ATIVO',
    orgao: 'Escola Jovino Souza Lima, Colégio Moisés Alves'
  },
  {
    id: 'usr-4',
    nome: 'dharmdiretor@gmail.com',
    email: 'dharmdiretor@gmail.com',
    cargo: null,
    status: 'SEM ACESSO',
    orgao: null
  },
  {
    id: 'usr-5',
    nome: 'diretor frei',
    email: 'diretorfrei@gmail.com',
    cargo: 'DIRETOR',
    status: 'ATIVO',
    orgao: 'Escola Frei Urbano'
  },
  {
    id: 'usr-6',
    nome: 'Edires Pereira da Silva',
    email: 'edires@gmail.com',
    cargo: 'PROFESSOR',
    status: 'ATIVO',
    orgao: 'Escola Modelo'
  }
]

export default function FuncionariosPage() {
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(mockFuncionariosInicial)

  // Modais de ações dos 3 botões
  const [selectedUser, setSelectedUser] = useState<Funcionario | null>(null)
  const [modalLogsOpen, setModalLogsOpen] = useState(false)
  const [modalResetOpen, setModalResetOpen] = useState(false)

  const carregarFuncionarios = async () => {
    try {
      const { data } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true })

      let localSuspended: string[] = []
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sig_suspended_emails')
        if (stored) {
          try { localSuspended = JSON.parse(stored) } catch (e) {}
        }
      }

      if (data && data.length > 0) {
        const formatados: Funcionario[] = data.map((f: any) => {
          const isSusp = localSuspended.includes((f.email || '').toLowerCase())
          let currentStatus = f.status || 'ATIVO'
          if (isSusp) currentStatus = 'SUSPENSO'

          return {
            id: f.id,
            nome: f.nome,
            email: f.email || f.nome,
            cargo: f.cargo || null,
            status: currentStatus,
            orgao: f.orgao || null,
            is_superadmin: f.is_superadmin || false
          }
        })

        // Mesclar com a lista inicial mockada se não existir no banco
        const combinedMap = new Map<string, Funcionario>()
        mockFuncionariosInicial.forEach(m => {
          const isSusp = localSuspended.includes((m.email || '').toLowerCase())
          combinedMap.set(m.email.toLowerCase(), {
            ...m,
            status: isSusp ? 'SUSPENSO' : m.status
          })
        })

        formatados.forEach(dbItem => {
          combinedMap.set(dbItem.email.toLowerCase(), dbItem)
        })

        setFuncionarios(Array.from(combinedMap.values()))
      } else {
        // Atualizar mock com suspensos locais se houver
        setFuncionarios(prev => prev.map(m => ({
          ...m,
          status: localSuspended.includes((m.email || '').toLowerCase()) ? 'SUSPENSO' : m.status
        })))
      }
    } catch (err) {
      console.warn('Erro ao carregar funcionários do banco, usando fallback:', err)
    }
  }

  useEffect(() => {
    carregarFuncionarios()
  }, [])

  // Ação 1: Ver Logs de Acesso
  const handleOpenLogs = (func: Funcionario) => {
    setSelectedUser(func)
    setModalLogsOpen(true)
  }

  // Ação 2: Resetar Senha
  const handleOpenReset = (func: Funcionario) => {
    setSelectedUser(func)
    setModalResetOpen(true)
  }

  // Ação 3: Suspender / Reativar Usuário
  const handleToggleSuspender = async (func: Funcionario) => {
    const emailKey = func.email.toLowerCase()
    const isCurrentlySuspended = func.status === 'SUSPENSO' || func.status === 'SEM ACESSO'
    const novoStatus = isCurrentlySuspended ? 'ATIVO' : 'SUSPENSO'

    // 1. Atualizar banco de dados Supabase
    try {
      await supabase
        .from('funcionarios')
        .update({ status: novoStatus })
        .eq('id', func.id)
    } catch (err) {
      console.warn('Bypass atualização banco:', err)
    }

    // 2. Atualizar estado local
    setFuncionarios(prev => prev.map(item => {
      if (item.id === func.id || item.email.toLowerCase() === emailKey) {
        return { ...item, status: novoStatus }
      }
      return item
    }))

    // 3. Atualizar localStorage de e-mails suspensos para verificação instantânea no Login
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sig_suspended_emails')
      let suspendedList: string[] = stored ? JSON.parse(stored) : []
      if (!isCurrentlySuspended) {
        if (!suspendedList.includes(emailKey)) suspendedList.push(emailKey)
      } else {
        suspendedList = suspendedList.filter(e => e !== emailKey)
      }
      localStorage.setItem('sig_suspended_emails', JSON.stringify(suspendedList))
    }

    if (isCurrentlySuspended) {
      toast.success(`Usuário ${func.nome} reativado com sucesso!`)
    } else {
      toast.error(`Usuário ${func.nome} marcado como SUSPENSO!`)
    }
  }

  const getInitials = (nome: string): string => {
    if (!nome) return 'U'
    const parts = nome.trim().split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const funcionariosFiltrados = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.cargo && f.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.orgao && f.orgao.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Modal Cadastro */}
      <ModalFuncionario 
        open={modalNovoOpen} 
        onOpenChange={setModalNovoOpen} 
        onSuccess={carregarFuncionarios} 
      />

      {/* Modal 1: Logs de Acesso */}
      <ModalLogsAcessoUser
        open={modalLogsOpen}
        onOpenChange={setModalLogsOpen}
        userEmail={selectedUser?.email}
        userName={selectedUser?.nome}
      />

      {/* Modal 2: Resetar Senha */}
      <ModalResetSenhaUser
        open={modalResetOpen}
        onOpenChange={setModalResetOpen}
        userEmail={selectedUser?.email}
        userName={selectedUser?.nome}
      />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#232328]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-sky-400" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Contas de acesso, níveis de permissão, auditoria de logs e suspensão de usuários da rede.
          </p>
        </div>

        <Button 
          onClick={() => setModalNovoOpen(true)}
          className="bg-[#0090ff] hover:bg-[#0070f3] text-white font-bold gap-2 rounded-xl shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
          <Input
            type="search"
            placeholder="Buscar por nome, e-mail, cargo ou escola..."
            className="pl-10 bg-[#121214] border-[#27272a] text-white placeholder:text-zinc-500 h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista Estilo Exato da Imagem de Referência */}
      <div className="space-y-3">
        {funcionariosFiltrados.length === 0 ? (
          <div className="bg-[#121214] border border-dashed border-[#3f3f46] rounded-2xl p-12 text-center text-zinc-400 text-sm">
            Nenhum usuário encontrado com os termos pesquisados.
          </div>
        ) : (
          funcionariosFiltrados.map((func) => {
            const isRoot = func.is_superadmin || func.cargo === 'ROOT'
            const isSuspended = func.status === 'SUSPENSO' || func.status === 'SEM ACESSO'

            // Extrair papéis (ex: "DIRETOR / COORDENADOR" -> ["DIRETOR", "COORDENADOR"])
            const rolesList = func.cargo ? func.cargo.split('/').map(r => r.trim()).filter(Boolean) : []

            return (
              <div 
                key={func.id}
                className="bg-[#131316] border border-[#232328] hover:border-[#383842] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-md"
              >
                {/* Lado Esquerdo: Avatar + Informações + Badges (Conforme Imagem) */}
                <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar Quadrado Roxo Suave */}
                  <div className="w-11 h-11 rounded-xl bg-[#2e1065]/70 border border-[#6b21a8]/60 text-[#c084fc] font-bold text-base flex items-center justify-center shrink-0 uppercase shadow-inner">
                    {func.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Detalhes do Usuário */}
                  <div className="min-w-0 space-y-1">
                    {/* Linha 1: Nome + Badge ROOT (se for superadmin) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-white text-base leading-tight">
                        {func.nome}
                      </h3>
                      {isRoot && (
                        <span className="bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/50 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase">
                          ROOT
                        </span>
                      )}
                    </div>

                    {/* Linha 2: E-mail em tom neutro */}
                    <p className="text-xs text-[#8e8e93] font-normal leading-tight">
                      {func.email}
                    </p>

                    {/* Linha 3: Badges de Status (ATIVO / SEM ACESSO / SUSPENSO) + Cargos + Órgão */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Badge de Status */}
                      {isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] text-[10px] font-extrabold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#71717a]" />
                          {func.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[10px] font-extrabold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                          ATIVO
                        </span>
                      )}

                      {/* Badges de Cargos (Azul) */}
                      {rolesList.map((role) => (
                        <span 
                          key={role} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0369a1]/30 border border-[#0284c7]/40 text-[#38bdf8] text-[10px] font-extrabold tracking-wide uppercase"
                        >
                          {role}
                        </span>
                      ))}

                      {/* Nome da Escola / Órgão em tom sutil */}
                      {func.orgao && (
                        <span className="text-xs text-[#8e8e93] font-normal ml-1 truncate max-w-md">
                          {func.orgao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Os 3 Botões de Ação Solicitados */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  {/* Botão 1: Ver Logs de Acesso (Azul Slate) */}
                  <button
                    type="button"
                    onClick={() => handleOpenLogs(func)}
                    className="w-10 h-10 rounded-xl bg-[#0369a1]/20 hover:bg-[#0369a1]/40 border border-[#0284c7]/40 text-[#38bdf8] flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    title="Ver logs de acesso"
                  >
                    <Activity className="w-4.5 h-4.5" />
                  </button>

                  {/* Botão 2: Resetar Senha (Amber) */}
                  <button
                    type="button"
                    onClick={() => handleOpenReset(func)}
                    className="w-10 h-10 rounded-xl bg-[#78350f]/20 hover:bg-[#78350f]/40 border border-[#d97706]/40 text-[#fbbf24] flex items-center justify-center transition-all cursor-pointer shadow-sm"
                    title="Resetar senha"
                  >
                    <KeyRound className="w-4.5 h-4.5" />
                  </button>

                  {/* Botão 3: Suspender Usuário / Reativar (Rose / Green) */}
                  <button
                    type="button"
                    onClick={() => handleToggleSuspender(func)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                      isSuspended
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 hover:text-white'
                    }`}
                    title={isSuspended ? 'Reativar usuário' : 'Suspender usuário'}
                  >
                    {isSuspended ? <UserCheck className="w-4.5 h-4.5" /> : <Ban className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
