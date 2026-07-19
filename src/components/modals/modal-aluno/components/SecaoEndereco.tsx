'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MiniMapa } from '@/components/map/MapWrapper'

export function SecaoEndereco() {
  const {
    rua, setRua,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidadeEnd, setCidadeEnd,
    ufEnd, setUfEnd,
    areaLocalizacao, setAreaLocalizacao,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    endereco, setEndereco
  } = useAlunoForm()

  return (
    <div>
      <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
        7. Endereço Residencial Detalhado
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <Label className="text-xs text-gray-300">Rua / Logradouro</Label>
            <Input 
              value={rua} 
              onChange={(e) => setRua(e.target.value)} 
              placeholder="Rua do Brito" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-gray-300">Nº</Label>
            <Input 
              value={numero} 
              onChange={(e) => setNumero(e.target.value)} 
              placeholder="78" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-gray-300">CEP</Label>
            <Input 
              value={cep} 
              onChange={(e) => setCep(e.target.value)} 
              placeholder="44540000" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-gray-300">Bairro / Localidade</Label>
            <Input 
              value={bairro} 
              onChange={(e) => setBairro(e.target.value)} 
              placeholder="Brito" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-gray-300">Cidade</Label>
            <Input 
              value={cidadeEnd} 
              onChange={(e) => setCidadeEnd(e.target.value)} 
              placeholder="SAPE AÇU" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
          <div>
            <Label className="text-xs text-gray-300">UF</Label>
            <Input 
              value={ufEnd} 
              maxLength={2}
              onChange={(e) => setUfEnd(e.target.value.toUpperCase())} 
              placeholder="BA" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-300">Área de localização da residência</Label>
            <Select value={areaLocalizacao} onValueChange={(val) => setAreaLocalizacao(val || 'Urbana')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Urbana">Urbana</SelectItem>
                <SelectItem value="Rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Residência em Área Diferenciada?</Label>
            <Select value={areaDiferenciada} onValueChange={(val) => setAreaDiferenciada(val || 'Não está em área diferenciada')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                <SelectItem value="Não está em área diferenciada">Não está em área diferenciada</SelectItem>
                <SelectItem value="Área quilombola">Área quilombola</SelectItem>
                <SelectItem value="Terra indígena">Terra indígena</SelectItem>
                <SelectItem value="Área de assentamento">Área de assentamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seleção de GPS por Mapa - print:hidden */}
        <div className="print:hidden mt-4">
          <Label className="text-xs text-gray-400 font-medium">Coordenadas de GPS (Arraste o pin ou clique no mapa para selecionar)</Label>
          <div className="mt-2 h-[260px] w-full rounded-xl overflow-hidden border border-[#2a2a2a] relative z-10">
            <MiniMapa
              initialLat={latitude ?? undefined}
              initialLng={longitude ?? undefined}
              onCoordinatesChange={(lat, lng) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
              address={rua ? `${rua}, ${numero || ''}, ${bairro || ''}, ${cidadeEnd || ''} - ${ufEnd || ''}` : endereco}
              onAddressChange={(val) => {
                setEndereco(val)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
