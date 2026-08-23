'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import {
  Route,
  ArrowLeft,
  School,
  MapPin,
  Building2,
  Sparkles,
  Loader2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { MapaRotasEscolas } from '@/components/map/MapWrapper';
import { EscolaMapeada } from '@/components/map/MapaRotasEscolas';
import { toast } from 'sonner';

import HistoricoPercursosTab from '@/components/map/HistoricoPercursosTab';
import { History, Compass } from 'lucide-react';

export default function RotasEscolasPage() {
  const supabase = createClient();
  const [escolas, setEscolas] = useState<EscolaMapeada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'roteirizador' | 'historico'>('roteirizador');
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const carregarEscolas = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome, latitude, longitude, endereco, localizacao, tipo, inep, telefone, ativo, is_teste')
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;

      if (isMounted.current) {
        setEscolas(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar escolas para geolocalização:', err);
      toast.error('Não foi possível carregar as escolas municipais.');
    } finally {
      if (isMounted.current) {
        setCarregando(false);
      }
    }
  };

  useEffect(() => {
    carregarEscolas();
  }, []);

  const isSemed = (e: EscolaMapeada) =>
    e.inep === '01' ||
    e.inep === '1' ||
    e.tipo === 'SECRETARIA' ||
    (e.nome || '').toUpperCase().includes('SEMED');

  const isSaude = (e: EscolaMapeada) =>
    e.tipo === 'SAUDE' ||
    e.tipo === 'POSTO' ||
    e.tipo === 'USF' ||
    (e.nome || '').toUpperCase().includes('POSTO DE SAÚDE') ||
    (e.nome || '').toUpperCase().includes('POSTO DE SAUDE') ||
    (e.nome || '').toUpperCase().includes('USF');

  const isTeste = (e: EscolaMapeada) =>
    e.is_teste === true || (e.nome || '').toLowerCase().startsWith('teste ');

  const escolasReais = escolas.filter((e) => !isSemed(e) && !isSaude(e) && !isTeste(e));
  const unidadesSaude = escolas.filter(isSaude);
  const unidadesTeste = escolas.filter(isTeste);
  const semedUnidade = escolas.find(isSemed);

  const unidadesEscolares = escolas.filter((e) => !isSemed(e));

  const escolasComCoords = unidadesEscolares.filter(
    (e) =>
      e.latitude !== null &&
      e.longitude !== null &&
      Number(e.latitude) !== 0 &&
      Number(e.longitude) !== 0
  );

  const escolasUrbanas = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('URBANA')
  );
  const escolasRurais = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('RURAL')
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background text-foreground p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/relatorios"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar aos Relatórios Administrativos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Administração
              </Link>
              <span>/</span>
              <Link href="/admin/relatorios" className="hover:text-foreground transition-colors">
                Relatórios
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">Rotas e Geolocalização</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Route className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              Geolocalização e Rotas de Unidades Escolares
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação entre Abas */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setAbaAtiva('roteirizador')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'roteirizador'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="w-4 h-4" />
              Roteirizador & Ao Vivo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico & Simulação
            </button>
          </div>

          <button
            type="button"
            onClick={carregarEscolas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border rounded-xl hover:bg-hoverCustom transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin text-sky-600 dark:text-sky-400' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {abaAtiva === 'roteirizador' ? (
        <>
          {/* Cards de Resumo & Estatísticas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Escolas Cadastradas
                </span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-lg font-bold text-foreground">{escolasReais.length}</span>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                    {semedUnidade && <span>+1 Sede</span>}
                    {unidadesSaude.length > 0 && <span>• {unidadesSaude.length} Saúde/USF</span>}
                    {unidadesTeste.length > 0 && <span>• {unidadesTeste.length} Teste</span>}
                  </div>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <School className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Com Geolocalização
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {escolasComCoords.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Urbana
                </span>
                <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                  {escolasUrbanas.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Rural
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {escolasRurais.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Route className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Componente do Mapa e Otimizador de Rotas */}
          {carregando ? (
            <div className="w-full h-[580px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-semibold">
                Carregando mapa e unidades escolares de Sapeaçu...
              </span>
            </div>
          ) : (
            <MapaRotasEscolas escolas={escolas} />
          )}
        </>
      ) : (
        <HistoricoPercursosTab />
      )}
    </div>
  );
}
