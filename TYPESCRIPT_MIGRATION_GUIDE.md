# TypeScript Migration Guide
## EcoSynTech V5.1 - Phase 1

**Version:** 1.0.0  
**Date:** May 2026  
**Status:** In Progress

---

## 📋 Overview

| Metric | Value |
|--------|-------|
| Total Files | 254 JS files |
| Current TS | 1 file (api.d.ts) |
| Target | Full TypeScript coverage |
| Timeline | 4 weeks (Sprint) |

---

## 🎯 Migration Strategy

### Priority Order

```
PRIORITY 1 - Critical (Week 1-2)
├── src/services/redisCache.js
├── src/services/authService.js
├── src/middleware/auth.js
├── src/middleware/encryption.js
├── src/config/database.js
└── src/config/logger.js

PRIORITY 2 - Core (Week 2-3)
├── All remaining services (47 files)
├── All middleware (21 files)
└── Core routes (20 files)

PRIORITY 3 - Extended (Week 3-4)
├── All remaining routes (24 files)
├── Skills (80 files)
└── WebSocket, Jobs, etc.
```

---

## 📁 Type Definitions Created

```
src/types/
├── api.d.ts        ✅ Existing - API types
├── services.d.ts   ✅ NEW - Service layer types
├── middleware.d.ts ✅ NEW - Middleware types
├── routes.d.ts     ✅ NEW - Route types
└── skills.d.ts     ✅ NEW - Skills types
```

---

## 🔧 Conversion Steps

### Step 1: Add Types (Pre-conversion)

```javascript
// Before: No types
function getUser(id) { return db.query(...); }

// After: Add JSDoc annotations
/**
 * @param {string} id
 * @returns {Promise<User|null>}
 */
function getUser(id) { return db.query(...); }
```

### Step 2: Rename File

```bash
# Rename .js to .ts
mv src/services/userService.js src/services/userService.ts
```

### Step 3: Fix Type Errors

Common issues:
- `any` types → explicit types
- `require()` → `import`
- Missing return types
- Undefined handling

### Step 4: Verify Build

```bash
# Type check only
npm run build:check

# Full build
npm run build:ts

# Run tests
npm test
```

---

## 📝 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `userService.ts` |
| Classes | PascalCase | `UserService` |
| Interfaces | PascalCase + I prefix | `IUserService` |
| Types | PascalCase | `UserType` |
| Enums | PascalCase | `UserRole` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |

---

## 🎨 TypeScript Patterns

### Interface vs Type

```typescript
// Use Interface for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// Use Type for unions/primitives
type UserRole = 'admin' | 'manager' | 'worker';
```

### Nullable Handling

```typescript
// Use optional (?)
interface User {
  id: string;
  email?: string; // optional
}

// Use null explicitly
function findUser(id: string): User | null { ... }
```

### Async Functions

```typescript
// Always use Promise<void> for async
async function createUser(data: CreateUserDTO): Promise<User> {
  // ...
}
```

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `require()` not found | Use `import` or add `allowSyntheticDefaultImports` |
| `__dirname` not found | Use `import.meta.url` + path utilities |
| Circular imports | Use type-only imports |
| Dynamic requires | Use `require('path').join(__dirname, ...)` |
| Module not found | Check tsconfig.json `moduleResolution` |

---

## ✅ Checklist per Module

Before marking as complete:

- [ ] All functions have return types
- [ ] All parameters have types
- [ ] No `any` types (or documented)
- [ ] Build passes with `npm run build:check`
- [ ] Tests still pass
- [ ] JSDoc updated to TSDoc

---

## 📊 Progress Tracking

| Module | Files | Status | Notes |
|--------|-------|--------|-------|
| Types Created | 4/4 | ✅ Done | Ready for use |
| Services | 53 | 🔄 Pending | Priority 1 first |
| Middleware | 23 | 🔄 Pending | After services |
| Routes | 44 | 🔄 Pending | Week 2-3 |
| Skills | 80 | 🔄 Pending | Week 3-4 |

---

## 🚀 Quick Commands

```bash
# Check current TS status
npm run build:check

# Run with TS
npm run dev

# Run tests
npm test

# Coverage report
npm run test:coverage
```

---

## 📞 Support

- Review tsconfig.json for compiler options
- Check existing types in `src/types/`
- Run `npm run lint` before commit
- Ask in team chat for questions

---

*Last Updated: May 2026*  
*Maintained by: Engineering Team*