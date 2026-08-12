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
    <div className="space-y-6">
      {/* 12. Autorização de Imagem e Voz */}
      <div>
        <div className="text-primary font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-border">
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
      <div ref={signatureSectionRef as any}>
        <div className="text-primary font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-border">
          13. Captura de Assinaturas Digitais
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-4 rounded-xl border border-border shadow-xs">
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
                className="w-full text-xs text-primary border border-primary/20 hover:bg-primary/10 h-9 rounded-xl flex items-center justify-center gap-1.5 font-medium"
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
                className="w-full text-xs text-primary border border-primary/20 hover:bg-primary/10 h-9 rounded-xl flex items-center justify-center gap-1.5 font-medium"
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

