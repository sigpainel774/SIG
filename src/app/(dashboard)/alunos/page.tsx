'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, GraduationCap, ArrowLeftRight, Printer, Edit, Trash2 } from 'lucide-react'
import { ModalAluno } from '@/components/modals/modal-aluno'
import { PrintFichaAluno } from '@/components/print/print-ficha-aluno'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Aluno {
  id: string
  nome: string
  cpf?: string | null
  inep?: string | null
  telefone?: string | null
  data_nascimento?: string | null
  rg?: string | null
  nis?: string | null
  cartao_sus?: string | null
  certidao_nascimento?: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  endereco?: string | null
  serie?: string | null
  escola_id?: string | null
  escola_nome?: string
  foto_url?: string | null
  dados_matricula?: Record<string, any>
  created_at: string
}

export default function AlunosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [alunos, setAlunos] = useState<Aluno[]>([
    {
      id: '1',
      nome: 'Alessandra Passos Silveira',
      cpf: '09087765291',
      inep: '87426482',
      telefone: '75998239643',
      data_nascimento: '2003-08-27',
      rg: '0908272363',
      nis: '817873766358',
      cartao_sus: '43287492838',
      certidao_nascimento: '82882728929824415',
      nome_mae: 'Jarlene Ferreira',
      nome_pai: 'Marcos Vinicius',
      endereco: 'Rua do Brito, 78',
      serie: '2º ANO',
      escola_nome: 'Colégio Moisés Alves',
      foto_url: '',
      created_at: '2026-07-03',
      dados_matricula: {
        anoLetivo: '2026',
        localizacaoUE: 'Zona Urbana',
        tipoMatricula: 'Renovação',
        dataMatricula: '2026-05-31',
        estadoCivilAluno: 'Solteiro',
        corRacaAluno: 'Parda',
        sexoAluno: 'Feminino',
        nacionalidadeAluno: 'BRASILEIRA',
        cidadeNascAluno: 'Salvador',
        ufNascAluno: 'BA',
        telMaeAluno: '75982374736',
        telPaiAluno: '75988827645',
        turnoAluno: 'Vespertino',
        turmaAluno: '1',
        transporteAluno: false,
        ruaAluno: 'Rua do Brito',
        numeroAluno: '78',
        cepAluno: '44540000',
        bairroAluno: 'Brito',
        cidadeEndAluno: 'SAPE AÇU',
        ufEndAluno: 'BA',
        areaLocalizacaoAluno: 'Rural',
        areaDiferenciadaAluno: 'Não está em área diferenciada',
        recursosEspeciaisAluno: 'Não',
        diabeteAluno: 'Não',
        convulsoesAluno: 'Não',
        asmaAluno: 'Não',
        infeccoesAluno: 'Não',
        restricaoExercicioAluno: 'Não',
        covidAluno: 'Não',
        alergiaMedAluno: 'Não',
        restricaoAlimentarAluno: 'Não',
        neeAluno: 'Sim, indique qual(is)',
        neeSelecionadas: [
          'Desenvolvimento de funções cognitivas',
          'Desenvolvimento de vida autônoma',
          'Enriquecimento curricular',
          'Ensino de informática acessível',
          'Ensino do Sistema Braille',
          'Língua Portuguesa como Segunda Língua',
          'Técnicas de cálculo no Soroban',
          'Orientação e mobilidade',
          'Comunicação Alternativa e Aumentativa',
          'Transtorno do Espectro Autista',
          'Altas habilidades/Superdotação'
        ],
        deficienciaAluno: 'Sim, indique qual(is)',
        deficienciasSelecionadas: [
          'Baixa visão',
          'Surdez',
          'Deficiência Intelectual',
          'Cegueira',
          'Surdocegueira',
          'Deficiência múltipla',
          'Deficiência auditiva',
          'Deficiência Física'
        ]
      }
    }
  ])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [alunoSelecionadoEditar, setAlunoSelecionadoEditar] = useState<Aluno | null>(null)
  const [alunoImprimir, setAlunoImprimir] = useState<Aluno | null>(null)

  const carregarAlunos = async () => {
    const supabase = createClient()
    setLoading(true)
    const { data, error } = await supabase.from('alunos').select('*').order('nome', { ascending: true })
    if (data && data.length > 0) {
      setAlunos(data as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarAlunos()
  }, [])

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aluno.cpf && aluno.cpf.includes(searchTerm)) ||
      (aluno.inep && aluno.inep.includes(searchTerm))
  )

  const handleNovoAluno = () => {
    setAlunoSelecionadoEditar(null)
    setModalOpen(true)
  }

  const handleEditarAluno = (aluno: Aluno) => {
    setAlunoSelecionadoEditar(aluno)
    setModalOpen(true)
  }

  const handleImprimirAluno = (aluno: Aluno) => {
    setAlunoImprimir(aluno)
  }

  const handleDeletar = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir a ficha deste aluno?')) {
      const supabase = createClient()
      const { error } = await supabase.from('alunos').delete().eq('id', id)
      if (error) {
        toast.error(`Erro ao excluir: ${error.message}`)
      } else {
        toast.success('Aluno removido com sucesso!')
        carregarAlunos()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Modal de Cadastro / Edição */}
      <ModalAluno 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        alunoEditar={alunoSelecionadoEditar}
        onSuccess={carregarAlunos} 
      />

      {/* Tela / Modal de Impressão da Ficha do Aluno */}
      {alunoImprimir && (
        <PrintFichaAluno 
          aluno={alunoImprimir}
          onClose={() => setAlunoImprimir(null)}
        />
      )}

      {/* Topo / Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-highlight" />
            Gestão de Alunos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastro completo com 11 seções, busca por INEP/CPF e impressão individual da Ficha de Matrícula.
          </p>
        </div>
        <Button 
          onClick={handleNovoAluno}
          className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Aluno
        </Button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nome, CPF ou Código INEP (Censo)..."
            className="pl-9 bg-[#121212] border-borderCustom text-white focus-visible:ring-highlight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela Grid de Alunos */}
      <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-[#0d0d0d]">
            <TableRow className="border-borderCustom hover:bg-transparent">
              <TableHead className="text-foregroundCustom font-semibold">Foto</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Nome Completo</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">CPF</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Código INEP (Censo)</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Série / Ano</TableHead>
              <TableHead className="text-right text-foregroundCustom font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunosFiltrados.map((aluno) => (
              <TableRow key={aluno.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-highlight/40 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                    ) : (
                      aluno.nome[0]
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-white">
                  <div>{aluno.nome}</div>
                  {aluno.nome_mae && <div className="text-[11px] text-muted-foreground">Mãe: {aluno.nome_mae}</div>}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{aluno.cpf || 'Não informado'}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{aluno.inep || 'Sem INEP'}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-medium">{aluno.serie || aluno.dados_matricula?.serieAluno || '-'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button 
                    onClick={() => handleImprimirAluno(aluno)} 
                    variant="ghost" 
                    size="sm" 
                    className="text-[#3ea6ff] hover:text-[#3ea6ff] hover:bg-[#3ea6ff]/10 gap-1 text-xs font-semibold"
                    title="Imprimir Ficha de Matrícula Individual"
                  >
                    <Printer className="w-3.5 h-3.5" /> Ficha
                  </Button>
                  <Button 
                    onClick={() => handleEditarAluno(aluno)} 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-300 hover:text-white hover:bg-white/10 gap-1 text-xs"
                    title="Editar Ficha"
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button 
                    onClick={() => handleDeletar(aluno.id)} 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 text-xs"
                    title="Excluir Aluno"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
