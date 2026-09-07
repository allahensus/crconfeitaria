import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { getCurrentOrganization } from '@/lib/tenant';

// A pre-hashed value nobody will ever type, compared against when no user is
// found -- keeps bcrypt.compare on the same code path either way, so the
// response time doesn't reveal whether that email exists in this tenant.
const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Cbn0/wykMhZWrOoR93EiRWzZP0M9C';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: 'Loja não encontrada.' },
        { status: 404 }
      );
    }

    // email is unique per (organizationId, email), not globally -- the same
    // address can belong to a different user in a different tenant, so the
    // lookup must be scoped by the composite key, not email alone.
    const user = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: organization.id, email } },
    });

    const passwordMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao realizar login.' },
      { status: 500 }
    );
  }
}
