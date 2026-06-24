/**
 * DeveloperDomain is the internal representation of a Developer.
 *
 * The service layer works with this type - never with raw Prisma models.
 * The mapper converts between Prisma ↔ DeveloperDomain ↔ DeveloperResponseDto.
 *
 * githubId is kept here because the service may need it for cross-module
 * operations (e.g. matching a GitHub webhook payload). It is never exposed
 * in the API response.
 */
export interface DeveloperDomain {
  id: string;
  githubId: string;
  githubLogin: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  createdAt: Date;
}

/**
 * Data shape expected by DevelopersRepository.upsertWithTeamLead.
 * Mirrors the fields that may come from a GitHub sync or a manual POST.
 */
export interface UpsertDeveloperData {
  githubId: string;
  githubLogin: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}
