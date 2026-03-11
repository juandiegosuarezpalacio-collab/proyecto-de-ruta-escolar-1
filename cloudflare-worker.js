export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-api-key'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const ok = Boolean(env.WHATSAPP_TOKEN && env.PHONE_NUMBER_ID);
      return json({ ok, mode: ok ? 'business' : 'incomplete-config' }, 200, corsHeaders);
    }

    if (url.pathname !== '/send' || request.method !== 'POST') {
      return json({ ok: false, error: 'Ruta no encontrada' }, 404, corsHeaders);
    }

    const apiKey = request.headers.get('x-api-key');
    if (env.API_KEY && apiKey !== env.API_KEY) {
      return json({ ok: false, error: 'No autorizado' }, 401, corsHeaders);
    }

    const body = await request.json().catch(() => null);
    if (!body?.telefono || !body?.mensaje) {
      return json({ ok: false, error: 'Faltan telefono o mensaje' }, 400, corsHeaders);
    }

    const phone = String(body.telefono).replace(/\D/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: body.mensaje }
    };

    const response = await fetch(`https://graph.facebook.com/v23.0/${env.PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ ok: false, error: data.error?.message || 'Error enviando a WhatsApp' }, 500, corsHeaders);
    }

    return json({ ok: true, id: data.messages?.[0]?.id || null }, 200, corsHeaders);
  }
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}
