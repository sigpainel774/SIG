import {
  TrackWaypoint,
  RouteVisit,
  TravelMode,
  MovementState,
  VisitasArea,
  VisitasVeiculo,
} from '@/types/visitas';
import { calcularDistanciaMetros, pontoDentroDoPoligono } from './areaCalculator';

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

  constructor(
    id: string,
    modo: TravelMode = 'driving',
    veiculo?: VisitasVeiculo | null,
    areas: VisitasArea[] = []
  ) {
    this.id = id;
    this.modo = modo;
    this.startedAt = Date.now();
    this.veiculo = veiculo;
    this.areas = areas;
  }

  public get config(): TrackingConfig {
    return TRACKING_CONFIGS[this.modo];
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
    return this.totalDistanceMeters;
  }

  public getMovingSeconds(now: number = Date.now()): number {
    const last = this.positions[this.positions.length - 1];
    const active =
      this.state === 'moving' && last
        ? Math.min(
            Math.max(0, Math.floor((now - last.timestamp) / 1000)),
            this.config.maximumSampleGapSeconds
          )
        : 0;
    return this.movingSeconds + active;
  }

  public getVisitSeconds(now: number = Date.now()): number {
    const closed = this.visits.reduce((acc, v) => acc + v.durationSeconds, 0);
    const active =
      this.state === 'visit' && this.stationarySince
        ? Math.max(0, Math.floor((now - this.stationarySince) / 1000))
        : 0;
    return closed + active;
  }

  /**
   * Adiciona um novo waypoint GPS e recalcula os estados de movimento/parada
   */
  public addPosition(
    lat: number,
    lng: number,
    accuracy: number,
    rawSpeedMps: number | null,
    heading: number,
    timestamp: number = Date.now()
  ): boolean {
    if (isNaN(lat) || isNaN(lng) || accuracy > this.config.maximumAccuracyMeters) {
      return false;
    }

    const previous = this.positions[this.positions.length - 1] || null;

    if (previous && timestamp <= previous.timestamp) {
      return false;
    }

    const step = previous
      ? calcularDistanciaMetros(previous.latitude, previous.longitude, lat, lng)
      : 0;

    let elapsedSeconds = 0;
    let discontinuity = false;

    if (previous) {
      elapsedSeconds = (timestamp - previous.timestamp) / 1000;
      if (elapsedSeconds > this.config.maximumSampleGapSeconds) {
        discontinuity = true;
        this.stationarySince = null;
        this.stationaryAnchor = null;
        this.state = 'stopped';
        this.resetMovementEvidence();
      }

      if (
        elapsedSeconds > 0 &&
        step / elapsedSeconds > this.config.maximumPlausibleSpeedMps
      ) {
        return false;
      }
    }

    const speedMps = rawSpeedMps && rawSpeedMps > 0 ? rawSpeedMps : 0;
    const inferredSpeedMps = elapsedSeconds > 0 ? step / elapsedSeconds : 0;
    const speedKmh = Number((Math.max(speedMps, inferredSpeedMps) * 3.6).toFixed(1));

    const noiseThreshold = previous
      ? (accuracy + previous.accuracy) * 0.6
      : this.config.minimumMovementMeters;

    const requiredStep = Math.min(
      Math.max(noiseThreshold, this.config.minimumMovementMeters),
      this.config.strongMovementMeters
    );

    const movementEvidence =
      previous !== null &&
      step >= requiredStep &&
      (speedMps >= this.config.movingSpeedMps ||
        inferredSpeedMps >= this.config.movingSpeedMps);

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
      speedMps: speedMps || inferredSpeedMps,
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

    this.stationarySince = null;
    this.stationaryAnchor = null;
  }

  /**
   * Finaliza o trajeto e calcula os resumos finais de telemetria e combustível
   */
  public finish(endedAt: number = Date.now()) {
    if (this.state === 'visit') {
      this.closeVisit(endedAt);
    }

    const totalSeconds = Math.max(0, Math.floor((endedAt - this.startedAt) / 1000));
    const moving = Math.min(this.getMovingSeconds(endedAt), totalSeconds);
    const visitSecs = this.getVisitSeconds(endedAt);

    let estimatedLiters: number | null = null;
    let estimatedCost: number | null = null;

    if (this.modo === 'driving' && this.veiculo && this.veiculo.consumo_km_l > 0) {
      const distKm = this.totalDistanceMeters / 1000;
      estimatedLiters = Number((distKm / this.veiculo.consumo_km_l).toFixed(2));
      estimatedCost = Number((estimatedLiters * this.veiculo.preco_litro).toFixed(2));
    }

    const firstPos = this.positions[0] || null;
    const lastPos = this.positions[this.positions.length - 1] || null;

    return {
      id: this.id,
      modo: this.modo,
      started_at: new Date(this.startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      origin_lat: firstPos?.latitude ?? null,
      origin_lng: firstPos?.longitude ?? null,
      destination_lat: lastPos?.latitude ?? null,
      destination_lng: lastPos?.longitude ?? null,
      distance_meters: Math.round(this.totalDistanceMeters),
      moving_seconds: moving,
      visit_seconds: visitSecs,
      estimated_liters: estimatedLiters,
      estimated_cost: estimatedCost,
      posicoes: this.positions,
      visitas_registradas: this.visits,
    };
  }
}
