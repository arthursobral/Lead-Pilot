/**
 * The shape of the authenticated user attached to request.user
 * by JwtStrategy after a valid JWT is presented.
 *
 * Populated in Phase 2 when the auth module is implemented.
 * Until then, JwtAuthGuard is wired but inactive (no strategy registered).
 */
export interface AuthenticatedUser {
  /** The TeamLead's primary key. Matches TeamLead.id in the database. */
  id: string;
  email: string;
}
