// Shared AI logic for the Vercel functions. The API key lives in Vercel's environment variables, never in the app.
const A = process.env.ANTHROPIC_API_KEY, O = process.env.OPENAI_API_KEY;
const provider = A ? 'anthropic' : O ? 'openai' : null;
const MODEL = process.env.MOMA_MODEL || (A ? 'claude-sonnet-4-5' : 'gpt-4o');
const RED = [
  /(want|thinking|thoughts?|feel like).{0,25}(die|dying|kill|end it|harm(ing)? (myself|me|the baby|my baby))|suicid|hurt(ing)? (myself|the baby|my baby)/i,
  /(heavy|lots? of|soaking|gushing).{0,20}(bleed|blood)|large clots?/i,
  /chest pain|can'?t breathe|short(ness)? of breath|faint(ed|ing)|seizure|collapsed/i,
  /(less|reduced|not|stopped|fewer|no).{0,15}(moving|movements?|kicks?)/i,
  /(severe|bad|worst|persistent).{0,15}headache|blurr(y|ed) vision|flashing lights/i,
  /waters? (broke|broken|breaking|leak)|leaking fluid/i,
  /fever|temperature.{0,10}3[89]/i,
  /(calf|leg).{0,20}(pain|swollen|swelling|hot)/i,
];
const system = (ctx, country, flagged) => `You are Moma, a warm, calm, evidence-based maternal care companion for pregnancy and the first year after birth. You speak like a knowledgeable friend who happens to be a midwife: plain words, no jargon, never preachy.
Rules:
- You are not a clinician and never diagnose. Base guidance on NHS, NICE and RCOG in the UK; SOGC in Canada; ACOG in the US; WHO elsewhere. The user is in: ${country}.
- Safety first: for heavy bleeding, reduced baby movements, severe headache or vision changes, sudden swelling, severe tummy pain, waters breaking early, fever, chest pain or breathlessness, a painful swollen calf, itchy palms or soles, or thoughts of self-harm, start by telling them to contact their maternity unit or emergency services now.
${flagged ? '- The app has ALREADY detected a possible red flag in this message and shown emergency guidance. Reinforce it in your first sentence. Never reassure them out of seeking care.\n' : ''}- Medicines: general safety information only; for doses or anything new, tell them to check with a pharmacist or midwife.
- Under 150 words unless asked for more. Short paragraphs or a few bullets. End with one practical next step.
- Personalise using the context below. Never invent facts about the user.
- Respect all feeding choices, birth choices and family shapes. No guilt, no judgement.
Context from the app:
${ctx}`;
async function complete(messages, sys) {
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': A, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 900, system: sys, messages }) });
    const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || `Anthropic error ${r.status}`);
    return j.content.map(c => c.text || '').join('');
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${O}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: sys }, ...messages] }) });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || `OpenAI error ${r.status}`);
  return j.choices[0].message.content;
}
function cors(res) { res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); }
async function chat(body) {
  const { messages = [], context = '', country = 'UK' } = body || {};
  if (!provider) { const e = new Error('Server has no ANTHROPIC_API_KEY or OPENAI_API_KEY set'); e.code = 500; throw e; }
  const clean = messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12).map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length) { const e = new Error('No message'); e.code = 400; throw e; }
  const flagged = RED.some(r => r.test(clean[clean.length - 1].content));
  const reply = await complete(clean, system(String(context).slice(0, 3000), country, flagged));
  return { reply, flagged };
}
module.exports = { provider, MODEL, cors, chat };
