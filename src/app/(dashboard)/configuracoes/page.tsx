'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  ShieldCheck, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Lock, 
  Save, 
  ChevronDown, 
  Info, 
  Search, 
  X, 
  BookOpen, 
  GraduationCap, 
  KeyRound, 
  Pin, 
  School, 
  Users,
  CheckCircle2,
  Smartphone,
  PenTool,
  Loader2,
  Plus,
  Trash2,
  Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { SchoolSelector } from '@/components/SchoolSelector'

const modulesList = [
  { label: 'Mural', icon: Pin, enabled: true },
  { label: 'Turmas', icon: BookOpen, enabled: true },
  { label: 'Funcionários', icon: Users, enabled: false },
  { label: 'Matrículas', icon: KeyRound, enabled: true },
  { label: 'Alunos', icon: GraduationCap, enabled: true },
  { label: 'Ocorrências', icon: ShieldCheck, enabled: true },
]



export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'assinatura-diretor' | 'assinatura-pessoal' | 'materias'>('perfil')
  const [showPassword, setShowPassword] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [modules, setModules] = useState(modulesList)
  const { funcionario, vinculos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const isAdmin = isAdminGlobalOrRoot()
  const [localFuncionario, setLocalFuncionario] = useState<any>(null)

  // Estados para a Assinatura Global do Diretor
  const [assinaturaDiretorUrl, setAssinaturaDiretorUrl] = useState<string | null>(null)
  const [newDiretorSignature, setNewDiretorSignature] = useState<string | null>(null)
  const [loadingDiretorSig, setLoadingDiretorSig] = useState(false)

  // Estados para a Assinatura Pessoal do Funcionário
  const [assinaturaPessoalUrl, setAssinaturaPessoalUrl] = useState<string | null>(null)
  const [newPessoalSignature, setNewPessoalSignature] = useState<string | null>(null)
  const [loadingPessoalSig, setLoadingPessoalSig] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (funcionario) {
      setLocalFuncionario(funcionario)
    } else {
      const fetchLocal = async () => {
        const { createClient } = await import('@/lib/supabaseClient')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          const { data } = await supabase
            .from('funcionarios')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle()
          if (data) setLocalFuncionario(data)
        }
      }
      fetchLocal()
    }
  }, [funcionario])

  // Sincroniza assinatura pessoal do funcionario
  useEffect(() => {
    if (localFuncionario) {
      setAssinaturaPessoalUrl(localFuncionario.assinatura_url || null)
    }
  }, [localFuncionario])

  // Carrega assinatura do diretor se a escola ativa mudar ou se for carregada
  useEffect(() => {
    if (escolaAtivaId) {
      const fetchEscolaSig = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('escolas')
          .select('assinatura_diretor_url')
          .eq('id', escolaAtivaId)
          .maybeSingle()
        if (data) {
          setAssinaturaDiretorUrl(data.assinatura_diretor_url)
        }
      }
      fetchEscolaSig()
    }
  }, [escolaAtivaId])

  const handleSaveDiretorSignature = async () => {
    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada. Por favor, selecione uma escola antes de salvar.')
      return
    }
    if (!newDiretorSignature) {
      toast.error('Nenhuma assinatura foi desenhada para salvar.')
      return
    }
    setLoadingDiretorSig(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newDiretorSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `escola_${escolaAtivaId}_diretor.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      // 3. Obter URL pública
      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const publicUrl = pData.publicUrl

      // 4. Salvar na tabela escolas
      const { error: dbErr } = await supabase
        .from('escolas')
        .update({ assinatura_diretor_url: publicUrl } as any)
        .eq('id', escolaAtivaId)

      if (dbErr) throw dbErr

      setAssinaturaDiretorUrl(publicUrl)
      setNewDiretorSignature(null)
      toast.success('Assinatura global do diretor salva com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura do diretor: ${err.message}`)
    } finally {
      setLoadingDiretorSig(false)
    }
  }

  const handleSavePessoalSignature = async () => {
    if (!localFuncionario?.id) {
      toast.error('Funcionário não identificado. Recarregue a página.')
      return
    }
    if (!newPessoalSignature) {
      toast.error('Nenhuma assinatura foi desenhada para salvar.')
      return
    }
    setLoadingPessoalSig(true)
    const supabase = createClient()

    try {
      // 1. Converter base64 para blob
      const parts = newPessoalSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const rawLength = raw.length
      const uInt8Array = new Uint8Array(rawLength)
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      // 2. Upload para storage
      const fileName = `funcionario_${localFuncionario.id}_assinatura.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      // 3. Obter URL pública
      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const publicUrl = pData.publicUrl

      // 4. Salvar na tabela funcionarios
      const { error: dbErr } = await supabase
        .from('funcionarios')
        .update({ assinatura_url: publicUrl } as any)
        .eq('id', localFuncionario.id)

      if (dbErr) throw dbErr

      setAssinaturaPessoalUrl(publicUrl)
      
      // Sincronizar em tempo real com o useAuthStore
      useAuthStore.setState({ 
        funcionario: { 
          ...funcionario!, 
          assinatura_url: publicUrl 
        } 
      })

      setNewPessoalSignature(null)
      toast.success('Sua assinatura pessoal foi salva com sucesso!')

      if (localFuncionario.auth_user_id) {
        const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
        await invalidarCachePerfil(localFuncionario.auth_user_id)
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura pessoal: ${err.message}`)
    } finally {
      setLoadingPessoalSig(false)
    }
  }

  const isDiretor = selectedEscola?.diretor_id === localFuncionario?.id || 
                    vinculos.some(v => v.escola_id === escolaAtivaId && (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR')))

  const toggleModule = (index: number) => {
    setModules(prev => prev.map((m, i) => i === index ? { ...m, enabled: !m.enabled } : m))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#185FA5] dark:text-[#3ea6ff]" />
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil pessoal, preferências de tema e permissões de acesso ao sistema.
        </p>
      </div>

      {/* Grid Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <button
          onClick={() => setActiveTab('perfil')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'perfil'
              ? "bg-card border-highlight ring-1 ring-highlight/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'perfil' ? "bg-highlight/10 text-highlight" : "bg-muted text-muted-foreground"
          )}>
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Meu Perfil & Aparência</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ficha funcional, alterar senha e tema do sistema</p>
          </div>
        </button>



        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('assinatura-diretor')}
            className={cn(
              "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
              activeTab === 'assinatura-diretor'
                ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
                : "bg-card border-borderCustom hover:bg-hoverCustom"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl",
              activeTab === 'assinatura-diretor' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
            )}>
              <PenTool className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Assinatura do Diretor</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastrar assinatura oficial do gestor para os documentos</p>
            </div>
          </button>
        )}

        <button
          onClick={() => setActiveTab('assinatura-pessoal')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'assinatura-pessoal'
              ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'assinatura-pessoal' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
          )}>
            <PenTool className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Minha Assinatura</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastrar sua assinatura digital pessoal para assinar documentos</p>
          </div>
        </button>

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('materias')}
            className={cn(
              "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
              activeTab === 'materias'
                ? "bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50"
                : "bg-card border-borderCustom hover:bg-hoverCustom"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl",
              activeTab === 'materias' ? "bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-muted text-muted-foreground"
            )}>
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Grade Curricular</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastrar matérias da escola e definir base comum/diversificada</p>
            </div>
          </button>
        )}

      </div>

      {/* Main Content Sections */}
      {activeTab === 'perfil' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Card: Dados da Ficha Funcional */}
          <Card className="border-[0.5px] border-borderCustom bg-card p-5">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom/50 pb-4 text-lg font-semibold text-foregroundCustom">
              <User className="h-5 w-5 text-[#185FA5] dark:text-[#3ea6ff]" />
              Dados da Ficha Funcional
            </h2>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-input text-foregroundCustom border border-borderCustom">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <ProfileField label="Nome Completo" value={mounted ? (localFuncionario?.nome || "Usuário") : "Carregando..."} strong />
                <ProfileField label="E-mail" value={mounted ? (localFuncionario?.email || "-") : "Carregando..."} />
                <ProfileField label="Cargo" value={mounted ? (localFuncionario?.cargo || vinculos.find(v => v.ativo)?.cargo || "Servidor") : "Carregando..."} badge />
                <ProfileField label="Status" value={mounted ? (localFuncionario?.status || "Ativo") : "Carregando..."} isStatus />
              </div>
            </div>
          </Card>

          {/* Alert Recomendação de Segurança */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-100 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-sm">Recomendações de Segurança</h3>
              <p className="text-xs leading-5 mt-1 text-muted-foreground">
                Se este é seu primeiro acesso usando uma senha padrão fornecida pela secretaria, crie uma senha forte e pessoal.
              </p>
            </div>
          </div>

          {/* Card: Alterar Senha */}
          <Card className="border-borderCustom bg-card p-6">
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className={cn(
                "flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-foregroundCustom cursor-pointer",
                showPassword ? 'border-b border-borderCustom pb-4' : ''
              )}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-highlight" />
                Alterar Senha de Acesso
              </span>
              <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", showPassword ? 'rotate-180' : '')} />
            </button>

            {showPassword && (
              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">Senha Atual</label>
                  <Input type="password" placeholder="Digite sua senha atual" className="bg-input" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">Nova Senha</label>
                    <Input type="password" placeholder="Mínimo 6 caracteres" className="bg-input" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">Confirmar Nova Senha</label>
                    <Input type="password" placeholder="Digite a nova senha novamente" className="bg-input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-highlight text-background hover:bg-highlight/90 font-medium">
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar Senha
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}


      {activeTab === 'assinatura-diretor' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Assinatura Oficial do Diretor (Global)
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Esta assinatura será impressa automaticamente em todos os comprovantes, boletins e documentos oficiais desta escola.
              </p>
              
              {isAdmin && (
                <div className="flex flex-col gap-2 p-4 bg-surface-2 rounded-xl border border-borderCustom max-w-md">
                  <span className="text-xs font-semibold text-foregroundCustom">Selecione a Escola para configurar:</span>
                  <SchoolSelector />
                </div>
              )}

              {!escolaAtivaId ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium max-w-md">
                  Por favor, selecione uma escola para visualizar e gerenciar a assinatura oficial do diretor.
                </div>
              ) : (
                <>
                  <div className="max-w-md">
                    <SignaturePad
                      label="Assinatura Digital"
                      value={newDiretorSignature || assinaturaDiretorUrl}
                      onChange={setNewDiretorSignature}
                      isEditMode={true}
                    />
                  </div>
                  {newDiretorSignature && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setNewDiretorSignature(null)}
                        className="text-zinc-400 hover:text-white"
                        disabled={loadingDiretorSig}
                      >
                        Descartar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveDiretorSignature}
                        disabled={loadingDiretorSig}
                        className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                      >
                        {loadingDiretorSig ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Assinatura Oficial
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'assinatura-pessoal' && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Minha Assinatura Digital Pessoal
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastre sua assinatura digital pessoal. Ela será usada quando você assinar documentos do sistema (como fichas de alunos) utilizando o preenchimento automático.
              </p>
              <div className="max-w-md">
                <SignaturePad
                  label="Minha Assinatura"
                  value={newPessoalSignature || assinaturaPessoalUrl}
                  onChange={setNewPessoalSignature}
                  isEditMode={true}
                />
              </div>
              {newPessoalSignature && (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewPessoalSignature(null)}
                    className="text-zinc-400 hover:text-white"
                    disabled={loadingPessoalSig}
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePessoalSignature}
                    disabled={loadingPessoalSig}
                    className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                  >
                    {loadingPessoalSig ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Assinatura
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'materias' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <GradeCurricularTab />
        </div>
      )}
    </div>
  )
}

function ProfileField({ 
  label, 
  value, 
  strong, 
  badge,
  isStatus
}: { 
  label: string; 
  value: string; 
  strong?: boolean; 
  badge?: boolean;
  isStatus?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {badge || isStatus ? (
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide",
          isStatus
            ? (value.toLowerCase() === 'ativo'
                ? "bg-emerald-50 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400"
                : "bg-zinc-50 border-zinc-200/50 text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-700/50 dark:text-zinc-400")
            : "bg-blue-50 border-blue-200/50 text-[#185FA5] dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-400"
        )}>
          {isStatus && (
            <span className={cn(
              "w-1.5 h-1.5 rounded-full mr-1.5",
              value.toLowerCase() === 'ativo' ? "bg-emerald-500" : "bg-zinc-500"
            )} />
          )}
          {value}
        </span>
      ) : (
        <span className={strong ? 'text-base font-semibold text-foregroundCustom' : 'text-sm text-foregroundCustom'}>
          {value}
        </span>
      )}
    </div>
  )
}



function GradeCurricularTab() {
  const { escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [materias, setMaterias] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [baseCurricular, setBaseCurricular] = useState<'comum' | 'diversificada'>('comum')
  
  // Para edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [editingBase, setEditingBase] = useState<'comum' | 'diversificada'>('comum')

  const fetchMaterias = async () => {
    if (!escolaAtivaId) return
    setLoading(true)
    const supabase = createClient() as any
    try {
      const { data, error } = await supabase
        .from('grade_curricular_escola')
        .select('*')
        .eq('escola_id', escolaAtivaId)
        .order('nome', { ascending: true })
      if (error) throw error
      setMaterias(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar matérias: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterias()
  }, [escolaAtivaId])

  const handleAddMateria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada. Por favor, selecione uma escola.')
      return
    }
    if (!nome.trim()) {
      toast.error('Digite o nome da matéria.')
      return
    }

    setLoading(true)
    const supabase = createClient() as any
    try {
      const { error } = await supabase
        .from('grade_curricular_escola')
        .insert({
          escola_id: escolaAtivaId,
          nome: nome.trim(),
          base_curricular: baseCurricular
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta matéria já está cadastrada nesta escola.')
        } else {
          throw error
        }
        return
      }

      toast.success('Matéria adicionada com sucesso!')
      setNome('')
      setBaseCurricular('comum')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao cadastrar matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMateria = async (id: string) => {
    if (!editingNome.trim()) {
      toast.error('Digite o nome da matéria.')
      return
    }

    setLoading(true)
    const supabase = createClient() as any
    try {
      const { error } = await supabase
        .from('grade_curricular_escola')
        .update({
          nome: editingNome.trim(),
          base_curricular: editingBase
        })
        .eq('id', id)

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta matéria já está cadastrada nesta escola.')
        } else {
          throw error
        }
        return
      }

      toast.success('Matéria atualizada com sucesso!')
      setEditingId(null)
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao atualizar matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMateria = async (id: string, nomeMateria: string) => {
    if (!escolaAtivaId) return

    setLoading(true)
    const supabase = createClient() as any
    try {
      // Verificar se a matéria está sendo usada em alguma turma
      const { count, error: checkError } = await supabase
        .from('materias')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaAtivaId)
        .eq('nome', nomeMateria)

      if (checkError) throw checkError

      if (count && count > 0) {
        toast.error(`Não é possível excluir a matéria "${nomeMateria}" pois ela está sendo utilizada em ${count} turma(s).`)
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('grade_curricular_escola')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Matéria removida com sucesso!')
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao remover matéria: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePreencherPadrao = async () => {
    if (!escolaAtivaId) return
    setLoading(true)
    const supabase = createClient() as any
    
    // Lista de matérias padrões recomendadas para as escolas
    const materiasPadrao = [
      { escola_id: escolaAtivaId, nome: 'Língua Portuguesa', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Matemática', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'História', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Geografia', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Ciências', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Arte', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Educação Física', base_curricular: 'comum' },
      { escola_id: escolaAtivaId, nome: 'Ensino Religioso', base_curricular: 'comum' },
    ]

    try {
      // Obter matérias já existentes para não dar conflito
      const { data: existentes } = await supabase
        .from('grade_curricular_escola')
        .select('nome')
        .eq('escola_id', escolaAtivaId)
      
      const nomesExistentes = (existentes || []).map((e: any) => e.nome.toLowerCase().trim())
      const aInserir = materiasPadrao.filter(m => !nomesExistentes.includes(m.nome.toLowerCase().trim()))

      if (aInserir.length === 0) {
        toast.info('Todas as matérias padrão já estão cadastradas nesta escola.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('grade_curricular_escola')
        .insert(aInserir)

      if (error) throw error

      toast.success(`${aInserir.length} matérias padrão cadastradas com sucesso!`)
      fetchMaterias()
    } catch (err: any) {
      toast.error('Erro ao popular matérias padrão: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-borderCustom/50 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-foregroundCustom flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-highlight" />
            Grade Curricular da Escola
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre as matérias oferecidas por sua escola e defina se pertencem à Base Comum ou Diversificada.
          </p>
        </div>
        {escolaAtivaId && materias.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePreencherPadrao}
            disabled={loading}
            className="border-borderCustom text-zinc-300 hover:bg-hoverCustom hover:text-white"
          >
            Preencher com Matérias Padrão
          </Button>
        )}
      </div>

      {isAdminGlobalOrRoot() && (
        <div className="flex flex-col gap-2 p-4 bg-surface-2 rounded-xl border border-borderCustom max-w-md">
          <span className="text-xs font-semibold text-foregroundCustom">Selecione a Escola para configurar:</span>
          <SchoolSelector />
        </div>
      )}

      {!escolaAtivaId ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium max-w-md">
          Por favor, selecione uma escola para visualizar e gerenciar a grade curricular.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário de Cadastro */}
          <div className="lg:col-span-1 border border-dashed border-[#3f3f46] bg-[#121214] rounded-2xl p-4 h-fit space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingId ? 'Editar Matéria' : 'Nova Matéria'}
            </h3>
            
            <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdateMateria(editingId); } : handleAddMateria} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Nome da Matéria</label>
                <Input
                  type="text"
                  placeholder="Ex: Geografia, Robótica..."
                  value={editingId ? editingNome : nome}
                  onChange={(e) => editingId ? setEditingNome(e.target.value) : setNome(e.target.value)}
                  className="bg-input border-borderCustom text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Base Curricular</label>
                <Select
                  value={editingId ? editingBase : baseCurricular}
                  onValueChange={(val: string | null) => editingId ? setEditingBase((val ?? 'comum') as 'comum' | 'diversificada') : setBaseCurricular((val ?? 'comum') as 'comum' | 'diversificada')}
                >
                  <SelectTrigger className="bg-input border-borderCustom text-white focus:ring-[#3ea6ff]">
                    <SelectValue placeholder="Selecione o tipo de base" />
                  </SelectTrigger>
                  <SelectContent className="bg-input border-borderCustom text-white">
                    <SelectItem value="comum">Base Comum</SelectItem>
                    <SelectItem value="diversificada">Base Diversificada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditingNome('');
                    }}
                    className="flex-1 text-zinc-400 hover:text-white"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-highlight text-background hover:bg-highlight/90 font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingId ? (
                    'Salvar'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Listagem de Matérias */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-borderCustom overflow-hidden bg-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderCustom bg-[#121214] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="p-4 font-medium">Nome da Matéria</th>
                    <th className="p-4 font-medium">Base Curricular</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCustom text-sm">
                  {materias.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-zinc-500">
                        Nenhuma matéria cadastrada nesta escola.
                      </td>
                    </tr>
                  ) : (
                    materias.map((mat) => (
                      <tr key={mat.id} className="hover:bg-hoverCustom/30 transition-colors">
                        <td className="p-4 font-medium text-foreground">{mat.nome}</td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                            mat.base_curricular === 'comum'
                              ? "bg-blue-500/10 border-blue-500/20 text-[#185FA5] dark:text-[#3ea6ff]"
                              : "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
                          )}>
                            {mat.base_curricular === 'comum' ? 'Base Comum' : 'Base Diversificada'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(mat.id);
                                setEditingNome(mat.nome);
                                setEditingBase(mat.base_curricular);
                              }}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              disabled={loading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir a matéria "${mat.nome}"?`)) {
                                  handleDeleteMateria(mat.id, mat.nome);
                                }
                              }}
                              className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

