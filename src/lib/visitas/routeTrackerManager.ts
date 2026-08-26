import {
  TrackWaypoint,
  RouteVisit,
  TravelMode,
  MovementState,
  VisitasArea,
  VisitasVeiculo,
} from '@/types/visitas';
import { calcularDistanciaMetros, pontoDentroDoPoligono } from './areaCalculator';
import { obterVisitasConfig, VisitasConfig } from './visitasConfigService';

export interface TrackingConfig {
  visitMinimumSeconds: number;
  visitRadiusMeters: number;
  stationarySpeedMps: number;
  maximumAccuracyMeters: number;
  maximumPlausibleSpeedMps: number;
  maximumSampleGapSeconds: number;
  movingSpeedMps: number;
  minimumMovementMeters: number;
  strongMovementMeters: number;
  movementSamples: number;
  fusionMinutes: number;
}

export const TRACKING_CONFIGS: Record<TravelMode, TrackingConfig> = {
  walking: {
    visitMinimumSeconds: 60,
    visitRadiusMeters: 20,
    stationarySpeedMps: 0.7,
    maximumAccuracyMeters: 35,
    maximumPlausibleSpeedMps: 15,
    maximumSampleGapSeconds: 120,
    movingSpeedMps: 0.8,
    minimumMovementMeters: 4,
    strongMovementMeters: 12,
    movementSamples: 2,
    fusionMinutes: 15,
  },
  driving: {
    visitMinimumSeconds: 90,
    visitRadiusMeters: 25,
    stationarySpeedMps: 1.5,
    maximumAccuracyMeters: 30,
    maximumPlausibleSpeedMps: 70, // ~252 km/h
    maximumSampleGapSeconds: 120,
    movingSpeedMps: 2.5, // ~9 km/h
    minimumMovementMeters: 8,
    strongMovementMeters: 30,
    movementSamples: 2,
    fusionMinutes: 15,
  },
};

export class RouteTrackerManager {
  private id: string;
  private modo: TravelMode;
  private startedAt: number;
  private veiculo?: VisitasVeiculo | null;
  private areas: VisitasArea[];

  private positions: TrackWaypoint[] = [];
  private visits: RouteVisit[] = [];

  private state: MovementState = 'stopped';
  private stationarySince: number | null = null;
  private stationaryAnchor: [number, number] | null = null;

  private totalDistanceMeters = 0;
  private movingSeconds = 0;
  private movementEvidenceCount = 0;
  private candidateDistanceMeters = 0;
  private movementCandidateSince: number | null = null;

  private userConfig: VisitasConfig;

  constructor(
    id: string,
    modo: TravelMode = 'driving',
    veiculo?: VisitasVeiculo | null,
    areas: VisitasArea[] = [],
    customConfig?: Partial<VisitasConfig>
  ) {
    this.id = id;
    this.modo = modo;
    this.startedAt = Date.now();
    this.veiculo = veiculo;
    this.areas = areas;
    
    // Carrega configuração de persistência e mescla com customConfig
    const base = obterVisitasConfig();
    this.userConfig = {
      tempoMinimoSegundos: customConfig?.tempoMinimoSegundos ?? base.tempoMinimoSegundos,
      raioToleranciaMetros: customConfig?.raioToleranciaMetros ?? base.raioToleranciaMetros,
      fusaoMinutos: customConfig?.fusaoMinutos ?? base.fusaoMinutos,
      iconeTipo: customConfig?.iconeTipo ?? base.iconeTipo,
      iconeCustomUrl: customConfig?.iconeCustomUrl ?? base.iconeCustomUrl,
    };
  }

  public get config(): TrackingConfig {
    const base = TRACKING_CONFIGS[this.modo];
    return {
      ...base,
      visitMinimumSeconds: this.userConfig.tempoMinimoSegundos,
      visitRadiusMeters: this.userConfig.raioToleranciaMetros,
      fusionMinutes: this.userConfig.fusaoMinutos,
    };
  }

  public updateConfig(newConfig: Partial<VisitasConfig>) {
    if (newConfig.tempoMinimoSegundos !== undefined) {
      this.userConfig.tempoMinimoSegundos = newConfig.tempoMinimoSegundos;
    }
    if (newConfig.raioToleranciaMetros !== undefined) {
      this.userConfig.raioToleranciaMetros = newConfig.raioToleranciaMetros;
    }
    if (newConfig.fusaoMinutos !== undefined) {
      this.userConfig.fusaoMinutos = newConfig.fusaoMinutos;
    }
  }

  public getPositions(): TrackWaypoint[] {
    return [...this.positions];
  }

  public getVisits(): RouteVisit[] {
    const list = [...this.visits];
    // Se há uma visita ocorrendo agora, inclui na visualização em tempo real
    if (this.state === 'visit' && this.stationarySince && this.stationaryAnchor) {
      const now = this.positions.length > 0 ? this.positions[this.positions.length - 1].timestamp : Date.now();
      const durationSeconds = Math.max(0, Math.floor((now - this.stationarySince) / 1000));
      const anchor = this.stationaryAnchor;
      const matchedArea = this.areas.find((area) =>
        pontoDentroDoPoligono([anchor[0], anchor[1]], area.vertices)
      );

      list.push({
        id: `visita_em_andamento_${this.id}`,
        trackId: this.id,
        startedAt: new Date(this.stationarySince).toISOString(),
        endedAt: new Date(now).toISOString(),
        latitude: anchor[0],
        longitude: anchor[1],
        areaId: matchedArea?.id ?? null,
        areaNome: matchedArea?.nome ?? 'Parada Detectada',
        durationSeconds,
      });
    }
    return list;
  }

  public getState(): MovementState {
    return this.state;
  }

  public getStationarySince(): number | null {
    return this.stationarySince;
  }

  public getStationaryElapsedSeconds(): number {
    return this.stationarySince ? Math.max(0, Math.floor((Date.now() - this.stationarySince) / 1000)) : 0;
  }

  public getMinVisitSeconds(): number {
    return this.config.visitMinimumSeconds || 60;
  }

  public getDistanceMeters(): number {
    return Math.round(this.totalDistanceMeters);
  }

  public getMovingSeconds(): number {
    return this.movingSeconds;
  }

  public getVisitSeconds(): number {
    return this.getVisits().reduce((acc, v) => acc + v.durationSeconds, 0);
  }

  public getEstimatedLiters(): number {
    if (!this.veiculo || this.modo === 'walking') return 0;
    const consumo = Number(this.veiculo.consumo_km_l) || 10;
    const km = this.totalDistanceMeters / 1000;
    return Number((km / consumo).toFixed(2));
  }

  public getEstimatedCost(): number {
    if (!this.veiculo || this.modo === 'walking') return 0;
    const litros = this.getEstimatedLiters();
    const preco = Number(this.veiculo.preco_litro) || 5.89;
    return Number((litros * preco).toFixed(2));
  }

  public addPosition(
    lat: number,
    lng: number,
    accuracy: number,
    speedMps: number | null,
    heading: number,
    timestamp: number = Date.now()
  ): boolean {
    return this.processPosition(lat, lng, accuracy, speedMps, heading, timestamp);
  }

  public processPosition(
    lat: number,
    lng: number,
    accuracy: number,
    speedMps: number | null,
    heading: number,
    timestamp: number = Date.now()
  ): boolean {
    // 1. Filtro de precisão do GPS (ignora ruídos acima do limite)
    if (accuracy > this.config.maximumAccuracyMeters) {
      return false;
    }

    const previous = this.positions.length > 0 ? this.positions[this.positions.length - 1] : null;

    let step = 0;
    let elapsedSeconds = 0;
    let inferredSpeedMps = 0;
    let discontinuity = false;

    if (previous) {
      step = calcularDistanciaMetros(previous.latitude, previous.longitude, lat, lng);
      elapsedSeconds = (timestamp - previous.timestamp) / 1000;

      if (elapsedSeconds <= 0) return false;

      inferredSpeedMps = step / elapsedSeconds;

      // Ignora saltos impossíveis de telemetria
      if (inferredSpeedMps > this.config.maximumPlausibleSpeedMps) {
        return false;
      }

      if (elapsedSeconds > this.config.maximumSampleGapSeconds) {
        discontinuity = true;
      }
    }

    const speedKmh = speedMps !== null && speedMps >= 0 ? speedMps * 3.6 : inferredSpeedMps * 3.6;

    const noiseThreshold = (accuracy + (previous ? previous.accuracy : accuracy)) * 0.4;
    const requiredStep = Math.min(
      Math.max(noiseThreshold, this.config.minimumMovementMeters),
      this.config.strongMovementMeters
    );

    const isMovingBySpeed = speedMps !== null && speedMps >= this.config.movingSpeedMps;
    const isMovingByInferred = inferredSpeedMps >= this.config.movingSpeedMps;

    const movementEvidence =
      previous !== null &&
      step >= requiredStep &&
      (isMovingBySpeed || isMovingByInferred);

    const strongMovement =
      movementEvidence &&
      step >= Math.max(this.config.strongMovementMeters, requiredStep * 2);

    if (!movementEvidence) {
      this.resetMovementEvidence();
      if (this.state === 'moving') {
        this.state = 'stopped';
      }

      if (this.stationarySince === null || discontinuity) {
        this.stationarySince = timestamp;
        this.stationaryAnchor = [lat, lng];
      }

      const anchor = this.stationaryAnchor || [lat, lng];
      const distFromAnchor = calcularDistanciaMetros(anchor[0], anchor[1], lat, lng);

      // TOLERÂNCIA DE QUINTAL / MOVIMENTO NO MESMO IMÓVEL:
      // Se a movimentação estiver dentro do raio de tolerância (ex: 20 metros),
      // mantém o mesmo anchor e continua acumulando tempo na mesma visita!
      if (distFromAnchor > this.config.visitRadiusMeters) {
        this.stationarySince = timestamp;
        this.stationaryAnchor = [lat, lng];
      } else if (
        timestamp - this.stationarySince >=
        this.config.visitMinimumSeconds * 1000
      ) {
        this.state = 'visit';
      }
    } else {
      if (this.state === 'moving') {
        this.movingSeconds += Math.round(elapsedSeconds);
        this.totalDistanceMeters += step;
        this.resetMovementEvidence();
      } else {
        this.movementEvidenceCount++;
        if (!this.movementCandidateSince && previous) {
          this.movementCandidateSince = previous.timestamp;
        }
        this.candidateDistanceMeters += step;

        const confirmed =
          strongMovement || this.movementEvidenceCount >= this.config.movementSamples;

        if (!confirmed) {
          this.state = 'stopped';
        } else {
          if (this.state === 'visit') {
            this.closeVisit(timestamp);
          }
          this.state = 'moving';
          if (this.movementCandidateSince) {
            const candidateElapsed = Math.min(
              Math.floor((timestamp - this.movementCandidateSince) / 1000),
              this.config.maximumSampleGapSeconds
            );
            this.movingSeconds += candidateElapsed;
          }
          this.totalDistanceMeters += this.candidateDistanceMeters;
          this.resetMovementEvidence();
        }
      }

      this.stationarySince = null;
      this.stationaryAnchor = null;
    }

    const waypoint: TrackWaypoint = {
      latitude: lat,
      longitude: lng,
      timestamp,
      speedKmh,
      speedMps: speedMps !== null && speedMps >= 0 ? speedMps : inferredSpeedMps,
      heading: isNaN(heading) ? 0 : heading,
      accuracy: Math.round(accuracy),
      state: this.state,
      distanceM: Math.round(step),
    };

    this.positions.push(waypoint);
    return true;
  }

  private resetMovementEvidence() {
    this.movementEvidenceCount = 0;
    this.candidateDistanceMeters = 0;
    this.movementCandidateSince = null;
  }

  private closeVisit(endedAt: number) {
    const start = this.stationarySince;
    const anchor = this.stationaryAnchor;

    if (start && anchor && endedAt > start) {
      const durationSeconds = Math.floor((endedAt - start) / 1000);

      // ── FUSÃO ANTI-DUPLICAÇÃO DE VISITAS NO MESMO IMÓVEL (QUINTAL / RE-ENTRADA) ──
      const lastVisit = this.visits[this.visits.length - 1];
      if (lastVisit) {
        const distToLast = calcularDistanciaMetros(lastVisit.latitude, lastVisit.longitude, anchor[0], anchor[1]);
        const lastEnded = new Date(lastVisit.endedAt).getTime();
        const timeSinceLastSec = (start - lastEnded) / 1000;
        const maxFusionSec = this.config.fusionMinutes * 60;

        if (distToLast <= this.config.visitRadiusMeters && timeSinceLastSec <= maxFusionSec) {
          lastVisit.endedAt = new Date(endedAt).toISOString();
          lastVisit.durationSeconds += durationSeconds;
          return;
        }
      }

      // Localiza se o anchor estava dentro de alguma das áreas cadastradas
      const matchedArea = this.areas.find((area) =>
        pontoDentroDoPoligono([anchor[0], anchor[1]], area.vertices)
      );

      this.visits.push({
        id: crypto.randomUUID(),
        trackId: this.id,
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        latitude: anchor[0],
        longitude: anchor[1],
        areaId: matchedArea?.id ?? null,
        areaNome: matchedArea?.nome ?? 'Parada Detectada',
        durationSeconds,
      });
    }
  }

  /**
   * Força o registro imediato de uma visita no ponto atual, sem precisar aguardar o temporizador de parada.
   */
  public markImmediateVisit(
    lat?: number,
    lng?: number,
    customAreaNome?: string,
    customAreaId?: string
  ): RouteVisit {
    const lastPos = this.positions.length > 0 ? this.positions[this.positions.length - 1] : null;
    const targetLat = lat ?? (lastPos ? lastPos.latitude : (this.stationaryAnchor ? this.stationaryAnchor[0] : 0));
    const targetLng = lng ?? (lastPos ? lastPos.longitude : (this.stationaryAnchor ? this.stationaryAnchor[1] : 0));
    const now = Date.now();
    const start = this.stationarySince || (now - 1000);

    const matchedArea = this.areas.find((area) =>
      pontoDentroDoPoligono([targetLat, targetLng], area.vertices)
    );

    const visit: RouteVisit = {
      id: crypto.randomUUID(),
      trackId: this.id,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(now).toISOString(),
      latitude: targetLat,
      longitude: targetLng,
      areaId: customAreaId ?? matchedArea?.id ?? null,
      areaNome: customAreaNome ?? matchedArea?.nome ?? 'Visita Imediata (Manual)',
      durationSeconds: Math.max(1, Math.floor((now - start) / 1000)),
    };

    this.stationarySince = now;
    this.stationaryAnchor = [targetLat, targetLng];
    this.visits.push(visit);

    return visit;
  }

  public finish(endedAt: number = Date.now()): any {
    this.finalize(endedAt);
    return {
      id: this.id,
      modo: this.modo,
      started_at: new Date(this.startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      distance_meters: this.getDistanceMeters(),
      moving_seconds: this.getMovingSeconds(),
      visit_seconds: this.getVisitSeconds(),
      estimated_liters: this.getEstimatedLiters(),
      estimated_cost: this.getEstimatedCost(),
      posicoes: this.getPositions(),
      visitas_registradas: this.getVisits(),
    };
  }

  public finalize(endedAt: number = Date.now()) {
    if (this.state === 'visit') {
      this.closeVisit(endedAt);
    }
    this.state = 'stopped';
  }
}
