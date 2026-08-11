import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { Funcionario } from '@/types/funcionario'
import {
  gerarFichaFuncionarioHtml,
  gerarListaFuncionariosHtml
} from '@/lib/funcionariosPrint'

export function useImprimirFuncionario() {
  const supabase = createClient()
  const { acessos, isAdminGlobalOrRoot } = useAuthStore()
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false

  const handleImprimir = async (funcId: string) => {
    const loadingToast = toast.loading('Buscando dados da ficha do funcionário...')
    try {
      const { data: f, error } = await supabase
        .from('funcionarios')
        .select(`
          *,
          vinculos_funcionarios(
            escola_id,
            cargo,
            ativo,
            escolas(nome, inep, localizacao, logo_url)
          )
        `)
        .eq('id', funcId)
        .maybeSingle()

      toast.dismiss(loadingToast)
      if (error || !f) {
        toast.error('Erro ao buscar dados do funcionário.')
        return
      }

      const activeVinc = f.vinculos_funcionarios?.find((v: any) => v.ativo)
      const schoolLogoUrl = activeVinc?.escolas?.logo_url ?? null

      // Formatar Doenças
      const listDoencas = []
      if (f.doenca_diabetes) listDoencas.push('Diabetes')
      if (f.doenca_convulsoes) listDoencas.push('Convulsões')
      if (f.doenca_asma_bronquite) listDoencas.push('Asma / Bronquite')
      if (f.doenca_infeccoes) listDoencas.push('Infecções')
      if (f.doenca_cardiopatias) listDoencas.push('Cardiopatias')
      if (f.doenca_alergias) listDoencas.push('Alergias')
      if (f.doenca_covid19) listDoencas.push('Covid-19')
      if (f.doenca_articulares) listDoencas.push('Doenças Articulares')
      if (f.doenca_outra) listDoencas.push(`Outra: ${f.doenca_outra}`)
      const doencasStr = listDoencas.length > 0 ? listDoencas.join(', ') : 'Nenhuma'

      // Formatar Deficiências
      const defsList = []
      if (f.possui_deficiencia) {
        if (f.deficiencias && f.deficiencias.length > 0) {
          defsList.push(...f.deficiencias)
        }
        if (f.tea) defsList.push('TEA (Transtorno do Espectro Autista)')
        if (f.altas_habilidades) defsList.push('Altas habilidades / Superdotação')
      }
      const defsStr = defsList.length > 0 ? defsList.join(', ') : 'Nenhuma'

      // Formatar Pós-Graduações
      const posList = Array.isArray(f.pos_graduacoes) ? f.pos_graduacoes : []
      const posHtml = posList.length > 0
        ? posList
            .map(
              (p: any) => `
          <div class="pos-item">
            <strong>${p.tipo ?? ''}</strong> em ${p.area ?? ''} (${
                p.situacao === 'Cursando' ? 'Cursando - Previsão:' : 'Conclusão:'
              } ${p.ano ?? ''})
          </div>
        `
            )
            .join('')
        : 'Nenhuma pós-graduação cadastrada'

      // Outros cursos
      const outrosCursosStr =
        f.outros_cursos && f.outros_cursos.length > 0
          ? f.outros_cursos.join(', ')
          : 'Nenhum'

      // Documentos anexados
      const docsAnexadosList = []
      if (f.doc_identidade_url) docsAnexadosList.push('Identidade (RG)')
      if (f.doc_cpf_url) docsAnexadosList.push('CPF')
      if (f.doc_comprovante_residencia_url) docsAnexadosList.push('Comprovante de Residência')
      if (f.doc_ensino_fundamental_url) docsAnexadosList.push('Comp. Escolaridade: Fundamental')
      if (f.doc_ensino_medio_url) docsAnexadosList.push('Comp. Escolaridade: Médio')
      if (f.doc_curso_superior_url) docsAnexadosList.push('Comp. Escolaridade: Superior')
      if (f.doc_pos_graduacao_url) docsAnexadosList.push('Comp. Escolaridade: Pós-Graduação')
      if (f.doc_mestrado_url) docsAnexadosList.push('Comp. Escolaridade: Mestrado')
      if (f.doc_doutorado_url) docsAnexadosList.push('Comp. Escolaridade: Doutorado')
      const docsAnexadosStr =
        docsAnexadosList.length > 0 ? docsAnexadosList.join(', ') : 'Nenhum'

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
      const isRootOrNivel1 = isAdminGlobalOrRoot() || (acessos && acessos.some((a: any) => a.nivel === 1 && a.ativo))
      
      const defaultEducacaoLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785727158753_educacao_final.png`
      const defaultSaudeLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785815672933_saude_oficial.png`
      const logoSecretariaUrl = isSaude ? defaultSaudeLogoUrl : defaultEducacaoLogoUrl
      
      const sessionTimestamp = Date.now()
      const logoDireitoUrl = isRootOrNivel1
        ? logoSecretariaUrl
        : schoolLogoUrl
        ? `${schoolLogoUrl}?t=${sessionTimestamp}`
        : logoSecretariaUrl

      const win = window.open('', '_blank', 'width=900,height=900')
      if (!win) {
        toast.warning('O bloqueador de pop-ups impediu a visualização da impressão. Por favor, autorize pop-ups para este site.')
        return
      }

      const html = gerarFichaFuncionarioHtml(
        f,
        `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png?t=${sessionTimestamp}`,
        logoDireitoUrl,
        logoSecretariaUrl,
        doencasStr,
        defsStr,
        posHtml,
        outrosCursosStr,
        docsAnexadosStr
      )
      win.document.write(html)
      win.document.close()
    } catch (err: any) {
      toast.error('Erro ao gerar a ficha de impressão: ' + err.message)
      console.error(err)
    }
  }

  const handleImprimirLista = (funcsFiltrados: Funcionario[], filtroCargo: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
    const sessionTimestamp = Date.now()
    const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png?t=${sessionTimestamp}`
    const logoSecretariaUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-secretaria.jpg?t=${sessionTimestamp}`
    const isRootOrNivel1 = isAdminGlobalOrRoot() || (acessos && acessos.some((a: any) => a.nivel === 1 && a.ativo))
    const logoEscolaAtivaUrl = selectedEscola?.logo_url || null
    
    const logoDireitoUrl = isRootOrNivel1
      ? logoSecretariaUrl
      : logoEscolaAtivaUrl
      ? `${logoEscolaAtivaUrl}?t=${sessionTimestamp}`
      : logoSecretariaUrl

    const legendaEscola = selectedEscola?.nome ?? 'Todas as Escolas'
    const legendaCargo = filtroCargo === 'todos' ? 'Todos os Cargos' : filtroCargo

    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.warning('O bloqueador de pop-ups impediu a visualização da impressão. Por favor, autorize pop-ups para este site.')
      return
    }

    const html = gerarListaFuncionariosHtml(
      funcsFiltrados,
      logoPrefeituraUrl,
      logoDireitoUrl,
      logoSecretariaUrl,
      legendaEscola,
      legendaCargo
    )
    win.document.write(html)
    win.document.close()
  }

  return {
    handleImprimir,
    handleImprimirLista
  }
}
