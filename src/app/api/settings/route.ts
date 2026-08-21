import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
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

    const body = await request.json(); // Record<string, string>

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
