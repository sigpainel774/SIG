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
    <section className="overflow-hidden border border-[#26262a] rounded-2xl bg-gradient-to-b from-[#1a202c]/95 to-[#121621]/95 shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-[#26262a] bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl color-[#3ea6ff] bg-[#3ea6ff]/10 font-extrabold text-sm text-[#3ea6ff]">
          05
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Responsáveis e comprovante</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Assinaturas integradas do servidor, responsável legal e comprovante destacável para entrega.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-6">
        {/* Painel de Assinaturas Digitais Integradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0b0e14]/50 p-4 rounded-xl border border-[#26262a]">
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
                className="w-full text-xs text-[#3ea6ff] border border-[#3ea6ff]/30 hover:bg-[#3ea6ff]/10 h-9 rounded-xl flex items-center justify-center gap-2 font-bold"
              >
                <Smartphone className="w-4 h-4" />
                Coletar Assinatura do Responsável no Celular (QR Code)
              </Button>
            )}

            {/* Card Ativo do Código QR Code de Celular */}
            {celularSigningCode && celularSigningField === 'resp' && (
              <div className="p-3.5 border border-[#3ea6ff]/50 rounded-xl bg-[#3ea6ff]/10 text-center space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3ea6ff] flex items-center gap-1.5">
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

                <div className="inline-block px-4 py-1.5 bg-[#0b0e14] border border-[#3ea6ff]/40 rounded-lg text-lg font-black text-[#3ea6ff] tracking-widest">
                  {celularSigningCode}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Comprovante de Matrícula Destacável */}
        <div className="p-4 md:p-5 border border-dashed border-[#3ea6ff]/40 rounded-xl bg-[#3ea6ff]/[0.045] space-y-4">
          <div className="flex items-center justify-center gap-2 text-center text-sm font-bold text-[#3ea6ff]">
            <FileText className="w-4 h-4" />
            <h3>Comprovante de matrícula AEE 2026</h3>
          </div>

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Unidade escolar de atendimento</Label>
              <Input
                readOnly
                value={nomeUnidadeSelecionada}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nome completo do aluno</Label>
              <Input
                readOnly
                value={nomeAlunoExibicao}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Turno</Label>
              <Input
                readOnly
                value={turnoAtendimento}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl text-center"
              />
            </div>

            <div className="col-span-6 md:col-span-2">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Data</Label>
              <Input
                readOnly
                value={dataMatricula}
                className="bg-[#121621] border-[#26262a] text-foreground text-xs rounded-xl text-center"
              />
            </div>

            {/* Visualização da Assinatura no Comprovante */}
            <div className="col-span-12 p-3 border border-dashed border-white/20 rounded-xl bg-[#0b0e14]/40 mt-2 flex flex-col items-center justify-center">
              <strong className="block text-xs font-bold text-foreground mb-1">Responsável pela matrícula</strong>
              {assinaturaServidorUrl ? (
                <img
                  src={assinaturaServidorUrl}
                  alt="Assinatura do Responsável pela Matrícula"
                  className="max-h-12 object-contain"
                />
              ) : (
                <div className="h-10 w-full border-b border-white/30 flex items-end justify-center pb-1 text-xs text-slate-400">
                  Assinatura de validação do servidor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nota LGPD */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border border-[#26262a] rounded-xl bg-[#121621]/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Dados pessoais e clínicos: aplicar permissões RLS e tratamento compatível com a LGPD.</span>
        </div>
      </div>
    </section>
  )
}
