// Edge Function: отправка письма о новой заявке через SMTP Mail.ru.
// Сырой SMTP (Deno.connectTls) с правильной обработкой multi-line ответов SMTP-сервера
// и base64-кодированием тела и вложений — Mail.ru гарантированно декодирует кириллицу
// и нормально показывает HTML.
//
// Скачивает прикреплённые клиентом файлы (включая сгенерированный КП.pdf) из приватного
// бакета `order-attachments` через Supabase service_role и прикладывает к письму.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SMTP_HOST = "smtp.mail.ru";
const SMTP_PORT = 465;
const SMTP_USER = "komfortnt@mail.ru";
const RECIPIENT = "komfortnt@mail.ru";
const DASHBOARD_URL = "https://comfort-calculator.vercel.app/#dashboard";

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8");

// Base64-кодирование UTF-8 строк (для subject, имён файлов, тела письма)
function b64utf8(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

// Base64-кодирование бинарного буфера (для вложений)
function b64bin(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Чтение полного ответа SMTP-сервера (включая multi-line вида "250-..." / "250 ...")
async function readResponse(conn: Deno.TlsConn): Promise<string> {
  let result = "";
  const buf = new Uint8Array(8192);
  while (true) {
    const n = await conn.read(buf);
    if (!n) break;
    result += dec.decode(buf.subarray(0, n));
    // Конец ответа: последняя строка начинается с "XXX " (3 цифры + пробел, не дефис)
    const lines = result.split("\r\n").filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && /^\d{3} /.test(last)) break;
  }
  return result;
}

async function cmd(conn: Deno.TlsConn, line: string): Promise<string> {
  await conn.write(enc.encode(line + "\r\n"));
  return readResponse(conn);
}

function expect(resp: string, code: string, label: string): void {
  if (!resp.startsWith(code)) {
    throw new Error(`${label} failed: ${resp.trim().slice(0, 200)}`);
  }
}

async function sendEmail(
  password: string,
  subject: string,
  htmlBody: string,
  attachments: Array<{ filename: string; content: Uint8Array; contentType: string }>,
): Promise<void> {
  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
  try {
    expect(await readResponse(conn), "220", "SMTP banner");
    expect(await cmd(conn, `EHLO ${SMTP_USER.split("@")[1]}`), "250", "EHLO");
    expect(await cmd(conn, "AUTH LOGIN"), "334", "AUTH LOGIN");
    expect(await cmd(conn, btoa(SMTP_USER)), "334", "username");
    expect(await cmd(conn, btoa(password)), "235", "password auth");
    expect(await cmd(conn, `MAIL FROM:<${SMTP_USER}>`), "250", "MAIL FROM");
    expect(await cmd(conn, `RCPT TO:<${RECIPIENT}>`), "250", "RCPT TO");
    expect(await cmd(conn, "DATA"), "354", "DATA");

    const boundary = "----=Part" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const subjectEnc = `=?UTF-8?B?${b64utf8(subject)}?=`;
    const fromEnc = `=?UTF-8?B?${b64utf8("Комфорт+")}?= <${SMTP_USER}>`;
    const htmlLines = b64utf8(htmlBody).match(/.{1,76}/g)?.join("\r\n") || "";

    const parts: string[] = [];
    parts.push(`From: ${fromEnc}`);
    parts.push(`To: <${RECIPIENT}>`);
    parts.push(`Subject: ${subjectEnc}`);
    parts.push(`Date: ${new Date().toUTCString()}`);
    parts.push(`MIME-Version: 1.0`);
    parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    parts.push("");

    // HTML-часть
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: text/html; charset=UTF-8`);
    parts.push(`Content-Transfer-Encoding: base64`);
    parts.push("");
    parts.push(htmlLines);

    // Вложения
    for (const att of attachments) {
      const attLines = b64bin(att.content).match(/.{1,76}/g)?.join("\r\n") || "";
      const nameEnc = `=?UTF-8?B?${b64utf8(att.filename)}?=`;
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${att.contentType}; name="${nameEnc}"`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(`Content-Disposition: attachment; filename="${nameEnc}"`);
      parts.push("");
      parts.push(attLines);
    }

    parts.push(`--${boundary}--`);

    const message = parts.join("\r\n");
    await conn.write(enc.encode(message + "\r\n.\r\n"));
    const dataResp = await readResponse(conn);
    expect(dataResp, "250", "DATA accept");

    try { await cmd(conn, "QUIT"); } catch { /* не критично */ }
  } finally {
    try { conn.close(); } catch { /* ok */ }
  }
}

serve(async (req) => {
  try {
    const password = Deno.env.get("SMTP_PASSWORD");
    if (!password) {
      return new Response(JSON.stringify({ ok: false, error: "SMTP_PASSWORD not set" }), { status: 500 });
    }

    const payload = await req.json();
    const order = payload.record || payload;
    console.log("Order:", order.client_name, order.client_phone);

    const price = order.price_min && order.price_max
      ? `${Number(order.price_min).toLocaleString("ru-RU")} – ${Number(order.price_max).toLocaleString("ru-RU")} ₽`
      : "";

    const subject = `Заявка на точный расчет: ${order.client_name || "Без имени"}${price ? " — " + price : ""}`;

    // Тело письма минимальное — детали клиент и менеджер видят в КП и в дашборде.
    // Совсем пустое тело Mail.ru может пометить как спам — оставляем одну строку и ссылку.
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#333;font-size:14px">
<p>Новая заявка с калькулятора. Подробности — в приложенном КП и файлах от клиента.</p>
<p><a href="${DASHBOARD_URL}" style="color:#005a8c;font-weight:bold">Открыть в дашборде →</a></p>
</body></html>`;

    // Скачиваем вложения из приватного Storage через service_role
    const attachmentsToSend: Array<{ filename: string; content: Uint8Array; contentType: string }> = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const orderAttachments = Array.isArray(order.attachments) ? order.attachments : [];
    const MAX_TOTAL = 20 * 1024 * 1024;
    let totalSize = 0;

    if (supabaseUrl && serviceKey && orderAttachments.length > 0) {
      // КП первым — приоритет
      const sorted = [...orderAttachments].sort(
        (a: { isKp?: boolean }, b: { isKp?: boolean }) => (b.isKp ? 1 : 0) - (a.isKp ? 1 : 0),
      );
      for (const att of sorted) {
        if (!att?.path) continue;
        try {
          const fileUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${att.path}`;
          const fileRes = await fetch(fileUrl, { headers: { Authorization: `Bearer ${serviceKey}` } });
          if (!fileRes.ok) {
            console.warn("Не удалось скачать", att.path, fileRes.status);
            continue;
          }
          const buf = new Uint8Array(await fileRes.arrayBuffer());
          if (totalSize + buf.length > MAX_TOTAL) {
            console.warn("Превышен лимит, пропускаем", att.name);
            continue;
          }
          totalSize += buf.length;
          attachmentsToSend.push({
            filename: att.name || "file",
            content: buf,
            contentType: att.type || "application/octet-stream",
          });
        } catch (e) {
          console.warn("Ошибка скачивания", att.path, (e as Error).message);
        }
      }
    }

    console.log("Sending via SMTP, attachments:", attachmentsToSend.length, "total size:", totalSize);
    await sendEmail(password, subject, html, attachmentsToSend);
    console.log("Email sent OK");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error("Error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
});
