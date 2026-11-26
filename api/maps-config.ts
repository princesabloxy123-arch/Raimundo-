interface VercelRequestLike {
  method?: string;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  const apiKey = (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  const recaptchaSiteKey = (
    process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
    process.env.RECAPTCHA_ENTERPRISE_SITE_KEY ||
    ''
  ).trim();

  res.status(200).json({
    ok: true,
    configured: Boolean(apiKey),
    apiKey,
    recaptchaSiteKey,
  });
}
