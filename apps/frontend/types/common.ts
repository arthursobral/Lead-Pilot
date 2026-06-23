/**
 * Shared types used across multiple domain modules.
 */

/**
 * Standard paginated envelope returned by all list endpoints.
 * Matches the backend PaginatedResponse<T> generic.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
