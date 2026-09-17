import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calcularResultadoSimulado } from '@/lib/omr/omrEngine'

export const dynamic = 'force-dynamic'

function normalizarCpf(cpf?: string | null): string {
  if (!cpf) return ''
  return cpf.replace(/\D/g, '')
}

function normalizarData(data?: string | null): string {
  if (!data) return ''
  const limpo = data.trim()
  // Se vier no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpo)) {
    const [dia, mes, ano] = limpo.split('/')
    return `${ano}-${mes}-${dia}`
  }
  // Se vier no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(limpo)) {
    return limpo.substring(0, 10)
  }
  return limpo
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { respostaId, cpf, dataNascimento } = body

    if (!respostaId) {
      return NextResponse.json(
        { error: 'Identificador da resposta é obrigatório.' },
        { status: 400 }
      )
    }

    const cpfDigitado = normalizarCpf(cpf)
    const dataNascDigitada = normalizarData(dataNascimento)

    if (!cpfDigitado || !dataNascDigitada) {
      return NextResponse.json(
        { error: 'CPF e Data de Nascimento são obrigatórios para acessar o resultado.' },
        { status: 400 }
      )
    }

    // Busca resposta no banco via supabaseAdmin
    const { data: resposta, error: respError } = await (supabaseAdmin as any)
      .from('simulados_respostas')
      .select(`
        *,
        simulado:simulados(
          id,
          titulo,
          descricao,
          ano_letivo,
          data_aplicacao,
          qtd_questoes,
          alternativas_por_questao,
          gabarito_oficial,
          possui_lingua_estrangeira,
          lingua_estrangeira_inicio,
          lingua_estrangeira_fim,
          gabarito_ingles,
          gabarito_espanhol,
          caderno_questoes,
          escola:escolas(nome)
        ),
        aluno:alunos(
          id,
          nome,
          numero_matricula,
          cpf,
          data_nascimento,
          turma_id
        ),
        turma:turmas(id, nome)
      `)
      .eq('id', respostaId)
      .single()

    if (respError || !resposta) {
      return NextResponse.json(
        { error: 'Registro de resposta não encontrado.' },
        { status: 404 }
      )
    }

    // Validação das credenciais do aluno
    const cpfCadastrado = normalizarCpf(resposta.cpf_aluno || resposta.aluno?.cpf)
    const dataNascCadastrada = normalizarData(resposta.data_nascimento_aluno || resposta.aluno?.data_nascimento)

    let cpfConfere = false
    let dataNascConfere = false

    if (cpfCadastrado && cpfDigitado === cpfCadastrado) {
      cpfConfere = true
    }

    if (dataNascCadastrada && dataNascDigitada === dataNascCadastrada) {
      dataNascConfere = true
    }

    // Se no cadastro do aluno não havia CPF ou data informada, ou não confere:
    if (!cpfConfere || !dataNascConfere) {
      return NextResponse.json(
        {
          error:
            'CPF ou Data de Nascimento não conferem com o registro deste simulado. Em caso de dúvidas, consulte a coordenação.'
        },
        { status: 401 }
      )
    }

    const simulado = resposta.simulado
    if (!simulado) {
      return NextResponse.json(
        { error: 'Simulado associado não foi localizado.' },
        { status: 404 }
      )
    }

    // Calcula os detalhes do resultado com suporte a Língua Estrangeira
    const resultadoCalculado = calcularResultadoSimulado(
      resposta.respostas || {},
      simulado.gabarito_oficial || {},
      simulado.qtd_questoes || 45,
      {
        possuiLinguaEstrangeira: simulado.possui_lingua_estrangeira,
        linguaEscolhida: resposta.lingua_estrangeira,
        linguaInicio: simulado.lingua_estrangeira_inicio || 1,
        linguaFim: simulado.lingua_estrangeira_fim || 5,
        gabaritoIngles: simulado.gabarito_ingles || {},
        gabaritoEspanhol: simulado.gabarito_espanhol || {}
      }
    )

    return NextResponse.json({
      sucesso: true,
      aluno: {
        nome: resposta.aluno?.nome || resposta.nome_identificado,
        numeroMatricula: resposta.aluno?.numero_matricula || null,
        turma: resposta.turma?.nome || null,
        linguaEstrangeira: resposta.lingua_estrangeira || null
      },
      simulado: {
        id: simulado.id,
        titulo: simulado.titulo,
        descricao: simulado.descricao,
        anoLetivo: simulado.ano_letivo,
        dataAplicacao: simulado.data_aplicacao,
        qtdQuestoes: simulado.qtd_questoes,
        alternativasPorQuestao: simulado.alternativas_por_questao,
        escolaNome: simulado.escola?.nome || 'Cursinho Pré-Universitário',
        possuiLinguaEstrangeira: simulado.possui_lingua_estrangeira,
        linguaInicio: simulado.lingua_estrangeira_inicio,
        linguaFim: simulado.lingua_estrangeira_fim
      },
      desempenho: {
        notaFinal: resultadoCalculado.notaFinal,
        percentualAcerto: resultadoCalculado.percentualAcerto,
        totalAcertos: resultadoCalculado.totalAcertos,
        totalErros: resultadoCalculado.totalErros,
        totalEmBranco: resultadoCalculado.totalEmBranco,
        totalAnuladas: resultadoCalculado.totalAnuladas,
        dataCorrecao: resposta.data_correcao
      },
      detalhesQuestoes: resultadoCalculado.detalhes
    })
  } catch (err: any) {
    console.error('Erro ao validar acesso do aluno ao simulado:', err)
    return NextResponse.json(
      { error: 'Erro interno ao processar validação de acesso.' },
      { status: 500 }
    )
  }
}
