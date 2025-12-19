# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Pre-Work Checklist

**Before starting any work, verify:**

1. **Available Scripts** - Review `package.json` for available commands
   - `npm run dev` - Development server
   - `npm run lint` - ESLint
   - `npm run test:run` - Test execution
   - `npm run similarity` - Duplicate code detection (85% threshold)
   - `npm run similarity:strict` - Strict duplicate detection (80% threshold)

2. **Current Branch State** - Check `git status` if needed to understand working directory state

## Project Overview

**GitHub Insights** - A Next.js web application that visualizes GitHub repository and user contribution statistics with a Japanese-first approach. The app supports both authenticated (via **GitHub App**) and unauthenticated access for public repositories, featuring badge systems, OG card generation for social sharing, and comprehensive analytics dashboards.

**Tech Stack:** Next.js 16 (App Router), TypeScript, NextAuth v5 + GitHub App, TanStack Query, Octokit GraphQL, Recharts, Tailwind CSS v4, Vitest, Playwright, Storybook

**Authentication:** Uses **GitHub App** with read-only permissions (`Contents: Read-only`, `Email addresses: Read-only`) instead of OAuth App for enhanced security.

**Environment:** Development server runs on port 3001 (not the default 3000)

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3001)
npm run build            # Production build
npm start                # Start production server

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Single test run
npm run test:coverage    # Coverage report (target: 94%+)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Run all tests (unit + e2e)

# Linting & Quality
npm run lint             # ESLint
npm run similarity       # Detect code duplication (threshold: 85%)
npm run similarity:strict # Strict duplication check (threshold: 80%)

# Tools
npm run storybook        # Launch Storybook on port 6006
npm run update-repos     # Update popular repositories JSON
```

## Architecture Overview

### Page Structure

- `/` - Landing page (unauthenticated access, public repository search)
- `/login` - Login page (Public/Private scope selection)
- `/dashboard` - Authenticated user dashboard
- `/repo/[owner]/[repo]` - Public repository details (unauthenticated access supported)
- `/user/[username]` - User profile page
- `/user/[username]/wrapped/[year]` - GitHub Wrapped annual summary

### Core Dual-Caching Strategy

The app uses a two-layer caching system to handle GitHub API rate limits (60 req/hour unauthenticated, 5000 req/hour authenticated):

1. **Client Cache (TanStack Query):** Prevents redundant fetches within the same browser session
2. **Server Cache (unstable_cache):** Shared across users to minimize GitHub API calls

```
User Request
    ↓
TanStack Query (staleTime: 5-10min)
    ↓ (cache miss)
Route Handler (/app/api/github/*)
    ↓
unstable_cache (revalidate: 5-10min)
    ↓ (cache miss)
GitHub GraphQL API
```

**Cache configuration:** All timeouts are centralized in [src/lib/cache-config.ts](src/lib/cache-config.ts). When adding new data fetching, reference this file for consistency.

### Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth v5 handlers
│   │   ├── github/                # GitHub API proxy with caching
│   │   │   ├── commits/
│   │   │   ├── contributors/
│   │   │   ├── languages/
│   │   │   ├── stats/
│   │   │   ├── search/            # Repository search
│   │   │   ├── search-users/      # User search
│   │   │   └── user/[username]/   # User profile & wrapped data
│   │   └── og/card/               # OG image generation (@vercel/og)
│   ├── dashboard/                 # Authenticated user dashboard
│   ├── repo/[owner]/[repo]/       # Public repository details
│   └── user/[username]/           # User profile & wrapped pages
├── lib/
│   ├── github/                    # Modular GitHub API client
│   │   ├── client.ts              # GraphQL client creation & retry logic
│   │   ├── repository.ts          # Repository queries
│   │   ├── user.ts                # User queries
│   │   ├── commits.ts             # Commit history
│   │   ├── stats.ts               # Statistics aggregation
│   │   ├── transforms.ts          # Data transformation utilities
│   │   ├── types.ts               # GraphQL response types
│   │   └── errors.ts              # Error handling utilities
│   ├── cache-config.ts            # Centralized cache settings
│   ├── actions.ts                 # Server Actions (auth flows)
│   ├── badges.ts                  # Badge calculation logic
│   ├── insight-score.ts           # User ranking score calculation
│   ├── api-utils.ts               # Route handler utilities
│   └── auth.ts                    # NextAuth configuration
├── hooks/                         # TanStack Query wrappers
│   ├── useRepoData.ts             # Repository data fetching
│   ├── useCommitHistory.ts        # Commit history with filtering
│   └── useSearchRepositories.ts   # Unified repo/user search
├── components/
│   ├── charts/                    # Recharts wrappers (SSR disabled)
│   ├── ContributorRanking.tsx     # Ranking display with badges
│   ├── RepoSearchCombobox.tsx     # Unified search UI
│   └── DashboardLayout.tsx        # Shared layout wrapper
└── providers/
    ├── QueryProvider.tsx          # TanStack Query setup
    └── SessionProvider.tsx        # NextAuth session provider
```

### Data Flow Pattern

**Example: Fetching Language Statistics**

1. Component calls `useLanguageStats()` hook
2. TanStack Query checks `staleTime` (10min)
3. On cache miss, fetches from `/api/github/languages`
4. Route handler checks `unstable_cache` (10min revalidate)
5. On cache miss, calls `getLanguageStats()` from `lib/github/stats.ts`
6. GitHub client determined by auth state: `createGitHubClient(token)` or `createPublicGitHubClient()`
7. Response cached at both layers with separate keys for authed/public users

## Critical Design Patterns

### 1. Authentication Branching

All GitHub API functions accept `accessToken: string | null` as the first parameter:

```typescript
export async function getRepositoryStats(
  accessToken: string | null,
  owner: string,
  repo: string
) {
  const client = accessToken
    ? createGitHubClient(accessToken)
    : createPublicGitHubClient();
  // ...
}
```

**Cache keys must include auth state:**
```typescript
const cacheKey = `stats:${owner}:${repo}:${isAuthenticated ? "auth" : "public"}`;
```

### 2. Recharts SSR Disabling

Recharts components reference `window` and fail during SSR. **Always** use `dynamic` import:

```typescript
import dynamic from "next/dynamic";

const LanguagesPieChart = dynamic(
  () => import("@/components/charts/LanguagesPieChart"),
  { ssr: false }
);
```

Chart components are in [src/components/charts/](src/components/charts/).

### 3. Server Actions

Authentication flows (sign in/out) use Server Actions defined in [src/lib/actions.ts](src/lib/actions.ts) with `"use server"` directive. This is the pattern for all server-only operations.

### 4. Rate Limit Mitigation

- **Local JSON search:** [public/data/popular-repos.json](public/data/popular-repos.json) contains 400+ popular repos for instant search without API calls
- **Debouncing:** User search uses 300ms debounce ([useDebounce hook](src/hooks/useDebounce.ts))
- **Retry logic:** `withRetry()` in [client.ts](src/lib/github/client.ts) handles secondary rate limits with exponential backoff
- **Automatic updates:** GitHub Actions workflow updates popular repos daily

### 5. Unified Search

The search combobox handles both repositories and users:
- **Repository search:** `owner/repo` format
- **User search:** `@username` format (prefix detection)

See [RepoSearchCombobox.tsx](src/components/RepoSearchCombobox.tsx) and [useSearchRepositories.ts](src/hooks/useSearchRepositories.ts).

## Environment Variables

Required for local development (`.env.local`):

```bash
# GitHub App credentials
GITHUB_APP_CLIENT_ID=<GitHub App Client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App Client Secret>
GITHUB_APP_ID=<GitHub App ID>

# NextAuth configuration
NEXTAUTH_SECRET=<NextAuth secret (openssl rand -base64 32)>
NEXTAUTH_URL=http://localhost:3001
AUTH_TRUST_HOST=true

# Optional: For future Server-to-Server authentication
# GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

**GitHub App setup:**
- Callback URL (dev): `http://localhost:3001/api/auth/callback/github`
- Callback URL (prod): `https://your-domain.vercel.app/api/auth/callback/github`
- Permissions: `Contents: Read-only`, `Email addresses: Read-only`

**For detailed GitHub App creation instructions, see [docs/GITHUB_APP_MIGRATION.md](docs/GITHUB_APP_MIGRATION.md).**

## Code Organization Principles

### File Naming
- **Components:** PascalCase (`ContributorRanking.tsx`)
- **Hooks:** camelCase with `use` prefix (`useRepoData.ts`)
- **Utilities:** kebab-case (`cache-config.ts`, `api-utils.ts`)
- **Types:** Defined in `src/types/` or co-located `types.ts` files

### Testing Strategy
- **Unit tests:** `__tests__/` directories or `*.test.ts(x)` files
- **E2E tests:** `tests/` directory (Playwright)
- **Component visual tests:** Storybook stories in `src/stories/`
- **Coverage target:** 94%+ (current: 94.15% with 362 tests)

### Localization
- **Primary language:** Japanese (UI text, comments, commit messages all in Japanese)
- **Code:** English for technical terms, variable names, function names
- **Documentation:** Japanese in README/ROADMAP, technical docs may use English

## Common Tasks

### Adding a New GitHub Data Endpoint

1. **Define GraphQL query** in appropriate `src/lib/github/*.ts` module (or create new module)
2. **Add types** to `src/lib/github/types.ts` or co-locate in module
3. **Create Route Handler** in `src/app/api/github/[endpoint]/route.ts`:
   - Use `createCachedFetch()` from `api-utils.ts`
   - Reference `SERVER_CACHE` constants from `cache-config.ts`
   - Include SWR headers: `stale-while-revalidate`
4. **Create React Query hook** in `src/hooks/use[DataName].ts`:
   - Use `staleTime` from `CLIENT_CACHE`
   - Set appropriate `gcTime`
5. **Add tests** for both API function and hook
6. **Update cache config** if using different revalidation times

### Running a Single Test File

```bash
npm run test:run -- path/to/test.test.ts
```

### Debugging Rate Limit Issues

1. Check server logs for "Rate limited" warnings
2. Inspect cache hit rates in network tab
3. Verify `cacheKey` uniqueness in route handlers
4. Confirm `staleTime` and `revalidate` are set per cache-config
5. Use `getPublicRateLimitInfo()` from `lib/github/client.ts` to check remaining quota

### Working with OG Cards

OG image routes are in `src/app/api/og/card/`:
- **Repository contribution card:** `/api/og/card/[owner]/[repo]/[user]`
- **User profile card:** `/api/og/card/user/[user]`
- **Wrapped card:** `/api/og/card/user/[user]/wrapped/[year]`

Images use `@vercel/og` with Edge Runtime. Size: 1200×630px (Twitter large card).

## Known Constraints

### CSP Configuration
Content Security Policy in [next.config.ts](next.config.ts) includes `unsafe-eval` because Recharts uses `Function` constructor internally. This is required and cannot be removed without replacing Recharts.

### API Rate Limits
- **Unauthenticated:** 60 requests/hour (shared IP-based quota)
- **Authenticated:** 5,000 requests/hour per user
- **Search API:** 10 requests/minute (unauthenticated)

**Mitigation:** Aggressive caching, local JSON search, retry logic with exponential backoff

### Data Freshness Trade-off
Cache revalidation times (5-10min) mean data may be stale. This is intentional to prioritize rate limit conservation over real-time accuracy. For user-critical operations (auth, personal dashboard), we use authenticated endpoints with higher quotas.

## Papercut Philosophy (Continuous Quality Improvement)

**Papercuts** are small but important improvements that maintain codebase health and prevent technical debt accumulation. Practice proactive quality maintenance.

### Post-Task Checklist (Self-Initiated)

**After completing any task, verify and fix:**

1. **Lint & Type Errors**
   - Run `npm run lint` and `npx tsc --noEmit`
   - Resolve warnings when possible

2. **Unused Code Cleanup**
   - Remove unused imports, variables, functions
   - Delete commented-out old code

3. **Code Duplication**
   - Run `npm run similarity` to detect repetition
   - Extract common logic to utilities/hooks when seeing 3+ repetitions

4. **Consistency Check**
   - Follow existing naming conventions
   - Unify styles across similar components

5. **Documentation Updates**
   - Update README/CLAUDE.md for new features
   - Add JSDoc comments for complex logic

### Immediate Fix Priorities

Address these issues on discovery (if time permits):

| Issue                     | Action                                      |
|---------------------------|---------------------------------------------|
| Duplicate code            | Extract to shared functions/components      |
| Magic numbers             | Define as named constants                   |
| Overly long functions     | Split by responsibility                     |
| Missing type definitions  | Replace `any` with specific types           |
| Missing error handling    | Add try-catch or fallbacks                  |
| Performance bottlenecks   | Apply `useMemo`, `useCallback`, lazy load   |

### Development Efficiency Tools

When patterns repeat, consider:
- **Utility functions** → Centralize in `lib/utils.ts`
- **Custom hooks** → Extract shared state logic
- **Type helpers** → Add reusable types to `types/`
- **Test helpers** → Standardize mocks and setup

### ROI-Based Prioritization

Prioritize papercuts by:
1. **Impact scope** - Widely used code first
2. **Frequency** - Frequently touched areas first
3. **Risk** - Bug-prone sections first
4. **Time-to-fix** - <5min fixes → do immediately

**When uncertain, leave a TODO comment:**
```typescript
// TODO: Extract this logic to useXxx hook
// TODO: Add error handling here
```

## Code Quality Rules

### Type Safety
- **Avoid `any` types** - Use specific types or `unknown`
- **Define explicit return types** for functions
- **Use `as const` assertions** for literal objects/arrays

### Error Handling
- **External API calls** - Wrap in try-catch with user-friendly fallbacks
- **User input validation** - Validate at boundaries
- **Graceful degradation** - Show partial UI on non-critical errors

### Performance Optimization
- **Expensive computations** - Use `useMemo`
- **Callback props** - Use `useCallback` to prevent re-renders
- **Large components** - Lazy load with `dynamic()`
- **Images** - Use Next.js `Image` component with proper sizing

### Code Organization
- **No magic numbers** - Extract to named constants (e.g., `const MAX_RETRIES = 3`)
- **DRY principle** - Extract shared logic after 3+ repetitions
- **Single Responsibility** - Functions/components should do one thing well
- **Early returns** - Reduce nesting with guard clauses

### UI/UX Patterns
- **Loading states** - Use Skeleton components or `animate-spin` spinners
- **Icons** - Use Lucide React consistently
- **Accessibility** - Add ARIA labels, keyboard navigation support
- **Responsive design** - Test mobile/tablet/desktop breakpoints

### Testing Priorities
1. **API logic** - Core business logic first
2. **Hooks** - Custom hook behavior
3. **Components** - Visual regression via Storybook

## Deployment (Vercel)

### Environment Variables Setup

Configure these variables in Vercel Dashboard:

```bash
GITHUB_APP_CLIENT_ID=<GitHub App Client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App Client Secret>
GITHUB_APP_ID=<GitHub App ID>
NEXTAUTH_SECRET=<NextAuth secret>
NEXTAUTH_URL=https://your-domain.vercel.app
AUTH_TRUST_HOST=true
```

### GitHub App Callback URLs

Register both production and preview environment URLs:

```
https://your-domain.vercel.app/api/auth/callback/github
https://your-project-git-*.vercel.app/api/auth/callback/github
```

### Deployment Notes

- `next.config.ts` already includes `images.remotePatterns` for GitHub avatars
- Recharts requires SSR disabling (`dynamic` import with `{ ssr: false }`)
- CSP configuration includes `unsafe-eval` for Recharts compatibility

## Related Documentation

- **Technical implementation details:** [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)
- **Development roadmap:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **GitHub App migration guide:** [docs/GITHUB_APP_MIGRATION.md](docs/GITHUB_APP_MIGRATION.md)
