import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface UseAlunoSignaturePollingProps {
  alunoId?: string
  setAssinaturaResponsavelUrl: (url: string | null) => void
  setAssinaturaFuncionarioUrl: (url: string | null) => void
}

export function useAlunoSignaturePolling({
  alunoId,
  setAssinaturaResponsavelUrl,
  setAssinaturaFuncionarioUrl,
}: UseAlunoSignaturePollingProps) {
  const [celularSigningField, setCelularSigningField] = useState<'resp' | 'func' | null>(null)
  const [celularSigningCode, setCelularSigningCode] = useState<string | null>(null)
  const pollingRef = useRef<any>(null)

  // Função para limpar os códigos temporários no banco de dados
  const clearDatabaseCodes = async (fieldToClear?: 'resp' | 'func' | null) => {
    if (!alunoId) return
    const targetField = fieldToClear || celularSigningField
    if (!targetField) return

    const supabase = createClient()
    const columnName = targetField === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func'
    try {
      await supabase
        .from('alunos')
        .update({ [columnName]: null } as any)
        .eq('id', alunoId)
    } catch (err) {
      console.error('Erro ao limpar código temporário no banco:', err)
    }
  }

  const iniciarAssinaturaCelular = async (tipo: 'resp' | 'func') => {
    if (!alunoId) {
      toast.error('Por favor, salve a ficha do aluno primeiro para poder usar a assinatura pelo celular.')
      return
    }

    const codeTemp = Math.floor(1000 + Math.random() * 9000).toString()
    setCelularSigningField(tipo)
    setCelularSigningCode(codeTemp)

    const supabase = createClient()
    const columnName = tipo === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func'
    const colCriadoEm = tipo === 'resp' ? 'codigo_temp_resp_criado_em' : 'codigo_temp_func_criado_em'

    try {
      const { error } = await supabase
        .from('alunos')
        .update({ 
          [columnName]: codeTemp,
          [colCriadoEm]: new Date().toISOString()
        } as any)
        .eq('id', alunoId)

      if (error) throw error

      toast.success('Código temporário gerado! Aponte o celular ou informe o código.')

      // Cancelar polling anterior
      if (pollingRef.current) clearInterval(pollingRef.current)

      let pollingTime = 0
      // Iniciar Polling com timeout de 5 minutos (300 segundos)
      pollingRef.current = setInterval(async () => {
        pollingTime += 3
        if (pollingTime > 300) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          await supabase
            .from('alunos')
            .update({ [columnName]: null } as any)
            .eq('id', alunoId)
          setCelularSigningCode(null)
          setCelularSigningField(null)
          toast.error('Tempo limite de assinatura por celular expirou. Solicite um novo código.')
          return
        }

        const { data, error: pollError } = await supabase
          .from('alunos')
          .select('dados_matricula, codigo_temp_resp, codigo_temp_func')
          .eq('id', alunoId)
          .single()

        if (pollError) return

        if (data) {
          const dm = data.dados_matricula as Record<string, any> || {}
          const codeValue = tipo === 'resp' ? data.codigo_temp_resp : data.codigo_temp_func
          const sigUrl = tipo === 'resp' ? dm.assinatura_responsavel_url : dm.assinatura_funcionario_url

          // Se o código sumiu e a URL foi setada no celular
          if (!codeValue && sigUrl) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            const cacheBustedUrl = `${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
            if (tipo === 'resp') {
              setAssinaturaResponsavelUrl(cacheBustedUrl)
            } else {
              setAssinaturaFuncionarioUrl(cacheBustedUrl)
            }
            setCelularSigningCode(null)
            setCelularSigningField(null)
            toast.success(`Assinatura do ${tipo === 'resp' ? 'Responsável' : 'Funcionário'} capturada com sucesso!`)
          }
        }
      }, 3000)
    } catch (err: any) {
      toast.error(`Erro ao iniciar assinatura por celular: ${err.message}`)
      setCelularSigningField(null)
      setCelularSigningCode(null)
    }
  }

  const cancelarAssinaturaCelular = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (alunoId && celularSigningField) {
      await clearDatabaseCodes(celularSigningField)
    }

    setCelularSigningCode(null)
    setCelularSigningField(null)
    toast.info('Assinatura pelo celular cancelada.')
  }

  // Efeito de desmontagem para evitar vazamento de memória e códigos órfãos no banco de dados
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      // Limpa os códigos do banco de dados ao desmontar, se aplicável
      if (alunoId && celularSigningField) {
        clearDatabaseCodes(celularSigningField)
      }
    }
  }, [alunoId, celularSigningField])

  return {
    celularSigningField,
    setCelularSigningField,
    celularSigningCode,
    setCelularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    clearDatabaseCodes,
  }
}
