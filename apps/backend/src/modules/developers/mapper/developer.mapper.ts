import { Injectable } from '@nestjs/common';
import type { Developer } from '@prisma/client';
import type { DeveloperResponseDto } from '../dto/developer-response.dto';
import type { DeveloperDomain } from '../types/developer.types';

/**
 * DeveloperMapper converts between the three representations of a Developer:
 *
 *   Prisma model  →  DeveloperDomain  →  DeveloperResponseDto
 *
 * The service layer always works with DeveloperDomain.
 * The controller always returns DeveloperResponseDto.
 * The repository always returns Prisma models.
 *
 * Injectable so it participates in NestJS DI and is mockable in tests.
 */
@Injectable()
export class DeveloperMapper {
  /**
   * Prisma Developer → DeveloperDomain
   *
   * Preserves all fields the service may need, including githubId
   * for cross-module matching (e.g. linking a GitHub webhook payload).
   */
  toDomain(record: Developer): DeveloperDomain {
    return {
      id: record.id,
      githubId: record.githubId,
      githubLogin: record.githubLogin,
      name: record.name,
      email: record.email,
      avatarUrl: record.avatarUrl,
      role: record.role,
      createdAt: record.createdAt,
    };
  }

  /**
   * DeveloperDomain → DeveloperResponseDto
   *
   * Omits internal fields (githubId, metadata) that have no meaning
   * for API consumers. Serializes createdAt to ISO 8601 so it crosses
   * the HTTP boundary cleanly regardless of client timezone.
   */
  toResponse(domain: DeveloperDomain): DeveloperResponseDto {
    return {
      id: domain.id,
      githubLogin: domain.githubLogin,
      name: domain.name,
      email: domain.email,
      avatarUrl: domain.avatarUrl,
      role: domain.role,
      createdAt: domain.createdAt.toISOString(),
    };
  }

  /**
   * Convenience: map an array of domain objects to response DTOs.
   */
  toResponseList(domains: DeveloperDomain[]): DeveloperResponseDto[] {
    return domains.map((d) => this.toResponse(d));
  }
}
