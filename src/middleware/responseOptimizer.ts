const JSON_CACHE_SIZE = 100;
const jsonCache = new Map<string, string>();

export function fastStringify(obj: any): string {
  const cacheKey = typeof obj === 'object' ? JSON.stringify(obj).substring(0, 100) : String(obj);
  
  if (jsonCache.has(cacheKey)) {
    return jsonCache.get(cacheKey)!;
  }
  
  const result = JSON.stringify(obj);
  
  if (jsonCache.size >= JSON_CACHE_SIZE) {
    const firstKey = jsonCache.keys().next().value;
    if (firstKey) jsonCache.delete(firstKey);
  }
  jsonCache.set(cacheKey, result);
  
  return result;
}

export function responseOptimizer(req: any, res: any, next: any): void {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  res.json = function(obj: any) {
    if (process.env.NODE_ENV === 'production' && obj && typeof obj === 'object') {
      const body = fastStringify(obj);
      res.setHeader('Content-Type', 'application/json');
      return originalSend(body);
    }
    return originalJson(obj);
  };
  
  next();
}

export default { responseOptimizer, fastStringify };