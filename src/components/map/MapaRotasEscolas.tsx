'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Filter,
  Navigation,
  School,
  Sparkles,
  Route,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Fuel,
  DollarSign,
  Square,
  Compass,
  DownloadCloud,
  Wifi,
  WifiOff,
  CheckCircle2,
  Car,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PontoLocalizacao,
  ResultadoRoteiro,
  SEDE_SEMED_SAPEACU,
  parseCoordinate,
  otimizarOrdemVisitas,
  obterRotaViariaReal,
  calcularDistanciaHaversine,
} from '@/lib/routeOptimizer';
import { useGpsTracker } from '@/hooks/useGpsTracker';
import {
  salvarRotaAtiva,
  obterRotaAtiva,
  limparRotaAtiva,
  enfileirarVisitaOffline,
  obterVisitasPendentes,
  marcarVisitasComoSincronizadas,
  VisitaPonto,
} from '@/lib/offlineRouteStore';
import {
  baixarMapaOfflineSapeacu,
  verificarStatusMapaOffline,
  DownloadProgress,
} from '@/lib/mapTileDownloader';
import { createClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export interface EscolaMapeada {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  endereco?: string | null;
  localizacao?: string | null;
  tipo?: string | null;
  inep?: string | null;
  telefone?: string | null;
  ativo?: boolean | null;
}

export interface EscolaComCoordenadas extends EscolaMapeada {
  latitude: number;
  longitude: number;
}

interface MapaRotasEscolasProps {
  escolas: EscolaMapeada[];
}

export default function MapaRotasEscolas({ escolas }: MapaRotasEscolasProps) {
  const { funcionario } = useAuthStore();
  const supabase = createClient();

  const [busca, setBusca] = useState('');
  const buscaDebounced = useDeferredValue(busca);
  const [filtroZona, setFiltroZona] = useState<'todos' | 'URBANA' | 'RURAL'>('todos');

  // Coordenadas padrão de Sapeaçu - BA
  const SAPEACU_CENTER: [number, number] = useMemo(() => [-12.7299932, -39.1858195], []);
  const mapRef = useRef<L.Map>(null);

  // Estados do Roteiro
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<PontoLocalizacao[]>([]);
  const [incluirSede, setIncluirSede] = useState(true);
  const [retornarAoSede, setRetornarAoSede] = useState(true);
  const [consumoKmLInput, setConsumoKmLInput] = useState('10.0');
  const [precoCombustivelInput, setPrecoCombustivelInput] = useState('6.29');
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [resultadoRoteiro, setResultadoRoteiro] = useState<ResultadoRoteiro | null>(null);

  // Estados de Navegação & Offline
  const [seguirCarro, setSeguirCarro] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [visitasPendentes, setVisitasPendentes] = useState<VisitaPonto[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [paradasConcluidas, setParadasConcluidas] = useState<string[]>([]);

  // Estados do Modal de Download de Mapa Offline
  const [modalOfflineAberto, setModalOfflineAberto] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [baixandoMapa, setBaixandoMapa] = useState(false);
  const [statusCache, setStatusCache] = useState<{ totalEmCache: number; tamanhoEstimadoMb: number }>({
    totalEmCache: 0,
    tamanhoEstimadoMb: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal de Check-in Manual
  const [modalCheckinAberto, setModalCheckinAberto] = useState(false);
  const [escolaCheckin, setEscolaCheckin] = useState<PontoLocalizacao | null>(null);
  const [obsCheckin, setObsCheckin] = useState('');
  const [statusVisitaInput, setStatusVisitaInput] = useState<'REALIZADA' | 'IMPREVISTO' | 'AUSENTE'>('REALIZADA');
  const [odometroInput, setOdometroInput] = useState('');

  // Localização da SEMED (INEP 01 - Sede Administrativa da Educação)
  const semedUnidade = useMemo(() => {
    return escolas.find(
      (e) =>
        e.inep === '01' ||
        e.inep === '1' ||
        e.tipo === 'SECRETARIA' ||
        (e.nome || '').toUpperCase().includes('SEMED') ||
        (e.nome || '').toLowerCase() === 'sede'
    );
  }, [escolas]);

  const pontoSede: PontoLocalizacao = useMemo(() => {
    if (semedUnidade) {
      const lat = parseCoordinate(semedUnidade.latitude);
      const lng = parseCoordinate(semedUnidade.longitude);
      if (lat !== null && lng !== null) {
        return {
          id: semedUnidade.id,
          nome: semedUnidade.nome.includes('SEMED')
            ? semedUnidade.nome
            : 'Secretaria Municipal de Educação (SEMED)',
          latitude: lat,
          longitude: lng,
          tipo: 'SECRETARIA',
          inep: semedUnidade.inep ?? '01',
          endereco: semedUnidade.endereco ?? 'Centro, Sapeaçu - BA',
          localizacao: semedUnidade.localizacao ?? 'URBANA',
        };
      }
    }
    return SEDE_SEMED_SAPEACU;
  }, [semedUnidade]);

  // Hook de GPS em Tempo Real
  const {
    ativo: gpsAtivo,
    posicao: posicaoVeiculo,
    proximaParada,
    iniciarGps,
    pararGps,
  } = useGpsTracker({
    escolasDestino: resultadoRoteiro?.pontosOrdenados.filter((p) => p.tipo !== 'SECRETARIA') || escolasSelecionadas,
    onChegadaPonto: (ponto, distM) => {
      if (!paradasConcluidas.includes(ponto.id)) {
        toast.info(`Você está chegando em ${ponto.nome} (${distM}m).`, {
          duration: 4000,
        });
      }
    },
  });

  // Escolas válidas com coordenadas (excluindo a SEMED)
  const escolasValidas = useMemo(() => {
    const list: EscolaComCoordenadas[] = [];
    for (const e of escolas) {
      const isSemed =
        e.inep === '01' ||
        e.inep === '1' ||
        e.tipo === 'SECRETARIA' ||
        e.id === semedUnidade?.id ||
        (e.nome || '').toUpperCase().includes('SEMED');

      if (isSemed) continue;

      const lat = parseCoordinate(e.latitude);
      const lng = parseCoordinate(e.longitude);
      if (lat !== null && lng !== null) {
        list.push({
          ...e,
          latitude: lat,
          longitude: lng,
          tipo: e.tipo ?? 'MUNICIPAL',
          localizacao: e.localizacao ?? 'URBANA',
        });
      }
    }
    return list;
  }, [escolas, semedUnidade]);

  // Escolas filtradas para a busca
  const escolasFiltradas = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    return escolasValidas.filter((e) => {
      if (filtroZona !== 'todos') {
        const zona = (e.localizacao || '').toUpperCase();
        if (!zona.includes(filtroZona)) return false;
      }
      if (!termo) return true;
      return (
        e.nome.toLowerCase().includes(termo) ||
        (e.endereco || '').toLowerCase().includes(termo) ||
        (e.inep || '').toLowerCase().includes(termo)
      );
    });
  }, [escolasValidas, buscaDebounced, filtroZona]);

  // 1. Sincronização da fila offline com o Supabase (Idempotente com upsert)
  const sincronizarFilaComServidor = useCallback(async () => {
    const pendentes = await obterVisitasPendentes();
    if (pendentes.length === 0) return;

    setSincronizando(true);
    try {
      // Renova a sessão antes de enviar para evitar 401 por JWT expirado
      await supabase.auth.getSession();

      const payload = pendentes.map((v) => ({
        id: v.id,
        escola_id: v.escola_id,
        funcionario_id: v.funcionario_id || funcionario?.id || null,
        rota_nome: v.rota_nome || 'Roteiro de Visitas',
        data_hora_chegada: v.data_hora_chegada,
        latitude: v.latitude,
        longitude: v.longitude,
        distancia_ponto_metros: v.distancia_ponto_metros,
        odometro_km: v.odometro_km,
        observacoes: v.observacoes,
        status: v.status,
        sincronizado_em: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('registros_visitas_rotas')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      const idsSincronizados = pendentes.map((p) => p.id);
      await marcarVisitasComoSincronizadas(idsSincronizados);

      const restantes = await obterVisitasPendentes();
      setVisitasPendentes(restantes);

      toast.success(`${idsSincronizados.length} visita(s) sincronizada(s) com sucesso no servidor!`);
    } catch (err: any) {
      console.error('Erro na sincronização de visitas:', err);
      toast.error('Não foi possível sincronizar agora. Os dados continuam salvos no aparelho.');
    } finally {
      setSincronizando(false);
    }
  }, [supabase, funcionario]);

  // 2. Carrega status de conexão e restaura rota ativa do IndexedDB ao iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        toast.success('Conexão restabelecida! Sincronizando dados com o servidor...', {
          icon: '📶',
        });
        sincronizarFilaComServidor();
      };

      const handleOffline = () => {
        setIsOnline(false);
        toast.warning('Sem conexão à internet. Modo offline ativado com GPS via satélite.', {
          icon: '📡',
        });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Carrega visitas pendentes
      obterVisitasPendentes().then((pendentes) => {
        setVisitasPendentes(pendentes);
      });

      // Checa status do cache do mapa
      verificarStatusMapaOffline().then(setStatusCache);

      // Restaura rota ativa se houver
      obterRotaAtiva().then((rotaSalva) => {
        if (rotaSalva && rotaSalva.escolasSelecionadas.length > 0) {
          setEscolasSelecionadas(rotaSalva.escolasSelecionadas);
          setResultadoRoteiro(rotaSalva.resultadoRoteiro);
          setParadasConcluidas(rotaSalva.paradasConcluidas || []);
        }
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [sincronizarFilaComServidor]);

  // 3. Centraliza o mapa no carro quando o GPS atualiza se o modo 'seguirCarro' estiver ativo
  useEffect(() => {
    if (gpsAtivo && posicaoVeiculo && seguirCarro && mapRef.current) {
      mapRef.current.panTo([posicaoVeiculo.latitude, posicaoVeiculo.longitude], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [posicaoVeiculo, gpsAtivo, seguirCarro]);

  // Adicionar/Remover escola do roteiro
  const toggleEscolaRoteiro = (ponto: PontoLocalizacao) => {
    setEscolasSelecionadas((prev) => {
      const existe = prev.some((item) => item.id === ponto.id);
      let novo: PontoLocalizacao[];
      if (existe) {
        novo = prev.filter((item) => item.id !== ponto.id);
      } else {
        novo = [...prev, ponto];
      }
      // Salva no IndexedDB
      salvarRotaAtiva({
        id: 'rota_ativa_atual',
        nome: 'Roteiro de Visitas',
        data_inicio: new Date().toISOString(),
        escolasSelecionadas: novo,
        resultadoRoteiro: null,
        paradasConcluidas,
        emNavegacao: gpsAtivo,
      });
      return novo;
    });
    setResultadoRoteiro(null);
  };

  const removerEscolaRoteiro = (id: string) => {
    setEscolasSelecionadas((prev) => {
      const novo = prev.filter((item) => item.id !== id);
      salvarRotaAtiva({
        id: 'rota_ativa_atual',
        nome: 'Roteiro de Visitas',
        data_inicio: new Date().toISOString(),
        escolasSelecionadas: novo,
        resultadoRoteiro: null,
        paradasConcluidas,
        emNavegacao: gpsAtivo,
      });
      return novo;
    });
    setResultadoRoteiro(null);
  };

  const limparRoteiro = () => {
    setEscolasSelecionadas([]);
    setResultadoRoteiro(null);
    setParadasConcluidas([]);
    limparRotaAtiva();
  };

  // Calcular Rota Otimizada (com persistência offline)
  const handleCalcularMelhorRoteiro = async () => {
    if (escolasSelecionadas.length === 0) return;

    setCalculandoRota(true);
    try {
      const consumoKmL = parseFloat(consumoKmLInput.replace(',', '.')) || 10.0;
      const precoLitro = parseFloat(precoCombustivelInput.replace(',', '.')) || 6.29;

      const pontoInicial = incluirSede ? pontoSede : escolasSelecionadas[0];
      const destinos = incluirSede
        ? escolasSelecionadas
        : escolasSelecionadas.filter((p) => p.id !== pontoInicial.id);

      const pontosOrdenados = otimizarOrdemVisitas(pontoInicial, destinos, retornarAoSede);
      const resultado = await obterRotaViariaReal(pontosOrdenados, consumoKmL, precoLitro);

      setResultadoRoteiro(resultado);

      // Salva a rota ativa pronta na memória offline
      await salvarRotaAtiva({
        id: 'rota_ativa_atual',
        nome: 'Roteiro de Visitas',
        data_inicio: new Date().toISOString(),
        escolasSelecionadas,
        resultadoRoteiro: resultado,
        paradasConcluidas,
        emNavegacao: gpsAtivo,
      });

      // Ajusta o zoom do mapa para enquadrar o trajeto
      if (mapRef.current && resultado.pontosOrdenados.length > 0) {
        const bounds = L.latLngBounds(
          resultado.pontosOrdenados.map((p) => [p.latitude, p.longitude] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error('Erro ao calcular roteiro:', err);
      toast.error('Erro ao calcular o melhor caminho viário.');
    } finally {
      setCalculandoRota(false);
    }
  };

  // Iniciar / Pausar Navegação com GPS
  const toggleNavegacaoGps = () => {
    if (gpsAtivo) {
      pararGps();
      toast.info('Navegação GPS pausada.');
    } else {
      iniciarGps();
      setSeguirCarro(true);
      toast.success('Navegação iniciada! GPS em alta precisão ativo.', {
        icon: '🚗',
      });
    }
  };

  // Abrir modal de Check-in para uma escola
  const abrirCheckinEscola = (esc: PontoLocalizacao) => {
    setEscolaCheckin(esc);
    setObsCheckin('');
    setStatusVisitaInput('REALIZADA');
    setOdometroInput('');
    setModalCheckinAberto(true);
  };

  // Confirmar Registro de Visita / Check-in
  const salvarCheckinVisita = async () => {
    if (!escolaCheckin) return;

    let distMetros: number | null = null;
    if (posicaoVeiculo && escolaCheckin.latitude && escolaCheckin.longitude) {
      distMetros = Math.round(
        calcularDistanciaHaversine(
          posicaoVeiculo.latitude,
          posicaoVeiculo.longitude,
          escolaCheckin.latitude,
          escolaCheckin.longitude
        ) * 1000
      );
    }

    const novoRegistro: VisitaPonto = {
      id: crypto.randomUUID(),
      escola_id: escolaCheckin.tipo === 'SECRETARIA' ? null : escolaCheckin.id,
      escola_nome: escolaCheckin.nome,
      funcionario_id: funcionario?.id ?? null,
      rota_nome: 'Roteiro de Visitas',
      data_hora_chegada: new Date().toISOString(),
      latitude: posicaoVeiculo?.latitude ?? escolaCheckin.latitude,
      longitude: posicaoVeiculo?.longitude ?? escolaCheckin.longitude,
      distancia_ponto_metros: distMetros,
      odometro_km: odometroInput ? parseFloat(odometroInput.replace(',', '.')) : null,
      observacoes: obsCheckin.trim() || null,
      status: statusVisitaInput,
      sincronizado: false,
    };

    // 1. Salva na fila offline local (IndexedDB)
    await enfileirarVisitaOffline(novoRegistro);

    // 2. Atualiza estado de paradas concluídas
    const novasConcluidas = Array.from(new Set([...paradasConcluidas, escolaCheckin.id]));
    setParadasConcluidas(novasConcluidas);

    if (resultadoRoteiro) {
      salvarRotaAtiva({
        id: 'rota_ativa_atual',
        nome: 'Roteiro de Visitas',
        data_inicio: new Date().toISOString(),
        escolasSelecionadas,
        resultadoRoteiro,
        paradasConcluidas: novasConcluidas,
        emNavegacao: gpsAtivo,
      });
    }

    const pendentes = await obterVisitasPendentes();
    setVisitasPendentes(pendentes);
    setModalCheckinAberto(false);

    toast.success(`Check-in em ${escolaCheckin.nome} registrado!`, {
      description: isOnline
        ? 'Enviando ao servidor...'
        : 'Salvo no aparelho. Será enviado quando a internet voltar.',
    });

    // 3. Se estiver online, tenta sincronizar imediatamente em segundo plano
    if (isOnline) {
      sincronizarFilaComServidor();
    }
  };

  // Iniciar Download de Mapa Offline de Sapeaçu
  const handleBaixarMapaOffline = async () => {
    setBaixandoMapa(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await baixarMapaOfflineSapeacu((prog) => {
        setDownloadProgress(prog);
      }, controller.signal);

      const novoStatus = await verificarStatusMapaOffline();
      setStatusCache(novoStatus);
      toast.success('Mapa offline de Sapeaçu baixado com sucesso!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Falha ao baixar alguns blocos do mapa offline.');
      }
    } finally {
      setBaixandoMapa(false);
      abortControllerRef.current = null;
    }
  };

  const cancelarDownloadMapa = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setBaixandoMapa(false);
    }
  };

  // Recentralizar mapa em Sapeaçu
  const recentralizarSapeacu = () => {
    if (mapRef.current) {
      mapRef.current.setView(SAPEACU_CENTER, 14, { animate: true });
    }
  };

  // Ícone Customizado do Carro com Rotação (Heading)
  const iconeCarro = useMemo(() => {
    if (!posicaoVeiculo) return null;
    const heading = posicaoVeiculo.heading || 0;
    const speed = posicaoVeiculo.speedKmh || 0;

    return L.divIcon({
      className: 'custom-car-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(14, 165, 233, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; width: 36px; height: 36px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.6); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <div style="position: absolute; top: -5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid #38bdf8;"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>

          <div style="position: absolute; bottom: -8px; background: #0f172a; color: #38bdf8; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 6px; border: 1px solid #0284c7; box-shadow: 0 2px 4px rgba(0,0,0,0.4); white-space: nowrap;">
            ${speed} km/h
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }, [posicaoVeiculo]);

  // Ícones Customizados de Escolas
  const criarIconeEscola = (escola: EscolaComCoordenadas, ordem?: number) => {
    const isRural = (escola.localizacao || '').toUpperCase().includes('RURAL');
    const isEspecial = escola.tipo === 'ESPECIAL' || escola.nome.toUpperCase().includes('EMAEE');
    const isConcluida = paradasConcluidas.includes(escola.id);

    let bgColor = isRural ? '#f59e0b' : '#0284c7';
    let borderColor = isRural ? '#d97706' : '#0369a1';
    if (isEspecial) {
      bgColor = '#8b5cf6';
      borderColor = '#6d28d9';
    }
    if (isConcluida) {
      bgColor = '#10b981';
      borderColor = '#059669';
    }

    const estaSelecionada = escolasSelecionadas.some((p) => p.id === escola.id);

    const badgeOrdemHtml = isConcluida
      ? `<span style="position: absolute; top: -7px; right: -7px; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">✓</span>`
      : ordem !== undefined
      ? `<span style="position: absolute; top: -7px; right: -7px; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${ordem}</span>`
      : estaSelecionada
      ? `<span style="position: absolute; top: -6px; right: -6px; background: #38bdf8; color: #0f172a; font-size: 10px; font-weight: 900; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.25);">✓</span>`
      : '';

    return L.divIcon({
      className: 'custom-escola-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; border-radius: 12px; background: ${bgColor}; border: 2px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff; transform: ${
        estaSelecionada ? 'scale(1.15)' : 'scale(1)'
      }; transition: all 0.2s ease;">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>
          </div>
          ${badgeOrdemHtml}
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });
  };

  const iconeSede = useMemo(() => {
    return L.divIcon({
      className: 'custom-sede-icon',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563eb; border: 3px solid #60a5fa; box-shadow: 0 4px 14px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </div>
          <span style="position: absolute; top: -6px; right: -6px; background: #3b82f6; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 4px; border-radius: 6px; border: 1.5px solid #ffffff;">SEMED</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  }, []);

  return (
    <div className="flex flex-col xl:flex-row gap-5 w-full">
      {/* Coluna Principal: Mapa, Barra de Status Offline e Filtros */}
      <div className="flex-1 flex flex-col gap-3.5 min-w-0">
        {/* Barra Superior de Conectividade e Ações Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-2xs">
          {/* Status da Rede / Indicador Offline */}
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-2xs',
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
              )}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{isOnline ? 'Online (Conectado)' : 'Modo Offline (GPS Satélite)'}</span>
            </div>

            {visitasPendentes.length > 0 && (
              <button
                type="button"
                onClick={sincronizarFilaComServidor}
                disabled={sincronizando || !isOnline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Sincronizar visitas salvas no aparelho com o Supabase"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', sincronizando && 'animate-spin')} />
                <span>
                  {sincronizando ? 'Sincronizando...' : `${visitasPendentes.length} pendente(s)`}
                </span>
              </button>
            )}
          </div>

          {/* Botões de Ação GPS e Download Offline */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOfflineAberto(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl hover:bg-hoverCustom transition-colors cursor-pointer shadow-2xs"
              title="Gerenciar cache de mapa offline para uso sem internet"
            >
              <DownloadCloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Mapa Offline</span>
              {statusCache.totalEmCache > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold">
                  {statusCache.tamanhoEstimadoMb} MB
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleNavegacaoGps}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm',
                gpsAtivo
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              {gpsAtivo ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Pausar GPS</span>
                </>
              ) : (
                <>
                  <Car className="w-4 h-4" />
                  <span>Iniciar Navegação GPS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Informativo de Navegação Ativa (Próxima Parada) */}
        {gpsAtivo && (
          <div className="flex items-center justify-between gap-3 bg-sky-500/10 border border-sky-500/30 p-3 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <span>Navegando com GPS via Satélite</span>
                  {posicaoVeiculo && (
                    <span className="text-[11px] text-foreground font-semibold">
                      • {posicaoVeiculo.speedKmh} km/h
                    </span>
                  )}
                </div>
                {proximaParada ? (
                  <p className="text-xs text-muted-foreground truncate">
                    Próxima parada: <b className="text-foreground">{proximaParada.ponto.nome}</b> (
                    {proximaParada.distanciaMetros > 1000
                      ? `${(proximaParada.distanciaMetros / 1000).toFixed(1)} km`
                      : `${proximaParada.distanciaMetros} metros`})
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Aguardando definição de rota...</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSeguirCarro(!seguirCarro)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs',
                  seguirCarro
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
                title="Manter mapa centralizado no veículo"
              >
                Seguir Veículo
              </button>

              {proximaParada && (
                <button
                  type="button"
                  onClick={() => abrirCheckinEscola(proximaParada.ponto)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Check-in
                </button>
              )}
            </div>
          </div>
        )}

        {/* Barra de Pesquisa e Filtro de Zona */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-2xs">
          <div className="flex flex-1 items-center gap-2.5 min-w-[220px] bg-surface-2 dark:bg-secondary/40 px-3.5 py-2 rounded-xl border border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar escola por nome, endereço ou código INEP..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </div>

          {/* Filtro Urbana / Rural */}
          <div className="flex items-center gap-1 bg-surface-2 dark:bg-secondary/40 p-1 rounded-xl border border-border">
            <span className="text-xs font-medium text-muted-foreground px-2 flex items-center gap-1 hidden sm:flex">
              <Filter className="w-3.5 h-3.5" /> Zona:
            </span>
            <button
              type="button"
              onClick={() => setFiltroZona('todos')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'todos'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todas ({escolasValidas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroZona('URBANA')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'URBANA'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Urbana (
              {
                escolasValidas.filter((e) =>
                  (e.localizacao || '').toUpperCase().includes('URBANA')
                ).length
              }
              )
            </button>
            <button
              type="button"
              onClick={() => setFiltroZona('RURAL')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroZona === 'RURAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Rural (
              {
                escolasValidas.filter((e) =>
                  (e.localizacao || '').toUpperCase().includes('RURAL')
                ).length
              }
              )
            </button>
          </div>

          <button
            type="button"
            onClick={recentralizarSapeacu}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 dark:border-sky-500/30 rounded-xl hover:bg-sky-500/20 transition-colors cursor-pointer shadow-2xs"
            title="Recentralizar Mapa em Sapeaçu"
          >
            <MapPin className="w-3.5 h-3.5" />
            Sapeaçu - BA
          </button>
        </div>

        {/* Container do Mapa Leaflet */}
        <div className="w-full h-[580px] rounded-2xl overflow-hidden border border-border shadow-md relative z-0">
          <MapContainer
            ref={mapRef}
            center={SAPEACU_CENTER}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Mapa de Ruas (OpenStreetMap - Suporte Offline)">
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  keepBuffer={8}
                  updateWhenIdle={true}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Satélite (Híbrido)">
                <TileLayer
                  attribution="&copy; Google Maps"
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  keepBuffer={6}
                  updateWhenIdle={true}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* Marcador da Sede (SEMED) */}
            {incluirSede && (
              <Marker
                position={[pontoSede.latitude, pontoSede.longitude]}
                icon={iconeSede}
              >
                <Popup className="custom-popup" autoPan={false}>
                  <div className="p-3.5 bg-card text-foreground rounded-xl border border-border min-w-[240px] shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        Sede Administrativa
                      </span>
                      <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400">
                        INEP: {pontoSede.inep ?? '01'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400 text-sm mb-1">
                      <Navigation className="w-4 h-4" />
                      Ponto de Partida / Chegada
                    </div>
                    <div className="text-xs font-bold text-foreground mb-1">
                      {pontoSede.nome}
                    </div>
                    {pontoSede.endereco && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{pontoSede.endereco}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcador do Veículo / Carro em Movimento */}
            {gpsAtivo && posicaoVeiculo && iconeCarro && (
              <Marker
                position={[posicaoVeiculo.latitude, posicaoVeiculo.longitude]}
                icon={iconeCarro}
                zIndexOffset={1000}
              >
                <Popup className="custom-popup" autoPan={false}>
                  <div className="p-3 bg-card text-foreground rounded-xl border border-border min-w-[200px] shadow-lg text-xs">
                    <div className="font-bold text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1.5">
                      <Car className="w-4 h-4" /> Veículo em Trânsito
                    </div>
                    <div className="text-muted-foreground">
                      Velocidade: <b className="text-foreground">{posicaoVeiculo.speedKmh} km/h</b>
                    </div>
                    <div className="text-muted-foreground">
                      Precisão GPS: <b className="text-foreground">±{posicaoVeiculo.accuracy}m</b>
                    </div>
                    <div className="text-muted-foreground">
                      Direção: <b className="text-foreground">{posicaoVeiculo.heading}°</b>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marcadores das Escolas */}
            {escolasFiltradas.map((esc) => {
              const idxNoRoteiro = resultadoRoteiro?.pontosOrdenados.findIndex(
                (p) => p.id === esc.id
              );
              const numOrdem =
                idxNoRoteiro !== undefined && idxNoRoteiro !== -1 ? idxNoRoteiro + 1 : undefined;
              const estaSelecionada = escolasSelecionadas.some((p) => p.id === esc.id);
              const icone = criarIconeEscola(esc, numOrdem);
              const isConcluida = paradasConcluidas.includes(esc.id);

              return (
                <Marker key={esc.id} position={[esc.latitude, esc.longitude]} icon={icone}>
                  <Popup className="custom-popup" autoPan={false}>
                    <div className="p-3.5 bg-card text-foreground rounded-xl border border-border min-w-[240px] shadow-lg">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                            isConcluida
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : (esc.localizacao || '').toUpperCase().includes('RURAL')
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                          )}
                        >
                          {isConcluida ? '✓ Visita Realizada' : `Zona ${esc.localizacao ?? 'Urbana'}`}
                        </span>
                        {esc.inep && (
                          <span className="text-[10px] text-muted-foreground">INEP: {esc.inep}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground leading-tight mb-1.5">
                        {esc.nome}
                      </h4>
                      {esc.endereco && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{esc.endereco}</span>
                        </p>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleEscolaRoteiro({
                              id: esc.id,
                              nome: esc.nome,
                              latitude: esc.latitude,
                              longitude: esc.longitude,
                              endereco: esc.endereco,
                              localizacao: esc.localizacao,
                              tipo: esc.tipo ?? 'MUNICIPAL',
                              inep: esc.inep,
                            })
                          }
                          className={cn(
                            'w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs',
                            estaSelecionada
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          )}
                        >
                          {estaSelecionada ? (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Remover do Roteiro
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar ao Roteiro
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            abrirCheckinEscola({
                              id: esc.id,
                              nome: esc.nome,
                              latitude: esc.latitude,
                              longitude: esc.longitude,
                              endereco: esc.endereco,
                              localizacao: esc.localizacao,
                              tipo: esc.tipo ?? 'MUNICIPAL',
                              inep: esc.inep,
                            })
                          }
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Registrar Check-in / Visita
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Traçado da Rota */}
            {resultadoRoteiro && resultadoRoteiro.coordenadasPolyline.length > 1 && (
              <Polyline
                positions={resultadoRoteiro.coordenadasPolyline}
                pathOptions={{
                  color: '#0284c7',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '8, 8',
                }}
              />
            )}
          </MapContainer>

          {/* Legenda Flutuante */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg flex flex-wrap items-center gap-3 text-xs text-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white/50 shadow-2xs"></span>
              <span>SEMED (INEP 01)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500 border border-white/50 shadow-2xs"></span>
              <span>Urbana</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500 border border-white/50 shadow-2xs"></span>
              <span>Rural</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 border border-white/50 shadow-2xs"></span>
              <span>Visita Concluída</span>
            </div>
            {gpsAtivo && (
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                <Car className="w-3.5 h-3.5" />
                <span>Veículo Ativo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Planejador de Roteiro & Resultados */}
      <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Roteiro de Visitas</h3>
                <p className="text-xs text-muted-foreground">Melhor caminho & economia</p>
              </div>
            </div>
            {escolasSelecionadas.length > 0 && (
              <button
                type="button"
                onClick={limparRoteiro}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {/* Parâmetros de Partida & Veículo */}
          <div className="grid grid-cols-2 gap-3 bg-surface-2 dark:bg-secondary/40 p-3 rounded-xl border border-border">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <Fuel className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Consumo (km/L)
              </label>
              <input
                type="text"
                value={consumoKmLInput}
                onChange={(e) => setConsumoKmLInput(e.target.value)}
                placeholder="10.0"
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500 shadow-2xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{' '}
                Gasolina (R$/L)
              </label>
              <input
                type="text"
                value={precoCombustivelInput}
                onChange={(e) => setPrecoCombustivelInput(e.target.value)}
                placeholder="6.29"
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirSede}
                  onChange={(e) => setIncluirSede(e.target.checked)}
                  className="rounded border-border text-sky-600 focus:ring-sky-500"
                />
                Partir da Secretaria (SEMED - INEP 01)
              </label>

              {incluirSede && (
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retornarAoSede}
                    onChange={(e) => setRetornarAoSede(e.target.checked)}
                    className="rounded border-border text-sky-600 focus:ring-sky-500"
                  />
                  Retornar à Secretaria no fim do roteiro
                </label>
              )}
            </div>
          </div>

          {/* Lista de Escolas Selecionadas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Escolas no Roteiro ({escolasSelecionadas.length})
              </span>
            </div>

            {escolasSelecionadas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs flex flex-col items-center gap-1.5 bg-surface-2/40">
                <School className="w-6 h-6 text-muted-foreground/60" />
                <span>Nenhuma escola selecionada.</span>
                <span className="text-[11px] text-muted-foreground/80">
                  Clique nos marcadores no mapa ou busque por uma unidade.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {escolasSelecionadas.map((esc, index) => {
                  const isConcluida = paradasConcluidas.includes(esc.id);
                  return (
                    <div
                      key={esc.id}
                      className={cn(
                        'flex items-center justify-between border px-3 py-2 rounded-xl text-xs transition-colors',
                        isConcluida
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-surface-2 dark:bg-secondary/40 border-border'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0',
                            isConcluida
                              ? 'bg-emerald-600 text-white'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                          )}
                        >
                          {isConcluida ? '✓' : index + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">{esc.nome}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => abrirCheckinEscola(esc)}
                          className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                          title="Registrar Visita"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerEscolaRoteiro(esc.id)}
                          className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botão de Calcular Rota Ótima */}
          <button
            type="button"
            disabled={escolasSelecionadas.length === 0 || calculandoRota}
            onClick={handleCalcularMelhorRoteiro}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {calculandoRota ? (
              <span>Otimizando roteiro...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Calcular Melhor Roteiro
              </>
            )}
          </button>

          {/* Painel de Resultados do Roteiro */}
          {resultadoRoteiro && (
            <div className="flex flex-col gap-3 bg-surface-2 dark:bg-secondary/40 border border-sky-500/30 p-3.5 rounded-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Roteiro
                  Otimizado
                </span>
                <a
                  href={resultadoRoteiro.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                </a>
              </div>

              {/* Indicadores de Consumo & Distância */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Distância Total
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    {resultadoRoteiro.distanciaTotalKm} km
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Gasolina Estimada
                  </span>
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {resultadoRoteiro.consumoLitros} L
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Custo Estimado
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    R$ {resultadoRoteiro.custoTotalReais.toFixed(2)}
                  </span>
                </div>
                <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
                  <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                    Tempo em Trânsito
                  </span>
                  <span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">
                    ~{resultadoRoteiro.tempoEstimadoMinutos} min
                  </span>
                </div>
              </div>

              {/* Paradas Passo a Passo */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground">
                  Ordem de Paradas:
                </span>
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                  {resultadoRoteiro.pontosOrdenados.map((p, idx) => {
                    const isConcluida = paradasConcluidas.includes(p.id);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs text-foreground py-0.5"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={cn(
                              'w-4 h-4 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0',
                              isConcluida
                                ? 'bg-emerald-600 text-white'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            )}
                          >
                            {isConcluida ? '✓' : idx + 1}
                          </span>
                          <span className={cn('truncate', isConcluida && 'line-through text-muted-foreground')}>
                            {p.nome}
                          </span>
                        </div>
                        {p.tipo !== 'SECRETARIA' && !isConcluida && (
                          <button
                            type="button"
                            onClick={() => abrirCheckinEscola(p)}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 cursor-pointer"
                          >
                            Cheguei
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Gerenciamento de Mapa Offline */}
      {modalOfflineAberto && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Mapa Offline de Sapeaçu</h3>
                  <p className="text-xs text-muted-foreground">Navegue sem precisar de internet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOfflineAberto(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl p-3.5 text-xs text-muted-foreground flex flex-col gap-2">
              <p>
                Ao baixar o mapa, todos os quadrantes de ruas, estradas vicinais e zona rural de Sapeaçu
                serão salvos no armazenamento seguro do seu navegador.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-border/60 text-foreground font-semibold">
                <span>Armazenamento em Cache:</span>
                <span>
                  {statusCache.totalEmCache} blocos ({statusCache.tamanhoEstimadoMb} MB)
                </span>
              </div>
            </div>

            {/* Barra de Progresso */}
            {downloadProgress && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>{downloadProgress.mensagem}</span>
                  <span>{downloadProgress.porcentagem}%</span>
                </div>
                <div className="w-full bg-surface-2 dark:bg-secondary/40 h-2.5 rounded-full overflow-hidden border border-border">
                  <div
                    className="bg-sky-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress.porcentagem}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {baixandoMapa ? (
                <button
                  type="button"
                  onClick={cancelarDownloadMapa}
                  className="px-4 py-2 rounded-xl bg-rose-600/15 text-rose-600 border border-rose-600/30 font-bold text-xs hover:bg-rose-600/25 transition-colors cursor-pointer"
                >
                  Cancelar Download
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setModalOfflineAberto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleBaixarMapaOffline}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    Baixar / Atualizar Mapa (~25 MB)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Check-in / Registro de Visita */}
      {modalCheckinAberto && escolaCheckin && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Registro de Chegada / Visita</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">{escolaCheckin.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCheckinAberto(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Status da Visita
                </label>
                <select
                  value={statusVisitaInput}
                  onChange={(e: any) => setStatusVisitaInput(e.target.value)}
                  className="w-full bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="REALIZADA">Visita Realizada com Sucesso</option>
                  <option value="IMPREVISTO">Imprevisto / Escola Fechada</option>
                  <option value="AUSENTE">Responsável / Aluno Ausente</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Odômetro Atual (KM Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 45280"
                  value={odometroInput}
                  onChange={(e) => setOdometroInput(e.target.value)}
                  className="w-full bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Observações / Ocorrência na Parada
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Entrega de merenda e livros concluída às 10:45..."
                  value={obsCheckin}
                  onChange={(e) => setObsCheckin(e.target.value)}
                  className="w-full bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-sky-500 resize-none font-normal"
                />
              </div>

              {posicaoVeiculo && (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Coordenadas GPS capturadas: {posicaoVeiculo.latitude.toFixed(6)},{' '}
                    {posicaoVeiculo.longitude.toFixed(6)} (±{posicaoVeiculo.accuracy}m)
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalCheckinAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarCheckinVisita}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Salvar Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
