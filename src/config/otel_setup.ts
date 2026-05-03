'use strict';

(async () => {
  if (process.env.NODE_ENV === 'test') {
    console.info('[OTEL] Test env: skipping OpenTelemetry setup');
    return;
  }
  const enable = (process.env.OTEL_ENABLED || 'true').toLowerCase() === 'true';
  if (!enable) {
    console.info('[OTEL] Telemetry disabled (OTEL_ENABLED=false)');
    return;
  }
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
    const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
    const instrumentations = [
      new HttpInstrumentation(),
      new ExpressInstrumentation()
    ];
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
    const collectorHost = process.env.OTEL_COLLECTOR_HOST || 'localhost';
    const otlpUrl = process.env.OTLP_URL || `http://${collectorHost}:4318/v1/traces`;

    let sampler;
    try {
      const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');
      const ratio = parseFloat(process.env.OTEL_SAMPLER_RATIO || '0.2');
      sampler = new TraceIdRatioBasedSampler(ratio);
    } catch (e) {
      sampler = undefined;
    }
    const sdk = new NodeSDK({
      sampler,
      traceExporter: new OTLPTraceExporter({ url: otlpUrl }),
      metricExporter: new OTLPMetricExporter({ url: otlpUrl }),
      serviceName: process.env.OTEL_SERVICE_NAME || 'ecosyntech-iot-backend',
      instrumentations: instrumentations
    });

    await sdk.start();
    console.info('[OTEL] OpenTelemetry started successfully');
  } catch (err: any) {
    console.warn('[OTEL] OpenTelemetry not started:', err?.message || err);
  }
})();

export default true;