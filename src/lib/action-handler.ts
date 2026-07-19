import { toast } from 'sonner'

interface ExecuteWithToastOptions<T> {
  action: () => Promise<T>
  setLoading?: (loading: boolean) => void
  successMessage?: string | ((result: T) => string)
  errorMessage?: string | ((error: any) => string)
  onSuccess?: (result: T) => void | Promise<void>
  onError?: (error: any) => void
  throwOnError?: boolean
}

/**
 * Normaliza mensagens de erro de formatos variados de forma defensiva.
 */
function normalizeErrorMessage(err: any): string {
  if (!err) return 'Erro desconhecido'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    return err.message || err.error_description || JSON.stringify(err)
  }
  return String(err)
}

/**
 * Invoca uma ação assíncrona com controle de estado de loading, console.error automático,
 * toasts integrados de sucesso e erro e tratamento de objetos de erro retornados (ex: Supabase).
 */
export async function executeWithToast<T>({
  action,
  setLoading,
  successMessage,
  errorMessage = 'Erro ao realizar ação',
  onSuccess,
  onError,
  throwOnError = false,
}: ExecuteWithToastOptions<T>): Promise<T | null> {
  if (setLoading) setLoading(true)
  try {
    const result = await action()

    // Trata retornos com a propriedade 'error' (ex: Supabase return { data, error })
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw result.error
    }
    
    // Trata retornos customizados de status de falha { success: false, error }
    if (result && typeof result === 'object' && 'success' in result && result.success === false) {
      throw (result as any).error || new Error('Ação retornou status de falha')
    }

    if (successMessage) {
      const msg = typeof successMessage === 'function' ? successMessage(result) : successMessage
      toast.success(msg)
    }

    if (onSuccess) {
      await onSuccess(result)
    }

    return result
  } catch (err: any) {
    console.error('Erro na execução da ação:', err)
    
    const baseMsg = typeof errorMessage === 'function' ? errorMessage(err) : errorMessage
    const detailedMsg = normalizeErrorMessage(err)
    const finalMsg = detailedMsg && detailedMsg !== 'Erro desconhecido' ? `${baseMsg}: ${detailedMsg}` : baseMsg
    
    toast.error(finalMsg)

    if (onError) {
      onError(err)
    }

    if (throwOnError) {
      throw err
    }

    return null
  } finally {
    if (setLoading) setLoading(false)
  }
}
