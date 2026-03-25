import { createServiceClient, extractToken, getUserFromToken } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const chatId = formData.get('chatId') as string | null;
    const type = formData.get('type') as string | null; // 'image' or 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isImage = type === 'image' || ALLOWED_IMAGE_TYPES.includes(file.type);
    const isDocument = type === 'document' || ALLOWED_DOC_TYPES.includes(file.type);

    if (!isImage && !isDocument) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Upload to Supabase Storage
    const bucket = isImage ? 'chat-images' : 'chat-documents';
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // For documents, extract text content and save to documents table
    if (isDocument && chatId) {
      let contentText: string | null = null;

      // Extract text from text-based files
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        contentText = await file.text();
      }

      await supabase.from('documents').insert({
        chat_id: chatId,
        filename: file.name,
        storage_path: filePath,
        content_text: contentText,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }

    return NextResponse.json({
      url: publicUrl,
      filename: file.name,
      type: isImage ? 'image' : 'document',
      size: file.size,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
