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
      <div className="print:hidden space-y-6">
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

      {/* Lista de Alunos em Cards */}
      <div className="flex flex-col gap-4">
        {alunosFiltrados.map((aluno) => (
          <div key={aluno.id} className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-6 flex items-center gap-6 shadow-sm hover:border-[#3ea6ff]/30 transition-colors">
            {/* Foto / Iniciais */}
            <div className="w-16 h-16 rounded-full border-2 border-[#3ea6ff] flex-shrink-0 flex items-center justify-center bg-[#3ea6ff]/10 text-white text-xl font-bold overflow-hidden">
              {aluno.foto_url ? (
                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
              ) : (
                aluno.nome.substring(0, 2).toUpperCase()
              )}
            </div>

            {/* Informações */}
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-[1.15rem] font-bold text-white mb-2">{aluno.nome}</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[0.9rem]">
                  <span className="text-gray-400 font-semibold">Telefone:</span>
                  <span className="text-gray-300">{aluno.telefone || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[0.9rem]">
                  <span className="text-gray-400 font-semibold">Email:</span>
                  <span className="text-gray-300">{aluno.dados_matricula?.emailAluno || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[0.9rem]">
                  <span className="text-gray-400 font-semibold">Endereço:</span>
                  <span className="text-gray-300">{aluno.endereco || aluno.dados_matricula?.ruaAluno || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[0.9rem]">
                  <span className="text-gray-400 font-semibold">Série:</span>
                  <span className="text-gray-300">{aluno.serie || aluno.dados_matricula?.serieAluno || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[0.9rem]">
                  <span className="text-gray-400 font-semibold">Escola:</span>
                  <span className="text-gray-300">{aluno.escola_nome || aluno.dados_matricula?.escolaNome || '-'}</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleEditarAluno(aluno)}
                className="w-12 h-12 rounded-full border border-gray-600/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Editar Aluno"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleDeletar(aluno.id)}
                className="w-12 h-12 rounded-full border border-rose-500/30 flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Excluir Aluno"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleImprimirAluno(aluno)}
                className="w-12 h-12 rounded-full border border-[#3ea6ff]/40 flex items-center justify-center text-[#3ea6ff] hover:bg-[#3ea6ff]/10 transition-colors"
                title="Imprimir Ficha de Matrícula"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {alunosFiltrados.length === 0 && (
          <div className="text-center py-12 bg-[#121212] rounded-2xl border border-borderCustom text-muted-foreground">
            Nenhum aluno encontrado.
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
