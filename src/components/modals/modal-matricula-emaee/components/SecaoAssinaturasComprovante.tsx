'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { FileText, ShieldCheck, Smartphone, QrCode, X, Key, Copy, Check, UserPlus, CalendarDays, Clock, Trash2, Pencil, User } from 'lucide-react'
import { toast } from 'sonner'
import { VinculoAEEConfig } from './ModalVincularProfissionalAlunoAEE'

const DIAS_SEMANA_MAP: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
}

export function SecaoAssinaturasComprovante() {
  const {
    alunoSelecionado,
    nomeCompleto,
    escolaAtendimentoId,
    unidadesEmaee,
    turnoAtendimento,
    dataMatricula,
    
    // Especialistas e Vínculos AEE
    vinculosAEE,
    adicionarVinculoAEE,
    editarVinculoAEE,
    abrirModalNovoVinculo,
    abrirModalNovaFila,
    removerVinculoAEE,
    modalVincularAEEOpen,
    setModalVincularAEEOpen,

    // Assinaturas integradas e Coleta Local
    assinaturaResponsavelUrl, setAssinaturaResponsavelUrl,
    assinaturaServidorUrl, setAssinaturaServidorUrl,
    codigoColetaLocal,
    gerarCodigoColetaLocal,
    celularSigningField,
    celularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    funcionario,
    
    // Responsável
    tipoResponsavel,
    nomeMae,
    nomePai,
    responsavelOutroNome
  } = useMatriculaEmaeeContext()

  const [copied, setCopied] = React.useState(false)

  const nomeUnidadeSelecionada = unidadesEmaee.find(u => u.id === escolaAtendimentoId)?.nome || 'EMAEE — Unidade Sede'
  const nomeAlunoExibicao = nomeCompleto || alunoSelecionado?.nome || 'Aguardando seleção do aluno'
  const vinculosVisiveis = vinculosAEE.filter((v: VinculoAEEConfig) => !v.isRemovido)
  const atendimentosAtivos = vinculosVisiveis.filter((v: VinculoAEEConfig) => v.status === 'EM_ATENDIMENTO' || (!v.status && v.profissionalId))
  const demandasFila = vinculosVisiveis.filter((v: VinculoAEEConfig) => v.status === 'FILA_ESPERA' || (!v.profissionalId && !v.status))

  const nomeResponsavelExibicao = tipoResponsavel === 'MAE'
    ? (nomeMae ? `Mãe: ${nomeMae}` : 'Mãe')
    : tipoResponsavel === 'PAI'
      ? (nomePai ? `Pai: ${nomePai}` : 'Pai')
      : (responsavelOutroNome ? `Responsável: ${responsavelOutroNome}` : 'Outro Responsável')

  const handleCopyCode = () => {
    if (codigoColetaLocal) {
      navigator.clipboard.writeText(codigoColetaLocal)
      setCopied(true)
      toast.success('Código copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          04
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Responsáveis, Assinaturas e Atendimento AEE</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vinculação de especialistas AEE, gestão de demandas em fila de espera e assinaturas integradas.
          </p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-6">
        {/* ========================================================================= */}
        {/* 1. MÓDULO DE DESTAQUE: ESPECIALIDADES, ATENDIMENTOS E FILAS               */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl bg-card dark:bg-[#141416] border border-border space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-primary" />
                Atendimento Especializado & Demandas AEE
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Vincule profissionais para atendimentos imediatos ou registre especialidades que aguardam vaga na fila.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                onClick={abrirModalNovoVinculo}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 gap-1.5 shrink-0 cursor-pointer border-none shadow-sm rounded-xl"
              >
                <UserPlus className="w-4 h-4" />
                Vincular Especialista
              </Button>

              <Button
                type="button"
                onClick={abrirModalNovaFila}
                variant="outline"
                className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 font-bold text-xs h-8 px-3 gap-1.5 shrink-0 cursor-pointer shadow-sm rounded-xl"
              >
                <Clock className="w-3.5 h-3.5" />
                Adicionar à Fila
              </Button>
            </div>
          </div>

          {/* Sub-bloco A: Atendimentos em Andamento com Profissional */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Especialistas Vinculados (Em Atendimento)
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {atendimentosAtivos.length} {atendimentosAtivos.length === 1 ? 'especialista ativo' : 'especialistas ativos'}
              </span>
            </div>

            {atendimentosAtivos.length === 0 ? (
              <div className="p-4 rounded-xl bg-muted/20 dark:bg-[#181818]/40 border border-dashed border-border text-center text-xs text-muted-foreground">
                Nenhum especialista vinculado com vaga imediata.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {atendimentosAtivos.map((v: VinculoAEEConfig) => (
                  <div
                    key={v.tempId || v.id}
                    className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/10 hover:bg-emerald-500/[0.06] flex items-start justify-between gap-3 relative group transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                        {v.profissionalFoto ? (
                          <img
                            src={v.profissionalFoto}
                            alt={v.profissionalNome || 'Profissional'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">{v.profissionalNome}</p>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium truncate">
                          {v.especialidade || v.profissionalCargo}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          {v.frequencia && (
                            <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-bold">
                              {v.frequencia}
                            </span>
                          )}
                          {v.dataInicio && (
                            <span className="bg-muted dark:bg-[#1f1f23] text-foreground border border-border px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-muted-foreground" />
                              Início: {v.dataInicio.includes('-') ? v.dataInicio.split('-').reverse().join('/') : v.dataInicio}
                            </span>
                          )}
                          {v.diaSemana && (
                            <span className="bg-muted dark:bg-[#1f1f23] text-foreground border border-border px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-muted-foreground" />
                              {DIAS_SEMANA_MAP[v.diaSemana] || 'Dia não def.'}
                            </span>
                          )}
                          {v.horarioInicio && v.horarioFim && (
                            <span className="bg-muted dark:bg-[#1f1f23] text-foreground border border-border px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {v.horarioInicio} - {v.horarioFim}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => editarVinculoAEE(v)}
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer rounded-lg transition-colors"
                        title="Editar horário, dia ou frequência"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerVinculoAEE(v.id || v.tempId)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0 rounded-lg transition-colors"
                        title="Remover atendimento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-bloco B: Especialidades Solicitadas (Aguardando Vaga / Fila de Espera) */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Especialidades na Fila de Espera (Aguardando Vaga)
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {demandasFila.length} {demandasFila.length === 1 ? 'demanda em fila' : 'demandas em fila'}
              </span>
            </div>

            {demandasFila.length === 0 ? (
              <div className="p-4 rounded-xl bg-muted/20 dark:bg-[#181818]/40 border border-dashed border-border text-center text-xs text-muted-foreground">
                Nenhuma especialidade aguardando na fila de espera para este aluno.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {demandasFila.map((v: VinculoAEEConfig) => (
                  <div
                    key={v.tempId || v.id}
                    className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-950/10 hover:bg-amber-500/[0.06] flex items-start justify-between gap-3 relative group transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">{v.especialidade}</p>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Fila de Espera
                          </span>
                          {v.prioridade && v.prioridade !== 'NORMAL' && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                              v.prioridade === 'JUDICIAL'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            }`}>
                              {v.prioridade}
                            </span>
                          )}
                        </div>
                        {v.motivoFila && (
                          <p className="text-[11px] text-muted-foreground italic truncate">
                            "{v.motivoFila}"
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5">
                          <CalendarDays className="w-3 h-3 text-muted-foreground" />
                          Solicitado em: {v.dataSolicitacao ? (v.dataSolicitacao.includes('-') ? v.dataSolicitacao.split('-').reverse().join('/') : v.dataSolicitacao) : 'Hoje'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => editarVinculoAEE(v)}
                        className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer rounded-lg transition-colors"
                        title="Editar prioridade ou motivo da fila"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerVinculoAEE(v.id || v.tempId)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0 rounded-lg transition-colors"
                        title="Remover especialidade da fila"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground italic">
            * Alunos com pelo menos 1 especialista ativo constarão em atendimento regular, enquanto especialidades em fila alimentarão as listas de espera e relatórios de demanda por área.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PAINEL DE ASSINATURAS DIGITAIS INTEGRADAS                              */}
        {/* ========================================================================= */}
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

          {/* Assinatura do Pai/Mãe/Responsável (Integrada ao Celular / Perfil / Coleta Local) */}
          <div className="space-y-3">
            {/* Barra superior de opções de assinatura do responsável */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">Assinatura do Responsável</span>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={gerarCodigoColetaLocal}
                className="text-[11px] h-7 px-2.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 font-bold gap-1"
                title="Gera código para o responsável assinar na página de Coleta Local ou Totem"
              >
                <Key className="w-3.5 h-3.5" />
                {codigoColetaLocal ? 'Renovar Código Coleta Local' : 'Gerar Código Coleta Local'}
              </Button>
            </div>

            {/* Painel de Código Coleta Local Ativo */}
            {codigoColetaLocal && (
              <div className="p-3 border border-primary/50 rounded-xl bg-primary/10 text-center space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Key className="w-4 h-4" /> Código de Coleta Local Gerado
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                <div className="inline-block px-5 py-2 bg-card dark:bg-[#0b0e14] border border-primary/40 rounded-xl text-2xl font-black text-primary tracking-widest font-mono">
                  {codigoColetaLocal}
                </div>

                <p className="text-[10.5px] text-muted-foreground leading-tight">
                  O responsável pode assinar no tablet ou totem em <strong className="text-foreground">/coleta-local</strong> informando o código acima.
                </p>
              </div>
            )}

            <SignaturePad
              label={`Assinar na Tela (${nomeResponsavelExibicao})`}
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

                <div className="inline-block px-4 py-1.5 bg-card dark:bg-[#0b0e14] border border-primary/40 rounded-lg text-lg font-black text-primary tracking-widest font-mono">
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
            <h3>Comprovante de matrícula AEE {new Date().getFullYear()}</h3>
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
                  className="max-h-12 object-contain mix-blend-multiply dark:mix-blend-normal"
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
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Dados pessoais e clínicos: aplicar permissões RLS e tratamento compatível com a LGPD.</span>
        </div>
      </div>
    </section>
  )
}
