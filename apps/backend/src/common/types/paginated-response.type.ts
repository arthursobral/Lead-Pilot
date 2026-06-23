/**
 * Standard envelope for paginated list responses.
 * Used across all list endpoints that support page/limit pagination.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
