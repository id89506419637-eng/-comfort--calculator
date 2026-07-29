// Vercel Serverless Function: проксирует загрузку файлов в Supabase Storage.
// Обходит блокировку провайдера — браузер шлёт файл на Vercel,
// а Vercel пересылает в Supabase Storage с service_role ключом.
//
// Поддерживает chunk-загрузку для файлов > 4 МБ:
// - x-chunk-index / x-chunk-total — номер/общее число частей
// - Части хранятся в памяти до сборки, затем отправляются целиком

export const config = {
  api: {
    bodyParser: false, // отключаем парсинг — передаём raw body
  },
};

// Временное хранилище для чанков (в памяти одного инстанса)
// Ключ: filePath, значение: { chunks: Map<number, Buffer>, total: number, timer: NodeJS.Timeout }
const pendingChunks = new Map();

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-file-path, x-content-type, x-chunk-index, x-chunk-total');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const filePath = req.headers['x-file-path'];
  const contentType = req.headers['x-content-type'] || 'application/octet-stream';
  const chunkIndex = req.headers['x-chunk-index'];
  const chunkTotal = req.headers['x-chunk-total'];

  if (!filePath) {
    return res.status(400).json({ error: 'Missing x-file-path header' });
  }

  try {
    // Читаем raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Если это chunk-загрузка
    if (chunkIndex !== undefined && chunkTotal !== undefined) {
      const idx = parseInt(chunkIndex, 10);
      const total = parseInt(chunkTotal, 10);

      if (!pendingChunks.has(filePath)) {
        const timer = setTimeout(() => pendingChunks.delete(filePath), 120000); // 2 мин таймаут
        pendingChunks.set(filePath, { chunks: new Map(), total, timer });
      }

      const entry = pendingChunks.get(filePath);
      entry.chunks.set(idx, body);
      console.log(`Chunk ${idx + 1}/${total} received for ${filePath} (${body.length}b)`);

      // Если все чанки получены — собираем и загружаем
      if (entry.chunks.size === total) {
        clearTimeout(entry.timer);
        const parts = [];
        for (let i = 0; i < total; i++) {
          parts.push(entry.chunks.get(i));
        }
        const fullBody = Buffer.concat(parts);
        pendingChunks.delete(filePath);

        console.log(`All ${total} chunks assembled for ${filePath} (${fullBody.length}b), uploading...`);

        const uploadUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${filePath}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
          body: fullBody,
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('Supabase upload error:', response.status, result);
          return res.status(response.status).json(result);
        }
        return res.status(200).json(result);
      }

      // Ещё не все чанки
      return res.status(200).json({ ok: true, received: idx + 1, total });
    }

    // Обычная загрузка (не чанки) — как было раньше
    const uploadUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${filePath}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: body,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Supabase upload error:', response.status, result);
      return res.status(response.status).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Upload proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
