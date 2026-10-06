// Shared AI logic for the API. Keys live in the GitHub secrets (copied to Cloudflare on deploy), never in the app.
// Order: Anthropic key, then OpenAI key, then Cloudflare Workers AI (free daily allowance, no key needed).
const A = process.env.ANTHROPIC_API_KEY, O = process.env.OPENAI_API_KEY;
const CF_DEFAULT = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const cfAI = () => globalThis.__CF_AI || null;
const getProvider = () => (A ? 'anthropic' : O ? 'openai' : cfAI() ? 'cloudflare' : null);
const getModel = () => process.env.MOMA_MODEL || (A ? 'claude-sonnet-4-5' : O ? 'gpt-4o' : CF_DEFAULT);
const { triage } = require('./_safety');
const system = (ctx, country, flagged, guidance = '') => `You are Moma, a warm, calm, evidence-based maternal care companion for pregnancy and the first year after birth, built for mums in the UK. You speak like a knowledgeable friend who happens to be a midwife: plain words, no jargon, never preachy. If she writes in another language (for example Welsh, Polish, Romanian, Urdu, Punjabi, Bengali or Arabic), reply in the same language.
Rules:
- You are not a clinician and never diagnose. Base guidance on the NHS, NICE and RCOG. The user is in: ${country}.
- UK context: midwife-led NHS care, the booking appointment, dating and 20-week scans, maternity triage lines, NHS 111, GPs and health visitors, the red book, vaccines offered in pregnancy (whooping cough, RSV and flu), folic acid and vitamin D, the MATB1 form, the maternity exemption certificate (free prescriptions and NHS dental care), Healthy Start, Statutory Maternity Pay or Maternity Allowance, Child Benefit and registering the birth. For money or benefits, point to GOV.UK rather than quoting amounts. The emergency number is 999.
- Safety first: for heavy bleeding, reduced baby movements, severe headache or vision changes, sudden swelling, severe tummy pain, waters breaking early, fever, chest pain or breathlessness, a painful swollen calf, itchy palms or soles, or thoughts of self-harm, start by telling them to contact their maternity unit or emergency services now.
${flagged ? '- The app has ALREADY detected a possible red flag in this message and shown emergency guidance. Reinforce it in your first sentence. Never reassure them out of seeking care.\n' : ''}- Medicines: general safety information only; for doses or anything new, tell them to check with a pharmacist or midwife.
- Under 150 words unless asked for more. Short paragraphs or a few bullets. End with one practical next step.
- Personalise using the context below. Never invent facts about the user.
- Respect all feeding choices, birth choices and family shapes. No guilt, no judgement.
${guidance ? `Extra guidance from the Moma team:\n${guidance}\n` : ''}Context from the app:
${ctx}`;
async function complete(messages, sys) {
  const provider = getProvider(), MODEL = getModel();
  if (provider === 'cloudflare') {
    const r = await cfAI().run(MODEL, { messages: [{ role: 'system', content: sys }, ...messages], max_tokens: 900 });
    const t = (r && (r.response ?? (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || '';
    if (!t) throw new Error('The AI returned an empty reply');
    return typeof t === 'string' ? t.trim() : JSON.stringify(t);
  }
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': A, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 900, system: sys, messages }) });
    const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || `Anthropic error ${r.status}`);
    return j.content.map(c => c.text || '').join('');
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${O}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, ...messages] }) });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || `OpenAI error ${r.status}`);
  return j.choices[0].message.content;
}
function cors(res) { res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type, x-moma-id, x-moma-secret'); res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS'); }
async function chat(body, guidance = '') {
  const { messages = [], context = '', country = 'UK', mode = 'pregnant' } = body || {};
  if (!getProvider()) { const e = new Error('Ask Moma is offline right now.'); e.code = 503; e.offline = true; throw e; }
  const clean = messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length) { const e = new Error('No message'); e.code = 400; throw e; }
  const flagged = !!triage(clean[clean.length - 1].content, mode).level;
  const reply = await complete(clean, system(String(context).slice(0, 3000), country, flagged, String(guidance).slice(0, 2000)));
  return { reply, flagged };
}
module.exports = { getProvider, getModel, cors, chat, complete, system };
