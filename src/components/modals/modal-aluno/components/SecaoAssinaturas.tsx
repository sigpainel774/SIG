'use client'

import React, { useEffect } from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { useAuthStore } from '@/store/useAuthStore'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { Smartphone, UserPlus, Clock, CalendarDays, Trash2, ShieldCheck, User, Camera } from 'lucide-react'
import { urlToBase64 } from '@/lib/utils'
import { ModalVincularProfissionalAlunoAEE, VinculoAEEConfig } from './ModalVincularProfissionalAlunoAEE'

const DIAS_SEMANA_MAP: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
}

export function SecaoAssinaturas() {
  const {
    vinculosAEE,
    adicionarVinculoAEE,
    removerVinculoAEE,
    modalVincularAEEOpen,
    setModalVincularAEEOpen,
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

  const vinculosVisiveis = vinculosAEE.filter((v: VinculoAEEConfig) => !v.isRemovido)

  return (
    <div className="space-y-6 py-2">
      {/* 1. MÓDULO DE DESTAQUE: VINCULAÇÃO DE PROFISSIONAIS AEE */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderCustom">
          <div className="flex items-center gap-2 text-highlight font-bold text-xs uppercase tracking-wider">
            <UserPlus className="w-4 h-4 text-highlight" />
            Atendimento Especializado (Profissionais AEE)
          </div>

          <Button
            type="button"
            onClick={() => setModalVincularAEEOpen(true)}
            className="bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold text-xs h-8 px-3 gap-1.5 shrink-0 cursor-pointer border-none shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Vincular Profissional AEE
          </Button>
        </div>

        {/* Lista de Atendimentos / Profissionais Vinculados */}
        {vinculosVisiveis.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#181818] border border-borderCustom text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#1f1f23] border border-borderCustom flex items-center justify-center mx-auto text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">Nenhum profissional AEE vinculado a este aluno.</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Clique em <strong>"Vincular Profissional AEE"</strong> para definir os especialistas responsáveis, horários e periodicidade do atendimento (Semanal ou Quinzenal).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vinculosVisiveis.map((v: VinculoAEEConfig) => (
              <div
                key={v.tempId || v.id}
                className="p-3.5 rounded-xl border border-borderCustom bg-[#141416] flex items-start justify-between gap-3 relative group hover:border-highlight/40 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1f1f23] border border-borderCustom overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                    {v.profissionalFoto ? (
                      <img src={v.profissionalFoto} alt={v.profissionalNome} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-bold text-foreground truncate">{v.profissionalNome}</p>
                    <p className="text-[11px] text-zinc-400 font-medium truncate">{v.profissionalCargo}</p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span className="bg-highlight/10 text-highlight border border-highlight/20 px-2 py-0.5 rounded-md font-bold">
                        {v.frequencia}
                      </span>
                      <span className="bg-[#1f1f23] text-zinc-300 border border-borderCustom px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-zinc-400" />
                        {DIAS_SEMANA_MAP[v.diaSemana] || 'Dia não def.'}
                      </span>
                      <span className="bg-[#1f1f23] text-zinc-300 border border-borderCustom px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        {v.horarioInicio} - {v.horarioFim}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removerVinculoAEE(v.id || v.tempId)}
                  className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer shrink-0 rounded-lg"
                  title="Remover atendimento deste profissional"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-[11px] text-zinc-500 italic">
          * Os atendimentos e agendamentos configurados acima serão consolidados e salvos na agenda oficial do EMAEE ao clicar em <strong>"Salvar Ficha do Aluno"</strong>.
        </div>
      </div>

      {/* 2. AUTORIZAÇÃO DE IMAGEM E VOZ */}
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

      {/* 3. CAPTURA DE ASSINATURAS DIGITAIS */}
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

      {/* SUB-MODAL DE SELEÇÃO E ESCALA DO PROFISSIONAL AEE */}
      {modalVincularAEEOpen && (
        <ModalVincularProfissionalAlunoAEE
          open={modalVincularAEEOpen}
          onOpenChange={setModalVincularAEEOpen}
          vinculosExistentes={vinculosAEE}
          onAdicionarVinculo={adicionarVinculoAEE}
        />
      )}
    </div>
  )
}
