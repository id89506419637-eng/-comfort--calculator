import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RECIPIENT = "remont-nt@mail.ru";
const FROM = "Комфорт+ <onboarding@resend.dev>";
const DASHBOARD_URL = "https://comfort-calculator.vercel.app/#dashboard";

serve(async (req) => {
  try {
    const payload = await req.json();
    const order = payload.record || payload;

    const itemsHtml = Array.isArray(order.items)
      ? order.items.map((it: Record<string, unknown>, i: number) =>
          `<li>№${i + 1}: ${JSON.stringify(it)}</li>`
        ).join("")
      : "<li>—</li>";

    const priceRange = order.price_min && order.price_max
      ? `${order.price_min.toLocaleString("ru-RU")} – ${order.price_max.toLocaleString("ru-RU")} ₽`
      : "—";

    const html = `
      <h2>Новая заявка на сайте Комфорт+</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
        <tr><td><b>Клиент:</b></td><td>${order.client_name || "—"}</td></tr>
        <tr><td><b>Телефон:</b></td><td>${order.client_phone || "—"}</td></tr>
        <tr><td><b>Компания:</b></td><td>${order.client_company || "—"}</td></tr>
        <tr><td><b>Сумма:</b></td><td>${priceRange}</td></tr>
        <tr><td><b>Дата заявки:</b></td><td>${new Date(order.created_at || Date.now()).toLocaleString("ru-RU")}</td></tr>
      </table>
      <h3>Состав заказа:</h3>
      <ul>${itemsHtml}</ul>
      <hr>
      <p>Открыть в дашборде: <a href="${DASHBOARD_URL}">${DASHBOARD_URL}</a></p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: RECIPIENT,
        subject: `Новая заявка: ${order.client_name || "Без имени"} — ${priceRange}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ ok: false, error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
