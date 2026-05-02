// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');
import path from 'path';

interface ApiDocOptions {
  tags?: string[];
  summary?: string;
  description?: string;
}

interface SwaggerEndpoint {
  tags?: string[];
  summary?: string;
  description?: string;
  responses: Record<string, { description: string }>;
}

interface SwaggerSpec {
  paths: Record<string, Record<string, SwaggerEndpoint>>;
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EcoSynTech Farm OS API',
      version: process.env.npm_package_version || '5.0.0',
      description: 'Nền tảng Nông nghiệp Thông minh IoT với AI',
      contact: {
        name: 'EcoSynTech',
        phone: '0989516698',
        email: 'kd.ecosyntech@gmail.com'
      }
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' }
    ],
    tags: [
      { name: 'Health', description: 'System health & status' },
      { name: 'Sensors', description: 'Cảm biến' },
      { name: 'Devices', description: 'Thiết bị' },
      { name: 'Rules', description: 'Quy tắc tự động' },
      { name: 'Schedules', description: 'Lịch tưới' },
      { name: 'Auth', description: 'Xác thực' }
    ],
    paths: {} as Record<string, Record<string, SwaggerEndpoint>>
  },
  apis: [path.join(__dirname, '../routes/*.js')]
};

const swaggerSpec = swaggerJsdoc(options) as SwaggerSpec;

function addApiDoc(_router: string, _endpointPath: string, method: string, options: ApiDocOptions): void {
  const firstTag = options.tags?.[0] ?? '';
  const endpoint = firstTag ? `/${firstTag.toLowerCase()}` : '/';
  if (!swaggerSpec.paths[endpoint]) {
    swaggerSpec.paths[endpoint] = {};
  }
  swaggerSpec.paths[endpoint][method] = {
    tags: options.tags,
    summary: options.summary || '',
    description: options.description || '',
    responses: {
      200: { description: 'Success' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' }
    }
  };
}

function getSwaggerSpec(): SwaggerSpec {
  return swaggerSpec;
}

function getApiDocs(): SwaggerSpec {
  return swaggerSpec;
}

export {
  addApiDoc,
  getSwaggerSpec,
  getApiDocs,
  swaggerSpec
};