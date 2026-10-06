// Voice and translation for Ask Moma and the community.
// stt: speech to text (OpenAI, then Cloudflare Whisper). tts: text to speech (OpenAI; the app falls back to the phone's own voice).
// translate: English, Welsh, Polish, Romanian, Urdu, Punjabi, Bengali and Arabic.
const { cors, complete, getProvider } = require('./_moma');
const { ready, body, bump } = require('./_db');
const { appUser } = require('./_appuser');
const O = process.env.OPENAI_API_KEY;
const cfAI = () => globalThis.__CF_AI || null;
const LANGS = { English: 'en', Welsh: 'cy', Polish: 'pl', Romanian: 'ro', Urdu: 'ur', Punjabi: 'pa', Bengali: 'bn', Arabic: 'ar' };
const fail = (code, msg) => Object.assign(new Error(msg), { code });

async function stt(b64, mime, lang) {
  const bytes = Buffer.from(b64, 'base64');
  if (!bytes.length) throw fail(400, 'No audio');
  if (bytes.length > 8 * 1024 * 1024) throw fail(413, 'That recording is too long. Keep it under a minute.');
  const hint = 'A mother in the UK asking about pregnancy, birth, breastfeeding or her baby. Words like midwife, health visitor, antenatal, maternity triage, NHS 111, MATB1, red book, Braxton Hicks.';
  if (O) {
    const fd = new FormData();
    const ext = /mp4|m4a|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm';
    fd.append('file', new Blob([bytes], { type: mime || 'audio/webm' }), `voice.${ext}`);
    fd.append('model', 'gpt-4o-mini-transcribe');
    fd.append('prompt', hint);
    if (LANGS[lang]) fd.append('language', LANGS[lang]);
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${O}` }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (r.ok && typeof j.text === 'string') return j.text.trim();
    if (!cfAI()) throw new Error((j.error && j.error.message) || 'Could not hear that');
  }
  if (cfAI()) {
    const r = await cfAI().run('@cf/openai/whisper-large-v3-turbo', { audio: b64, initial_prompt: hint, ...(LANGS[lang] ? { language: LANGS[lang] } : {}) });
    return String((r && r.text) || '').trim();
  }
  throw fail(503, 'Voice is not switched on yet');
}

async function tts(text, lang) {
  if (!O) return null;
  const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${O}` },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'coral', format: 'mp3', input: text,
      instructions: `Warm, calm and kind, like a caring NHS midwife. Speak clearly at a gentle pace with a British accent.${lang && lang !== 'English' ? ` The text is in ${lang}; pronounce it naturally.` : ''}` }) });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

async function translate(text, to) {
  if (!getProvider()) throw fail(503, 'Translation is offline right now');
  const sys = `You translate messages for Moma, a maternal health app for mothers in the UK. Translate the user's message into ${to}.
Keep the meaning exact, including any safety advice, numbers, doses and phone numbers such as 999 and 111. Keep markdown formatting (bold, bullets). Use simple everyday words a mother would use at home.
If a medical word has no common equivalent, keep the English word. Reply with the translation only, no notes.`;
  return (await complete([{ role: 'user', content: text }], sys)).trim();
}

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const a = (req.query && req.query.a) || '';
  try {
    if (ready && !(await appUser(req))) throw fail(401, 'Open Moma again so we can set up your account, then try again.');
    const B = body(req);
    const lang = Object.keys(LANGS).includes(B.lang) ? B.lang : 'English';
    if (a === 'stt') {
      const text = await stt(String(B.audio || ''), String(B.mime || ''), lang);
      if (ready) await bump(['voice:stt']).catch(() => {});
      return res.status(200).json({ text });
    }
    if (a === 'tts') {
      const text = String(B.text || '').replace(/[*#_`>]/g, '').replace(/\n{2,}/g, '\n').trim().slice(0, 2000);
      if (!text) throw fail(400, 'Nothing to read');
      const audio = await tts(text, lang);
      if (ready && audio) await bump(['voice:tts']).catch(() => {});
      return res.status(200).json(audio ? { audio, mime: 'audio/mpeg' } : { audio: null });
    }
    if (a === 'translate') {
      const text = String(B.text || '').slice(0, 4000);
      if (!text.trim()) throw fail(400, 'Nothing to translate');
      const to = Object.keys(LANGS).includes(B.to) ? B.to : 'English';
      const out = await translate(text, to);
      if (ready) await bump(['voice:translate']).catch(() => {});
      return res.status(200).json({ text: out, to });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    if (!e.code || e.code >= 500) console.error(e);
    return res.status(typeof e.code === 'number' ? e.code : 500).json({ error: e.code ? e.message : 'Something went wrong' });
  }
};
