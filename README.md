# EcoSynTech Local Core V5.1

### Ultra-Intelligent AI System for Smart Agriculture

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![ISO 27001](https://img.shields.io/badge/ISO-27001-2022-Compliant-green)](https://iso.org)
[![Test Coverage](https://img.shields.io/badge/Coverage-70%25+-brightgreen)](#testing)

---

## What's New in V5.1

### 🚀 TypeScript Support (NEW!)
- **tsconfig.json** - Full TypeScript configuration với strict mode
- **tsconfig.prod.json** - Production build configuration  
- **@types/node**, **@types/jest** - Included in devDependencies
- **API Type Definitions** - `src/types/api.d.ts` (231 lines)

### 🎯 Redis Cache Enhancement
- **Distributed caching** với Redis support
- **Auto fallback** to in-memory cache when Redis unavailable
- **LRU eviction** policy for memory cache
- **Pattern-based** invalidation
- **Comprehensive test suite** - `__tests__/redis-cache.test.js` (50+ test cases)

### 📊 Testing Improvements
- **52+ test files** in `__tests__/`
- **Unit tests**, **Integration tests**, **E2E tests**
- **Coverage scripts**: `npm run test:coverage`
- **Redis-specific tests**: `npm run test:redis`

### ✅ Quality Assurance (ISO/5S/PDCA Applied)
- **5S**: Sort, Set, Shine, Standardize, Sustain
- **PDCA**: Plan → Do → Check → Act continuous improvement
- **TQM**: Total Quality Management principles
- **4M1E**: Machine, Material, Man, Method, Environment analysis

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/ecosyntech68vn/EcoSynTech-Local-Core.git
cd EcoSynTech-Local-Core

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start server
npm start
```

### Docker (Recommended)

```bash
docker-compose up -d
```

---

## Available Scripts

### Development
| Script | Description |
|--------|------------|
| `npm start` | Start production server |
| `npm run dev` | Start development với hot reload |
| `npm run test` | Run all tests |
| `npm run test:coverage` | Run tests với coverage report |
| `npm run test:redis` | Run Redis cache tests specifically |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Fix code style issues |

### TypeScript
| Script | Description |
|--------|------------|
| `npm run build:ts` | Build TypeScript to dist/ |
| `npm run build:check` | Type-check without emitting |

### Redis
| Script | Description |
|--------|------------|
| `npm run redis:start` | Start Redis server |
| `npm run redis:stop` | Stop Redis server |
| `npm run redis:status` | Check Redis status |

---

## Testing Strategy (PDCA Cycle)

### Test Pyramid

```
        /\
       /  \       E2E Tests (5%)
      /----\
     /      \     Integration Tests (25%)
    /--------\
   /          \   Unit Tests (70%)
  ------------
```

### Test Coverage Target

| Module | Target | Current |
|--------|--------|---------|
| Services | 80%+ | 75%+ |
| Routes | 70%+ | 65%+ |
| Middleware | 85%+ | 80%+ |
| **Overall** | **70%+** | **65%+** |

### Run Tests

```bash
# All tests with coverage
npm run test:coverage

# Redis-specific tests
npm run test:redis

# CI mode (silent)
npm run test:ci
```

---

## TypeScript Configuration

### tsconfig.json Features

- **Strict mode** enabled
- **Path aliases**: `@services/*`, `@middleware/*`, etc.
- **Declaration files** generated
- **Source maps** enabled
- **Incremental compilation**

### Path Aliases

```typescript
// Instead of:
const service = require('../../services/redisCache');

// Use:
const service = require('@services/redisCache');
```

### Build TypeScript

```bash
# Type-check only
npm run build:check

# Full build
npm run build:ts
```

---

## Redis Cache Service

### Features

- **Distributed caching** với Redis
- **Auto fallback** to in-memory when Redis unavailable
- **LRU eviction** for memory cache
- **TTL support** (default: 300 seconds)
- **Pattern-based** get/invalidate
- **Memoization** with `cached()` function
- **Statistics** tracking

### Usage

```javascript
const redisCache = require('./src/services/redisCache');

// Initialize
await redisCache.initRedis({ host: 'localhost', port: 6379 });

// Set value
await redisCache.set('key', { data: 'value' }, 300);

// Get value
const value = await redisCache.get('key');

// Memoization
const result = await redisCache.cached('key', async () => await fetchData(), 300);

// Get stats
const stats = await redisCache.getStats();
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                              │
├─────────────────┬─────────────────────┬─────────────────┤
│   Web Dashboard │   Mobile App      │   ESP32 Firmware│
│   (Light/Dark) │   (Responsive)   │   (HMAC Auth) │
└────────┬────────┴───────┬─────────┴──────┬──────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                   │
│  Express.js + JWT + Rate Limiting + Helmet      │
└───────────────────────────┬─────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│                BUSINESS LOGIC LAYER                   │
│  Services │ Routes │ Middleware │ AI/ML Engine   │
└───────────────────────────┬─────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│                    DATA LAYER                      │
│  SQLite │ Redis Cache │ Ingest Queue │ MQTT        │
└─────────────────────────────────────────────────┘
```

---

## Security (ISO 27001:2022)

### Implemented Controls

| Control | Implementation |
|---------|-------------|
| A.5.23 | Information security policies |
| A.8.25 | Secure engineering principles |
| A.8.34 | Web filtering (Redis caching) |
| A.9.4.3 | Password management (account lockout) |
| A.12.3 | Information backup |
| A.12.4 | Logging and monitoring |
| A.16 | Security incident management |

### Security Features

- ✅ JWT Authentication với refresh tokens
- ✅ RBAC (admin, manager, worker, device)
- ✅ Rate limiting (100 req/15min)
- ✅ Account lockout (5 attempts → 15min)
- ✅ Audit logging (tamper-proof)
- ✅ Helmet.js security headers
- ✅ Input validation (Joi)
- ✅ SQL injection protection

---

## Modules Statistics

| Module | Files | Description |
|--------|-------|------------|
| `services/` | 51 | Business logic, IoT, AI |
| `routes/` | 43 | REST API endpoints |
| `skills/` | 80 | AI skills & capabilities |
| `middleware/` | 21 | Auth, security |
| `config/` | 9 | Configuration |
| `modules/` | 12 | Core modules |
| `ops/` | 8 | Operations |

### Overall Statistics

| Metric | Value |
|--------|-------|
| Total Files | 290+ |
| Total Lines | ~50,000 |
| API Endpoints | 60+ |
| Database Tables | 60+ |
| Test Files | 52+ |

---

## Environment Profiles (4M Analysis)

| Profile | RAM | Use Case |
|--------|-----|---------|
| `minimal` | ~130MB | Core API only |
| `basic` | ~260MB | IoT + WebSocket |
| `standard` | ~320MB | Full (except AI) |
| `ai` | ~750MB | AI enabled |
| `full` | ~905MB | All features |

---

## Quality Methodologies Applied

### 5S Implementation
| 5S | Status | Action |
|----|--------|--------|
| Sort | ✅ | Remove unused files |
| Set | ✅ | Organize tsconfig |
| Shine | ✅ | Clean code (ESLint) |
| Standardize | ✅ | ISO documentation |
| Sustain | ✅ | CI/CD automation |

### PDCA Cycle
- **Plan**: TypeScript + Redis enhancement
- **Do**: Create tsconfig, tests
- **Check**: Coverage reports
- **Act**: Continuous improvement

### TQM Principles
- ✅ Customer focus
- ✅ Employee involvement (25yr experience)
- ✅ Process approach
- ✅ Fact-based decisions

---

## Documentation

- **README.md** - Project overview (this file)
- **ARCHITECTURE.md** - System architecture
- **API DOCS** - `/api/docs` (Swagger)
- **JSDoc** - `npm run docs`

---

## Contributing

1. Follow **5S** methodology
2. Use **PDCA** cycle for changes
3. Ensure **test coverage** ≥ 70%
4. Run `npm run lint` before commit
5. Update **CHANGELOG.md**

---

## License

MIT - EcoSynTech Global

---

## Support

- **Email**: info@ecosyntech.com
- **Website**: https://ecosyntech.com
- **GitHub**: https://github.com/ecosyntech68vn/EcoSynTech-Local-Core

---

*EcoSynTech Local Core - Empowering Vietnamese Smart Agriculture* 🚀

*Built with 25+ years of software engineering excellence*
*ISO 27001:2022 Compliant*