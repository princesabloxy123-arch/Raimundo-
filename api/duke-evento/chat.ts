import { runDukeEventChat, type DukeChatRequestBody } from '../../src/server/dukeEventAi.ts';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const rawBody =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as DukeChatRequestBody)
        : ((req.body || {}) as DukeChatRequestBody);
    const result = await runDukeEventChat(rawBody);
    res.status(200).json(result);
  } catch (err) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
    const message =
      err instanceof Error
        ? err.message
        : 'Erro interno ao consultar a Inteligência Artificial do Robô Duque Evento.';
    res.status(statusCode).json({ error: message });
  }
}
