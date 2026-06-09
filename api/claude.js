// Edge function — מסתירה את מפתח ה-API בצד השרת.
// ב-Vercel: הגדירי משתנה סביבה ANTHROPIC_API_KEY, והאפליקציה תקרא דרך כאן.
// הגוף שמגיע מהדפדפן מועבר כמו שהוא ל-Anthropic, והתשובה (כולל סטרימינג) חוזרת ישירות.
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY לא הוגדר בשרת. הגדירי אותו ב-Vercel → Settings → Environment Variables.' } }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
  const body = await req.text();
  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: 'שגיאת רשת מול Anthropic: ' + e.message } }),
      { status: 502, headers: { 'content-type': 'application/json' } });
  }
  // העברת התשובה כמו שהיא (כולל זרם ה-SSE)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'text/event-stream',
      'cache-control': 'no-cache',
    },
  });
}
