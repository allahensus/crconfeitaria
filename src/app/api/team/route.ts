import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getScopedPrisma } from '@/lib/db';
import { getSession, isOwnerFresh } from '@/lib/auth';

// NOTE: User is not in TENANT_SCOPED_MODELS (src/lib/db.ts) — getScopedPrisma
// does not auto-scope it. Every query below adds organizationId manually.

const VALID_ROLES = new Set(['OWNER', 'STAFF']);

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

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
    const db = getScopedPrisma(session.organizationId);
    if (!(await isOwnerFresh(session, db))) return NextResponse.json({ error: 'Acesso restrito à dona da loja' }, { status: 403 });

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
