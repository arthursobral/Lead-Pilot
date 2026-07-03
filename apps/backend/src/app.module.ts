import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { envValidationSchema } from './config/env.validation';
import {
  appConfig,
  authConfig,
  databaseConfig,
  githubConfig,
  openaiConfig,
  redisConfig,
} from './config/app.config';
import { BullConfigService } from './jobs/bull.config';
import { DatabaseModule } from './database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { GithubModule } from './modules/github/github.module';
import { InsightsModule } from './modules/insights/insights.module';
import { FactsModule } from './modules/facts/facts.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ObservationsModule } from './modules/observations/observations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TeamMetricsModule } from './modules/team-metrics/team-metrics.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    /**
     * ConfigModule -- global, validated at startup.
     *
     * isGlobal: true means every module can inject ConfigService
     * without importing ConfigModule again.
     *
     * validationSchema runs the Joi schema before the app boots.
     * The app exits immediately if a required variable is missing.
     *
     * load registers typed config namespaces (app, database, redis...)
     * so services use config.get('redis.url') instead of process.env.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        authConfig,
        githubConfig,
        openaiConfig,
      ],
    }),

    /**
     * BullModule -- global Redis connection for all queues.
     *
     * forRootAsync defers connection setup until ConfigService is ready,
     * so Redis credentials from the validated env are available.
     *
     * Individual modules register their own queues with
     * BullModule.registerQueue({ name: QUEUES.X }).
     */
    BullModule.forRootAsync({
      useClass: BullConfigService,
    }),

    // Infrastructure
    DatabaseModule,

    // Feature modules -- registered in dependency order.
    // Modules that others depend on appear first.
    AuthModule,
    DevelopersModule,
    GithubModule,
    MetricsModule,
    TeamMetricsModule,   // depends on: Metrics (reads MetricSnapshot via own repository)
    ObservationsModule,
    TimelineModule,
    FactsModule,         // depends on: Developers, Metrics, Observations
    KnowledgeModule,     // depends on: Developers, Metrics, Observations, Facts
    InsightsModule,      // depends on: Knowledge
    ReportsModule,
    HealthModule,
  ],
})
export class AppModule {}
