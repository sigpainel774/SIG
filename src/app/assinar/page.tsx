'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ShieldAlert, CheckCircle2, Key, Loader2, Sparkles } from 'lucide-react'

export default function AssinarPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [aluno, setAluno] = useState<any | null>(null)
  const [sigType, setSigType] = useState<'resp' | 'func' | null>(null) // resp = responsável, func = funcionário
  const [tempSignature, setTempSignature] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length !== 4) {
      toast.error('O código deve ter 4 dígitos.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Busca por código de responsável
      let { data: alunoResp, error: errorResp } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_resp', code)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoResp) {
        setAluno(alunoResp)
        setSigType('resp')
        toast.success('Código validado com sucesso!')
        setLoading(false)
        return
      }

      // 2. Se não encontrou, busca por código de funcionário
      let { data: alunoFunc, error: errorFunc } = await supabase
        .from('alunos')
        .select('*')
        .eq('codigo_temp_func', code)
        .is('deleted_at', null)
        .maybeSingle()

      if (alunoFunc) {
        setAluno(alunoFunc)
        setSigType('func')
        toast.success('Código validado com sucesso!')
        setLoading(false)
        return
      }

      // Nenhum aluno encontrado com esse código ativo
      toast.error('Código inválido ou expirado.')
    } catch (err: any) {
      toast.error(`Erro ao validar código: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Converte a string base64 do canvas recortado em um Blob binário para upload
  const base64ToBlob = (base64: string) => {
    const parts = base64.split(';base64,')
    const contentType = parts[0].split(':')[1]
    const raw = window.atob(parts[1])
    const rawLength = raw.length
    const uInt8Array = new Uint8Array(rawLength)
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i)
    }
    return new Blob([uInt8Array], { type: contentType })
  }

  const handleSaveSignature = async () => {
    if (!tempSignature) {
      toast.error('Por favor, desenhe sua assinatura antes de salvar.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const label = sigType === 'resp' ? 'responsavel' : 'funcionario'

    try {
      const blob = base64ToBlob(tempSignature)
      const fileExt = 'png'
      const fileName = `aluno_${aluno.id}_${label}.${fileExt}`

      // 1. Upload da assinatura para o bucket
      const { error: uploadError } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      // 2. Buscar URL Pública da assinatura
      const { data: publicData } = supabase.storage
        .from('assinaturas_alunos')
        .getPublicUrl(fileName)

      const publicUrl = publicData.publicUrl

      // 3. Atualizar dados_matricula com a nova URL
      const dadosMatriculaAtualizados = {
        ...(aluno.dados_matricula || {}),
        [sigType === 'resp' ? 'assinatura_responsavel_url' : 'assinatura_funcionario_url']: publicUrl
      }

      const updatePayload: any = {
        dados_matricula: dadosMatriculaAtualizados
      }

      const { error: updateError } = await supabase
        .from('alunos')
        .update(updatePayload)
        .eq('id', aluno.id)

      if (updateError) throw updateError

      setSuccess(true)
      toast.success('Assinatura salva e enviada com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#3ea6ff]/30 selection:text-white">
      {/* Decoração sutil de luz de fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-[#1d4ed8]/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Box do Formulário */}
      <div className="w-full max-w-md bg-[#121214] border border-[#26262a] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow no topo do card */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#3ea6ff]/40 to-transparent" />

        {/* 1. Tela de Sucesso */}
        {success ? (
          <div className="text-center space-y-4 py-6">
            <div className="inline-flex p-3 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Assinado com Sucesso!</h2>
            <p className="text-sm text-zinc-400">
              A assinatura digital foi enviada e integrada à ficha de matrícula do aluno. Você já pode fechar esta aba no seu celular.
            </p>
          </div>
        ) : !aluno ? (
          // 2. Tela de Solicitação de Código
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-[#3ea6ff]/10 text-[#3ea6ff] border border-[#3ea6ff]/20 mb-2">
                <Key className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>Coleta de Assinatura</span>
                <Sparkles className="w-4 h-4 text-[#3ea6ff]" />
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Digite o código temporário de 4 dígitos gerado no painel do computador para assinar.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Ex: 1234"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-[#18181b] border-[#27272a] text-center text-2xl font-mono tracking-[0.5em] text-white focus-visible:ring-[#3ea6ff] h-14 rounded-xl placeholder:text-zinc-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || code.length !== 4}
                className="w-full bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold h-12 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#3ea6ff]/15"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Acessar Painel de Assinatura</span>
                )}
              </Button>
            </form>
          </div>
        ) : (
          // 3. Tela de Assinatura
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#3ea6ff] bg-[#3ea6ff]/10 px-2 py-0.5 rounded-full border border-[#3ea6ff]/20 uppercase">
                {sigType === 'resp' ? 'Responsável Legal' : 'Funcionário da Matrícula'}
              </span>
              <h2 className="text-lg font-bold text-white leading-tight pt-1">
                {aluno.nome}
              </h2>
              <p className="text-xs text-zinc-400">
                Utilize seu dedo ou caneta stylus no espaço abaixo para assinar.
              </p>
            </div>

            <div className="space-y-4">
              <SignaturePad
                label={sigType === 'resp' ? 'Assinatura do Responsável' : 'Assinatura do Funcionário'}
                value={null}
                onChange={setTempSignature}
                isEditMode={true}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAluno(null)
                    setSigType(null)
                    setTempSignature(null)
                    setCode('')
                  }}
                  className="flex-1 text-zinc-400 hover:text-white border border-[#27272a] rounded-xl h-11 text-xs"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={loading || !tempSignature}
                  className="flex-1 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold rounded-xl h-11 text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#3ea6ff]/10"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Enviar Assinatura</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selo de Segurança */}
      <div className="mt-6 flex items-center gap-1.5 text-[10px] text-zinc-500">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Conexão criptografada oficial da Secretaria de Educação</span>
      </div>
    </div>
  )
}
