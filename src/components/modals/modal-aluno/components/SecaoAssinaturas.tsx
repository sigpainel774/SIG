'use client'

import React, { useEffect } from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { useAuthStore } from '@/store/useAuthStore'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { Smartphone } from 'lucide-react'
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

  // Lazy-load: só converte a assinatura do funcionário quando o usuário rola até a seção 13
  useEffect(() => {
    let active = true
    const dm = alunoEditar?.dados_matricula
    const temAssinaturaSalva = dm?.assinatura_funcionario_url
    if (temAssinaturaSalva || !funcionario?.assinatura_url) return

    const sectionEl = signatureSectionRef?.current
    if (!sectionEl) return

    let loaded = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          loaded = true
          observer.disconnect()
          urlToBase64(funcionario.assinatura_url!)
            .then(b64 => {
              if (active) setNewSignatureFuncionario(b64)
            })
            .catch(err => console.error('Erro ao converter assinatura do funcionário para base64:', err))
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sectionEl)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [alunoEditar?.id, funcionario?.assinatura_url, signatureSectionRef])

  return (
    <div className="space-y-4">
      {/* 12. Autorização de Imagem e Voz */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          12. Autorização de Imagem e Voz (Para Comprovante)
        </div>
        <div className="w-64">
          <Label className="text-xs text-muted-foreground font-medium">Autoriza o uso de imagem e voz do aluno?</Label>
          <Select value={autorizaImagemVoz} onValueChange={(val) => setAutorizaImagemVoz(val || 'Não')}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim, autorizo</SelectItem>
              <SelectItem value="Não">Não, não autorizo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 13. Assinaturas Digitais */}
      <div ref={signatureSectionRef as any} className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          13. Captura de Assinaturas Digitais
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F8FAFC] p-4 rounded-xl border border-[#D1D5DB]">
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
                className="w-full text-xs text-[#0067C0] border border-[#0067C0]/20 hover:bg-[#0067C0]/10 h-9 rounded-xl flex items-center justify-center gap-1.5 font-medium"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Colher Assinatura pelo Celular
              </Button>
            )}
          </div>

          {/* Assinatura do Funcionário */}
          <div className="space-y-3">
            <SignaturePad
              label="Assinatura do Funcionário Responsável"
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
                className="w-full text-xs text-[#0067C0] border border-[#0067C0]/20 hover:bg-[#0067C0]/10 h-9 rounded-xl flex items-center justify-center gap-1.5 font-medium"
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

