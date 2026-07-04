'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, ArrowLeft, Plus, Loader2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Database } from '@/types/supabase'

type Escola = Database['public']['Tables']['escolas']['Row']

export default function AdminEscolasPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [nome, setNome] = useState('')
  const [plano, setPlano] = useState('Básico')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchEscolas()
  }, [])

  const fetchEscolas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('escolas').select('*').order('nome')
      if (error) throw error
      setEscolas(data || [])
    } catch (error) {
      toast.error('Erro ao carregar escolas')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setNome('')
    setPlano('Básico')
    setLogoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!nome) {
      toast.error('Nome da escola é obrigatório')
      return
    }

    try {
      setSaving(true)
      
      let logoUrl = null
      
      // Upload Logo
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('logos-escolas')
          .upload(fileName, logoFile)
          
        if (uploadError) {
          throw new Error('Erro no upload da logo: ' + uploadError.message)
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('logos-escolas')
          .getPublicUrl(fileName)
          
        logoUrl = publicUrl
      }

      // Create Escola
      const { error } = await supabase
        .from('escolas')
        .insert({
          nome,
          plano,
          logo_url: logoUrl,
          modulos_ativos: ['mural', 'turmas', 'funcionarios', 'alunos'] // Default modules
        })
        
      if (error) throw error
      
      toast.success('Escola criada com sucesso!')
      setIsModalOpen(false)
      fetchEscolas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar escola')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-borderCustom flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-[#27272a] rounded-lg transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-500" /> Escolas da Rede
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1 ml-11">Cadastro e listagem de todas as unidades escolares.</p>
        </div>
        <Button onClick={handleOpenModal} className="bg-highlight hover:bg-highlight/90 text-white font-semibold">
          <Plus className="w-4 h-4 mr-2" /> Nova Escola
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {escolas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-borderCustom rounded-xl bg-card/50">
              <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">Nenhuma escola cadastrada.</p>
            </div>
          ) : (
            escolas.map((escola) => (
              <Card key={escola.id} className="bg-card border-borderCustom overflow-hidden flex flex-col">
                <div className="h-32 bg-[#1f1f22] flex items-center justify-center relative">
                  {escola.logo_url ? (
                    <img src={escola.logo_url} alt={escola.nome} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground opacity-30" />
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm border border-white/10">
                    {escola.plano || 'Básico'}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-white text-lg leading-tight mb-1">{escola.nome}</h3>
                  <div className="mt-auto pt-4 flex gap-1 flex-wrap">
                    {escola.modulos_ativos?.slice(0, 3).map(mod => (
                      <span key={mod} className="bg-white/5 text-muted-foreground px-2 py-0.5 rounded text-[10px] uppercase">
                        {mod}
                      </span>
                    ))}
                    {escola.modulos_ativos && escola.modulos_ativos.length > 3 && (
                      <span className="bg-white/5 text-muted-foreground px-2 py-0.5 rounded text-[10px] uppercase">
                        +{escola.modulos_ativos.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal Nova Escola */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-borderCustom text-foregroundCustom sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Cadastrar Nova Escola
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foregroundCustom">Nome da Escola</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-input border-borderCustom text-white"
                placeholder="Ex: Escola Municipal Central"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano" className="text-foregroundCustom">Plano de Assinatura</Label>
              <select
                id="plano"
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-input border border-borderCustom rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-highlight"
              >
                <option value="Básico">Básico</option>
                <option value="Pro">Pro</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo" className="text-foregroundCustom">Logo da Escola (Opcional)</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="bg-input border-borderCustom text-muted-foreground cursor-pointer file:text-white file:bg-transparent file:border-0 file:mr-4 file:font-semibold"
              />
              <p className="text-xs text-muted-foreground mt-1">Recomendado: PNG ou JPG, tamanho quadrado.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-transparent border-borderCustom text-foregroundCustom hover:bg-hoverCustom">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-highlight hover:bg-highlight/90 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar Escola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
