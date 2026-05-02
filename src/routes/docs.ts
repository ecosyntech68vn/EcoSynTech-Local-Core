import { Router, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EcoSynTech IoT API',
      version: '2.0.0',
      description: 'REST API for IoT Agriculture Platform'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.ts']
};

const specs = swaggerJsdoc(options);

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));
router.get('/json', (req: Request, res: Response) => res.json(specs));

export default router;