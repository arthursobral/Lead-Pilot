/**
 * The shape returned by all developer endpoints.
 *
 * Intentionally omits internal fields:
 *   - githubId   (integration implementation detail)
 *   - metadata   (raw integration data, not for consumers)
 *   - updatedAt  (internal staleness tracking)
 *
 * createdAt is serialized as an ISO 8601 string so it crosses
 * the HTTP boundary cleanly regardless of client timezone.
 */
export class DeveloperResponseDto {
  id: string;
  githubLogin: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string | null;
  createdAt: string;
}
