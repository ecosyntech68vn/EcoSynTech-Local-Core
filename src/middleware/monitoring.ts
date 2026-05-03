import prometheus from('prom-client');

// Create a Registry to register the metrics
import register = new prometheus.Registry();

// Create a Histogram for HTTP request duration
import httpRequestDurationHistogram = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Create a Counter for total HTTP requests
import httpRequestTotalCounter = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Middleware function
import monitoringMiddleware = (req, res, next) => {
  const end = httpRequestDurationHistogram.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
    httpRequestTotalCounter.inc({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
  });
  next();
};

// Expose the metrics endpoint
import metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

module.exports = { monitoringMiddleware, metricsEndpoint };