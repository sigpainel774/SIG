'use client'

import { useState, useEffect } from 'react'
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
  CheckCircle2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AlunoOption {
  id: string
  nome: string
  numero_matricula?: string | null
  turma_nome?: string
}

interface ModalCadastroResponsavelProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  escolaId: string
  responsavelEmEdicao?: any | null
}

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

  // Alunos selecionados
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<AlunoOption[]>([])
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([])
  const [buscaAluno, setBuscaAluno] = useState('')
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{ email: string; senha: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

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
      return
    }

    if (responsavelEmEdicao) {
      setCpf(formatarCpf(responsavelEmEdicao.cpf || ''))
      setNome(responsavelEmEdicao.nome || '')
      setEmail(responsavelEmEdicao.email || '')
      setTelefone(responsavelEmEdicao.telefone || '')
      setSenhaProvisoria('')
      setAlunosSelecionados((responsavelEmEdicao.alunos || []).map((a: any) => a.id))
    } else {
      setCpf('')
      setNome('')
      setEmail('')
      setTelefone('')
      setParentesco('Pai / Mãe')
      gerarSenhaAleatoria()
      setAlunosSelecionados([])
    }
  }, [open, responsavelEmEdicao])

  // Checar se o CPF já existe ao terminar de digitar
  const handleCpfBlur = async () => {
    const limpo = cpf.replace(/\D/g, '')
    if (limpo.length !== 11 || responsavelEmEdicao) return

    try {
      const { data } = await supabase
        .from('responsaveis')
        .select('id, nome, email, telefone')
        .eq('cpf', limpo)
        .maybeSingle()

      if (data) {
        toast.info(`Responsável "${data.nome}" já localizado no sistema. Dados carregados!`)
        setNome(data.nome)
        setEmail(data.email)
        if (data.telefone) setTelefone(data.telefone)
      }
    } catch (e) {}
  }

  const toggleAluno = (alunoId: string) => {
    setAlunosSelecionados(prev => 
      prev.includes(alunoId) ? prev.filter(id => id !== alunoId) : [...prev, alunoId]
    )
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cpf || !nome || !email || (!senhaProvisoria && !responsavelEmEdicao)) {
      toast.error('Por favor, preencha todos os campos obrigatórios.')
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
          senha_provisoria: senhaProvisoria,
          aluno_ids: alunosSelecionados,
          escola_id: escolaId
        })
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao processar cadastro')
      }

      setCredenciaisCriadas({
        email: email.trim().toLowerCase(),
        senha: senhaProvisoria
      })

      toast.success('Responsável e acessos salvos com sucesso!')
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar responsável:', err)
      toast.error(err.message || 'Erro ao salvar responsável.')
    } finally {
      setSalvando(false)
    }
  }

  const handleCopiarCredenciais = () => {
    if (!credenciaisCriadas) return
    const texto = `*Acesso ao Portal do Aluno*\nEscola: Portal dos Pais\nE-mail: ${credenciaisCriadas.email}\nSenha Provisória: ${credenciaisCriadas.senha}\nLink: ${window.location.origin}/portal-aluno/login`
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

  return (
    <StandardDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={responsavelEmEdicao ? "Editar Responsável" : "Novo Responsável & Acesso ao Portal"}
      description="Cadastre o pai/mãe ou responsável legal e defina a senha provisória de primeiro acesso."
      maxWidth="sm:max-w-2xl"
    >
      {credenciaisCriadas ? (
        <div className="space-y-6 py-4 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Acesso Criado com Sucesso!</h3>
            <p className="text-sm text-muted-foreground">
              Entregue estas credenciais provisórias para o responsável. No primeiro login, a troca de senha será exigida.
            </p>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 text-left space-y-3 font-mono text-sm max-w-md mx-auto">
            <div>
              <span className="text-zinc-500 text-xs block">E-MAIL DE ACESSO:</span>
              <span className="text-foreground font-semibold">{credenciaisCriadas.email}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">SENHA PROVISÓRIA:</span>
              <span className="text-amber-400 font-bold text-base">{credenciaisCriadas.senha}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">LINK DE LOGIN:</span>
              <span className="text-indigo-400 text-xs break-all">{typeof window !== 'undefined' ? `${window.location.origin}/portal-aluno/login` : '/portal-aluno/login'}</span>
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
            <Button variant="outline" onClick={onClose} className="border-[#3f3f46]">
              Concluir e Fechar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSalvar} className="space-y-5 pt-2">
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-xs font-medium text-zinc-300">
                CPF do Responsável <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatarCpf(e.target.value))}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className="bg-[#18181b] border-[#27272a]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-medium text-zinc-300">
                Nome Completo <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria dos Santos Silva"
                required
                className="bg-[#18181b] border-[#27272a]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                E-mail (Login no Portal) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                required
                className="bg-[#18181b] border-[#27272a]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-xs font-medium text-zinc-300">
                Telefone / WhatsApp
              </Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-[#18181b] border-[#27272a]"
              />
            </div>
          </div>

          {/* Senha Provisória */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                Senha Provisória de Acesso <span className="text-rose-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={gerarSenhaAleatoria}
                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-7 text-xs gap-1.5"
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
              className="bg-[#141416] border-[#3f3f46] font-mono text-amber-400 font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Esta senha é temporária. O responsável será forçado a criar sua senha pessoal no primeiro login.
            </p>
          </div>

          {/* Seleção de Alunos (Filhos) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Filho(s) / Aluno(s) Vinculados nesta Escola <span className="text-rose-500">*</span>
              </Label>
              <Badge variant="outline" className="text-[11px] bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                {alunosSelecionados.length} selecionado(s)
              </Badge>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                placeholder="Filtrar aluno por nome ou turma..."
                className="pl-9 bg-[#18181b] border-[#27272a] h-9 text-xs"
              />
            </div>

            <div className="border border-[#27272a] rounded-xl max-h-48 overflow-y-auto p-2 bg-[#141416] divide-y divide-[#27272a]/50">
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
                        isChecked ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'hover:bg-[#1f1f23] text-foreground'
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
                        className="rounded border-[#3f3f46] text-indigo-600 focus:ring-0 pointer-events-none"
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#27272a]">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando} className="border-[#3f3f46]">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              {salvando ? 'Salvando Acesso...' : 'Salvar e Gerar Acesso'}
            </Button>
          </div>
        </form>
      )}
    </StandardDialog>
  )
}
