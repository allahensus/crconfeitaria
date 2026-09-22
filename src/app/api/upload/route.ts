import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/auth';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB -- plenty for a product/gallery photo

// The browser-supplied File.type is just a client claim (trivially forged in
// a raw multipart request) and was the only check here before -- sniff the
// real file signature instead of trusting it, so an .html/.svg/anything else
// can't be uploaded and served publicly from Blob storage under a
// Content-Type: image/png label.
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return 'image/webp';
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Formato de requisição inválido.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Envie apenas imagens (JPEG, PNG, WEBP ou GIF).' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande (máximo 8MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffedType = sniffImageMime(buffer);
    if (!sniffedType) {
      return NextResponse.json({ error: 'O arquivo não é uma imagem válida (JPEG, PNG, WEBP ou GIF).' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `img_${Date.now()}_${safeName}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: true, // avoid two uploads in the same millisecond overwriting each other
      contentType: sniffedType,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (err: any) {
    console.error('Error in /api/upload:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar imagem.' }, { status: 500 });
  }
}
