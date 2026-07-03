'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, UserPlus, Save, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ModalAluno({ open, onOpenChange, trigger, onSuccess }: ModalAlunoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  // Form states
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [cpf, setCpf] = useState('')
  const [inep, setInep] = useState('')
  const [telefone, setTelefone] = useState('')
  const [mae, setMae] = useState('')
  const [pai, setPai] = useState('')
  const [certidao, setCertidao] = useState('')
  const [rg, setRg] = useState('')
  const [sus, setSus] = useState('')
  const [nis, setNis] = useState('')
  const [endereco, setEndereco] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const supabase = createClient()
    const fileName = `${Date.now()}_${file.name}`
    toast.loading('Enviando foto do aluno...')

    const { data, error } = await supabase.storage
      .from('fotos-alunos')
      .upload(fileName, file)

    toast.dismiss()

    if (error) {
      toast.error(`Erro no upload: ${error.message}`)
      return
    }

    const { data: publicData } = supabase.storage
      .from('fotos-alunos')
      .getPublicUrl(fileName)

    setFotoUrl(publicData.publicUrl)
    toast.success('Foto enviada com sucesso!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) {
      toast.error('Preencha pelo menos o Nome Completo do aluno.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const payload: any = {
        nome,
        foto_url: fotoUrl || null,
        data_nascimento: nascimento || null,
        cpf: cpf || null,
        inep: inep || null,
        telefone_contato: telefone || null,
        nome_mae: mae || null,
        nome_pai: pai || null,
        rg: rg || null,
        cartao_sus: sus || null,
        nis: nis || null,
        certidao_nascimento: certidao || null,
        endereco: endereco || null
      }

      const { error } = await (supabase.from('alunos') as any).insert(payload)

      if (error) throw error

      toast.success('Aluno cadastrado com sucesso!')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao cadastrar aluno: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="sm:max-w-2xl bg-[#121212] border-borderCustom text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-highlight" />
            Cadastro Completo de Aluno
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Photo upload section */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#181818] border border-borderCustom">
            <div 
              onClick={() => document.getElementById('modalFotoAlunoInput')?.click()}
              className="w-20 h-20 rounded-full bg-[#252525] border-2 border-highlight flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto Aluno" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-white">Foto 3x4 do Aluno</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Clique no círculo para selecionar a imagem.</p>
              <input 
                id="modalFotoAlunoInput" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFotoUpload} 
              />
            </div>
          </div>

          {/* Dados Principais */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-highlight uppercase tracking-wider">Identificação Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Nome do aluno" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                  required
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Código INEP (Censo)</Label>
                <Input 
                  value={inep} 
                  onChange={(e) => setInep(e.target.value)} 
                  placeholder="Ex: 12345678" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
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
              <div>
                <Label>Telefone de Contato</Label>
                <Input 
                  value={telefone} 
                  onChange={(e) => setTelefone(e.target.value)} 
                  placeholder="(75) 99999-9999" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
            </div>
          </div>

          {/* Documentos & Filiação */}
          <div className="space-y-4 pt-2 border-t border-borderCustom">
            <h3 className="text-sm font-bold text-highlight uppercase tracking-wider">Documentos e Filiação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome da Mãe</Label>
                <Input 
                  value={mae} 
                  onChange={(e) => setMae(e.target.value)} 
                  placeholder="Nome completo da mãe" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
              <div>
                <Label>Nome do Pai</Label>
                <Input 
                  value={pai} 
                  onChange={(e) => setPai(e.target.value)} 
                  placeholder="Nome completo do pai" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>RG (Identidade)</Label>
                <Input 
                  value={rg} 
                  onChange={(e) => setRg(e.target.value)} 
                  placeholder="Nº do RG" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
              <div>
                <Label>Nº do NIS</Label>
                <Input 
                  value={nis} 
                  onChange={(e) => setNis(e.target.value)} 
                  placeholder="Nº NIS" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
              <div>
                <Label>Cartão do SUS</Label>
                <Input 
                  value={sus} 
                  onChange={(e) => setSus(e.target.value)} 
                  placeholder="Nº Cartão SUS" 
                  className="bg-[#181818] border-borderCustom text-white mt-1" 
                />
              </div>
            </div>

            <div>
              <Label>Endereço Completo</Label>
              <Input 
                value={endereco} 
                onChange={(e) => setEndereco(e.target.value)} 
                placeholder="Rua, Nº, Bairro, Ponto de referência" 
                className="bg-[#181818] border-borderCustom text-white mt-1" 
              />
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
              <Save className="w-4 h-4" />
              {loading ? 'Salvar Aluno...' : 'Cadastrar Aluno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
