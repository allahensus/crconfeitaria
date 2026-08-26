import { NextResponse } from 'next/server';
import { getScopedPrisma } from '@/lib/db';
import { getCurrentOrganization } from '@/lib/tenant';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    const db = getScopedPrisma(organization.id);

    const settings = await db.setting.findMany();
    const settingsObject: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObject[s.key] = s.value;
    });
    return NextResponse.json(settingsObject);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const db = getScopedPrisma(session.organizationId);

    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await db.setting.upsert({
          where: { organizationId_key: { organizationId: session.organizationId, key } },
          update: { value },
          create: { organizationId: session.organizationId, key, value },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
