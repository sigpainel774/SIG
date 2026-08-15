'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import {
  CircleHelp,
  KeyRound,
  UserPlus,
  MessageSquareText,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'

interface FaqItem {
  pergunta: string
  resposta: string
}

const faqs: FaqItem[] = [
  {
    pergunta: 'O acesso ao Portal dos Pais ou a emissão de declarações é gratuito?',
    resposta:
      'Sim! O Portal dos Pais e todos os documentos emitidos pela rede municipal de ensino de Sapeaçu são 100% gratuitos para os responsáveis cadastrados.',
  },
  {
    pergunta: 'Meus filhos estudam em escolas municipais diferentes. Preciso de contas separadas?',
    resposta:
      'Não. Todos os seus filhos ou dependentes matriculados em qualquer unidade da rede municipal de Sapeaçu ficam centralizados em seu único cadastro vinculado ao seu CPF e e-mail.',
  },
  {
    pergunta: 'Como sei quando a Declaração do Bolsa Família está pronta para ser retirada?',
    resposta:
      'Ao fazer o pedido pela aba "Solicitações", o status mudará para "Pronto para Retirada" com uma mensagem de confirmação da secretaria da escola.',
  },
  {
    pergunta: 'O que fazer se os dados ou turma do meu filho estiverem desatualizados?',
    resposta:
      'Você pode enviar uma mensagem direta para a secretaria da escola através da aba "Mensagens" informando a divergência, ou comparecer à secretaria escolar.',
  },
  {
    pergunta: 'Com que frequência as notas e faltas são atualizadas?',
    resposta:
      'Os registros de presença e notas são lançados pelos professores da turma ao longo do período letivo e no fechamento de cada trimestre pedagógico.',
  },
]

export default function AjudaPaisPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [responsavel, setResponsavel] = useState<{ id: string; nome: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const authUser = authData?.user

        if (!authUser) {
          router.push('/portal-aluno/login')
          return
        }

        const { data: respData } = await supabase
          .from('responsaveis')
          .select('id, nome, email')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        if (isMounted.current) {
          setResponsavel(respData)
          setLoading(false)
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar perfil na ajuda:', err)
        if (isMounted.current) setLoading(false)
      }
    }

    carregarPerfil()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/portal-aluno/login')
  }

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle="Central de Ajuda e Suporte"
    >
      <div className="space-y-8 max-w-5xl mx-auto">
        
        {/* Cabeçalho */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F47C12] mb-1">
            <CircleHelp className="w-4 h-4" />
            Suporte &amp; Orientações
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Como podemos te ajudar?
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Tire suas dúvidas sobre como usar o Portal dos Pais, solicitar novas credenciais, adicionar dependentes e enviar mensagens para a escola.
          </p>
        </div>

        {/* Grade de Guias Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Guia 1: Solicitar Nova Senha */}
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-6 shadow-xs space-y-4 hover:border-[#BDD5ED] transition-all">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: AZUL }}
              >
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#102D50]">
                  Como solicitar ou redefinir sua senha
                </h2>
                <span className="text-xs text-slate-400 font-medium">Acesso e segurança da conta</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Caso tenha esquecido sua senha ou precise de um novo código de acesso, solicite a redefinição diretamente na <strong>secretaria da escola do seu filho</strong> portando seu documento oficial com foto (RG/CNH).
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-[#0B4FB3]" />
                Procedimento de Segurança:
              </div>
              <p>
                Por proteção aos dados do estudante (LGPD), as senhas dos responsáveis são redefinidas com validação presencial ou confirmação cadastral na secretaria.
              </p>
            </div>
          </div>

          {/* Guia 2: Adicionar Outro Filho */}
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-6 shadow-xs space-y-4 hover:border-[#BDD5ED] transition-all">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: LARANJA }}
              >
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#102D50]">
                  Como adicionar outro filho ou dependente
                </h2>
                <span className="text-xs text-slate-400 font-medium">Vínculo familiar unificado</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Se você possui mais de um filho matriculado na rede municipal e ele ainda não aparece no portal, solicite a vinculação na <strong>secretaria da escola em que ele estuda</strong> informando seu CPF cadastrado.
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-[#F47C12]" />
                Acesso Unificado:
              </div>
              <p>
                Assim que a secretaria cadastrar seu CPF no registro do aluno, ele aparecerá automaticamente na tela inicial do seu portal.
              </p>
            </div>
          </div>

          {/* Guia 3: Enviar Mensagens à Escola */}
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-6 shadow-xs space-y-4 hover:border-[#BDD5ED] transition-all">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: '#0284C7' }}
              >
                <MessageSquareText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#102D50]">
                  Como enviar mensagens à escola
                </h2>
                <span className="text-xs text-slate-400 font-medium">Canal direto com a secretaria</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Você pode enviar recados, justificar ausências ou tirar dúvidas diretamente com a equipe escolar pela aba <strong>Mensagens</strong> no menu lateral.
            </p>

            <Link href="/portal-aluno/mensagens">
              <Button
                variant="outline"
                className="w-full font-bold text-xs h-10 rounded-xl border-sky-300 text-sky-700 hover:bg-sky-50 mt-1 cursor-pointer"
              >
                Ir para a Central de Mensagens
              </Button>
            </Link>
          </div>

          {/* Guia 4: Solicitação de Declarações */}
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-6 shadow-xs space-y-4 hover:border-[#BDD5ED] transition-all">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: '#059669' }}
              >
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#102D50]">
                  Como pedir Declaração Bolsa Família
                </h2>
                <span className="text-xs text-slate-400 font-medium">Documentos escolares online</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Solicite a declaração de frequência e matrícula escolar para o CRAS sem sair de casa pela aba <strong>Solicitações</strong> e acompanhe quando estiver pronta.
            </p>

            <Link href="/portal-aluno/solicitacoes">
              <Button
                variant="outline"
                className="w-full font-bold text-xs h-10 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 mt-1 cursor-pointer"
              >
                Fazer Solicitação de Documento
              </Button>
            </Link>
          </div>

        </div>

        {/* Perguntas Frequentes (FAQ) */}
        <div className="bg-white rounded-2xl border border-[#DCE7F2] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B4FB3] flex items-center justify-center">
              <CircleHelp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#102D50]">Perguntas Frequentes (FAQ)</h2>
              <p className="text-xs text-slate-500">Respostas para as dúvidas mais comuns dos pais e responsáveis</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-bold text-sm text-[#102D50] hover:text-[#0B4FB3] transition-colors py-1 cursor-pointer"
                  >
                    <span>{faq.pergunta}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#0B4FB3] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pl-1 pt-1 animate-in fade-in-50 duration-200">
                      {faq.resposta}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contato Institucional da Secretaria de Educação */}
        <div
          className="rounded-2xl p-6 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(11,79,179,0.98), rgba(8,57,132,0.96))`,
            boxShadow: '0 12px 24px rgba(11,79,179,0.18)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-300">
                <Building2 className="w-4 h-4" />
                Atendimento Oficial
              </div>
              <h2 className="text-xl font-black text-white">
                Secretaria Municipal de Educação de Sapeaçu
              </h2>
              <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
                Precisa de atendimento presencial ou suporte especial? Entre em contato com a equipe pedagógica do município.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-xs space-y-2 border border-white/15 shrink-0">
              <div className="flex items-center gap-2 text-blue-100">
                <MapPin className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                <span>Praça da Matriz, Centro — Sapeaçu/BA</span>
              </div>
              <div className="flex items-center gap-2 text-blue-100">
                <Clock className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                <span>Segunda a Sexta: 08:00 às 14:00</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PortalPaisLayout>
  )
}
