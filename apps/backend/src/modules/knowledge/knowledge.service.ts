import { Injectable, Logger } from '@nestjs/common';
import { DevelopersService } from '../developers/developers.service';
import { MetricsService } from '../metrics/metrics.service';
import { ObservationsService } from '../observations/observations.service';
import { TimelineService } from '../timeline/timeline.service';

/**
 * KnowledgeService - the Context Pack builder.
 *
 * Responsibilities (Phase 5):
 *   - Gather developer profile, metrics, observations, timeline entries
 *   - Extract Facts from evidence
 *   - Build a structured ContextPack for the AI layer
 *   - Reduce hallucination by grounding AI input in stored evidence
 *
 * The ContextPack shape is defined in knowledge/types/context-pack.types.ts (Phase 5).
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly developersService: DevelopersService,
    private readonly metricsService: MetricsService,
    private readonly observationsService: ObservationsService,
    private readonly timelineService: TimelineService,
  ) {}

  // buildContextPack() implemented in Phase 5
}
