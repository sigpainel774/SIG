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

function normalizarNome(nome?: string | null): string {
  if (!nome) return ''
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos e cedilhas
    .toLowerCase()
    .replace(/['"`´^~]/g, '') // remove aspas/apóstrofos
    .trim()
    .replace(/\s+/g, ' ') // normaliza múltiplos espaços
}

function compararNomesMae(nomeDigitado: string, nomeCadastrado: string): boolean {
  const normDigitado = normalizarNome(nomeDigitado)
  const normCadastrado = normalizarNome(nomeCadastrado)

  if (!normDigitado || !normCadastrado) return false

  // 1. Match direto exato (sem acento / minúsculo)
  if (normDigitado === normCadastrado) return true

  // 2. Tolerância a preposições comuns no português (de, da, do, dos, das, e)
  const removerConectivos = (str: string) =>
    str
      .split(' ')
      .filter((w) => !['de', 'da', 'do', 'dos', 'das', 'e'].includes(w))
      .join(' ')

  const semConectivosDigitado = removerConectivos(normDigitado)
  const semConectivosCadastrado = removerConectivos(normCadastrado)

  if (semConectivosDigitado && semConectivosDigitado === semConectivosCadastrado) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { respostaId, dataNascimento, nomeMae, cpf } = body

    if (!respostaId) {
      return NextResponse.json(
        { error: 'Identificador da resposta é obrigatório.' },
        { status: 400 }
      )
    }

    const dataNascDigitada = normalizarData(dataNascimento)
    const nomeMaeDigitado = (nomeMae || '').trim()
    const cpfDigitado = normalizarCpf(cpf)

    if (!dataNascDigitada || (!nomeMaeDigitado && !cpfDigitado)) {
      return NextResponse.json(
        { error: 'Data de Nascimento e Nome Completo da Mãe são obrigatórios para acessar o resultado.' },
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
          nome_mae,
          dados_matricula,
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

    // Extração com fallback cascata para nome da mãe e data de nascimento
    const dm = (resposta.aluno?.dados_matricula as Record<string, any>) || {}
    const nomeMaeCadastrado: string | null =
      resposta.nome_mae_aluno ||
      resposta.aluno?.nome_mae ||
      dm.nomeMaeAluno ||
      dm.maeAluno ||
      dm.nomeMae ||
      dm.mae ||
      null

    const dataNascCadastrada: string =
      normalizarData(resposta.data_nascimento_aluno) ||
      normalizarData(resposta.aluno?.data_nascimento) ||
      normalizarData(dm.dataNascimento) ||
      normalizarData(dm.data_nascimento) ||
      ''

    const cpfCadastrado = normalizarCpf(resposta.cpf_aluno || resposta.aluno?.cpf)

    // Caso a ficha do aluno esteja com dados incompletos no banco
    if (!dataNascCadastrada || (!nomeMaeCadastrado && !cpfCadastrado)) {
      return NextResponse.json(
        {
          error:
            'Os dados de filiação materna ou data de nascimento não constam completos no cadastro deste estudante. Por favor, solicite a atualização da sua ficha junto à coordenação do Cursinho.'
        },
        { status: 403 }
      )
    }

    // Validação da Data de Nascimento
    const dataNascConfere = Boolean(dataNascCadastrada && dataNascDigitada === dataNascCadastrada)

    // Validação do Nome da Mãe (ou fallback por CPF se informado)
    let identidadeConfere = false
    if (nomeMaeDigitado && nomeMaeCadastrado) {
      identidadeConfere = compararNomesMae(nomeMaeDigitado, nomeMaeCadastrado)
    } else if (cpfDigitado && cpfCadastrado) {
      identidadeConfere = cpfDigitado === cpfCadastrado
    }

    if (!dataNascConfere || !identidadeConfere) {
      return NextResponse.json(
        {
          error:
            'Data de Nascimento ou Nome Completo da Mãe não conferem com a ficha deste estudante no Cursinho. Verifique a digitação e tente novamente.'
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
