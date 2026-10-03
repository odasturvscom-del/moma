// Deterministic red-flag layer. Runs on-device before any AI call; the server runs the same rules.
import { Country, EM } from './content';
export type Level = 'm' | 'e' | 'u' | 's';
type Flag = { id: string; re: RegExp; lvl: Level; t: string; x?: string; pregOnly?: boolean };
export const FLAGS: Flag[] = [
  { id: 'mh', re: /(want|thinking|thoughts?|feel like).{0,25}(die|dying|kill|end it|harm(ing)? (myself|me|the baby|my baby))|suicid|hurt(ing)? (myself|the baby|my baby)|can'?t go on/i, lvl: 'm', t: 'Thoughts of harming yourself or your baby' },
  { id: 'hb', re: /(heavy|lots? of|soaking|gushing|pouring).{0,20}(bleed|blood)|bleeding (heavily|a lot)|soak(ing|ed|s)? (through )?(a |my |the )?(pads?|sanitary|maternity pad)|large clots?|golf ball/i, lvl: 'e', t: 'Heavy bleeding' },
  { id: 'cp', re: /chest pain|can'?t breathe|struggling to breathe|short(ness)? of breath|faint(ed|ing)|seizure|\bfits?\b|unconscious|collapsed/i, lvl: 'e', t: 'Chest pain, breathing trouble, fainting or a seizure' },
  { id: 'mv', re: /(less|reduced|not|stopped|fewer|no|hardly|barely).{0,15}(moving|movements?|kicks?|kicking)|(moving|movements?|kicking|kicks?).{0,15}(less|slower|fewer|reduced|stopped)|(hasn'?t|has not|haven'?t|have not) (kicked|moved|been (kicking|moving))|baby (hasn'?t|has not|isn'?t|is not) (moved|moving)|haven'?t felt (the )?baby/i, lvl: 'u', t: "A change in your baby's movements", x: "Don't wait until tomorrow and don't rely on a home doppler.", pregOnly: true },
  { id: 'pe', re: /(severe|bad|terrible|worst|persistent|pounding).{0,15}headache|headache.{0,25}(vision|blurr|flash|spots)|blurr(y|ed) vision|flashing lights|spots in (my )?(vision|eyes)/i, lvl: 'u', t: 'Severe headache or vision changes (possible pre-eclampsia)' },
  { id: 'sw', re: /sudden(ly)?.{0,10}swell|swollen (face|hands)|puffy face|(face|hands|feet).{0,12}(puffy|swollen|swelling)/i, lvl: 'u', t: 'Sudden swelling of the face, hands or feet' },
  { id: 'ap', re: /(severe|sharp|bad|intense|constant|stabbing).{0,15}(tummy|stomach|abdominal|abdomen|belly) pain|pain.{0,10}(won'?t|doesn'?t) (stop|go away)/i, lvl: 'u', t: 'Severe tummy pain' },
  { id: 'wb', re: /waters? (have |has )?(broke|broken|breaking|leak\w*|gone|went)|leaking (fluid|water)|gush of (fluid|water)/i, lvl: 'u', t: 'Waters breaking or leaking', pregOnly: true },
  { id: 'fv', re: /fever|temperature.{0,10}(3[89]|high)|high temp|shiver(s|ing)|chills|rigors/i, lvl: 'u', t: 'Fever or high temperature' },
  { id: 'ic', re: /itch(y|ing|es)?.{0,20}(hands|feet|palms|soles)|(hands|feet|palms|soles).{0,20}itch/i, lvl: 'u', t: 'Itchy hands or feet (possible obstetric cholestasis)', pregOnly: true },
  { id: 'dv', re: /(calf|leg).{0,20}(pain|swollen|swelling|red|hot|tender)/i, lvl: 'u', t: 'A painful, swollen or hot calf (possible clot)' },
  { id: 'bl', re: /bleed|spotting|blood/i, lvl: 's', t: 'Bleeding' },
];
export type Triage = { level: Level; title: string; items: string[]; ids: string[]; action: string; call?: string } | null;
const ORDER: Record<Level, number> = { m: 0, e: 1, u: 2, s: 3 };
export function triage(text: string, mode: 'pregnant' | 'postpartum', country: Country): Triage {
  let hits = FLAGS.filter(f => f.re.test(text));
  if (hits.some(h => h.id === 'hb')) hits = hits.filter(h => h.id !== 'bl');
  if (mode === 'postpartum') hits = hits.filter(h => !h.pregOnly);
  if (!hits.length) return null;
  hits.sort((a, b) => ORDER[a.lvl] - ORDER[b.lvl]);
  const e = EM[country] ?? EM.Other;
  const top = hits[0].lvl;
  const extra = hits.find(h => h.x)?.x ?? '';
  const action =
    top === 'm' ? `If you might act on these thoughts, call ${e.e} now. You can also talk to ${e.mh}, or your GP, midwife or health visitor today. You are not alone and this is treatable.`
    : top === 'e' ? `Call ${e.e} now.`
    : top === 'u' ? `Contact ${e.u} now, day or night. ${extra}`.trim()
    : `Any bleeding should be checked. Contact ${e.u} today, and call ${e.e} if it gets heavy or you feel unwell.`;
  return {
    level: top, title: top === 's' ? 'Worth checking' : 'This needs a professional now',
    items: hits.map(h => h.t), ids: hits.map(h => h.id), action,
    call: top === 'e' || top === 'm' ? e.tel : e.urgentTel,
  };
}
