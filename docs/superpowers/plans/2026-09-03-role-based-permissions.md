# Permissão por Papel (Dona vs Funcionária) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `User.role` (`OWNER` | `STAFF`) actually enforced — `STAFF` accounts are blocked from Financeiro and Cupons at the API level — and give the store owner a screen to create/manage staff accounts.

**Architecture:** No schema migration (`User.role` already exists as `String`). A single `isOwner(session)` helper in `src/lib/auth.ts` is checked inline in the 4 route files that must be restricted, following this codebase's existing pattern of each route doing its own inline session check (no centralized middleware auth). A new `/api/team` route pair does CRUD on `User` rows within the caller's organization (manually scoped, since `User` is not in `getScopedPrisma`'s auto-scoped model set). `AdminSidebar` and the three affected admin pages fetch the current session client-side (`/api/auth/me`, which already returns `role`) to hide restricted nav items and pages from `STAFF`.

**Tech Stack:** Next.js App Router route handlers, Prisma (`getScopedPrisma`), `bcryptjs`, React client components, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-role-based-permissions-design.md`

## Global Constraints

- Never return a `User.password` hash from any API response — always `select` the fields to return explicitly, never the whole row.
- `User` is NOT in `TENANT_SCOPED_MODELS` (`src/lib/db.ts`) — `getScopedPrisma(...).user.*` calls do **not** auto-inject `organizationId`. Every `/api/team` query must add `organizationId: session.organizationId` to its `where` manually, and to `data` on create.
- This codebase has no unit tests for route handlers or page components anywhere (confirmed: `tests/` only covers `src/lib/*` pure functions and Prisma-level integration). Follow that established convention: only the new pure `isOwner()` helper gets a Vitest unit test (matching `userBelongsToOrganization`'s existing test in `tests/lib/tenant-auth.test.ts`); every other task is verified with `npx tsc --noEmit` after the edit, and the whole feature gets one end-to-end manual verification pass (real login, real cookies, real HTTP requests) in the final task — the same method already used and proven in this session for the Galeria and Ficha Técnica features.
- Every new/modified API route keeps the existing response shape: `NextResponse.json({ error: '...' }, { status: N })` for failures, matching the exact Portuguese error-message style already used in sibling routes.
- Restricted routes return `403` with `{ error: 'Acesso restrito à dona da loja' }` — this exact string, so the client-side guard and manual verification can both key off it consistently.

---

### Task 1: `isOwner` helper + unit test

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `tests/lib/auth.test.ts`

**Interfaces:**
- Produces: `isOwner(session: AuthSession): boolean` — exported from `src/lib/auth.ts`, imported as `import { getSession, isOwner } from '@/lib/auth';` by every task below that needs it.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isOwner } from '@/lib/auth';

describe('isOwner', () => {
  const baseSession = {
    userId: 'u1',
    email: 'a@b.com',
    name: 'Test',
    organizationId: 'org-1',
  };

  it('returns true for an OWNER session', () => {
    expect(isOwner({ ...baseSession, role: 'OWNER' })).toBe(true);
  });

  it('returns false for a STAFF session', () => {
    expect(isOwner({ ...baseSession, role: 'STAFF' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: FAIL — `isOwner` is not exported from `@/lib/auth`.

- [ ] **Step 3: Add the helper**

In `src/lib/auth.ts`, right after the closing `}` of the `AuthSession` interface (after the `organizationId: string;` field and before `export async function createSession`), add:

```ts

export function isOwner(session: AuthSession): boolean {
  return session.role === 'OWNER';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add isOwner() session helper for role-gated routes"
```

---

### Task 2: Restrict Financeiro API to OWNER

**Files:**
- Modify: `src/app/api/finance/route.ts`
- Modify: `src/app/api/finance/[id]/route.ts`

**Interfaces:**
- Consumes: `isOwner(session)` from Task 1.

- [ ] **Step 1: Update the import in both files**

In `src/app/api/finance/route.ts`, change:

```ts
import { getSession } from '@/lib/auth';
```

to:

```ts
import { getSession, isOwner } from '@/lib/auth';
```

Do the same in `src/app/api/finance/[id]/route.ts`.

- [ ] **Step 2: Add the role check to every handler in `src/app/api/finance/route.ts`**

In `export async function GET()`, change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);
```

In the same file, `export async function POST(request: Request)` has the identical two lines — change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { type, description, category, amount, paymentMethod, date, notes } = body;
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();
    const { type, description, category, amount, paymentMethod, date, notes } = body;
```

- [ ] **Step 3: Add the role check to both handlers in `src/app/api/finance/[id]/route.ts`**

In `export async function PUT(...)`, change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);
```

In the same file, `export async function DELETE(...)` has the identical two lines followed by a comment block — change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;

    const transaction = await db.financialTransaction.findUnique({ where: { id } });
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;

    const transaction = await db.financialTransaction.findUnique({ where: { id } });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/finance/route.ts "src/app/api/finance/[id]/route.ts"
git commit -m "feat: restrict Financeiro API to OWNER role"
```

---

### Task 3: Restrict Cupons API to OWNER

**Files:**
- Modify: `src/app/api/coupons/route.ts`
- Modify: `src/app/api/coupons/[id]/route.ts`

**Interfaces:**
- Consumes: `isOwner(session)` from Task 1.
- Does NOT touch `src/app/api/coupons/validate/route.ts` — that route stays public (used by the storefront, checked against `getCurrentOrganization()`, not `getSession()`).

- [ ] **Step 1: Update the import in both files**

In `src/app/api/coupons/route.ts` and `src/app/api/coupons/[id]/route.ts`, change:

```ts
import { getSession } from '@/lib/auth';
```

to:

```ts
import { getSession, isOwner } from '@/lib/auth';
```

- [ ] **Step 2: Add the role check to both handlers in `src/app/api/coupons/route.ts`**

In `export async function GET()`, change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);
```

In the same file, `export async function POST(request: Request)` has the identical two lines — change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();
```

- [ ] **Step 3: Add the role check to both handlers in `src/app/api/coupons/[id]/route.ts`**

In `export async function PUT(...)`, change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const { code, discountType, discountValue, active, expiresAt, maxUses, oncePerCustomer } = await request.json();
```

In `export async function DELETE(...)`, change:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.coupon.delete({ where: { id } });
```

to:

```ts
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    await db.coupon.delete({ where: { id } });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/coupons/route.ts "src/app/api/coupons/[id]/route.ts"
git commit -m "feat: restrict Cupons API to OWNER role"
```

---

### Task 4: Team API — list and create (`/api/team`)

**Files:**
- Create: `src/app/api/team/route.ts`

**Interfaces:**
- Consumes: `getSession`, `isOwner` from `@/lib/auth`; `getScopedPrisma` from `@/lib/db`; `bcrypt` from `bcryptjs` (same import used in `src/app/api/auth/login/route.ts`).
- Produces (response shape, consumed by Task 6's admin page): `GET` → `{ id, name, email, role, createdAt }[]`. `POST` → `201` with `{ id, name, email, role, createdAt }` (no `password` field ever).

- [ ] **Step 1: Create the route file**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwner } from '@/lib/auth';

const VALID_ROLES = new Set(['OWNER', 'STAFF']);

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const users = await db.user.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Erro ao buscar equipe' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Nome, e-mail, senha e papel são obrigatórios' }, { status: 400 });
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        organizationId: session.organizationId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 400 });
    }
    console.error('Error creating team member:', error);
    return NextResponse.json({ error: 'Erro ao criar conta da equipe' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/team/route.ts
git commit -m "feat: add /api/team list and create endpoints"
```

---

### Task 5: Team API — update and delete with last-owner guard (`/api/team/[id]`)

**Files:**
- Create: `src/app/api/team/[id]/route.ts`

**Interfaces:**
- Consumes: same as Task 4, plus `db.user.findUnique`/`count` for the last-owner guard.
- Produces: `PUT` → `200` with `{ id, name, email, role, createdAt }`. `DELETE` → `200` with `{ success: true }`. Both return `400` with `{ error: 'Não é possível remover a última conta de dona da loja.' }` when the guard trips.

- [ ] **Step 1: Create the route file**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwner } from '@/lib/auth';

const VALID_ROLES = new Set(['OWNER', 'STAFF']);
const LAST_OWNER_ERROR = 'Não é possível remover a última conta de dona da loja.';

async function wouldRemoveLastOwner(
  db: ReturnType<typeof getScopedPrisma>,
  organizationId: string,
  targetUserId: string
): Promise<boolean> {
  const remainingOwners = await db.user.count({
    where: { organizationId, role: 'OWNER', id: { not: targetUserId } },
  });
  return remainingOwners === 0;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { name, email, password, role } = await request.json();

    if (role !== undefined && !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Papel inválido' }, { status: 400 });
    }
    if (existing.role === 'OWNER' && role && role !== 'OWNER') {
      if (await wouldRemoveLastOwner(db, session.organizationId, id)) {
        return NextResponse.json({ error: LAST_OWNER_ERROR }, { status: 400 });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name: name || undefined,
        email: email || undefined,
        role: role || undefined,
        password: password ? await bcrypt.hash(password, 10) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 400 });
    }
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Erro ao atualizar conta da equipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isOwner(session)) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });
    const db = getScopedPrisma(session.organizationId);

    const { id } = await params;
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (existing.role === 'OWNER' && (await wouldRemoveLastOwner(db, session.organizationId, id))) {
      return NextResponse.json({ error: LAST_OWNER_ERROR }, { status: 400 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json({ error: 'Erro ao excluir conta da equipe' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/team/[id]/route.ts"
git commit -m "feat: add /api/team update and delete with last-owner guard"
```

---

### Task 6: Admin Equipe page

**Files:**
- Create: `src/app/admin/equipe/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/team` (Task 4), `PUT/DELETE /api/team/[id]` (Task 5), `GET /api/auth/me` (existing, returns `{ authenticated, user: { userId, email, name, role, organizationId } }`).

- [ ] **Step 1: Create the page**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UserCog, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function AdminTeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setRole(data?.user?.role || null);
        setCurrentUserId(data?.user?.userId || '');
      })
      .finally(() => setRoleChecked(true));
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setUserRole('STAFF');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: any) => {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setUserRole(u.role);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload: any = { name, email, role: userRole };
      if (password) payload.password = password;
      if (!editingId) payload.password = password;

      const url = editingId ? `/api/team/${editingId}` : '/api/team';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar conta.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      loadData();
    } else {
      alert(data.error || 'Erro ao excluir conta.');
    }
  };

  if (roleChecked && role !== 'OWNER') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-10 text-center max-w-md">
            <h1 className="font-serif text-xl font-bold text-[#4A231A] mb-2">Acesso restrito</h1>
            <p className="text-sm text-[#645451]">Esta área é visível apenas para a dona da loja.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">Equipe</h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Contas com acesso ao painel administrativo desta loja
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando equipe...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-3xl border border-[#F2D7D0] p-5 shadow-card flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <UserCog className="w-5 h-5 text-[#C27360]" />
                  <div className="flex items-center gap-1.5">
                    {u.id === currentUserId && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F9ECE9] text-[#874132]">
                        Você
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        u.role === 'OWNER' ? 'bg-[#C27360] text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {u.role === 'OWNER' ? 'Dona' : 'Funcionária'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-sm text-[#4A231A] block">{u.name}</span>
                  <span className="text-xs text-[#645451]">{u.email}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F2D7D0]/60 mt-auto">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="flex-1 p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6] flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#C27360]" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#F2D7D0] flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="font-serif text-xl font-bold text-[#4A231A]">
                {editingId ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-[#FAF6F4] text-[#645451]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Senha {editingId ? '(deixe em branco para manter a atual)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Papel
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'OWNER' | 'STAFF')}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                >
                  <option value="STAFF">Funcionária — acesso restrito</option>
                  <option value="OWNER">Dona — acesso total</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#F2D7D0] text-[#4A231A] font-bold text-sm hover:bg-[#FAF6F4] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/equipe/page.tsx
git commit -m "feat: add /admin/equipe team management page"
```

---

### Task 7: Sidebar role-awareness

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `GET /api/auth/me`.

- [ ] **Step 1: Add the `UserCog` icon import**

Change:

```ts
import {
  LayoutDashboard,
  Cake,
  FolderTree,
  FileText,
  ShoppingBag,
  Calendar,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  Tag,
  Menu,
  X,
} from 'lucide-react';
```

to:

```ts
import {
  LayoutDashboard,
  Cake,
  FolderTree,
  FileText,
  ShoppingBag,
  Calendar,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  Tag,
  Menu,
  X,
  Images,
  UserCog,
} from 'lucide-react';
```

(`Images` is already used from the Galeria feature — keep it; only `UserCog` is new.)

- [ ] **Step 2: Fetch the session role on mount**

Change:

```ts
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
```

to:

```ts
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role || null))
      .catch(() => setRole(null));
  }, []);
```

Add `useEffect` to the React import at the top of the file — change:

```ts
import React, { useState } from 'react';
```

to:

```ts
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 3: Mark restricted nav items and filter them**

Change:

```ts
  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Pedidos (Kanban)', href: '/admin/pedidos', icon: ShoppingBag },
    { label: 'Calendário Produção', href: '/admin/calendario', icon: Calendar },
    { label: 'Orçamentos', href: '/admin/orcamentos', icon: FileText },
    { label: 'Produtos', href: '/admin/produtos', icon: Cake },
    { label: 'Insumos & Precificação', href: '/admin/insumos', icon: Sparkles },
    { label: 'Categorias', href: '/admin/categorias', icon: FolderTree },
    { label: 'Clientes (CRM)', href: '/admin/clientes', icon: Users },
    { label: 'Financeiro', href: '/admin/financeiro', icon: DollarSign },
    { label: 'Cupons', href: '/admin/cupons', icon: Tag },
    { label: 'Depoimentos', href: '/admin/depoimentos', icon: Quote },
    { label: 'Galeria', href: '/admin/galeria', icon: Images },
    { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
  ];
```

to:

```ts
  const allNavItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, ownerOnly: false },
    { label: 'Pedidos (Kanban)', href: '/admin/pedidos', icon: ShoppingBag, ownerOnly: false },
    { label: 'Calendário Produção', href: '/admin/calendario', icon: Calendar, ownerOnly: false },
    { label: 'Orçamentos', href: '/admin/orcamentos', icon: FileText, ownerOnly: false },
    { label: 'Produtos', href: '/admin/produtos', icon: Cake, ownerOnly: false },
    { label: 'Insumos & Precificação', href: '/admin/insumos', icon: Sparkles, ownerOnly: false },
    { label: 'Categorias', href: '/admin/categorias', icon: FolderTree, ownerOnly: false },
    { label: 'Clientes (CRM)', href: '/admin/clientes', icon: Users, ownerOnly: false },
    { label: 'Financeiro', href: '/admin/financeiro', icon: DollarSign, ownerOnly: true },
    { label: 'Cupons', href: '/admin/cupons', icon: Tag, ownerOnly: true },
    { label: 'Depoimentos', href: '/admin/depoimentos', icon: Quote, ownerOnly: false },
    { label: 'Galeria', href: '/admin/galeria', icon: Images, ownerOnly: false },
    { label: 'Equipe', href: '/admin/equipe', icon: UserCog, ownerOnly: true },
    { label: 'Configurações', href: '/admin/configuracoes', icon: Settings, ownerOnly: false },
  ];
  const navItems = allNavItems.filter((item) => !item.ownerOnly || role === 'OWNER');
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat: hide Financeiro, Cupons and Equipe from STAFF in the sidebar"
```

---

### Task 8: Client-side guard on Financeiro and Cupons pages

**Files:**
- Modify: `src/app/admin/financeiro/page.tsx`
- Modify: `src/app/admin/cupons/page.tsx`

**Interfaces:**
- Consumes: `GET /api/auth/me`.

- [ ] **Step 1: Add role state to `src/app/admin/financeiro/page.tsx`**

Change:

```tsx
  const [errorMsg, setErrorMsg] = useState('');

  const loadFinance = async () => {
```

to:

```tsx
  const [errorMsg, setErrorMsg] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role || null))
      .finally(() => setRoleChecked(true));
  }, []);

  const loadFinance = async () => {
```

- [ ] **Step 2: Add the guard before the main return in the same file**

Change:

```tsx
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão Financeira & DRE
```

to:

```tsx
  if (roleChecked && role !== 'OWNER') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-10 text-center max-w-md">
            <h1 className="font-serif text-xl font-bold text-[#4A231A] mb-2">Acesso restrito</h1>
            <p className="text-sm text-[#645451]">Esta área é visível apenas para a dona da loja.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão Financeira & DRE
```

- [ ] **Step 3: Repeat the same two edits in `src/app/admin/cupons/page.tsx`**

Change:

```tsx
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
```

to:

```tsx
  const [errorMsg, setErrorMsg] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role || null))
      .finally(() => setRoleChecked(true));
  }, []);

  const loadData = async () => {
```

Change:

```tsx
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">Cupons de Desconto</h1>
```

to:

```tsx
  if (roleChecked && role !== 'OWNER') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-10 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-10 text-center max-w-md">
            <h1 className="font-serif text-xl font-bold text-[#4A231A] mb-2">Acesso restrito</h1>
            <p className="text-sm text-[#645451]">Esta área é visível apenas para a dona da loja.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">Cupons de Desconto</h1>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/financeiro/page.tsx src/app/admin/cupons/page.tsx
git commit -m "feat: show an access-restricted state to STAFF on Financeiro and Cupons pages"
```

---

### Task 9: End-to-end verification and full test suite

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
npm run dev > /tmp/dev-server-roles.log 2>&1 &
disown
timeout 40 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done' && echo READY
```

- [ ] **Step 2: Log in as the existing OWNER and create a STAFF test account**

```bash
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@cinthia.com","password":"admin123"}' -c /tmp/owner_cookies.txt -o /dev/null -w "owner login: %{http_code}\n"

curl -s -X POST http://localhost:3000/api/team -H "Content-Type: application/json" -b /tmp/owner_cookies.txt \
  -d '{"name":"Funcionaria Teste","email":"staff-teste@cinthia.com","password":"teste123","role":"STAFF"}'
```

Expected: `owner login: 200`, and the `POST /api/team` response is `201` with a JSON body containing `"role":"STAFF"` and no `password` field. Copy the returned `id` for Step 5.

- [ ] **Step 3: Log in as the STAFF test account and confirm restricted routes are blocked**

```bash
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"staff-teste@cinthia.com","password":"teste123"}' -c /tmp/staff_cookies.txt -o /dev/null -w "staff login: %{http_code}\n"

curl -s -o /dev/null -w "GET /api/finance as STAFF: %{http_code}\n" "http://localhost:3000/api/finance?range=month" -b /tmp/staff_cookies.txt
curl -s -o /dev/null -w "GET /api/coupons as STAFF: %{http_code}\n" "http://localhost:3000/api/coupons" -b /tmp/staff_cookies.txt
curl -s -o /dev/null -w "GET /api/team as STAFF: %{http_code}\n" "http://localhost:3000/api/team" -b /tmp/staff_cookies.txt
curl -s -o /dev/null -w "GET /api/orders as STAFF (should still work): %{http_code}\n" "http://localhost:3000/api/orders" -b /tmp/staff_cookies.txt
```

Expected: `403` for `/api/finance`, `/api/coupons`, `/api/team`; `200` for `/api/orders`.

- [ ] **Step 4: Confirm the last-owner guard**

```bash
curl -s -X GET "http://localhost:3000/api/team" -b /tmp/owner_cookies.txt
```

Copy the OWNER's own `id` from the response, then:

```bash
curl -s -X DELETE "http://localhost:3000/api/team/<OWNER_ID_HERE>" -b /tmp/owner_cookies.txt
```

Expected: `400` with `{"error":"Não é possível remover a última conta de dona da loja."}` (there are now two users — the seeded OWNER and the STAFF test account — so the OWNER being deleted here IS the only OWNER; the guard must trip).

- [ ] **Step 5: Clean up the STAFF test account**

```bash
curl -s -X DELETE "http://localhost:3000/api/team/<STAFF_TEST_ID_FROM_STEP_2>" -b /tmp/owner_cookies.txt -w "\ndelete staff: %{http_code}\n"
```

Expected: `200` with `{"success":true}`.

- [ ] **Step 6: Check the dev server log for unhandled errors**

```bash
grep -iE "error|unhandled|TypeError" /tmp/dev-server-roles.log | grep -v "console.error"
```

Expected: no output (the route handlers' own `console.error` calls for expected 4xx paths don't count — only look for stack traces or crashes).

- [ ] **Step 7: Stop the dev server**

```bash
netstat -ano | grep ":3000 " | grep LISTENING
```

Take the PID from the output and run `taskkill //F //PID <PID>`.

- [ ] **Step 8: Full typecheck and test suite**

```bash
npx tsc --noEmit
npm test
```

Expected: typecheck clean, all existing Vitest suites still passing (including the new `tests/lib/auth.test.ts` from Task 1).

- [ ] **Step 9: Final commit (if any verification step required a fix)**

If Steps 1-8 required no code changes, there is nothing to commit here — every task already committed its own change. If a fix was needed, commit it with a message describing what verification caught.
