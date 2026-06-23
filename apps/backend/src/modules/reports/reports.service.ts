import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ReportsRepository } from './reports.repository';

/**
 * ReportsService
 *
 * Responsibilities (Phase 7):
 *   - Build team and individual developer reports
 *   - Use KnowledgeService to gather structured context
 *   - Store generated reports for retrieval
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly reportsRepository: ReportsRepository,
  ) {}

  // Implemented in Phase 7
}
