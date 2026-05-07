import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SMTP_HOST = "smtp.mail.ru";
const SMTP_PORT = 465;
const SMTP_USER = "komfortnt@mail.ru";
const RECIPIENT = "komfortnt@mail.ru";
const DASHBOARD_URL = "https://comfort-calculator.vercel.app/#dashboard";

serve(async (req) => {
  try {
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    if (!smtpPassword) {
      console.error("SMTP_PASSWORD not set");
      return new Response(JSON.stringify({ ok: false, error: "SMTP_PASSWORD not configured" }), { status: 500 });
    }

    const payload = await req.json();
    console.log("Payload received:", JSON.stringify(payload).slice(0, 500));
    const order = payload.record || payload;

    // Формируем список изделий
    const itemsHtml = Array.isArray(order.items)
      ? order.items.map((it: Record<string, unknown>, i: number) => {
          const labels: Record<string, string> = {
            window: "Окно", door: "Дверь", partition: "Перегородка", "sliding-balcony": "Раздвижная лоджия",
          };
          const profiles: Record<string, string> = {
            "cold-alu": "Холодный алюминий", "warm-alu": "Тёплый алюминий", pvc: "ПВХ",
          };
          const name = labels[it.productType as string] || String(it.productType || "—");
          const profile = profiles[it.profileType as string] || String(it.profileType || "—");
          const size = `${it.width || "?"}×${it.height || "?"} мм`;
          const count = `${it.count || 1} шт.`;
          return `<li>${name} — ${profile}, ${size}, ${count}</li>`;
        }).join("")
      : "<li>—</li>";

    // Диапазон цен
    const priceRange = order.price_min && order.price_max
      ? `${Number(order.price_min).toLocaleString("ru-RU")} – ${Number(order.price_max).toLocaleString("ru-RU")} ₽`
      : "—";

    // Дата
    const dateStr = new Date(order.created_at || Date.now()).toLocaleString("ru-RU", { timeZone: "Asia/Yekaterinburg" });

    // Собираем красивое HTML-письмо
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
        <div style="background:#005a8c;padding:16px 24px">
          <h2 style="color:#fff;margin:0;font-size:18px">📋 Новая заявка на сайте</h2>
        </div>
        <div style="padding:20px 24px">
          <table cellpadding="6" style="border-collapse:collapse;font-size:14px;width:100%">
            <tr><td style="color:#666;width:120px"><b>Клиент:</b></td><td>${order.client_name || "—"}</td></tr>
            <tr><td style="color:#666"><b>Телефон:</b></td><td><a href="tel:${order.client_phone || ""}">${order.client_phone || "—"}</a></td></tr>
            ${order.client_company ? `<tr><td style="color:#666"><b>Компания:</b></td><td>${order.client_company}</td></tr>` : ""}
            ${order.address ? `<tr><td style="color:#666"><b>Адрес:</b></td><td>${order.address}</td></tr>` : ""}
            <tr><td style="color:#666"><b>Сумма:</b></td><td style="font-weight:bold;color:#005a8c">${priceRange}</td></tr>
            <tr><td style="color:#666"><b>Дата:</b></td><td>${dateStr}</td></tr>
          </table>

          <h3 style="color:#005a8c;margin:20px 0 8px;font-size:15px">Состав заказа:</h3>
          <ul style="margin:0;padding-left:20px;font-size:14px">${itemsHtml}</ul>

          ${order.order_comment ? `
          <div style="margin-top:16px;padding:10px 14px;background:#f5f5f5;border-left:3px solid #005a8c;border-radius:4px;font-size:13px">
            <b>Комментарий:</b> ${order.order_comment}
          </div>` : ""}

          <div style="margin-top:24px;text-align:center">
            <a href="${DASHBOARD_URL}" style="display:inline-block;background:#005a8c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
              Открыть в дашборде →
            </a>
          </div>
        </div>
        <div style="background:#f9f9f9;padding:12px 24px;border-top:1px solid #e0e0e0;text-align:center;font-size:11px;color:#999">
          Автоматическое уведомление от калькулятора Комфорт+
        </div>
      </div>
    `;

    // Скачиваем прикреплённые файлы из Supabase Storage и прикладываем к письму.
    // Edge Functions автоматически имеют SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY.
    const attachmentsToSend: Array<{ filename: string; content: Uint8Array; contentType: string; encoding: "binary" }> = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const orderAttachments = Array.isArray(order.attachments) ? order.attachments : [];

    const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 МБ — оставляем запас под лимит Mail.ru ~25 МБ
    let totalSize = 0;

    if (supabaseUrl && serviceKey && orderAttachments.length > 0) {
      // КП показываем первым — приоритет
      const sorted = [...orderAttachments].sort((a, b) => (b.isKp ? 1 : 0) - (a.isKp ? 1 : 0));
      for (const att of sorted) {
        if (!att?.path) continue;
        try {
          const fileUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${att.path}`;
          const fileRes = await fetch(fileUrl, {
            headers: { Authorization: `Bearer ${serviceKey}` },
          });
          if (!fileRes.ok) {
            console.error("Не удалось скачать файл", att.path, fileRes.status);
            continue;
          }
          const buf = new Uint8Array(await fileRes.arrayBuffer());
          if (totalSize + buf.length > MAX_TOTAL_BYTES) {
            console.warn(`Превышен лимит размера, пропускаем ${att.name}`);
            continue;
          }
          totalSize += buf.length;
          attachmentsToSend.push({
            filename: att.name || "file",
            content: buf,
            contentType: att.type || "application/octet-stream",
            encoding: "binary",
          });
        } catch (e) {
          console.error("Ошибка при скачивании файла", att.path, (e as Error).message);
        }
      }
    }

    console.log("Connecting to SMTP:", SMTP_HOST, SMTP_PORT, "attachments:", attachmentsToSend.length);

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: {
          username: SMTP_USER,
          password: smtpPassword,
        },
      },
    });

    await client.send({
      from: `Комфорт+ <${SMTP_USER}>`,
      to: RECIPIENT,
      subject: `Новая заявка: ${order.client_name || "Без имени"} — ${priceRange}`,
      content: "auto",
      html,
      attachments: attachmentsToSend,
    });

    await client.close();

    console.log("Email sent successfully");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (e) {
    console.error("Function error:", e.message, e.stack);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
