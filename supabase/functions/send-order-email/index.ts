// Edge Function: отправка письма о новой заявке через Яндекс SMTP.
//
// Яндекс SMTP работал с 7 мая — письма доходили. Кодировка через base64.
// Отправитель: izuikova@yandex.ru (пароль приложения в секрете SMTP_PASSWORD).
// Получатель: настраивается через RECIPIENT.
//
// Скачивает прикреплённые клиентом файлы (включая КП.pdf) из приватного
// бакета `order-attachments` через service_role и прикладывает к письму.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const SMTP_HOST = "smtp.yandex.ru";
const SMTP_PORT = 465;
const SMTP_USER = "izuikova@yandex.ru";
const SENDER_NAME = "Комфорт+";
const RECIPIENT = "id89506419637@gmail.com";
const DASHBOARD_URL = "https://comfort-calculator.vercel.app/#dashboard";

// --- TLS + raw SMTP helpers ---
async function smtpConnect(): Promise<Deno.TlsConn> {
  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });
  await readReply(conn);
  return conn;
}

async function readReply(conn: Deno.TlsConn): Promise<string> {
  const buf = new Uint8Array(4096);
  const n = await conn.read(buf);
  return n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
}

async function sendCmd(conn: Deno.TlsConn, cmd: string): Promise<string> {
  await conn.write(new TextEncoder().encode(cmd + "\r\n"));
  return readReply(conn);
}

function encodeSubject(text: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(text)))}?=`;
}

function b64bin(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function encodeFilename(name: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(name)))}?=`;
}

serve(async (req) => {
  try {
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      return new Response(
        JSON.stringify({ ok: false, error: "SMTP_PASSWORD not set" }),
        { status: 500 },
      );
    }

    const payload = await req.json();
    const order = payload.record || payload;
    console.log("Order:", order.client_name, order.client_phone);

    const price = order.price_min && order.price_max
      ? `${Number(order.price_min).toLocaleString("ru-RU")} – ${Number(order.price_max).toLocaleString("ru-RU")} ₽`
      : "";

    const subject = `Заявка на точный расчет: ${order.client_name || "Без имени"}${price ? " — " + price : ""}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#333;font-size:14px">
<div style="background:#005a8c;padding:16px 24px"><h2 style="color:#fff;margin:0;font-size:18px">Заявка на точный расчет</h2></div>
<div style="padding:16px 24px">
<p><strong>Клиент:</strong> ${order.client_name || "—"}</p>
<p><strong>Телефон:</strong> ${order.client_phone || "—"}</p>
<p><strong>Расчёт:</strong> ${price || "—"}</p>
<p>Новая заявка с калькулятора. Подробности — в приложенном КП и файлах от клиента.</p>
<p><a href="${DASHBOARD_URL}" style="color:#005a8c;font-weight:bold">Открыть в дашборде →</a></p>
</div>
</body></html>`;

    // --- Скачиваем вложения из Supabase Storage ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      || Deno.env.get("SUPABASE_SECRET_KEY")
      || Deno.env.get("SUPABASE_SERVICE_KEY")
      || "";
    const orderAttachments = Array.isArray(order.attachments) ? order.attachments : [];
    const MAX_TOTAL = 20 * 1024 * 1024;
    let totalSize = 0;
    const debug: string[] = [];
    debug.push(`attachments=${orderAttachments.length}`);
    debug.push(`URL=${supabaseUrl ? "set" : "MISSING"}`);
    debug.push(`KEY=${serviceKey ? "set(" + serviceKey.length + ")" : "MISSING"}`);

    const files: Array<{ filename: string; b64: string; contentType: string }> = [];

    if (supabaseUrl && serviceKey && orderAttachments.length > 0) {
      const sorted = [...orderAttachments].sort(
        (a: { isKp?: boolean }, b: { isKp?: boolean }) => (b.isKp ? 1 : 0) - (a.isKp ? 1 : 0),
      );
      for (const att of sorted) {
        if (!att?.path) { debug.push(`skip: no path`); continue; }
        try {
          const fileUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${att.path}`;
          const fileRes = await fetch(fileUrl, {
            headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
          });
          if (!fileRes.ok) {
            debug.push(`FAIL ${fileRes.status} ${att.path}`);
            continue;
          }
          const buf = new Uint8Array(await fileRes.arrayBuffer());
          if (totalSize + buf.length > MAX_TOTAL) { debug.push(`size limit ${att.name}`); continue; }
          totalSize += buf.length;
          files.push({
            filename: att.name || "file",
            b64: b64bin(buf),
            contentType: att.type || "application/octet-stream",
          });
          debug.push(`OK ${att.name} ${buf.length}b`);
        } catch (e) {
          debug.push(`err ${att.path}: ${(e as Error).message}`);
        }
      }
    }

    console.log("DEBUG:", debug.join(" | "));
    console.log("Files to attach:", files.length, "total:", totalSize);

    // --- Формируем MIME-письмо вручную (правильная кодировка) ---
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let mime = `From: ${SENDER_NAME} <${SMTP_USER}>\r\n`;
    mime += `To: ${RECIPIENT}\r\n`;
    mime += `Subject: ${encodeSubject(subject)}\r\n`;
    mime += `MIME-Version: 1.0\r\n`;
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    mime += `\r\n`;
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: text/html; charset=UTF-8\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n`;
    mime += `\r\n`;
    mime += btoa(unescape(encodeURIComponent(html))) + `\r\n`;

    for (const f of files) {
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: ${f.contentType}; name="${encodeFilename(f.filename)}"\r\n`;
      mime += `Content-Disposition: attachment; filename="${encodeFilename(f.filename)}"\r\n`;
      mime += `Content-Transfer-Encoding: base64\r\n`;
      mime += `\r\n`;
      // Разбиваем base64 на строки по 76 символов (стандарт MIME)
      const b = f.b64;
      for (let i = 0; i < b.length; i += 76) {
        mime += b.slice(i, i + 76) + `\r\n`;
      }
    }

    mime += `--${boundary}--\r\n`;

    // --- Отправка через raw SMTP ---
    const conn = await smtpConnect();
    await sendCmd(conn, `EHLO localhost`);
    await sendCmd(conn, `AUTH LOGIN`);
    await sendCmd(conn, btoa(SMTP_USER));
    await sendCmd(conn, btoa(smtpPassword));
    await sendCmd(conn, `MAIL FROM:<${SMTP_USER}>`);
    await sendCmd(conn, `RCPT TO:<${RECIPIENT}>`);
    await sendCmd(conn, `DATA`);
    await conn.write(new TextEncoder().encode(mime + "\r\n.\r\n"));
    await readReply(conn);
    await sendCmd(conn, `QUIT`);
    conn.close();

    console.log("Email sent OK via Yandex SMTP");
    return new Response(
      JSON.stringify({ ok: true, attachments: files.length, debug }),
      { status: 200 },
    );
  } catch (e) {
    console.error("Error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
});
