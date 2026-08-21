import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. Multipart Form Data (File Picker Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Clean filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `img_${Date.now()}_${safeName}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({ success: true, url: publicUrl });
    }

    // 2. JSON Payload (Windows Local Filepath or Base64)
    const body = await req.json();
    const { localPath } = body;

    if (localPath) {
      // Normalize Windows slash
      let cleanPath = localPath.replace(/"/g, '').trim();

      // Check if file exists on local disk
      if (!fs.existsSync(cleanPath)) {
        return NextResponse.json(
          { error: `Arquivo local não encontrado no caminho: ${cleanPath}` },
          { status: 404 }
        );
      }

      const fileExt = path.extname(cleanPath) || '.jpeg';
      const baseName = path.basename(cleanPath, fileExt).replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `img_${Date.now()}_${baseName}${fileExt}`;
      const destPath = path.join(uploadsDir, filename);

      fs.copyFileSync(cleanPath, destPath);

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({ success: true, url: publicUrl });
    }

    return NextResponse.json({ error: 'Formato de requisição inválido.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/upload:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar imagem.' }, { status: 500 });
  }
}
