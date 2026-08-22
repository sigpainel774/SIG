'use client'

import React, { useEffect } from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { useAuthStore } from '@/store/useAuthStore'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { Smartphone, ShieldCheck } from 'lucide-react'
import { urlToBase64 } from '@/lib/utils'

export function SecaoAssinaturas() {
  const {
    autorizaImagemVoz, setAutorizaImagemVoz,
    newSignatureResponsavel, setNewSignatureResponsavel,
    assinaturaResponsavelUrl,
    isEditMode,
    alunoEditar,
    celularSigningCode,
    iniciarAssinaturaCelular,
    newSignatureFuncionario, setNewSignatureFuncionario,
    assinaturaFuncionarioUrl,
    signatureSectionRef
  } = useAlunoForm()

  const { funcionario } = useAuthStore()

  // Converte a assinatura padrão do funcionário logado
  useEffect(() => {
    let active = true
    const dm = alunoEditar?.dados_matricula
    const temAssinaturaSalva = dm?.assinatura_funcionario_url
    if (temAssinaturaSalva || !funcionario?.assinatura_url || newSignatureFuncionario) return

    urlToBase64(funcionario.assinatura_url)
      .then((b64) => {
        if (active) setNewSignatureFuncionario(b64)
      })
      .catch((err) => console.error('Erro ao converter assinatura do funcionário para base64:', err))

    return () => {
      active = false
    }
  }, [alunoEditar?.id, funcionario?.assinatura_url, newSignatureFuncionario])

  return (
    <div className="space-y-6 py-2">
      {/* 1. AUTORIZAÇÃO DE IMAGEM E VOZ */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-highlight" />
          Autorização de Imagem e Voz (Comprovante Oficial)
        </div>

        <div className="w-64 space-y-1">
          <Label className="text-xs text-muted-foreground font-medium">Autoriza o uso de imagem e voz do estudante?</Label>
          <Select value={autorizaImagemVoz} onValueChange={(val) => setAutorizaImagemVoz(val || 'Não')}>
            <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
              <SelectItem value="Sim">Sim, autorizo</SelectItem>
              <SelectItem value="Não">Não, não autorizo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. CAPTURA DE ASSINATURAS DIGITAIS */}
      <div ref={signatureSectionRef as any} className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <Smartphone className="w-4 h-4 text-highlight" />
          Captura de Assinaturas Digitais
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#181818] p-4 rounded-xl border border-borderCustom">
          {/* Assinatura do Responsável */}
          <div className="space-y-3">
            <SignaturePad
              label="Assinatura do Pai/Mãe/Responsável"
              value={newSignatureResponsavel || assinaturaResponsavelUrl}
              onChange={setNewSignatureResponsavel}
              isEditMode={isEditMode}
            />
            {isEditMode && alunoEditar?.id && !celularSigningCode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => iniciarAssinaturaCelular('resp')}
                className="w-full text-xs text-[#3ea6ff] border border-[#3ea6ff]/20 hover:bg-[#3ea6ff]/10 h-8 rounded-xl flex items-center justify-center gap-1.5 font-medium cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Colher Assinatura pelo Celular
              </Button>
            )}
          </div>

          {/* Assinatura do Funcionário */}
          <div className="space-y-3">
            <SignaturePad
              label="Assinatura do Servidor Responsável"
              value={newSignatureFuncionario || assinaturaFuncionarioUrl}
              onChange={setNewSignatureFuncionario}
              isEditMode={isEditMode}
              globalSignatureUrl={funcionario?.assinatura_url}
            />
            {isEditMode && alunoEditar?.id && !celularSigningCode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => iniciarAssinaturaCelular('func')}
                className="w-full text-xs text-[#3ea6ff] border border-[#3ea6ff]/20 hover:bg-[#3ea6ff]/10 h-8 rounded-xl flex items-center justify-center gap-1.5 font-medium cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Colher Assinatura pelo Celular
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
