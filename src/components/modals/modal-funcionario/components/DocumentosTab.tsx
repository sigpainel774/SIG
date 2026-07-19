'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MiniMapa } from '@/components/map/MapWrapper'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function DocumentosTab() {
  const {
    cpf, setCpf,
    rg, setRg,
    nis, setNis,
    logradouro, setLogradouro,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidade, setCidade,
    ufResidencia, setUfResidencia,
    areaResidencia, setAreaResidencia,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    formatCPF,
    formatCEP,
  } = useFuncionarioForm()

  const fullAddress = logradouro ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}` : ''

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Documentação Básica</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>CPF</Label>
          <Input
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Identidade (RG)</Label>
          <Input
            value={rg}
            onChange={(e) => setRg(e.target.value)}
            placeholder="Número do RG"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Número do NIS (PIS/PASEP)</Label>
          <Input
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            placeholder="Número do NIS"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1 pt-2">Endereço Residencial</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <Label>Avenida / Rua / Travessa</Label>
          <Input
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Ex: Av. Sete de Setembro"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Número</Label>
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Nº"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>CEP</Label>
          <Input
            value={cep}
            onChange={(e) => setCep(formatCEP(e.target.value))}
            placeholder="44350-000"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Bairro / Localidade</Label>
          <Input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Ex: Centro"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Ex: Sapeaçu"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>UF Residência</Label>
          <Input
            value={ufResidencia}
            onChange={(e) => setUfResidencia(e.target.value.toUpperCase())}
            placeholder="Ex: BA"
            maxLength={2}
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Área Residencial</Label>
          <select
            value={areaResidencia}
            onChange={(e) => setAreaResidencia(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Urbana">Urbana</option>
            <option value="Rural">Rural</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Área de Localização Diferenciada</Label>
          <select
            value={areaDiferenciada}
            onChange={(e) => setAreaDiferenciada(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não está em área diferenciada">Não está em área diferenciada</option>
            <option value="Comunidade remanescente de quilombos">Comunidade remanescente de quilombos (Quilombola)</option>
            <option value="Terra indígena">Terra indígena</option>
            <option value="Área de assentamento cigano">Área de assentamento cigano</option>
          </select>
        </div>
        
        {/* Endereço consolidado readonly */}
        <div>
          <Label>Endereço Completo de Login (exibe no mapa)</Label>
          <Input
            type="text"
            placeholder="Rua, número, bairro, cidade..."
            value={fullAddress}
            disabled
            className="bg-zinc-800/40 border-borderCustom text-zinc-400 mt-1 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-2">
        <Label className="text-xs text-zinc-400">Coordenadas de GPS Residencial (Opcional, clique ou arraste no mapa)</Label>
        <div className="mt-2 h-[220px] w-full rounded-xl overflow-hidden border border-borderCustom relative z-10">
          <MiniMapa
            initialLat={latitude ?? undefined}
            initialLng={longitude ?? undefined}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat)
              setLongitude(lng)
            }}
            address={fullAddress}
            onAddressChange={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
