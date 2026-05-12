import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  const lang = (formData.get('lang') as string) || 'zh';

  if (!audioFile) {
    return Response.json({ error: '没有音频数据' }, { status: 400 });
  }

  const whisperFormData = new FormData();
  whisperFormData.append('file', audioFile, 'audio.webm');
  whisperFormData.append('model', 'whisper-1');
  whisperFormData.append('language', lang);
  whisperFormData.append('response_format', 'json');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Whisper API error:', err);
      return Response.json({ error: '转写失败' }, { status: 500 });
    }

    const result = await response.json();
    return Response.json({ text: result.text });
  } catch (e) {
    console.error('Whisper transcription error:', e);
    return Response.json({ error: '转写失败' }, { status: 500 });
  }
}
