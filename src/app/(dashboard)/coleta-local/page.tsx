'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { Smartphone, Loader2, Save } from 'lucide-react'

export default function ColetaLocalPage() {
  const { funcionario } = useAuthStore()
  const [token, setToken] = useState('')
  const [aluno, setAluno] = useState<any | null>(null)
  const [sigType, setSigType] = useState<'resp' | 'func' | null>(null)
  const [newSignature, setNewSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || token.length !== 4) {
      toast.error('Por favor, insira um código de 4 dígitos.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Busca por código de responsável
      let { data: alunoResp } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_resp', token)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoResp) {
        setAluno(alunoResp)
        setSigType('resp')
        setNewSignature(null)
        toast.success('Código do responsável validado!')
        return
      }

      // 2. Busca por código de funcionário
      let { data: alunoFunc } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_func', token)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoFunc) {
        setAluno(alunoFunc)
        setSigType('func')
        setNewSignature(null)
        toast.success('Código do funcionário validado!')
        return
      }

      toast.error('Código inválido, expirado ou já utilizado.')
      setAluno(null)
      setSigType(null)
    } catch (err: any) {
      toast.error(`Erro ao validar código: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSignature = async () => {
    if (!aluno || !sigType || !newSignature) return
    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `aluno_${aluno.id}_${sigType === 'resp' ? 'responsavel' : 'funcionario'}.png`
      const { error: uploadError } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from('assinaturas_alunos')
        .getPublicUrl(fileName)

      const publicUrl = publicData.publicUrl

      // 3. Atualizar dados_matricula e zerar token
      const dadosMatriculaAtualizados = {
        ...(aluno.dados_matricula || {}),
        [sigType === 'resp' ? 'assinatura_responsavel_url' : 'assinatura_funcionario_url']: publicUrl,
        [sigType === 'resp' ? 'assinatura_responsavel_at' : 'assinatura_funcionario_at']: new Date().toISOString()
      }

      const updatePayload: any = {
        dados_matricula: dadosMatriculaAtualizados,
        [sigType === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func']: null
      }

      const { error: updateError } = await supabase
        .from('alunos')
        .update(updatePayload)
        .eq('id', aluno.id)

      if (updateError) throw updateError

      toast.success('Assinatura colhida e salva com sucesso!')
      setToken('')
      setAluno(null)
      setSigType(null)
      setNewSignature(null)
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Smartphone className="h-8 w-8 text-[#185FA5] dark:text-[#3ea6ff]" />
          Coleta Local de Assinaturas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use esta ferramenta para colher a assinatura de um cidadão ou funcionário que não possui conta ou celular na rede.
        </p>
      </div>

      <Card className="border-borderCustom bg-card p-6 space-y-6">
        {!aluno ? (
          <form onSubmit={handleVerifyCode} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase font-bold tracking-wider">
                Insira o Código de Assinatura (4 dígitos)
              </label>
              <Input
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="Ex: 1234"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                className="bg-input h-11 text-center font-mono text-xl tracking-widest text-white border-borderCustom"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || token.length !== 4}
              className="w-full bg-highlight text-background hover:bg-highlight/90 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Validando...
                </>
              ) : (
                'Verificar Código'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-background rounded-xl border border-borderCustom space-y-2">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Dados da Matrícula Localizada</h3>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-zinc-500 block text-xs">Aluno(a)</span>
                  <span className="font-semibold text-white uppercase">{aluno.nome}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-xs">Tipo de Assinatura</span>
                  <span className="font-bold text-[#3ea6ff] uppercase">
                    {sigType === 'resp' ? 'Pai/Mãe/Responsável' : 'Funcionário Responsável'}
                  </span>
                </div>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <SignaturePad
                label={`Assine aqui (${sigType === 'resp' ? 'Responsável' : 'Funcionário'})`}
                value={newSignature}
                onChange={setNewSignature}
                isEditMode={true}
                globalSignatureUrl={sigType === 'func' ? funcionario?.assinatura_url : null}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAluno(null)
                    setSigType(null)
                    setNewSignature(null)
                  }}
                  disabled={loading}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={loading || !newSignature}
                  className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Assinatura na Ficha
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
