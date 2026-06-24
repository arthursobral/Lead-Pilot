import { Controller } from '@nestjs/common';
import { ReportsService } from './reports.service';

/**
 * ReportsController
 *
 * Routes (Phase 7):
 *   GET  /api/reports                 - list reports for the team
 *   GET  /api/reports/:id             - get a specific report
 *   POST /api/reports/generate        - trigger report generation
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Routes implemented in Phase 7
}
