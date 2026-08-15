'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Sparkles, 
  Copy, 
  Check, 
  Search, 
  GraduationCap, 
  Loader2, 
  ShieldCheck,
  CheckCircle2,
  Building2,
  UserCheck,
  RefreshCw,
  Edit3,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AlunoOption {
  id: string
  nome: string
  numero_matricula?: string | null
  turma_nome?: string
}

interface DependenteRede {
  id: string
  nome: string
  numero_matricula?: string | null
  escola_id?: string
  escola_nome: string
  turma_nome: string
  parentesco: string
}

interface ResponsavelExistente {
  id: string
  auth_user_id?: string | null
  cpf: string
  nome: string
  email: string
  telefone?: string | null
  ativo: boolean
  must_change_password: boolean
  created_at: string
  dependentes_rede: DependenteRede[]
}

interface ModalCadastroResponsavelProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  escolaId: string
  responsavelEmEdicao?: any | null
}

const OPCOES_PARENTESCO = [
  'Mãe',
  'Pai',
  'Responsável Legal',
  'Avô / Avó',
  'Tio / Tia',
  'Padrasto / Madrasta',
  'Outro'
]

export function ModalCadastroResponsavel({
  open,
  onClose,
  onSuccess,
  escolaId,
  responsavelEmEdicao
}: ModalCadastroResponsavelProps) {
  const supabase = createClient()

  const [cpf, setCpf] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [parentesco, setParentesco] = useState('Pai / Mãe')
  const [senhaProvisoria, setSenhaProvisoria] = useState('')

  // Estados de Responsável Existente & Controles Dinâmicos
  const [responsavelExistente, setResponsavelExistente] = useState<ResponsavelExistente | null>(null)
  const [verificandoCpf, setVerificandoCpf] = useState(false)
  const [redefinirSenha, setRedefinirSenha] = useState(false)
  const [editandoDadosContato, setEditandoDadosContato] = useState(false)

  // Alunos selecionados
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoOption[]>([])
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([])
  const [buscaAluno, setBuscaAluno] = useState('')
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{
    tipo: 'novo_com_senha' | 'vinculo_existente'
    nome: string
    email: string
    senha?: string
    totalAlunos: number
  } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const ultimoCpfBuscadoRef = useRef<string>('')

  // Máscara de CPF
  const formatarCpf = (valor: string) => {
    const limpo = valor.replace(/\D/g, '').slice(0, 11)
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  // Gerador de senha amigável
  const gerarSenhaAleatoria = () => {
    const prefixos = ['Escola', 'Acesso', 'Portal', 'Familia', 'Sig']
    const prefixo = prefixos[Math.floor(Math.random() * prefixos.length)]
    const numero = Math.floor(1000 + Math.random() * 9000)
    setSenhaProvisoria(`${prefixo}@${numero}`)
  }

  // Carregar lista de alunos matriculados nesta escola
  useEffect(() => {
    if (!open || !escolaId) return

    async function carregarAlunos() {
      setCarregandoAlunos(true)
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('id, nome, numero_matricula, turma_id, turmas:turma_id(nome)')
          .eq('escola_id', escolaId)
          .is('deleted_at', null)
          .order('nome')

        if (error) throw error

        const lista: AlunoOption[] = (data || []).map((a: any) => ({
          id: a.id,
          nome: a.nome,
          numero_matricula: a.numero_matricula,
          turma_nome: a.turmas?.nome || 'Sem Turma'
        }))

        setAlunosDisponiveis(lista)
      } catch (err: any) {
        console.error('Erro ao carregar alunos da escola:', err)
        toast.error('Erro ao listar alunos da unidade.')
      } finally {
        setCarregandoAlunos(false)
      }
    }

    carregarAlunos()
  }, [open, escolaId, supabase])

  // Inicializar formulário para edição ou novo
  useEffect(() => {
    if (!open) {
      setCredenciaisCriadas(null)
      setCopiado(false)
      setResponsavelExistente(null)
      setRedefinirSenha(false)
      setEditandoDadosContato(false)
      ultimoCpfBuscadoRef.current = ''
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      return
    }

    if (responsavelEmEdicao) {
      setCpf(formatarCpf(responsavelEmEdicao.cpf || ''))
      setNome(responsavelEmEdicao.nome || '')
      setEmail(responsavelEmEdicao.email || '')
      setTelefone(responsavelEmEdicao.telefone || '')
      setParentesco('Pai / Mãe')
      setSenhaProvisoria('')
      setResponsavelExistente(null)
      setAlunosSelecionados((responsavelEmEdicao.alunos || []).map((a: any) => a.id))
    } else {
      setCpf('')
      setNome('')
      setEmail('')
      setTelefone('')
      setParentesco('Pai / Mãe')
      gerarSenhaAleatoria()
      setResponsavelExistente(null)
      setAlunosSelecionados([])
    }
  }, [open, responsavelEmEdicao])

  // Buscar responsável existente por CPF via endpoint seguro
  const buscarResponsavelPorCpf = useCallback(async (cpfInput: string) => {
    const limpo = cpfInput.replace(/\D/g, '')
    if (limpo.length !== 11 || responsavelEmEdicao) return
    if (ultimoCpfBuscadoRef.current === limpo) return

    ultimoCpfBuscadoRef.current = limpo
    setVerificandoCpf(true)

    try {
      const res = await fetch(`/api/admin/responsaveis?check_cpf=${limpo}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Erro ao verificar CPF')

      if (json.responsavel) {
        const resp: ResponsavelExistente = json.responsavel
        setResponsavelExistente(resp)
        setNome(resp.nome)
        setEmail(resp.email)
        setTelefone(resp.telefone || '')
        setSenhaProvisoria('')
        setRedefinirSenha(false)
        setEditandoDadosContato(false)

        // Pré-selecionar alunos desta escola já vinculados a este responsável para evitar perda de dados (ES-1)
        const alunosDestaEscola = (resp.dependentes_rede || [])
          .filter(d => d.escola_id === escolaId)
          .map(d => d.id)

        if (alunosDestaEscola.length > 0) {
          setAlunosSelecionados(prev => Array.from(new Set([...prev, ...alunosDestaEscola])))
        }

        toast.success(`Responsável "${resp.nome}" localizado na rede municipal!`)
      } else {
        // CPF não encontrado: permanece no modo de novo cadastro
        setResponsavelExistente(null)
      }
    } catch (err: any) {
      console.error('Erro ao verificar CPF:', err)
      toast.error('Não foi possível consultar o CPF na rede no momento.')
    } finally {
      setVerificandoCpf(false)
    }
  }, [responsavelEmEdicao, escolaId])

  // Monitorar digitação de CPF com debounce
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoFormatado = formatarCpf(e.target.value)
    setCpf(novoFormatado)

    const limpo = novoFormatado.replace(/\D/g, '')

    if (limpo.length < 11) {
      if (responsavelExistente) {
        setResponsavelExistente(null)
        setNome('')
        setEmail('')
        setTelefone('')
        setAlunosSelecionados([])
        gerarSenhaAleatoria()
      }
      ultimoCpfBuscadoRef.current = ''
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      return
    }

    if (limpo.length === 11 && !responsavelEmEdicao) {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = setTimeout(() => {
        buscarResponsavelPorCpf(limpo)
      }, 350)
    }
  }

  const handleCpfBlur = () => {
    const limpo = cpf.replace(/\D/g, '')
    if (limpo.length === 11 && !responsavelEmEdicao && !responsavelExistente) {
      buscarResponsavelPorCpf(limpo)
    }
  }

  const handleLimparCpf = () => {
    setCpf('')
    setNome('')
    setEmail('')
    setTelefone('')
    setResponsavelExistente(null)
    setRedefinirSenha(false)
    setEditandoDadosContato(false)
    setAlunosSelecionados([])
    gerarSenhaAleatoria()
    ultimoCpfBuscadoRef.current = ''
  }

  const toggleAluno = (alunoId: string) => {
    setAlunosSelecionados(prev => 
      prev.includes(alunoId) ? prev.filter(id => id !== alunoId) : [...prev, alunoId]
    )
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cpf || !nome || !email) {
      toast.error('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    const exigeSenha = (!responsavelExistente && !responsavelEmEdicao) || redefinirSenha
    if (exigeSenha && (!senhaProvisoria || senhaProvisoria.trim().length === 0)) {
      toast.error('Por favor, informe ou gere uma senha provisória de acesso.')
      return
    }

    if (alunosSelecionados.length === 0) {
      toast.error('Selecione ao menos um aluno para vincular a este responsável.')
      return
    }

    setSalvando(true)

    try {
      const res = await fetch('/api/admin/responsaveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf,
          nome,
          email,
          telefone,
          parentesco,
          senha_provisoria: exigeSenha ? senhaProvisoria.trim() : undefined,
          aluno_ids: alunosSelecionados,
          escola_id: escolaId
        })
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao processar cadastro')
      }

      if (exigeSenha) {
        setCredenciaisCriadas({
          tipo: 'novo_com_senha',
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha: senhaProvisoria,
          totalAlunos: alunosSelecionados.length
        })
      } else {
        setCredenciaisCriadas({
          tipo: 'vinculo_existente',
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          totalAlunos: alunosSelecionados.length
        })
      }

      toast.success(responsavelExistente ? 'Vínculo escolar atualizado com sucesso!' : 'Responsável e acessos salvos com sucesso!')
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar responsável:', err)
      toast.error(err.message || 'Erro ao salvar responsável.')
    } finally {
      setSalvando(false)
    }
  }

  const handleCopiarCredenciais = () => {
    if (!credenciaisCriadas || !credenciaisCriadas.senha) return
    const texto = `*Acesso ao Portal do Aluno*\nEscola: Portal dos Pais\nResponsável: ${credenciaisCriadas.nome}\nE-mail: ${credenciaisCriadas.email}\nSenha Provisória: ${credenciaisCriadas.senha}\nLink: ${window.location.origin}/portal-aluno/login`
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    toast.success('Credenciais de acesso copiadas para a área de transferência!')
    setTimeout(() => setCopiado(false), 3000)
  }

  const alunosFiltrados = alunosDisponiveis.filter(a => 
    a.nome.toLowerCase().includes(buscaAluno.toLowerCase()) ||
    (a.numero_matricula && a.numero_matricula.includes(buscaAluno)) ||
    (a.turma_nome && a.turma_nome.toLowerCase().includes(buscaAluno.toLowerCase()))
  )

  // Dependentes em outras escolas da rede
  const dependentesOutrasEscolas = (responsavelExistente?.dependentes_rede || []).filter(
    d => d.escola_id !== escolaId
  )

  return (
    <StandardDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={
        responsavelEmEdicao 
          ? "Editar Responsável" 
          : responsavelExistente 
          ? "Vincular Aluno a Responsável Existente" 
          : "Novo Responsável & Acesso ao Portal"
      }
      description={
        responsavelExistente
          ? "Responsável localizado na base municipal. Selecione os alunos desta unidade para vincular."
          : "Cadastre o pai/mãe ou responsável legal e defina a senha provisória de primeiro acesso."
      }
      maxWidth="sm:max-w-2xl"
    >
      {credenciaisCriadas ? (
        <div className="space-y-6 py-4 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          {credenciaisCriadas.tipo === 'novo_com_senha' ? (
            <>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Acesso Criado com Sucesso!</h3>
                <p className="text-sm text-muted-foreground">
                  Entregue estas credenciais provisórias para o responsável. No primeiro login, a troca de senha será exigida.
                </p>
              </div>

              <div className="bg-muted/50 border border-border rounded-xl p-5 text-left space-y-3 font-mono text-sm max-w-md mx-auto">
                <div>
                  <span className="text-muted-foreground text-xs block">RESPONSÁVEL:</span>
                  <span className="text-foreground font-semibold font-sans">{credenciaisCriadas.nome}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">E-MAIL DE ACESSO:</span>
                  <span className="text-foreground font-semibold">{credenciaisCriadas.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">SENHA PROVISÓRIA:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-base">{credenciaisCriadas.senha}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">LINK DE LOGIN:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 text-xs break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/portal-aluno/login` : '/portal-aluno/login'}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCopiarCredenciais}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Copiado!' : 'Copiar Credenciais'}
                </Button>
                <Button variant="outline" onClick={onClose} className="border-border">
                  Concluir e Fechar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-foreground">Vínculo Realizado com Sucesso!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  O(a) responsável <strong>{credenciaisCriadas.nome}</strong> já possui conta ativa com o e-mail <strong className="text-foreground">{credenciaisCriadas.email}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Os <strong>{credenciaisCriadas.totalAlunos} dependente(s)</strong> vinculados nesta unidade escolar já estão imediatamente disponíveis no portal da família.
                </p>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-700 dark:text-indigo-300 max-w-md mx-auto text-left flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Nenhuma nova senha foi necessária, pois o responsável mantém sua senha pessoal pré-existente.
                </span>
              </div>

              <div className="flex justify-center pt-2">
                <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8">
                  Concluir
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSalvar} className="space-y-5 pt-2">
          {/* Seção 1: Campo de CPF com Busca Reativa */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cpf" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                CPF do Responsável <span className="text-rose-500">*</span>
              </Label>
              {responsavelExistente && (
                <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                  <UserCheck className="w-3 h-3" /> Cadastro Localizado na Rede
                </Badge>
              )}
            </div>

            <div className="relative">
              <Input
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                disabled={Boolean(responsavelEmEdicao)}
                className={`bg-background border-border text-foreground pr-10 font-mono ${
                  responsavelExistente ? 'border-emerald-500/50 focus-visible:ring-emerald-500/20' : ''
                }`}
              />
              <div className="absolute right-3 top-2.5">
                {verificandoCpf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : responsavelExistente ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : null}
              </div>
            </div>
          </div>

          {/* Seção 2A: Card de Identificação de Responsável Existente (Modo Vínculo) */}
          {responsavelExistente ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {responsavelExistente.nome?.charAt(0) || 'R'}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      {responsavelExistente.nome}
                      {responsavelExistente.must_change_password ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          1º Acesso Pendente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          Conta Ativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{email}</span>
                      </div>
                      {telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditandoDadosContato(!editandoDadosContato)}
                    className="h-8 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1"
                    title="Editar e-mail ou telefone"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {editandoDadosContato ? 'Recolher' : 'Editar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLimparCpf}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Trocar CPF
                  </Button>
                </div>
              </div>

              {/* Dependentes em outras unidades da rede municipal */}
              {dependentesOutrasEscolas.length > 0 && (
                <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    Filho(s) matriculado(s) em outras escolas da rede:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dependentesOutrasEscolas.map((dep) => (
                      <Badge
                        key={dep.id}
                        variant="secondary"
                        className="text-xs bg-background text-foreground border-border flex items-center gap-1.5 py-1 px-2.5 font-normal"
                      >
                        <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="font-semibold">{dep.nome}</span>
                        <span className="text-muted-foreground">• {dep.escola_nome} ({dep.turma_nome})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Painel Expansível de Atualização de Dados de Contato */}
              {editandoDadosContato && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label htmlFor="nome_edit" className="text-xs font-medium text-foreground">
                      Nome Completo
                    </Label>
                    <Input
                      id="nome_edit"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="bg-background border-border h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email_edit" className="text-xs font-medium text-foreground">
                      E-mail de Acesso
                    </Label>
                    <Input
                      id="email_edit"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background border-border h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="telefone_edit" className="text-xs font-medium text-foreground">
                      Telefone / WhatsApp
                    </Label>
                    <Input
                      id="telefone_edit"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="bg-background border-border h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Opção de Redefinir Senha do Pai Existente */}
              <div className="pt-2 border-t border-border flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={redefinirSenha}
                    onChange={(e) => {
                      setRedefinirSenha(e.target.checked)
                      if (e.target.checked && !senhaProvisoria) {
                        gerarSenhaAleatoria()
                      }
                    }}
                    className="rounded border-border text-indigo-600 focus:ring-0"
                  />
                  <span>Redefinir senha de acesso para este responsável</span>
                </label>

                {redefinirSenha && (
                  <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2 mt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="senha_redef" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Nova Senha Provisória
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={gerarSenhaAleatoria}
                        className="text-indigo-600 dark:text-indigo-400 h-6 text-xs gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Gerar Nova
                      </Button>
                    </div>
                    <Input
                      id="senha_redef"
                      value={senhaProvisoria}
                      onChange={(e) => setSenhaProvisoria(e.target.value)}
                      required={redefinirSenha}
                      className="bg-background border-border font-mono text-amber-600 dark:text-amber-400 font-semibold h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Seção 2B: Formulário Completo de Novo Cadastro */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-medium text-foreground">
                    Nome Completo <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Maria dos Santos Silva"
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground">
                    E-mail (Login no Portal) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@email.com"
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="telefone" className="text-xs font-medium text-foreground">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              {/* Senha Provisória para Novo Cadastro */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Senha Provisória de Acesso <span className="text-rose-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={gerarSenhaAleatoria}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/10 h-7 text-xs gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerar Senha Aleatória
                  </Button>
                </div>
                <Input
                  id="senha"
                  value={senhaProvisoria}
                  onChange={(e) => setSenhaProvisoria(e.target.value)}
                  placeholder="Digite uma senha ou use o gerador"
                  required={!responsavelEmEdicao}
                  className="bg-background border-border font-mono text-amber-600 dark:text-amber-400 font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Esta senha é temporária. O responsável será forçado a criar sua senha pessoal no primeiro login.
                </p>
              </div>
            </div>
          )}

          {/* Seção 3: Grau de Parentesco */}
          <div className="space-y-1.5">
            <Label htmlFor="parentesco" className="text-xs font-semibold text-foreground">
              Grau de Parentesco / Relação com o(s) Aluno(s) <span className="text-rose-500">*</span>
            </Label>
            <select
              id="parentesco"
              value={parentesco}
              onChange={(e) => setParentesco(e.target.value)}
              className="w-full h-9 px-3 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {OPCOES_PARENTESCO.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Seção 4: Seleção de Alunos (Filhos) desta Escola */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Filho(s) / Aluno(s) Vinculados nesta Escola <span className="text-rose-500">*</span>
              </Label>
              <Badge variant="outline" className="text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                {alunosSelecionados.length} selecionado(s)
              </Badge>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                placeholder="Filtrar aluno por nome ou turma..."
                className="pl-9 bg-background border-border h-9 text-xs text-foreground"
              />
            </div>

            <div className="border border-border rounded-xl max-h-44 overflow-y-auto p-2 bg-background divide-y divide-border/60">
              {carregandoAlunos ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando alunos da escola...
                </div>
              ) : alunosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum aluno encontrado para este filtro.
                </div>
              ) : (
                alunosFiltrados.map((aluno) => {
                  const isChecked = alunosSelecionados.includes(aluno.id)
                  return (
                    <div
                      key={aluno.id}
                      onClick={() => toggleAluno(aluno.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/40' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold block">{aluno.nome}</span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>Turma: {aluno.turma_nome}</span>
                          {aluno.numero_matricula && (
                            <>
                              <span>•</span>
                              <span>Matrícula: {aluno.numero_matricula}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border text-indigo-600 focus:ring-0 pointer-events-none"
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando} className="border-border">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-xs"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {salvando 
                ? (responsavelExistente ? 'Salvando Vínculo...' : 'Salvando Acesso...') 
                : (responsavelExistente ? 'Vincular Aluno(s) à Escola' : 'Salvar e Gerar Acesso')
              }
            </Button>
          </div>
        </form>
      )}
    </StandardDialog>
  )
}
