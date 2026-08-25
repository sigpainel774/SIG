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
    return [...this.visits];
  }

  public getState(): MovementState {
    return this.state;
  }

  public getDistanceMeters(): number {
    return Math.round(this.totalDistanceMeters);
  }

  public getMovingSeconds(): number {
    return this.movingSeconds;
  }

  public getVisitSeconds(): number {
    return this.visits.reduce((acc, v) => acc + v.durationSeconds, 0);
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
      // Se a última visita registrada foi dentro do raio de tolerância (ex: até 20m)
      // e ocorreu em um intervalo recente (ex: até 15 minutos), acumula o tempo na mesma visita!
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
        areaNome: matchedArea?.nome ?? null,
        durationSeconds,
      });
    }
  }

  public finish(endedAt: number = Date.now()) {
    return this.finalize(endedAt);
  }

  public finalize(endedAt: number = Date.now()) {
    if (this.state === 'visit') {
      this.closeVisit(endedAt);
    }
    this.state = 'stopped';
  }
}
