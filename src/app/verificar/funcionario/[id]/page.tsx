import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, User, Mail, Briefcase, Building2, Check, Clock } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const metadata: Metadata = {
  title: 'Verificação de Funcionário – SIG Sapeaçu',
  description: 'Portal oficial de validação cadastral de funcionários municipais.',
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function maskCpf(cpf?: string | null): string {
  if (!cpf) return '—'
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return '***.***.***-**'
  return `***.${clean.substring(3, 6)}.***-**`
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function VerificarFuncionarioPage({ params }: PageProps) {
  const { id } = await params

  // Buscar dados do funcionário
  const { data: rawFunc, error } = await (supabaseAdmin
    .from('funcionarios' as any) as any)
    .select(`
      id,
      nome,
      email,
      cpf,
      cargo,
      status,
      foto_url,
      vinculos_funcionarios (
        ativo,
        escolas (
          nome
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  const funcionario = rawFunc as any
  const valid = !!funcionario && !error && funcionario.status === 'ativo'

  // Encontrar o vínculo ativo
  const vinculoAtivo = funcionario?.vinculos_funcionarios?.find((v: any) => v.ativo)
  const escolaNome = vinculoAtivo?.escolas?.nome ?? 'Não vinculada'

  const initials = funcionario ? getInitials(funcionario.nome) : '?'

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4 font-sans selection:bg-[#3ea6ff]/30 selection:text-white relative overflow-hidden">
      {/* Overlay Escuro e Backdrop Blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 pointer-events-none" />

      {/* Modal Centralizado */}
      <div className="w-full max-w-xl bg-[#121214]/90 backdrop-blur-md border border-[#26262a] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden z-20 my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${valid ? 'via-emerald-500/40' : 'via-rose-500/40'} to-transparent`} />

        {valid ? (
          // ─── TELA DE SUCESSO: FUNCIONÁRIO ATIVO E VÁLIDO ───
          <div className="space-y-6">
            {/* Status Header */}
            <div className="text-center space-y-3 pb-4 border-b border-[#26262a]">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Ficha Funcional Autêntica
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Este funcionário possui cadastro ativo e regular no quadro de servidores municipais.
              </p>
            </div>

            {/* Perfil e Identificação Básica */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#18181b]/60 border border-[#27272a] p-5 rounded-xl">
              <div className="w-16 h-20 bg-zinc-800 border border-[#3e3e42] rounded-lg overflow-hidden flex items-center justify-center text-xl font-bold text-zinc-300 flex-shrink-0">
                {funcionario.foto_url ? (
                  <img
                    src={`${funcionario.foto_url.split('?')[0]}?t=${Date.now()}`}
                    alt={funcionario.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              
              <div className="text-center sm:text-left space-y-1">
                <h3 className="font-bold text-lg text-white uppercase leading-snug">{funcionario.nome}</h3>
                <p className="text-sm text-[#3ea6ff] font-medium flex items-center justify-center sm:justify-start gap-1">
                  <Briefcase className="w-4 h-4" />
                  {funcionario.cargo ?? 'Cargo não informado'}
                </p>
              </div>
            </div>

            {/* Detalhes da Ficha */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#3ea6ff]" />
                Dados Administrativos
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#18181b]/40 border border-[#27272a]/60 p-4 rounded-xl text-sm leading-relaxed">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Unidade de Lotação</span>
                  <span className="font-medium text-zinc-300">{escolaNome}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Status no SIG</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Ativo / Regularizado
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">CPF (Protegido)</span>
                  <span className="font-mono text-zinc-300">{maskCpf(funcionario.cpf)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Identificador Único</span>
                  <span className="font-mono text-zinc-400 text-xs truncate block" title={funcionario.id}>{funcionario.id}</span>
                </div>
              </div>
            </div>

            {/* Trilha de Integridade */}
            <div className="bg-emerald-950/10 border border-emerald-900/20 p-4 rounded-xl flex items-start gap-3 text-xs text-emerald-400/90 leading-relaxed">
              <Clock className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>
                Esta consulta valida a situação cadastral em tempo real diretamente na base de dados da Secretaria Municipal de Educação de Sapeaçu.
              </span>
            </div>
          </div>
        ) : (
          // ─── TELA DE ERRO: FUNCIONÁRIO INVÁLIDO/NÃO ENCONTRADO ───
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-12 h-12 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Servidor Não Localizado ou Inativo
              </h1>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                O código identificador <strong className="text-zinc-200">{id}</strong> não corresponde a nenhum funcionário ativo no painel de recursos humanos da Secretaria de Educação.
              </p>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl text-left text-xs text-zinc-400 space-y-2 max-w-md mx-auto leading-relaxed">
              <span className="font-bold text-white uppercase text-[10px] block">
                Motivos possíveis:
              </span>
              <p>
                1. O funcionário foi desligado ou transferido da rede municipal.
              </p>
              <p>
                2. O código de barras/QR Code impresso está desatualizado ou inválido.
              </p>
              <p>
                3. O vínculo ativo ainda não foi homologado ou associado a uma unidade escolar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé institucional */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] text-zinc-500 z-20">
        <span>SIG Sapeaçu – Recursos Humanos</span>
      </div>
    </div>
  )
}
