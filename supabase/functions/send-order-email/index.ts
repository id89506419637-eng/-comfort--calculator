// Edge Function: отправка письма о новой заявке через Resend API.
//
// Почему Resend, а не SMTP: Yandex SMTP с зарубежных IP Supabase Edge Functions
// принимает сессию и возвращает 250 OK, но письма тихо не доставляет (anti-spam).
// Мы потратили несколько часов на отладку SMTP — все таймауты и пароли приложений
// корректные, но письма не приходят. Resend это REST API, без SMTP-сессий, с
// валидным SPF/DKIM на resend.dev — yandex/gmail принимают такие письма нормально.
//
// Скачивает прикреплённые клиентом файлы (включая сгенерированный КП.pdf) из
// приватного бакета `order-attachments` через Supabase service_role и прикладывает
// к письму через base64.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Получатель — nambam577@gmail.com: на бесплатном тарифе Resend без верифицированного
// домена можно слать ТОЛЬКО на email, на который заведён аккаунт. Когда подключим
// свой домен (komfortnt.ru) — сменим получателя на izuikova@yandex.ru / любой другой.
// До тех пор пользователь может настроить gmail автопересылку на izuikova@yandex.ru.
// Пока используем тестовый режим Resend — слать можно ТОЛЬКО на email-владелец аккаунта
// Resend (id89506419637@gmail.com — регистрационная почта пользовательницы). Когда
// подключим свой домен komfortnt.ru — сменим на izuikova@yandex.ru или любой другой.
const RECIPIENT = "id89506419637@gmail.com";
// На бесплатном тарифе Resend без верифицированного домена единственный разрешённый
// отправитель — onboarding@resend.dev. Имя в From показывается получателю как
// «Комфорт+ <onboarding@resend.dev>».
const FROM = "Комфорт+ <onboarding@resend.dev>";
const DASHBOARD_URL = "https://comfort-calculator.vercel.app/#dashboard";

// Base64-кодирование бинарного буфера (для вложений)
function b64bin(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const payload = await req.json();
    const order = payload.record || payload;
    console.log("Order:", order.client_name, order.client_phone);

    const price = order.price_min && order.price_max
      ? `${Number(order.price_min).toLocaleString("ru-RU")} – ${Number(order.price_max).toLocaleString("ru-RU")} ₽`
      : "";

    const subject = `Заявка на точный расчет: ${order.client_name || "Без имени"}${price ? " — " + price : ""}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#333;font-size:14px">
<p>Новая заявка с калькулятора. Подробности — в приложенном КП и файлах от клиента.</p>
<p><a href="${DASHBOARD_URL}" style="color:#005a8c;font-weight:bold">Открыть в дашборде →</a></p>
</body></html>`;

    // Скачиваем вложения из приватного Storage через service_role
    const attachmentsForResend: Array<{ filename: string; content: string }> = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      || Deno.env.get("SUPABASE_SECRET_KEY")
      || Deno.env.get("SUPABASE_SERVICE_KEY")
      || "";
    const orderAttachments = Array.isArray(order.attachments) ? order.attachments : [];
    // Лимит Resend на письмо — 40 МБ, но между base64 и JSON-overhead закладываемся
    // на 30 МБ исходных байтов.
    const MAX_TOTAL = 30 * 1024 * 1024;
    let totalSize = 0;
    const debug: string[] = [];
    debug.push(`order.attachments count=${orderAttachments.length}`);
    debug.push(`SUPABASE_URL=${supabaseUrl ? "set" : "MISSING"}`);
    debug.push(`SERVICE_KEY=${serviceKey ? "set(" + serviceKey.length + ")" : "MISSING"}`);

    if (supabaseUrl && serviceKey && orderAttachments.length > 0) {
      const sorted = [...orderAttachments].sort(
        (a: { isKp?: boolean }, b: { isKp?: boolean }) => (b.isKp ? 1 : 0) - (a.isKp ? 1 : 0),
      );
      for (const att of sorted) {
        if (!att?.path) {
          debug.push(`skip: no path on ${JSON.stringify(att).slice(0, 80)}`);
          continue;
        }
        try {
          const fileUrl = `${supabaseUrl}/storage/v1/object/order-attachments/${att.path}`;
          const fileRes = await fetch(fileUrl, {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
          });
          if (!fileRes.ok) {
            const body = await fileRes.text().catch(() => "");
            debug.push(`download FAIL ${fileRes.status} ${att.path}: ${body.slice(0, 120)}`);
            continue;
          }
          const buf = new Uint8Array(await fileRes.arrayBuffer());
          if (totalSize + buf.length > MAX_TOTAL) {
            debug.push(`size limit, skip ${att.name} (${buf.length}b)`);
            continue;
          }
          totalSize += buf.length;
          attachmentsForResend.push({
            filename: att.name || "file",
            content: b64bin(buf),
          });
          debug.push(`OK ${att.name} ${buf.length}b`);
        } catch (e) {
          debug.push(`exception on ${att.path}: ${(e as Error).message}`);
        }
      }
    }

    console.log("Sending via Resend, attachments:", attachmentsForResend.length, "total size:", totalSize);
    console.log("DEBUG:", debug.join(" | "));

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        subject,
        html,
        attachments: attachmentsForResend,
      }),
    });

    const respText = await resendResp.text();
    if (!resendResp.ok) {
      console.error("Resend error", resendResp.status, respText);
      return new Response(
        JSON.stringify({ ok: false, error: `Resend ${resendResp.status}: ${respText.slice(0, 400)}`, debug }),
        { status: 500 },
      );
    }

    console.log("Email sent OK via Resend:", respText.slice(0, 200));
    return new Response(
      JSON.stringify({ ok: true, sent: attachmentsForResend.length, debug, resend: respText.slice(0, 200) }),
      { status: 200 },
    );
  } catch (e) {
    console.error("Error:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
});
