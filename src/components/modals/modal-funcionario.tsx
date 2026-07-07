'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Save, Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { MiniMapa } from '@/components/map/MapWrapper'

interface FuncionarioBasico {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  formacao?: string | null
  foto_url?: string | null
  data_nascimento?: string | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface ModalFuncionarioProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
  /** Se fornecido, abre em modo edição */
  funcionario?: FuncionarioBasico | null
}

interface Cargo {
  id: string
  nome: string
}

export function ModalFuncionario({
  open,
  onOpenChange,
  trigger,
  onSuccess,
  funcionario,
}: ModalFuncionarioProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const isEditing = !!funcionario

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      // Resetar preview ao fechar
      setFotoFile(null)
      setFotoPreview(null)
    }
  }

  // Form states
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [cargo, setCargo] = useState('')
  const [status, setStatus] = useState('ativo')
  const [formacao, setFormacao] = useState('')
  const [endereco, setEndereco] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // Pré-preencher ao abrir em modo edição
  useEffect(() => {
    if (activeOpen) {
      if (funcionario) {
        setNome(funcionario.nome ?? '')
        setEmail(funcionario.email ?? '')
        setCpf(funcionario.cpf ?? '')
        setNascimento(funcionario.data_nascimento ?? '')
        setCargo(funcionario.cargo ?? '')
        setStatus(funcionario.status ?? 'ativo')
        setFormacao(funcionario.formacao ?? '')
        setFotoPreview(funcionario.foto_url ?? null)
        setEndereco(funcionario.endereco ?? '')
        setLatitude(funcionario.latitude ? Number(funcionario.latitude) : null)
        setLongitude(funcionario.longitude ? Number(funcionario.longitude) : null)
      } else {
        setNome('')
        setEmail('')
        setCpf('')
        setNascimento('')
        setCargo('')
        setStatus('ativo')
        setFormacao('')
        setFotoPreview(null)
        setFotoFile(null)
        setEndereco('')
        setLatitude(null)
        setLongitude(null)
      }
    }
  }, [activeOpen, funcionario])

  // Carregar cargos do banco
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cargos')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (data) setCargos(data)
      })
  }, [])

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !email) {
      toast.error('Preencha os campos obrigatórios: Nome e E-mail.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      let foto_url: string | null = funcionario?.foto_url ?? null

      // Upload da foto se houver arquivo novo
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos-funcionarios')
          .upload(path, fotoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('fotos-funcionarios')
          .getPublicUrl(uploadData.path)

        foto_url = urlData.publicUrl
      }

      const basePayload = {
        nome,
        cpf: cpf || null,
        cargo: cargo || null,
        status,
        formacao: formacao || null,
        foto_url,
        data_nascimento: nascimento || null,
        endereco: endereco || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }

      if (isEditing && funcionario) {
        const { error } = await supabase
          .from('funcionarios')
          .update(basePayload)
          .eq('id', funcionario.id)
        if (error) throw error
        toast.success('Funcionário atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('funcionarios')
          .insert({ ...basePayload, email, is_superadmin: false })
        if (error) throw error
        toast.success('Funcionário cadastrado com sucesso!')
      }

      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro ao salvar funcionário: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-2xl bg-[#121212] border-borderCustom text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-highlight" />
            {isEditing ? 'Editar Funcionário' : 'Cadastro de Funcionário / Servidor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Foto do funcionário */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#1a1a2e] border-2 border-[#3ea6ff]/40 overflow-hidden flex items-center justify-center">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#3ea6ff]">
                    {nome ? nome.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <label
                htmlFor="foto-input"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#3ea6ff] flex items-center justify-center cursor-pointer hover:bg-[#0090ff] transition-colors"
                title="Alterar foto"
              >
                <Camera className="w-3 h-3 text-white" />
              </label>
              <input
                id="foto-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFotoChange}
              />
            </div>
            <div className="text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Foto do funcionário</p>
              <p>JPG, PNG ou WebP · máx 5MB</p>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="bg-[#181818] border-borderCustom text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-[#181818] border-borderCustom text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>E-mail de Login *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@escola.com"
                  className="bg-[#181818] border-borderCustom text-white mt-1"
                  required
                  disabled={isEditing}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                  className="bg-[#181818] border-borderCustom text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cargo / Função</Label>
                <Select value={cargo} onValueChange={(val) => val && setCargo(val)}>
                  <SelectTrigger className="bg-[#181818] border-borderCustom text-white mt-1">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-borderCustom text-white">
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Funcional</Label>
                <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                  <SelectTrigger className="bg-[#181818] border-borderCustom text-white mt-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-borderCustom text-white">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                    <SelectItem value="desligado">Desligado</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Formação */}
          <div className="space-y-4 pt-2 border-t border-borderCustom">
            <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Formação Acadêmica</h3>
            <div>
              <Label>Formação</Label>
              <Input
                value={formacao}
                onChange={(e) => setFormacao(e.target.value)}
                placeholder="Ex: Licenciatura em Pedagogia"
                className="bg-[#181818] border-borderCustom text-white mt-1"
              />
            </div>
          </div>

          {/* Localização e Endereço - print:hidden */}
          <div className="space-y-4 pt-2 border-t border-borderCustom print:hidden">
            <h3 className="text-xs font-bold text-highlight uppercase tracking-wider">Localização & Endereço</h3>
            <div>
              <Label>Endereço Residencial</Label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade..."
                className="bg-[#181818] border-borderCustom text-white mt-1"
              />
            </div>
            
            <div className="mt-2">
              <Label className="text-xs text-zinc-400">Arraste o pin ou clique no mapa para definir as coordenadas de GPS</Label>
              <div className="mt-2 h-[260px] w-full rounded-xl overflow-hidden border border-borderCustom relative z-10">
                <MiniMapa
                  initialLat={latitude ?? undefined}
                  initialLng={longitude ?? undefined}
                  onCoordinatesChange={(lat, lng) => {
                    setLatitude(lat)
                    setLongitude(lng)
                  }}
                  address={endereco}
                  onAddressChange={setEndereco}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-borderCustom">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
