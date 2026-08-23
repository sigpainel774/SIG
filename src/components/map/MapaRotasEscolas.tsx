'use client';

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
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
  MapLayerType,
} from '@/lib/mapTileDownloader';
import {
  salvarCacheEntidadeAlpha,
  obterCacheEntidadeAlpha,
} from '@/lib/alphaOfflineManager';
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
  is_teste?: boolean | null;
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

  // Estados de Rotas Designadas (Sistema Alpha)
  const [rotasDesignadas, setRotasDesignadas] = useState<any[]>([]);
  const [rotaAtivaDesignada, setRotaAtivaDesignada] = useState<any | null>(null);
  const [loadingRotasDesignadas, setLoadingRotasDesignadas] = useState(false);

  // Estados de Navegação & Offline
  const { ativo: gpsAtivo, posicao: posicaoVeiculo, iniciarGps, pararGps } = useGpsTracker();
  const [seguirCarro, setSeguirCarro] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [visitasPendentes, setVisitasPendentes] = useState<VisitaPonto[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [paradasConcluidas, setParadasConcluidas] = useState<string[]>([]);

  const pontoSede = useMemo<PontoLocalizacao>(() => SEDE_SEMED_SAPEACU, []);

  // Estados do Trajeto Estilo Google Maps
  const [pontoInicio, setPontoInicio] = useState<PontoLocalizacao | null>(SEDE_SEMED_SAPEACU);
  const [pontoFim, setPontoFim] = useState<PontoLocalizacao | null>(null);
  const [paradasIntermediarias, setParadasIntermediarias] = useState<PontoLocalizacao[]>([]);
  const [modoMarcacaoMapa, setModoMarcacaoMapa] = useState<'inicio' | 'fim' | number | null>(null);

  const modoMarcacaoMapaRef = useRef(modoMarcacaoMapa);
  useEffect(() => {
    modoMarcacaoMapaRef.current = modoMarcacaoMapa;
  }, [modoMarcacaoMapa]);

  const definirPontoPorMarcacao = useCallback((ponto: PontoLocalizacao) => {
    const modo = modoMarcacaoMapaRef.current;
    if (modo === 'inicio') {
      setPontoInicio(ponto);
      toast.success(`Início definido: ${ponto.nome}`, { icon: '📍' });
    } else if (modo === 'fim') {
      setPontoFim(ponto);
      toast.success(`Chegada definida: ${ponto.nome}`, { icon: '🏁' });
    } else if (typeof modo === 'number') {
      setParadasIntermediarias((prev) => {
        const copy = [...prev];
        copy[modo] = ponto;
        return copy;
      });
      toast.success(`Parada ${modo + 1} definida: ${ponto.nome}`, { icon: '🔵' });
    }
    setModoMarcacaoMapa(null);
  }, []);

  const adicionarParadaIntermediaria = () => {
    setParadasIntermediarias((prev) => [
      ...prev,
      {
        id: `parada_placeholder_${Date.now()}`,
        nome: `Parada ${prev.length + 1}`,
        latitude: 0,
        longitude: 0,
        localizacao: 'URBANA',
        tipo: 'MUNICIPAL',
      },
    ]);
  };

  const removerParadaIntermediaria = (index: number) => {
    setParadasIntermediarias((prev) => prev.filter((_, i) => i !== index));
    if (modoMarcacaoMapa === index) {
      setModoMarcacaoMapa(null);
    }
  };

  const inverterInicioEFim = () => {
    const temp = pontoInicio;
    setPontoInicio(pontoFim);
    setPontoFim(temp);
    toast.info('Ponto de início e término invertidos!');
  };

  const pontosDoTrajetoFormatados = useMemo(() => {
    const lista: PontoLocalizacao[] = [];
    if (pontoInicio && pontoInicio.latitude !== 0) lista.push(pontoInicio);
    for (const p of paradasIntermediarias) {
      if (p && p.latitude !== 0) lista.push(p);
    }
    if (pontoFim && pontoFim.latitude !== 0) lista.push(pontoFim);
    return lista;
  }, [pontoInicio, paradasIntermediarias, pontoFim]);

  const calcularTrajetoGoogleMaps = async () => {
    if (pontosDoTrajetoFormatados.length < 2) {
      toast.error('Defina pelo menos o Ponto de Início e o Ponto de Fim!');
      return;
    }
    setCalculandoRota(true);
    try {
      const consumoKmL = parseFloat(consumoKmLInput.replace(',', '.')) || 10.0;
      const precoLitro = parseFloat(precoCombustivelInput.replace(',', '.')) || 6.29;

      const resultado = await obterRotaViariaReal(pontosDoTrajetoFormatados, consumoKmL, precoLitro);
      setResultadoRoteiro(resultado);

      if (mapRef.current && resultado.pontosOrdenados.length > 0) {
        const bounds = L.latLngBounds(
          resultado.pontosOrdenados.map((p) => [p.latitude, p.longitude] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
      toast.success('Trajeto calculado com sucesso!', { icon: '🚗' });
    } catch (err) {
      console.error('Erro ao calcular trajeto Google Maps:', err);
      toast.error('Erro ao calcular rota do trajeto.');
    } finally {
      setCalculandoRota(false);
    }
  };

  const limparTrajetoGoogleMaps = () => {
    setPontoInicio(SEDE_SEMED_SAPEACU);
    setPontoFim(null);
    setParadasIntermediarias([]);
    setModoMarcacaoMapa(null);
    setResultadoRoteiro(null);
    toast.info('Trajeto limpo.');
  };

  const escolasValidas = useMemo(() => {
    return escolas.filter(
      (e): e is EscolaComCoordenadas =>
        e.latitude !== null &&
        e.longitude !== null &&
        Number(e.latitude) !== 0 &&
        Number(e.longitude) !== 0
    );
  }, [escolas]);

  const escolasFiltradas = useMemo(() => {
    return escolasValidas.filter((esc) => {
      const atendeBusca =
        !buscaDebounced ||
        esc.nome.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
        (esc.endereco && esc.endereco.toLowerCase().includes(buscaDebounced.toLowerCase())) ||
        (esc.inep && esc.inep.includes(buscaDebounced));

      const atendeZona =
        filtroZona === 'todos' ||
        (filtroZona === 'URBANA' && (esc.localizacao || '').toUpperCase().includes('URBANA')) ||
        (filtroZona === 'RURAL' && (esc.localizacao || '').toUpperCase().includes('RURAL'));

      return atendeBusca && atendeZona;
    });
  }, [escolasValidas, buscaDebounced, filtroZona]);

  const proximaParada = useMemo(() => {
    if (!resultadoRoteiro || !posicaoVeiculo) return null;
    const pendentes = resultadoRoteiro.pontosOrdenados.filter(
      (p) => !paradasConcluidas.includes(p.id)
    );
    if (pendentes.length === 0) return null;
    const prox = pendentes[0];
    const dist = Math.round(
      calcularDistanciaHaversine(
        posicaoVeiculo.latitude,
        posicaoVeiculo.longitude,
        prox.latitude,
        prox.longitude
      ) * 1000
    );
    return { ponto: prox, distanciaMetros: dist };
  }, [resultadoRoteiro, posicaoVeiculo, paradasConcluidas]);

  // Carregar Rotas Designadas do Supabase com fallback offline
  const carregarRotasDesignadas = useCallback(async () => {
    setLoadingRotasDesignadas(true);
    // 1. Tenta carregar do cache IndexedDB
    try {
      const cached = await obterCacheEntidadeAlpha<any[]>('rotas-escolas', 'rotas_designadas');
      if (cached && cached.length > 0) {
        setRotasDesignadas(cached);
        if (funcionario?.id && !rotaAtivaDesignada) {
          const minhaRota = cached.find((r: any) => r.motorista_id === funcionario.id);
          if (minhaRota) setRotaAtivaDesignada(minhaRota);
        }
      }
    } catch {}

    // 2. Se estiver online, atualiza do Supabase e salva no cache
    if (navigator.onLine) {
      try {
        const { data, error } = await (supabase as any)
          .from('alpha_rotas')
          .select(`
            id,
            nome,
            descricao,
            motorista_id,
            veiculo_id,
            turno,
            pontos_parada,
            ativo,
            motorista:motorista_id (id, nome, cargo),
            veiculo:veiculo_id (id, placa, modelo)
          `)
          .eq('ativo', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          setRotasDesignadas(data);
          await salvarCacheEntidadeAlpha('rotas-escolas', 'rotas_designadas', data);

          // Se o motorista logado tiver uma rota atribuída, auto-seleciona
          if (funcionario?.id && !rotaAtivaDesignada) {
            const minhaRota = data.find((r: any) => r.motorista_id === funcionario.id);
            if (minhaRota) {
              setRotaAtivaDesignada(minhaRota);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar rotas designadas do servidor, mantendo cache:', err);
      } finally {
        setLoadingRotasDesignadas(false);
      }
    } else {
      setLoadingRotasDesignadas(false);
    }
  }, [supabase, funcionario?.id, rotaAtivaDesignada]);

  useEffect(() => {
    carregarRotasDesignadas();
  }, [carregarRotasDesignadas]);

  // Aplicar Rota Designada Selecionada
  const aplicarRotaDesignada = (rota: any) => {
    if (!rota) {
      setRotaAtivaDesignada(null);
      return;
    }

    setRotaAtivaDesignada(rota);
    const paradas = Array.isArray(rota.pontos_parada) ? rota.pontos_parada : [];

    const pontosFormatados: PontoLocalizacao[] = paradas.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      latitude: p.latitude,
      longitude: p.longitude,
      inep: p.inep ?? undefined,
      localizacao: p.localizacao ?? 'URBANA',
      tipo: p.tipo ?? 'MUNICIPAL',
    }));

    setEscolasSelecionadas(pontosFormatados);
    setResultadoRoteiro(null);
    setParadasConcluidas([]);

    salvarRotaAtiva({
      id: 'rota_ativa_atual',
      rota_id: rota.id,
      veiculo_id: rota.veiculo_id,
      nome: rota.nome,
      data_inicio: new Date().toISOString(),
      escolasSelecionadas: pontosFormatados,
      resultadoRoteiro: null,
      paradasConcluidas: [],
      emNavegacao: gpsAtivo,
    });

    toast.success(`Rota "${rota.nome}" carregada com ${pontosFormatados.length} paradas!`, {
      icon: '📍',
    });
  };

  // Estados do Modal de Download de Mapa Offline
  const [modalOfflineAberto, setModalOfflineAberto] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [baixandoMapa, setBaixandoMapa] = useState(false);
  const [tipoCamadaOffline, setTipoCamadaOffline] = useState<MapLayerType>('google_hybrid');
  const [maxZoomOffline, setMaxZoomOffline] = useState<number>(18);
  const [statusCache, setStatusCache] = useState<{ totalEmCache: number; tamanhoEstimadoMb: number }>({
    totalEmCache: 0,
    tamanhoEstimadoMb: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Estados do Ciclo de Vida da Ronda (Livre: Iniciar, Pausar, Retomar, Finalizar)
  const [statusRonda, setStatusRonda] = useState<'INATIVA' | 'EM_ANDAMENTO' | 'PAUSADA'>('INATIVA');
  const [horaInicioRonda, setHoraInicioRonda] = useState<string | null>(null);
  const [modalFinalizarRondaAberto, setModalFinalizarRondaAberto] = useState(false);

  // Modal de Check-in (Ponto da Rota ou Ponto Livre / Avulso)
  const [modalCheckinAberto, setModalCheckinAberto] = useState(false);
  const [escolaCheckin, setEscolaCheckin] = useState<PontoLocalizacao | null>(null);
  const [isCheckinLivre, setIsCheckinLivre] = useState(false);
  const [nomeLocalLivre, setNomeLocalLivre] = useState('');
  const [obsCheckin, setObsCheckin] = useState('');
  const [statusVisitaInput, setStatusVisitaInput] = useState<'REALIZADA' | 'IMPREVISTO' | 'AUSENTE'>('REALIZADA');
  const [odometroInput, setOdometroInput] = useState('');

  // 1. Sincronização da fila offline com o Supabase (Idempotente com upsert)
  const sincronizarFilaComServidor = useCallback(async () => {
    const pendentes = await obterVisitasPendentes();
    if (pendentes.length === 0) return;

    setSincronizando(true);
    try {
      // Renova a sessão antes de enviar para evitar 401 por JWT expirado
      await supabase.auth.getSession();

      const payload: any[] = pendentes.map((v) => ({
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

  // Controles do Ciclo de Vida da Ronda Livre
  const iniciarRonda = () => {
    iniciarGps();
    setSeguirCarro(true);
    setStatusRonda('EM_ANDAMENTO');
    const agora = new Date().toISOString();
    setHoraInicioRonda(agora);
    salvarRotaAtiva({
      id: 'rota_ativa_atual',
      nome: 'Roteiro de Visitas',
      data_inicio: agora,
      escolasSelecionadas,
      resultadoRoteiro,
      paradasConcluidas,
      emNavegacao: true,
    });
    toast.success('Ronda iniciada! GPS em alta precisão ativo.', {
      icon: '🚗',
    });
  };

  const pausarRonda = () => {
    pararGps();
    setStatusRonda('PAUSADA');
    toast.info('Ronda e navegação GPS pausadas.');
  };

  const retomarRonda = () => {
    iniciarGps();
    setSeguirCarro(true);
    setStatusRonda('EM_ANDAMENTO');
    toast.success('Ronda retomada! Rastreamento GPS ativo.', {
      icon: '🚗',
    });
  };

  const abrirFinalizacaoRonda = () => {
    setModalFinalizarRondaAberto(true);
  };

  const confirmarFinalizarRonda = async () => {
    pararGps();
    setStatusRonda('INATIVA');
    setHoraInicioRonda(null);
    setModalFinalizarRondaAberto(false);
    toast.success('Ronda finalizada com sucesso! Todos os registros foram consolidados.');
  };

  // Abrir modal de Check-in para uma escola da rota
  const abrirCheckinEscola = (esc: PontoLocalizacao) => {
    setEscolaCheckin(esc);
    setIsCheckinLivre(false);
    setNomeLocalLivre('');
    setObsCheckin('');
    setStatusVisitaInput('REALIZADA');
    setOdometroInput('');
    setModalCheckinAberto(true);
  };

  // Abrir modal de Check-in Livre (ponto avulso)
  const abrirCheckinLivre = () => {
    setEscolaCheckin(null);
    setIsCheckinLivre(true);
    setNomeLocalLivre('');
    setObsCheckin('');
    setStatusVisitaInput('REALIZADA');
    setOdometroInput('');
    setModalCheckinAberto(true);
  };

  // Confirmar Registro de Visita / Check-in (Escola ou Ponto Livre)
  const salvarCheckinVisita = async () => {
    const nomeFinal = isCheckinLivre
      ? (nomeLocalLivre.trim() || 'Check-in Livre / Ponto Avulso')
      : (escolaCheckin?.nome || 'Ponto de Parada');

    let distMetros: number | null = null;
    const latPonto = escolaCheckin?.latitude ?? posicaoVeiculo?.latitude ?? SEDE_SEMED_SAPEACU.latitude;
    const lngPonto = escolaCheckin?.longitude ?? posicaoVeiculo?.longitude ?? SEDE_SEMED_SAPEACU.longitude;

    if (posicaoVeiculo && escolaCheckin?.latitude && escolaCheckin?.longitude) {
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
      escola_id: isCheckinLivre || escolaCheckin?.tipo === 'SECRETARIA' ? null : (escolaCheckin?.id ?? null),
      escola_nome: nomeFinal,
      funcionario_id: funcionario?.id ?? null,
      rota_id: rotaAtivaDesignada?.id ?? null,
      veiculo_id: rotaAtivaDesignada?.veiculo_id ?? null,
      rota_nome: rotaAtivaDesignada?.nome || 'Roteiro de Visitas',
      data_hora_chegada: new Date().toISOString(),
      latitude: posicaoVeiculo?.latitude ?? latPonto,
      longitude: posicaoVeiculo?.longitude ?? lngPonto,
      distancia_ponto_metros: distMetros,
      odometro_km: odometroInput ? parseFloat(odometroInput.replace(',', '.')) : null,
      observacoes: obsCheckin.trim() || null,
      status: statusVisitaInput,
      sincronizado: false,
    };

    // 1. Salva na fila offline local (IndexedDB)
    await enfileirarVisitaOffline(novoRegistro);

    // 2. Atualiza estado de paradas concluídas (se for escola cadastrada)
    if (escolaCheckin?.id) {
      const novasConcluidas = Array.from(new Set([...paradasConcluidas, escolaCheckin.id]));
      setParadasConcluidas(novasConcluidas);

      if (resultadoRoteiro) {
        salvarRotaAtiva({
          id: 'rota_ativa_atual',
          rota_id: rotaAtivaDesignada?.id ?? null,
          veiculo_id: rotaAtivaDesignada?.veiculo_id ?? null,
          nome: rotaAtivaDesignada?.nome || 'Roteiro de Visitas',
          data_inicio: horaInicioRonda || new Date().toISOString(),
          escolasSelecionadas,
          resultadoRoteiro,
          paradasConcluidas: novasConcluidas,
          emNavegacao: gpsAtivo,
        });
      }
    }

    const pendentes = await obterVisitasPendentes();
    setVisitasPendentes(pendentes);
    setModalCheckinAberto(false);

    toast.success(`Check-in em "${nomeFinal}" registrado!`, {
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
      await baixarMapaOfflineSapeacu(
        (prog) => {
          setDownloadProgress(prog);
        },
        controller.signal,
        13,
        maxZoomOffline,
        tipoCamadaOffline
      );

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

  // Escutador de Cliques no Mapa Leaflet para Marcação de Pontos
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (modoMarcacaoMapaRef.current === null) return;
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        const pontoLivre: PontoLocalizacao = {
          id: `ponto_mapa_${Date.now()}`,
          nome: `Ponto no Mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          latitude: lat,
          longitude: lng,
          localizacao: 'URBANA',
          tipo: 'MUNICIPAL',
        };
        definirPontoPorMarcacao(pontoLivre);
      },
    });
    return null;
  }

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

          {/* Botões de Ação da Ronda, GPS e Download Offline */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Check-in Livre (Qualquer Local) */}
            <button
              type="button"
              onClick={abrirCheckinLivre}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/25 transition-colors cursor-pointer shadow-2xs"
              title="Registrar um ponto de parada ou check-in avulso em qualquer local"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Check-in Livre</span>
            </button>

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

            {/* Controles de Ronda: Iniciar / Pausar / Retomar / Finalizar */}
            {statusRonda === 'INATIVA' ? (
              <button
                type="button"
                onClick={iniciarRonda}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Car className="w-4 h-4" />
                <span>Iniciar Ronda</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
                {statusRonda === 'EM_ANDAMENTO' ? (
                  <button
                    type="button"
                    onClick={pausarRonda}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                    title="Pausar rastreamento da ronda"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={retomarRonda}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                    title="Retomar rastreamento da ronda"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Retomar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={abrirFinalizacaoRonda}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                  title="Finalizar e encerrar esta ronda"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Finalizar Ronda</span>
                </button>
              </div>
            )}
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
                  <span>Ronda em Andamento (GPS Satélite)</span>
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
                  <p className="text-xs text-muted-foreground">Rastreando trajeto em tempo real...</p>
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

        {/* Painel de Planejamento de Trajeto (Estilo Google Maps) */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Compass className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Trajeto e Roteirização (Estilo Google Maps)</span>
                  <span className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-400/30 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                    Google Maps UI
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Defina o ponto de início, paradas no meio (+) e o destino marcando no mapa ou selecionando os locais.
                </p>
              </div>
            </div>

            {pontoInicio && pontoFim && (
              <button
                type="button"
                onClick={inverterInicioEFim}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-xl hover:bg-sky-500/20 transition-colors cursor-pointer"
                title="Inverter Ponto de Início e Chegada"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Inverter Origem/Fim</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Campo 1: Ponto de Início (Origem - A) */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 flex justify-center shrink-0">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Ponto de Início (Origem)" />
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={pontoInicio?.id || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'semed') setPontoInicio(SEDE_SEMED_SAPEACU);
                    else if (val === 'gps' && posicaoVeiculo) {
                      setPontoInicio({
                        id: 'gps_atual',
                        nome: `Minha Localização GPS (${posicaoVeiculo.latitude.toFixed(4)}, ${posicaoVeiculo.longitude.toFixed(4)})`,
                        latitude: posicaoVeiculo.latitude,
                        longitude: posicaoVeiculo.longitude,
                        localizacao: 'URBANA',
                        tipo: 'GPS',
                      });
                    } else {
                      const esc = escolasValidas.find((item) => item.id === val);
                      if (esc) setPontoInicio({ id: esc.id, nome: esc.nome, latitude: esc.latitude, longitude: esc.longitude, inep: esc.inep ?? undefined, localizacao: esc.localizacao ?? 'URBANA' });
                      else setPontoInicio(null);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">Selecione o Ponto de Início...</option>
                  <option value="semed">🏛️ Sede SEMED (Sapeaçu)</option>
                  {posicaoVeiculo && <option value="gps">📡 Minha Localização GPS Atual</option>}
                  <optgroup label="Escolas Municipais">
                    {escolasValidas.map((esc) => (
                      <option key={`inc_${esc.id}`} value={esc.id}>
                        📍 {esc.nome}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setModoMarcacaoMapa(modoMarcacaoMapa === 'inicio' ? null : 'inicio')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap',
                    modoMarcacaoMapa === 'inicio'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-md animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  )}
                  title="Clique para ir ao mapa e selecionar o Ponto de Início"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{modoMarcacaoMapa === 'inicio' ? 'Aguardando Clique...' : 'Marcar no Mapa'}</span>
                </button>
              </div>
            </div>

            {/* Paradas Intermediárias (Waypoints) */}
            {paradasIntermediarias.map((parada, idx) => (
              <div key={`parada_${idx}`} className="flex items-center gap-2.5 pl-0.5">
                <div className="w-6 flex justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-sky-500 border border-white shadow-xs" title={`Parada ${idx + 1}`} />
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={parada?.id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const esc = escolasValidas.find((item) => item.id === val);
                      if (esc) {
                        const novoPonto = { id: esc.id, nome: esc.nome, latitude: esc.latitude, longitude: esc.longitude, inep: esc.inep ?? undefined, localizacao: esc.localizacao ?? 'URBANA' };
                        setParadasIntermediarias((prev) => {
                          const copy = [...prev];
                          copy[idx] = novoPonto;
                          return copy;
                        });
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="">{parada && parada.latitude !== 0 ? `🔵 Parada ${idx + 1}: ${parada.nome}` : `Selecione a Parada ${idx + 1}...`}</option>
                    <option value="semed">🏛️ Sede SEMED (Sapeaçu)</option>
                    <optgroup label="Escolas Municipais">
                      {escolasValidas.map((esc) => (
                        <option key={`par_${idx}_${esc.id}`} value={esc.id}>
                          📍 {esc.nome}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModoMarcacaoMapa(modoMarcacaoMapa === idx ? null : idx)}
                      className={cn(
                        'inline-flex flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap',
                        modoMarcacaoMapa === idx
                          ? 'bg-sky-500 text-white border-sky-600 shadow-md animate-pulse'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20'
                      )}
                      title={`Clique no mapa para marcar a Parada ${idx + 1}`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{modoMarcacaoMapa === idx ? 'Aguardando Clique...' : 'Marcar no Mapa'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removerParadaIntermediaria(idx)}
                      className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Remover esta parada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Botão "+" para Adicionar Parada no Meio */}
            <div className="flex items-center gap-2.5 pl-0.5 pt-1">
              <div className="w-6 flex justify-center shrink-0">
                <button
                  type="button"
                  onClick={adicionarParadaIntermediaria}
                  className="w-5 h-5 rounded-full bg-sky-500/15 hover:bg-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs transition-colors cursor-pointer border border-sky-500/30"
                  title="Adicionar Parada no Meio do Trajeto (+ Google Maps)"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={adicionarParadaIntermediaria}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar trajeto/parada no meio (+ Google Maps)</span>
              </button>
            </div>

            {/* Campo 2: Ponto de Fim (Destino - B) */}
            <div className="flex items-center gap-2.5 pt-1">
              <div className="w-6 flex justify-center shrink-0">
                <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-xs" title="Ponto de Fim (Destino)" />
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={pontoFim?.id || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'semed') setPontoFim(SEDE_SEMED_SAPEACU);
                    else {
                      const esc = escolasValidas.find((item) => item.id === val);
                      if (esc) setPontoFim({ id: esc.id, nome: esc.nome, latitude: esc.latitude, longitude: esc.longitude, inep: esc.inep ?? undefined, localizacao: esc.localizacao ?? 'URBANA' });
                      else setPontoFim(null);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="">Selecione o Ponto de Fim / Destino...</option>
                  <option value="semed">🏛️ Sede SEMED (Sapeaçu)</option>
                  <optgroup label="Escolas Municipais">
                    {escolasValidas.map((esc) => (
                      <option key={`fim_${esc.id}`} value={esc.id}>
                        📍 {esc.nome}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setModoMarcacaoMapa(modoMarcacaoMapa === 'fim' ? null : 'fim')}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap',
                    modoMarcacaoMapa === 'fim'
                      ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  )}
                  title="Clique para ir ao mapa e selecionar o Ponto de Destino"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{modoMarcacaoMapa === 'fim' ? 'Aguardando Clique...' : 'Marcar no Mapa'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Rodapé com Resumo e Botão de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="font-bold text-foreground">
                {pontosDoTrajetoFormatados.length} ponto(s) definido(s)
              </span>
              {pontosDoTrajetoFormatados.length < 2 && (
                <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                  (Defina Início e Fim para traçar a rota)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={limparTrajetoGoogleMaps}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Limpar Trajeto
              </button>

              <button
                type="button"
                onClick={calcularTrajetoGoogleMaps}
                disabled={calculandoRota || pontosDoTrajetoFormatados.length < 2}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Route className={cn('w-4 h-4', calculandoRota && 'animate-spin')} />
                <span>{calculandoRota ? 'Calculando Rota...' : 'Calcular Trajeto'}</span>
              </button>
            </div>
          </div>
        </div>

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
          {modoMarcacaoMapa !== null && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-sky-600 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
              <span className="text-xs font-bold">
                Clique em qualquer lugar no mapa ou sobre uma escola para definir{' '}
                {modoMarcacaoMapa === 'inicio'
                  ? 'o PONTO DE INÍCIO 🟢'
                  : modoMarcacaoMapa === 'fim'
                  ? 'o PONTO DE FIM 🔴'
                  : `a PARADA ${Number(modoMarcacaoMapa) + 1} 🔵`}
              </span>
              <button
                type="button"
                onClick={() => setModoMarcacaoMapa(null)}
                className="ml-2 px-2.5 py-1 text-[11px] font-extrabold bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          <MapContainer
            ref={mapRef}
            center={SAPEACU_CENTER}
            zoom={14}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <MapClickHandler />
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
        {/* Seção de Rotas Designadas (Sistema Alpha) */}
        {rotasDesignadas.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold text-foreground">Rotas Planejadas Alpha</h4>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 rounded-md border border-blue-500/20">
                {rotasDesignadas.length} DISPONÍVEIS
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {rotasDesignadas.map((r) => {
                const isMinhaRota = funcionario?.id && r.motorista_id === funcionario.id;
                const isAtiva = rotaAtivaDesignada?.id === r.id;
                const qtdParadas = Array.isArray(r.pontos_parada) ? r.pontos_parada.length : 0;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => aplicarRotaDesignada(isAtiva ? null : r)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5',
                      isAtiva
                        ? 'bg-blue-600/15 border-blue-500 text-foreground shadow-xs'
                        : isMinhaRota
                        ? 'bg-sky-500/10 border-sky-500/40 text-foreground hover:bg-sky-500/15'
                        : 'bg-surface-2 dark:bg-secondary/40 border-border hover:border-blue-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate flex items-center gap-1.5">
                        {isAtiva && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {r.nome}
                      </span>
                      {isMinhaRota && (
                        <span className="text-[9px] font-extrabold bg-sky-500 text-white px-1.5 py-0.2 rounded shrink-0">
                          SUA ROTA
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {r.veiculo ? `🚐 ${r.veiculo.modelo} (${r.veiculo.placa})` : '🚐 Veículo avulso'}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {qtdParadas} paradas • {r.turno}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {rotaAtivaDesignada && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Rota ativa:</span>
                <button
                  type="button"
                  onClick={() => aplicarRotaDesignada(null)}
                  className="text-rose-500 hover:underline font-bold text-[10px] cursor-pointer"
                >
                  Desmarcar rota
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {rotaAtivaDesignada ? rotaAtivaDesignada.nome : 'Roteiro de Visitas'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {rotaAtivaDesignada?.veiculo
                    ? `Veículo: ${rotaAtivaDesignada.veiculo.modelo} (${rotaAtivaDesignada.veiculo.placa})`
                    : 'Melhor caminho & economia'}
                </p>
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
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
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

            <div className="bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl p-3.5 text-xs text-muted-foreground flex flex-col gap-2.5">
              <p>
                Ao baixar o mapa, os quadrantes da zona urbana e rural de Sapeaçu serão salvos no armazenamento interno do seu navegador para uso sem internet.
              </p>

              {/* Opções de Configuração do Download */}
              <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Tipo de Mapa a Baixar:
                  </label>
                  <select
                    value={tipoCamadaOffline}
                    onChange={(e: any) => setTipoCamadaOffline(e.target.value)}
                    disabled={baixandoMapa}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="google_hybrid">Google Híbrido (Satélite + Ruas - Recomendado)</option>
                    <option value="osm">OpenStreetMap (Mapa de Ruas Vetorial)</option>
                    <option value="both">Ambos os Mapas (Completo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Profundidade do Zoom:
                  </label>
                  <select
                    value={maxZoomOffline}
                    onChange={(e: any) => setMaxZoomOffline(Number(e.target.value))}
                    disabled={baixandoMapa}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value={18}>Zoom Detalhado Rumo Máximo (Zooms 13 ao 18 - Nível de Rua e Prédios)</option>
                    <option value={16}>Zoom Médio (Zooms 13 ao 16 - Visão Geral)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-border/60 text-foreground font-semibold">
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
                    Baixar / Atualizar Mapa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Check-in / Registro de Visita (Escola da Rota ou Ponto Livre) */}
      {modalCheckinAberto && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {isCheckinLivre ? 'Check-in Livre / Ponto Avulso' : 'Registro de Chegada / Visita'}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                    {isCheckinLivre ? 'Registro instantâneo via GPS' : (escolaCheckin?.nome ?? 'Ponto da Rota')}
                  </p>
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
              {isCheckinLivre && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Nome do Local / Ponto Avulso *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Posto São Cristóvão, Secretaria de Obras, Escola Fechada..."
                    value={nomeLocalLivre}
                    onChange={(e) => setNomeLocalLivre(e.target.value)}
                    className="w-full bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-sky-500 font-semibold"
                  />
                </div>
              )}

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

      {/* Modal de Confirmação para Finalizar Ronda */}
      {modalFinalizarRondaAberto && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Finalizar Ronda</h3>
                  <p className="text-xs text-muted-foreground">Consolidação e encerramento do trajeto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalFinalizarRondaAberto(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl text-xs text-muted-foreground flex flex-col gap-2">
              <p className="text-foreground font-semibold">
                Deseja realmente finalizar a ronda em andamento?
              </p>
              <p>
                O rastreamento de GPS será desativado e todos os check-ins registrados ficarão disponíveis no Histórico & Replay.
              </p>
              {horaInicioRonda && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-foreground font-bold">
                  <span>Início da Ronda:</span>
                  <span>{new Date(horaInicioRonda).toLocaleTimeString('pt-BR')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalFinalizarRondaAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Continuar Ronda
              </button>
              <button
                type="button"
                onClick={confirmarFinalizarRonda}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                Confirmar e Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

