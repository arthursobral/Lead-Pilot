import type { ContextPack } from '../types/knowledge.types';

/**
 * HTTP response shape for GET /developers/:developerId/context-pack.
 *
 * Thin alias over ContextPack. Keeping a DTO class here makes it easy to add
 * metadata fields later (cacheHit, latencyMs, version) without changing callers.
 */
export class ContextPackResponseDto implements ContextPack {
  developer!: ContextPack['developer'];
  period!: ContextPack['period'];
  metrics!: ContextPack['metrics'];
  observations!: ContextPack['observations'];
  timeline!: ContextPack['timeline'];
  facts!: ContextPack['facts'];
  evidenceMap!: ContextPack['evidenceMap'];
  generatedAt!: string;
}
