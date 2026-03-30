# chinese-checkers — Project Conventions

## Stack

Firebase (Firestore + Firebase Functions + Firebase Auth + Firebase Hosting)

## Architecture

- **Frontend:** Vite + React + TypeScript in `app/src/`
- **Backend:** Firebase Functions in `functions/src/`
- **Database:** Firestore
- **Auth:** Firebase Auth
- **Multi-tenant:** No

## Frontend Rules (Non-Negotiable)

### NEVER use `useEffect` for data fetching

This is the most common source of infinite loops, race conditions, and stale data bugs.

```tsx
// NEVER DO THIS
function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setUser); // race condition, memory leak
  }, [userId]);
}

// ALWAYS DO THIS
function UserCard({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

`useEffect` is only acceptable for truly imperative DOM side effects (measurements, third-party lib init, focus). Even then, question whether it's really needed.

### React Query for all server/async state

- Use `useQuery` for reads, `useMutation` for writes
- Query keys follow the pattern: `['resource', id]` or `['resource', 'list', filters]`
- Never use `useEffect + useState` to fetch data

### Pass IDs as props, not full objects

Components receive IDs (or keys) and load their own data via React Query.

```tsx
// NEVER — passing full objects (prop drilling, coupling, no cache benefit)
function OrderList({ orders }) {
  return orders.map(o => <OrderRow order={o} />);
}

// ALWAYS — pass IDs, each component self-loads
function OrderList({ orderIds }) {
  return orderIds.map(id => <OrderRow orderId={id} />);
}

function OrderRow({ orderId }) {
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });
}
```

React Query deduplicates requests by query key — calling the same hook in many components results in only **one** network request.

### No prop drilling beyond 1 level

Data should not be passed more than one level deep. Beyond that: use a React Query hook (for server data) or a Jotai atom (for UI state).

### Small, focused components

- Each component does **one thing**
- A component file should rarely exceed ~150 lines
- Extract sub-concerns into child components aggressively

### Jotai atoms for client-only state

- Atoms live in `src/store/` — one file per domain (`uiAtoms.ts`, `filterAtoms.ts`)
- Only use Jotai for UI state: modal open/close, active tab, filter selections, optimistic UI
- Never put server data in an atom — that belongs in React Query

## Directory Structure

```
app/src/
├── components/    # Shared UI components (small, focused, self-loading)
├── pages/         # Page-level components (route entries)
├── hooks/         # Custom React Query hooks (one hook per resource)
├── store/         # Jotai atoms (client-only state)
└── lib/           # SDK clients, query client, utilities
```

## Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `use<Resource>.ts` (e.g., `useUser.ts`, `useOrders.ts`)
- Atoms: `<domain>Atoms.ts` (e.g., `uiAtoms.ts`)
- Types: `PascalCase`, co-located with usage or in `types.ts`
- API functions: `camelCase` in `lib/` (e.g., `api.getUser()`)

## Package Manager

- **npm** — always use `npm install`, `npm run dev`, etc.

## Git Workflow

- Default branch: `main` (production)
- Development branch: `develop`
- Feature branches: `feature/<slug>` off `develop`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
