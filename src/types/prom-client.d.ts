declare module 'prom-client' {
  export class Registry {
    constructor(options?: any);
    contentType: string;
    metrics(): string;
  }

  export class Histogram {
    constructor(config: any);
    startTimer(): (labels?: any) => void;
  }

  export class Counter {
    constructor(config: any);
    inc(labels?: any, value?: number): void;
  }

  export class Gauge {
    constructor(config: any);
    inc(labels?: any): void;
    set(labels?: any, value?: number): void;
  }

  export class Summary {
    constructor(config: any);
    observe(labels?: any, value?: number): void;
  }
}