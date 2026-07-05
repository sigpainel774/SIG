'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  School, 
  X, 
  Eye, 
  Search, 
  ShieldCheck, 
  Check,
  UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { toast } from 'sonner'



export function PermissoesView() {
  const { isEditMode, setEditMode } = useEditModeStore()
  const { funcionario } = useAuthStore()
  const pathname = usePathname()
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false)
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modoAtribuicao, setModoAtribuicao] = useState<'funcionario' | 'escola'>('funcionario')
  
  // States do formulário
  const [pesquisaFunc, setPesquisaFunc] = useState('')
  const [escolaSel, setEscolaSel] = useState('')
  const [nivelSel, setNivelSel] = useState('')

  // States de filtro da lista
  const [buscaLista, setBuscaLista] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')
  
  const [funcionariosList, setFuncionariosList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isRootPanel = !!funcionario?.is_superadmin || (typeof pathname === 'string' && (pathname.startsWith('/admin') || pathname === '/root'))

  useEffect(() => {
    const fetchPermissoes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('funcionarios')
        .select('*, acessos_usuarios(nivel)')
      
      if (data) {
        const formatados = data.map(f => {
          let nomeNivel = 'Nível 1 - Funcionário Base'
          if (f.acessos_usuarios?.[0]?.nivel === 2) nomeNivel = 'Nível 2 - Diretor'
          if (f.acessos_usuarios?.[0]?.nivel === 3) nomeNivel = 'Nível 3 - Secretário'
          if (f.acessos_usuarios?.[0]?.nivel === 4) nomeNivel = 'Nível 4 - Professor'
          if (f.acessos_usuarios?.[0]?.nivel === 5) nomeNivel = 'Nível 5 - Chefe de Equipe'
          if (f.is_superadmin) nomeNivel = 'ROOT'

          return {
            id: f.id,
            nome: f.nome,
            email: f.email || f.nome,
            nivel: nomeNivel,
            escola: 'Sem Lotação',
            status: f.status || 'ATIVO'
          }
        })
        setFuncionariosList(formatados)
      }
      setLoading(false)
    }
    fetchPermissoes()
  }, [])

  useEffect(() => {
    if (isRootPanel) {
      setIsSuperAdminUser(true)
      setEditMode(true)
      return
    }

    const checkSuperAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data } = await supabase
          .from('funcionarios')
          .select('is_superadmin')
          .ilike('email', user.email)
          .maybeSingle()
        
        if (data?.is_superadmin) {
          setIsSuperAdminUser(true)
          setEditMode(true)
        }
      }
    }
    checkSuperAdmin()
  }, [funcionario, isRootPanel, setEditMode])

  const isEditActive = isEditMode || isSuperAdminUser || isRootPanel

  const handleSalvarPermissao = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditActive) {
      toast.warning('Ative o Modo Edição no topo para alterar permissões.')
      setModalSenhaOpen(true)
      return
    }

    if (!pesquisaFunc) {
      toast.error('Informe o funcionário.')
      return
    }

    toast.success('Permissão atribuída com sucesso!')
    setPesquisaFunc('')
    setEscolaSel('')
    setNivelSel('')
  }

  const limparFiltros = () => {
    setBuscaLista('')
    setFiltroNivel('')
    setFiltroEscola('')
  }

  const funcionariosFiltrados = funcionariosList.filter((item) => {
    const matchBusca = item.nome.toLowerCase().includes(buscaLista.toLowerCase()) || 
                       item.email.toLowerCase().includes(buscaLista.toLowerCase())
    const matchNivel = !filtroNivel || item.nivel.includes(filtroNivel)
    const matchEscola = !filtroEscola || item.escola === filtroEscola
    return matchBusca && matchNivel && matchEscola
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header da Seção Permissões */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Permissões
        </h1>

        {/* Botões de Alternância: Por Funcionário / Por Escola */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setModoAtribuicao('funcionario')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'funcionario'
                ? 'bg-[#132338] border-[#0090ff] text-[#0090ff] shadow-sm'
                : 'bg-[#18181b] border-[#3f3f46] text-zinc-400 hover:bg-[#27272a] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Por Funcionário</span>
          </button>

          <button
            type="button"
            onClick={() => setModoAtribuicao('escola')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'escola'
                ? 'bg-[#132338] border-[#0090ff] text-[#0090ff] shadow-sm'
                : 'bg-[#18181b] border-[#3f3f46] text-zinc-400 hover:bg-[#27272a] hover:text-white'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Por Escola</span>
          </button>
        </div>
      </div>

      {/* Card 1: Atribuir acesso */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-md space-y-5">
        <h2 className="text-lg font-bold text-white">
          Atribuir acesso
        </h2>

        <form onSubmit={handleSalvarPermissao} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campo Funcionário */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                FUNCIONÁRIO
              </label>
              <Input
                type="text"
                placeholder="Digite para pesquisar funcionário..."
                value={pesquisaFunc}
                onChange={(e) => setPesquisaFunc(e.target.value)}
                className="bg-[#121212] border-[#3f3f46] text-white placeholder:text-zinc-500 h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
              />
            </div>

            {/* Campo Escola / Órgão */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                ESCOLA / ÓRGÃO
              </label>
              <select
                value={escolaSel}
                onChange={(e) => setEscolaSel(e.target.value)}
                className="w-full bg-[#121212] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff]"
              >
                <option value="">Selecione a Escola</option>
                <option value="Escola Modelo">Escola Modelo</option>
                <option value="Colégio Dr Eraldo Tinoco">Colégio Dr Eraldo Tinoco</option>
                <option value="Global">Global / Todas</option>
              </select>
            </div>

            {/* Campo Nível de Acesso */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                NÍVEL DE ACESSO
              </label>
              <select
                value={nivelSel}
                onChange={(e) => setNivelSel(e.target.value)}
                className="w-full bg-[#121212] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff]"
              >
                <option value="">Selecione o nivel</option>
                <option value="Nível 1 - Admin">Nível 1 - Admin</option>
                <option value="Nível 2 - Diretor">Nível 2 - Diretor</option>
                <option value="Nível 3 - Coordenador">Nível 3 - Coordenador</option>
                <option value="Nível 4 - Professor">Nível 4 - Professor</option>
                <option value="Nível 5 - Chefe de Equipe">Nível 5 - Chefe de Equipe</option>
              </select>
            </div>
          </div>

          {/* Botão Salvar permissão */}
          <Button
            type="submit"
            className="w-full h-12 bg-[#0090ff] hover:bg-[#0070f3] text-white font-medium text-base rounded-xl transition-all shadow-md cursor-pointer"
          >
            Salvar permissão
          </Button>
        </form>
      </div>

      {/* Card 2: Filtros e Lista de Funcionários com Permissões */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-md space-y-4">
        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca por nome / email */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar funcionário..."
              value={buscaLista}
              onChange={(e) => setBuscaLista(e.target.value)}
              className="bg-[#121212] border-[#3f3f46] text-white placeholder:text-zinc-500 h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
            />
          </div>

          {/* Filtro por Nível */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="w-full bg-[#121212] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff]"
          >
            <option value="">Todos os Níveis</option>
            <option value="Nível 2 - Diretor">Nível 2 - Diretor</option>
            <option value="Nível 4 - Professor">Nível 4 - Professor</option>
            <option value="Nível 5 - Chefe de Equipe">Nível 5 - Chefe de Equipe</option>
          </select>

          {/* Filtro por Escola */}
          <select
            value={filtroEscola}
            onChange={(e) => setFiltroEscola(e.target.value)}
            className="w-full bg-[#121212] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff]"
          >
            <option value="">Todas as Escolas</option>
            <option value="Escola Modelo">Escola Modelo</option>
            <option value="Colégio Dr Eraldo Tinoco">Colégio Dr Eraldo Tinoco</option>
            <option value="Global">Global</option>
          </select>

          {/* Botão Limpar */}
          <button
            type="button"
            onClick={limparFiltros}
            className="h-11 px-4 bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="space-y-2 pt-2">
          {funcionariosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-[#3f3f46] rounded-xl">
              Nenhum funcionário encontrado com os filtros aplicados.
            </div>
          ) : (
            funcionariosFiltrados.map((item) => {
              const inicial = item.nome.charAt(0).toUpperCase()
              return (
                <div
                  key={item.id}
                  className="bg-[#121212] border border-[#27272a] hover:border-[#3f3f46] rounded-xl p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Badge */}
                    <div className="w-10 h-10 rounded-full bg-[#0070f3]/20 border border-[#0070f3]/50 flex items-center justify-center font-bold text-[#0090ff] text-base shrink-0">
                      {inicial}
                    </div>
                    {/* Infos */}
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {item.nome}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {item.email}
                      </p>
                    </div>
                  </div>

                  {/* Ação Visualizar / Editar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditActive) {
                          toast.info('Ative o Modo Edição para gerenciar permissões.')
                          setModalSenhaOpen(true)
                        } else {
                          toast.info(`Gerenciando permissões de ${item.nome}`)
                        }
                      }}
                      className="p-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 hover:text-white rounded-full transition-colors cursor-pointer"
                      title="Visualizar Permissões"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal de Senha caso tente interagir sem modo edição */}
      <ModalConfirmacaoSenha
        open={modalSenhaOpen}
        onOpenChange={setModalSenhaOpen}
        onSuccess={() => setEditMode(true)}
      />
    </div>
  )
}
