export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginate(req: any, defaultLimit: number = 50, maxLimit: number = 500): PaginationParams {
  const page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || defaultLimit;
  
  limit = Math.min(Math.max(1, limit), maxLimit);
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function paginatedResponse<T>(data: T, total: number, { page, limit }: PaginationParams): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

export function validateLimit(limit: any, max: number = 500): number {
  const parsed = parseInt(limit);
  if (isNaN(parsed) || parsed < 1) return 1;
  if (parsed > max) return max;
  return parsed;
}

export function validateOffset(offset: any): number {
  const parsed = parseInt(offset);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function sanitizeInput(value: any): any {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeInput(value);
  }
  return sanitized;
}

export default {
  paginate,
  paginatedResponse,
  validateLimit,
  validateOffset,
  sanitizeInput,
  sanitizeObject
};