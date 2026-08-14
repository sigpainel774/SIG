'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { 
  GraduationCap, 
  User, 
  School, 
  ArrowRight, 
  LogOut, 
  ShieldAlert, 
  Loader2,
  BookOpen,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'

export default function PortalAlunoDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [responsavel, setResponsavel] = useState<any | null>(null)
  const [filhos, setFilhos] = useState<any[]>([])

  useEffect(() => {
    async function carregarDadosPortal() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/portal-aluno/login')
          return
        }

        // 1. Buscar dados do responsável
        const { data: respData, error: respErr } = await supabase
          .from('responsaveis')
          .select('id, nome, email, cpf, telefone')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (respErr) throw respErr

        if (!respData) {
          toast.error('Cadastro de responsável não localizado.')
          return
        }

        setResponsavel(respData)

        // 2. Buscar vínculos com alunos e os dados das escolas (para checar portal_pais_ativo)
        const { data: vinculosData, error: vincErr } = await supabase
          .from('responsaveis_alunos')
          .select(`
            id,
            parentesco,
            aluno:aluno_id (
              id,
              nome,
              numero_matricula,
              foto_url,
              turma:turma_id (
                id,
                nome,
                turno
              ),
              escola:escola_id (
                id,
                nome,
                portal_pais_ativo
              )
            )
          `)
          .eq('responsavel_id', respData.id)

        if (vincErr) throw vincErr

        const listaFilhos = (vinculosData || []).map((v: any) => ({
          vinculo_id: v.id,
          parentesco: v.parentesco,
          ...v.aluno
        }))

        setFilhos(listaFilhos)
      } catch (err: any) {
        console.error('Erro ao carregar dashboard do portal:', err)
        toast.error('Erro ao carregar dados dos seus dependentes.')
      } finally {
        setLoading(false)
      }
    }

    carregarDadosPortal()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada com sucesso.')
    router.push('/portal-aluno/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-zinc-400">Carregando informações escolares...</p>
        </div>
      </div>
    )
  }

  // Verificar se TODAS as escolas dos filhos estão com o portal desativado
  const todasDesativadas = filhos.length > 0 && filhos.every((f) => !f.escola?.portal_pais_ativo)

  return (
    <div className="min-h-screen bg-[#0f0f11] text-foreground flex flex-col">
      {/* Header Superior */}
      <header className="border-b border-[#27272a] bg-[#141416]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white block">Portal do Aluno</span>
              <span className="text-xs text-zinc-400">Olá, {responsavel?.nome?.split(' ')[0] || 'Responsável'}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-8 flex-1 space-y-6">
        {todasDesativadas ? (
          /* Tela Amigável: Quando a escola desativou o portal (Regra de Preservação) */
          <div className="max-w-lg mx-auto text-center bg-[#141416] border border-[#27272a] rounded-2xl p-8 my-12 space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Portal Temporariamente Indisponível</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                O acompanhamento escolar online ainda não está habilitado para a unidade escolar do seu filho(a) ou está em fase de implantação.
              </p>
            </div>
            <div className="p-4 bg-zinc-900/60 border border-[#27272a] rounded-xl text-xs text-zinc-500 text-left space-y-1.5">
              <p className="font-semibold text-zinc-400">O que você pode fazer:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Suas credenciais continuam válidas e salvas com segurança.</li>
                <li>Para notas, boletins ou declarações, procure a secretaria escolar.</li>
              </ul>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-[#3f3f46]">
              Sair da Conta
            </Button>
          </div>
        ) : filhos.length === 0 ? (
          /* Empty State: Nenhum aluno vinculado */
          <div className="max-w-md mx-auto text-center bg-[#141416] border border-[#27272a] rounded-2xl p-8 my-12 space-y-4">
            <User className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum Dependente Localizado</h3>
            <p className="text-xs text-zinc-400">
              Não encontramos nenhum aluno vinculado ao seu CPF no momento. Solicite a vinculação na secretaria da escola.
            </p>
          </div>
        ) : (
          /* Listagem dos Filhos */
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Seus Filhos & Dependentes</h2>
              <p className="text-xs text-zinc-400">
                Selecione o estudante abaixo para consultar notas, frequência e comunicados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filhos.map((filho) => {
                const portalAtivoNaEscola = filho.escola?.portal_pais_ativo === true

                return (
                  <div
                    key={filho.id}
                    className={`bg-[#141416] border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                      portalAtivoNaEscola 
                        ? 'border-[#27272a] hover:border-indigo-500/40 shadow-lg hover:shadow-indigo-500/5' 
                        : 'border-[#27272a]/60 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-zinc-800 rounded-xl overflow-hidden border border-[#27272a] flex items-center justify-center shrink-0">
                        {filho.foto_url ? (
                          <img src={filho.foto_url} alt={filho.nome} className="w-full h-full object-cover" />
                        ) : (
                          <GraduationCap className="w-7 h-7 text-zinc-500" />
                        )}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="font-bold text-base text-white truncate block">
                          {filho.nome}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <School className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{filho.escola?.nome || 'Escola Municipal'}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="outline" className="text-[11px] bg-zinc-800 text-zinc-300 border-zinc-700">
                            Turma: {filho.turma?.nome || 'Sem Turma'}
                          </Badge>
                          {filho.parentesco && (
                            <Badge variant="outline" className="text-[11px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                              {filho.parentesco}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
                      {portalAtivoNaEscola ? (
                        <Link href={`/portal-aluno/dashboard/${filho.id}`} className="w-full">
                          <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 gap-1.5 shadow-md shadow-indigo-600/20">
                            Acessar Boletim & Frequência
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-400 w-full justify-center py-1">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Portal desativado nesta escola</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
