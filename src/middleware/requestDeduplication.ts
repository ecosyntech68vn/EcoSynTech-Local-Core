const requestCache = new Map<string, { timestamp: number; status: number; headers: Record<string, string>; response: any }>();
export const DEDUP_WINDOW_MS = 500;

export function requestDeduplication(req: any, res: any, next: any): void {
  if (req.headers.authorization || req.headers['x-api-key']) {
    return next();
  }
  
  const bodyStr = (typeof req.body === 'string') ? req.body : (req.body ? JSON.stringify(req.body) : '');
  const queryStr = req.query ? JSON.stringify(req.query) : '{}';
  const key = `${req.method}:${req.path}:${queryStr}:${(bodyStr || '').substring(0, 200)}`;
  const now = Date.now();
  
  if (requestCache.has(key)) {
    const prev = requestCache.get(key)!;
    if (now - prev.timestamp < DEDUP_WINDOW_MS) {
      if (prev.response) {
        return res.set(prev.headers).status(prev.status).send(prev.response);
      }
    }
  }
  
  const originalSend = res.send.bind(res);
  res.send = function(body: any) {
    if (res.statusCode < 400) {
      const keyStr = typeof key === 'string' ? key.substring(0, 32) : '';
      requestCache.set(key, {
        timestamp: now,
        status: res.statusCode,
        headers: { 
          'X-Cache': 'HIT',
          'X-Cache-Key': keyStr
        },
        response: body
      });
    }
    return originalSend(body);
  };
  
  res.setHeader('X-Cache', 'MISS');
  next();
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache) {
      if (now - value.timestamp > 5000) {
        requestCache.delete(key);
      }
    }
  }, 10000);
}

export default { requestDeduplication };