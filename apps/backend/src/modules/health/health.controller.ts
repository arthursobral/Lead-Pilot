import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

/**
 * HealthController exposes GET /health for infrastructure probes.
 *
 * HTTP semantics:
 *   200 OK              — all indicators healthy
 *   503 Service Unavail — one or more indicators failed
 *
 * The status code matters: load balancers and container orchestrators
 * (ECS, k8s) use it to decide whether to route traffic to this instance.
 *
 * No authentication guard -- health endpoints must be reachable by
 * infrastructure probes that do not hold a JWT.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();

    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
