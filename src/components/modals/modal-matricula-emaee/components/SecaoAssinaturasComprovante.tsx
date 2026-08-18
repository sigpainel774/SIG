'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { FileText, ShieldCheck, Smartphone, QrCode, X } from 'lucide-react'

export function SecaoAssinaturasComprovante() {
  const {
    alunoSelecionado,
    nomeCompleto,
    escolaAtendimentoId,
    unidadesEmaee,
    turnoAtendimento,
    dataMatricula,
    
    // Assinaturas integradas
    assinaturaResponsavelUrl, setAssinaturaResponsavelUrl,
    assinaturaServidorUrl, setAssinaturaServidorUrl,
    celularSigningField,
    celularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    funcionario
  } = useMatriculaEmaeeContext()

  const nomeUnidadeSelecionada = unidadesEmaee.find(u => u.id === escolaAtendimentoId)?.nome || 'EMAEE — Unidade Sede'
  const nomeAlunoExibicao = nomeCompleto || alunoSelecionado?.nome || 'Aguardando seleção do aluno'

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          05
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Responsáveis e comprovante</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Assinaturas integradas do servidor, responsável legal e comprovante destacável para entrega.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-6">
        {/* Painel de Assinaturas Digitais Integradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/50 dark:bg-[#0b0e14]/50 p-4 rounded-xl border border-border">
          {/* Assinatura do Servidor / Responsável pela Matrícula (Puxada do Perfil) */}
          <div className="space-y-3">
            <SignaturePad
              label="Responsável pela Matrícula (Servidor EMAEE)"
              value={assinaturaServidorUrl}
              onChange={setAssinaturaServidorUrl}
              isEditMode={true}
              globalSignatureUrl={funcionario?.assinatura_url}
            />
            {funcionario?.nome && (
              <p className="text-[11px] text-muted-foreground text-center">
                Servidor: <strong className="text-foreground">{funcionario.nome}</strong> ({funcionario.cargo ?? 'Servidor'})
              </p>
            )}
          </div>

          {/* Assinatura do Pai/Mãe/Responsável (Integrada ao Celular / Perfil) */}
          <div className="space-y-3">
            <SignaturePad
              label="Responsável pelo Aluno (Pai / Mãe / Tutor)"
              value={assinaturaResponsavelUrl}
              onChange={setAssinaturaResponsavelUrl}
              isEditMode={true}
            />

            {/* Painel de Coleta de Assinatura via Celular / QR Code */}
            {alunoSelecionado?.id && !celularSigningCode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => iniciarAssinaturaCelular('resp')}
                className="w-full text-xs text-primary border border-primary/30 hover:bg-primary/10 h-9 rounded-xl flex items-center justify-center gap-2 font-bold"
              >
                <Smartphone className="w-4 h-4" />
                Coletar Assinatura do Responsável no Celular (QR Code)
              </Button>
            )}

            {/* Card Ativo do Código QR Code de Celular */}
            {celularSigningCode && celularSigningField === 'resp' && (
              <div className="p-3.5 border border-primary/50 rounded-xl bg-primary/10 text-center space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> Assinatura por Celular Ativa
                  </span>
                  <button
                    type="button"
                    onClick={cancelarAssinaturaCelular}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Aponte a câmera do celular para o QR Code ou acesse a página de assinatura informando o código:
                </p>

                <div className="inline-block px-4 py-1.5 bg-card dark:bg-[#0b0e14] border border-primary/40 rounded-lg text-lg font-black text-primary tracking-widest">
                  {celularSigningCode}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Comprovante de Matrícula Destacável */}
        <div className="p-4 md:p-5 border border-dashed border-primary/40 rounded-xl bg-primary/[0.045] space-y-4">
          <div className="flex items-center justify-center gap-2 text-center text-sm font-bold text-primary">
            <FileText className="w-4 h-4" />
            <h3>Comprovante de matrícula AEE 2026</h3>
          </div>

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12">
              <Label className="block mb-1 text-xs font-bold text-foreground">Unidade escolar de atendimento</Label>
              <Input
                readOnly
                value={nomeUnidadeSelecionada}
                className="bg-input border-border text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Nome completo do aluno</Label>
              <Input
                readOnly
                value={nomeAlunoExibicao}
                className="bg-input border-border text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-foreground">Turno</Label>
              <Input
                readOnly
                value={turnoAtendimento}
                className="bg-input border-border text-foreground text-xs rounded-xl text-center"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-foreground">Data</Label>
              <Input
                readOnly
                value={dataMatricula}
                className="bg-input border-border text-foreground text-xs rounded-xl text-center"
              />
            </div>

            {/* Visualização da Assinatura no Comprovante */}
            <div className="col-span-12 p-3 border border-dashed border-border rounded-xl bg-muted/50 dark:bg-[#0b0e14]/40 mt-2 flex flex-col items-center justify-center">
              <strong className="block text-xs font-bold text-foreground mb-1">Responsável pela matrícula</strong>
              {assinaturaServidorUrl ? (
                <img
                  src={assinaturaServidorUrl}
                  alt="Assinatura do Responsável pela Matrícula"
                  className="max-h-12 object-contain"
                />
              ) : (
                <div className="h-10 w-full border-b border-border flex items-end justify-center pb-1 text-xs text-muted-foreground">
                  Assinatura de validação do servidor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nota LGPD */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border border-border rounded-xl bg-muted/60 dark:bg-[#121621]/60">
          <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
          <span>Dados pessoais e clínicos: aplicar permissões RLS e tratamento compatível com a LGPD.</span>
        </div>
      </div>
    </section>
  )
}
