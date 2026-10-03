// Server copy of the app's red-flag rules (src/safety.ts). Keep the two in step: the admin Safety lab tests these.
const FLAGS = [
  { id: 'mh', lvl: 'm', t: 'Thoughts of harming self or baby', re: /(want|thinking|thoughts?|feel like).{0,25}(die|dying|kill|end it|harm(ing)? (myself|me|the baby|my baby))|suicid|hurt(ing)? (myself|the baby|my baby)|can'?t go on/i },
  { id: 'hb', lvl: 'e', t: 'Heavy bleeding', re: /(heavy|lots? of|soaking|gushing|pouring).{0,20}(bleed|blood)|bleeding (heavily|a lot)|soak(ing|ed|s)? (through )?(a |my |the )?(pads?|sanitary|maternity pad)|large clots?|golf ball/i },
  { id: 'cp', lvl: 'e', t: 'Chest pain, breathing, fainting, seizure', re: /chest pain|can'?t breathe|struggling to breathe|short(ness)? of breath|faint(ed|ing)|seizure|\bfits?\b|unconscious|collapsed/i },
  { id: 'mv', lvl: 'u', t: "Change in baby's movements", pregOnly: true, re: /(less|reduced|not|stopped|fewer|no|hardly|barely).{0,15}(moving|movements?|kicks?|kicking)|(moving|movements?|kicking|kicks?).{0,15}(less|slower|fewer|reduced|stopped)|(hasn'?t|has not|haven'?t|have not) (kicked|moved|been (kicking|moving))|baby (hasn'?t|has not|isn'?t|is not) (moved|moving)|haven'?t felt (the )?baby/i },
  { id: 'pe', lvl: 'u', t: 'Severe headache or vision changes', re: /(severe|bad|terrible|worst|persistent|pounding).{0,15}headache|headache.{0,25}(vision|blurr|flash|spots)|blurr(y|ed) vision|flashing lights|spots in (my )?(vision|eyes)/i },
  { id: 'sw', lvl: 'u', t: 'Sudden swelling', re: /sudden(ly)?.{0,10}swell|swollen (face|hands)|puffy face|(face|hands|feet).{0,12}(puffy|swollen|swelling)/i },
  { id: 'ap', lvl: 'u', t: 'Severe tummy pain', re: /(severe|sharp|bad|intense|constant|stabbing).{0,15}(tummy|stomach|abdominal|abdomen|belly) pain|pain.{0,10}(won'?t|doesn'?t) (stop|go away)/i },
  { id: 'wb', lvl: 'u', t: 'Waters breaking or leaking', pregOnly: true, re: /waters? (have |has )?(broke|broken|breaking|leak\w*|gone|went)|leaking (fluid|water)|gush of (fluid|water)/i },
  { id: 'fv', lvl: 'u', t: 'Fever', re: /fever|temperature.{0,10}(3[89]|high)|high temp|shiver(s|ing)|chills|rigors/i },
  { id: 'ic', lvl: 'u', t: 'Itchy hands or feet', pregOnly: true, re: /itch(y|ing|es)?.{0,20}(hands|feet|palms|soles)|(hands|feet|palms|soles).{0,20}itch/i },
  { id: 'dv', lvl: 'u', t: 'Painful swollen calf', re: /(calf|leg).{0,20}(pain|swollen|swelling|red|hot|tender)/i },
  { id: 'bl', lvl: 's', t: 'Any bleeding', re: /bleed|spotting|blood/i },
];
const ORDER = { m: 0, e: 1, u: 2, s: 3 };
function triage(text, mode = 'pregnant') {
  let hits = FLAGS.filter(f => f.re.test(String(text || '')));
  if (hits.some(h => h.id === 'hb')) hits = hits.filter(h => h.id !== 'bl');
  if (mode === 'postpartum') hits = hits.filter(h => !h.pregOnly);
  hits.sort((a, b) => ORDER[a.lvl] - ORDER[b.lvl]);
  return { level: hits.length ? hits[0].lvl : null, ids: hits.map(h => h.id), titles: hits.map(h => h.t) };
}
const FLAG_IDS = FLAGS.map(f => f.id);
const FLAG_TITLES = Object.fromEntries(FLAGS.map(f => [f.id, f.t]));
module.exports = { FLAGS, triage, FLAG_IDS, FLAG_TITLES };
