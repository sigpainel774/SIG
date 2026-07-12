import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ShieldAlert, FileText, Download, Building2, User, Clock, ShieldCheck, HelpCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const metadata: Metadata = {
  title: 'Verificação de Autenticidade – SIG Escolar',
  description: 'Portal oficial de validação de documentos escolares assinados digitalmente.',
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function VerificarPage({ params }: PageProps) {
  const { token } = await params

  // Buscar os dados da assinatura pelo token
  const { data: rawAssinatura, error } = await (supabaseAdmin
    .from('assinatura' as any) as any)
    .select('*, alunos(nome, escolas(nome))')
    .eq('token_verificacao', token)
    .maybeSingle()

  const assinatura = rawAssinatura as any
  const valid = !!assinatura && !error

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4 font-sans selection:bg-[#3ea6ff]/30 selection:text-white relative overflow-hidden">
      {/* 1. Tela de Login simulada no fundo (Borrada e Desativada) */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none select-none blur-md scale-95 opacity-20 z-0">
        <div className="w-full max-w-[420px] p-8 bg-[#161616] border border-[#242424] rounded-[24px] space-y-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 bg-zinc-800 rounded-full" />
            <h1 className="text-2xl font-bold text-white text-center tracking-tight">
              Sapeaçu Painel Escolar
            </h1>
          </div>
          <div className="space-y-4 pt-2">
            <div className="w-full h-13 bg-zinc-800 rounded-xl" />
            <div className="w-full h-13 bg-zinc-800 rounded-xl" />
            <div className="w-full h-13 bg-zinc-700 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 2. Overlay Escuro e Backdrop Blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 pointer-events-none" />

      {/* 3. Modal Centralizado (Card Principal) */}
      <div className="w-full max-w-2xl bg-[#121214]/90 backdrop-blur-md border border-[#26262a] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden z-20 my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${valid ? 'via-emerald-500/40' : 'via-rose-500/40'} to-transparent`} />

        {valid ? (
          // ─── TELA DE SUCESSO: DOCUMENTO VÁLIDO ───
          <div className="space-y-6">
            {/* Status Header */}
            <div className="text-center space-y-3 pb-4 border-b border-[#26262a]">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Documento Autêntico e Válido
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                As assinaturas eletrônicas deste documento foram validadas com sucesso em nossos servidores institucionais.
              </p>
            </div>

            {/* Informações da Matrícula */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#3ea6ff]" />
                Dados do Documento
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#18181b]/60 border border-[#27272a] p-4 rounded-xl text-sm leading-relaxed">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Aluno(a)</span>
                  <span className="font-bold text-white uppercase">{assinatura.alunos?.nome ?? 'Aluno não identificado'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Escola</span>
                  <span className="font-medium text-zinc-300">{assinatura.alunos?.escolas?.nome ?? 'Escola Municipal'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Tipo do Documento</span>
                  <span className="font-medium text-zinc-300">Comprovante de Matrícula Escolar</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Código de Verificação</span>
                  <span className="font-mono font-bold text-[#3ea6ff]">{assinatura.token_verificacao ?? token}</span>
                </div>
              </div>
            </div>

            {/* Trilha de Auditoria e Assinaturas */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#3ea6ff]" />
                Evidências de Assinatura
              </h3>
              
              <div className="space-y-3">
                {/* Assinatura 1: Responsável */}
                <div className="bg-[#18181b]/40 border border-[#27272a]/60 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-[#27272a]/60 pb-1.5">
                    <span className="font-bold text-[#3ea6ff] uppercase tracking-wider text-[10px]">1. Responsável pelo Aluno</span>
                    <span className="text-emerald-400 font-semibold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">Assinatura Coletada</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-zinc-400">
                    <div>Data: <strong className="text-zinc-200">{assinatura.data_responsavel ? new Date(assinatura.data_responsavel).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</strong></div>
                    <div>IP: <strong className="text-zinc-200">{assinatura.ip_responsavel ?? 'Não registrado'}</strong></div>
                    <div className="col-span-2 truncate">Navegador: <strong className="text-zinc-200" title={assinatura.user_agent_responsavel}>{assinatura.user_agent_responsavel ?? '-'}</strong></div>
                    <div>Dispositivo: <strong className="text-zinc-200">{assinatura.dispositivo_responsavel ?? 'Celular'}</strong></div>
                  </div>
                </div>

                {/* Assinatura 2: Funcionário */}
                <div className="bg-[#18181b]/40 border border-[#27272a]/60 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-[#27272a]/60 pb-1.5">
                    <span className="font-bold text-[#3ea6ff] uppercase tracking-wider text-[10px]">2. Servidor Público (SIG)</span>
                    <span className="text-emerald-400 font-semibold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">Assinatura Coletada</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-zinc-400">
                    <div>Data: <strong className="text-zinc-200">{assinatura.data_funcionario ? new Date(assinatura.data_funcionario).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</strong></div>
                    <div>IP: <strong className="text-zinc-200">{assinatura.ip_funcionario ?? '-'}</strong></div>
                    <div className="col-span-2 truncate">Navegador: <strong className="text-zinc-200" title={assinatura.user_agent_funcionario}>{assinatura.user_agent_funcionario ?? '-'}</strong></div>
                    <div>Dispositivo: <strong className="text-zinc-200">{assinatura.dispositivo_funcionario ?? 'Computador'}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Criptografia e Integridade */}
            <div className="bg-emerald-950/10 border border-emerald-900/20 p-4 rounded-xl space-y-2 text-xs font-mono">
              <span className="text-[10px] text-zinc-500 font-bold block">HASH CRIPTOGRÁFICO SHA-256 DO PDF ORIGINAL</span>
              <span className="text-emerald-400 font-bold break-all text-[11px] leading-relaxed block">{assinatura.hash_sha256 ?? 'Sem hash'}</span>
            </div>

            {/* Ações */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              {assinatura.arquivo_pdf_url && (
                <a
                  href={assinatura.arquivo_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] font-bold h-11 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#3ea6ff]/10 text-sm decoration-none"
                >
                  <Download className="w-4 h-4" />
                  <span>Visualizar PDF Assinado</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          // ─── TELA DE ERRO: DOCUMENTO INVÁLIDO/NÃO ENCONTRADO ───
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-12 h-12 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Documento Não Encontrado
              </h1>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                A chave de verificação <strong className="text-zinc-200">{token}</strong> não corresponde a nenhuma matrícula registrada ou homologada eletronicamente neste portal.
              </p>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl text-left text-xs text-zinc-400 space-y-2.5 max-w-md mx-auto leading-normal">
              <span className="font-bold text-white uppercase text-[10px] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-[#3ea6ff]" />
                O que fazer?
              </span>
              <p>
                1. Certifique-se de que digitou a chave alfanumérica corretamente.
              </p>
              <p>
                2. Apenas matrículas que concluíram o fluxo eletrônico de assinaturas possuem comprovantes verificáveis online.
              </p>
              <p>
                3. Se o problema persistir, entre em contato diretamente com a secretaria da escola onde realizou a matrícula.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé institucional */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] text-zinc-500 z-20">
        <FileText className="w-3.5 h-3.5" />
        <span>SIG Escolar – Portal Público de Validação de Assinaturas</span>
      </div>
    </div>
  )
}
