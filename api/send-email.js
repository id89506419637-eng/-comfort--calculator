// Vercel Serverless Function: отправляет email двумя способами:
// 1) Resend API → Gmail (надёжный, всегда работает)
// 2) Mail.ru SMTP → komfortnt@mail.ru (попытка прямой доставки)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order } = req.body || {};
    if (!order) return res.status(400).json({ error: 'No order data' });

    const resendKey = process.env.RESEND_API_KEY || '';
    const smtpPassword = process.env.SMTP_PASSWORD || '';
    const smtpUser = process.env.SMTP_USER || 'remont-nt@mail.ru';
    const gmailRecipient = 'id89506419637@gmail.com';
    const komfortRecipient = process.env.EMAIL_RECIPIENT || 'komfortnt@mail.ru';

    // Формируем данные письма
    const price = order.price_min && order.price_max
      ? `${Number(order.price_min).toLocaleString('ru-RU')} – ${Number(order.price_max).toLocaleString('ru-RU')} ₽`
      : '';

    const subject = `Заявка на точный расчет: ${order.client_name || 'Без имени'}${price ? ' — ' + price : ''}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;font-size:14px">
<div style="background:#005a8c;padding:16px 24px"><h2 style="color:#fff;margin:0;font-size:18px">Заявка на точный расчет</h2></div>
<div style="padding:16px 24px">
<p><strong>Клиент:</strong> ${order.client_name || '—'}</p>
<p><strong>Телефон:</strong> ${order.client_phone || '—'}</p>
<p><strong>Расчёт:</strong> ${price || '—'}</p>
<p>Подробности — в приложенном КП и файлах от клиента.</p>
<p><a href="https://comfort-calculator.vercel.app/#dashboard" style="color:#005a8c;font-weight:bold">Открыть в дашборде →</a></p>
</div></body></html>`;

    // Скачиваем вложения из Supabase Storage
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nweouiumnpcenomzqxkx.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const orderAttachments = Array.isArray(order.attachments) ? order.attachments : [];
    const fileBufs = []; // {name, buf, type}

    if (serviceKey && orderAttachments.length > 0) {
      let totalSize = 0;
      const MAX_TOTAL = 10 * 1024 * 1024;
      const sorted = [...orderAttachments].sort((a, b) => (b.isKp ? 1 : 0) - (a.isKp ? 1 : 0));
      for (const att of sorted) {
        if (!att?.path) continue;
        try {
          const fileUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${att.path}`;
          const fileRes = await fetch(fileUrl, {
            headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
          });
          if (!fileRes.ok) continue;
          const buf = Buffer.from(await fileRes.arrayBuffer());
          if (totalSize + buf.length > MAX_TOTAL) continue;
          totalSize += buf.length;
          fileBufs.push({ name: att.name || 'file', buf, type: att.type || 'application/octet-stream' });
        } catch (e) {
          console.warn('Attachment err:', e.message);
        }
      }
    }

    const results = { resend: null, smtp: null };

    // === 1) Resend → Gmail (надёжный) ===
    if (resendKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Комфорт+ <onboarding@resend.dev>',
            to: [gmailRecipient],
            subject,
            html,
            attachments: fileBufs.map(f => ({ filename: f.name, content: f.buf.toString('base64') })),
          }),
        });
        const data = await resendRes.json().catch(() => ({}));
        results.resend = resendRes.ok ? 'OK' : `FAIL ${resendRes.status}: ${data.message || ''}`;
      } catch (e) {
        results.resend = `ERROR: ${e.message}`;
      }
      console.log('Resend:', results.resend);
    }

    // === 2) Mail.ru SMTP → komfortnt (попытка) ===
    if (smtpPassword) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: 'smtp.mail.ru',
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPassword },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });
        await transporter.sendMail({
          from: `"Комфорт+" <${smtpUser}>`,
          to: komfortRecipient,
          subject,
          html,
          attachments: fileBufs.map(f => ({ filename: f.name, content: f.buf })),
        });
        results.smtp = 'OK';
      } catch (e) {
        results.smtp = `FAIL: ${e.message}`;
      }
      console.log('SMTP:', results.smtp);
    }

    const anyOk = results.resend === 'OK' || results.smtp === 'OK';
    return res.status(anyOk ? 200 : 500).json({ ok: anyOk, results });
  } catch (e) {
    console.error('Error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
