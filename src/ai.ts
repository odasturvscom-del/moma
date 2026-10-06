import { State, preg, pp, last7, dkey, fmtDate, DAY, ChatMsg } from './store';
import { weekInfo, ppInfo } from './content';
import { Platform } from 'react-native';
import { cycleOf, fromDay } from './cycle';

// On the hosted web app the AI lives on the same site at /api. On phones, use the saved server address.
export const apiBase = (s: State) => {
  const u = s.ai.serverUrl.trim().replace(/\/$/, '');
  if (u) return u;
  return Platform.OS === 'web' ? '/api' : '';
};

export function buildContext(s: State) {
  const p = preg(s), q = pp(s), l = last7(s);
  let c = `Name: ${s.name || 'not given'}. Country: ${s.country}. Today: ${dkey()}.\n`;
  if (s.mode === 'pregnant' && p) c += `Pregnant: ${p.w} weeks ${p.d} days (trimester ${p.tri}), due ${dkey(p.due)}.\n`;
  if (s.mode === 'postpartum' && q) c += `Postpartum: baby born ${s.birth}, now ${q.days} days old.\n`;
  const cy = s.mode === 'ttc' ? cycleOf(s) : null;
  if (s.mode === 'ttc') c += cy ? `Trying to conceive. Cycle day ${cy.cd} of about ${cy.len} days${cy.irregular ? ' (irregular)' : ''}. Estimated fertile window ${dkey(fromDay(cy.fw0))} to ${dkey(fromDay(cy.fw1))}, likely ovulation ${dkey(fromDay(cy.ov))}, next period ${dkey(fromDay(cy.next))}${cy.lateDays ? `, period ${cy.lateDays} days late` : ''}. Signs today: ${(s.cycle?.marks[dkey()] ?? []).join(', ') || 'none'}.\n` : 'Trying to conceive. No period logged yet.\n';
  c += `Check-ins in last 7 days: ${l.days}. Symptoms logged: ${Object.entries(l.sym).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}. Mood (1-5): ${l.moods.join(',') || 'none'}.\n`;
  if (l.notes.length) c += `Notes: ${l.notes.slice(-5).join(' | ')}\n`;
  if (s.mode === 'ttc') {}
  else if (s.mode === 'pregnant') c += `Baby movements logged in last 24h: ${s.moves.filter(t => Date.now() - t < DAY).length}.\n`;
  else c += `Feeds in last 24h: ${s.feeds.filter(f => Date.now() - f.t < DAY).length}. Nappies in last 24h: ${s.nappies.filter(n => Date.now() - n.t < DAY).length}.\n`;
  const up = s.appts.filter(a => a.d >= dkey()).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 3);
  if (up.length) c += `Upcoming appointments: ${up.map(a => `${a.d} ${a.t}`).join('; ')}.\n`;
  return c;
}

export function summaryText(s: State) {
  const p = preg(s), q = pp(s), l = last7(s);
  const top = Object.entries(l.sym).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const avg = l.moods.length ? l.moods.reduce((a, b) => a + b, 0) / l.moods.length : null;
  let out = `**Your week for your ${s.mode === 'pregnant' ? 'midwife' : s.mode === 'ttc' ? 'GP' : 'health visitor'}**\n`;
  if (s.mode === 'pregnant' && p) out += `- ${p.w} weeks ${p.d} days pregnant, due ${fmtDate(p.due)}\n`;
  if (s.mode === 'postpartum' && q) out += `- Baby is ${q.w} weeks ${q.d} days old\n`;
  out += `- Checked in ${l.days} of the last 7 days\n- Most logged: ${top.map(([k, n]) => `${k} (${n})`).join(', ') || 'nothing yet'}\n`;
  if (avg) out += `- Average mood ${avg.toFixed(1)} out of 5\n`;
  if (s.mode === 'postpartum') out += `- ${s.feeds.filter(f => Date.now() - f.t < DAY).length} feeds and ${s.nappies.filter(n => Date.now() - n.t < DAY).length} nappies in the last 24h\n`;
  const qs: string[] = [];
  if (l.sym['Headache']) qs.push('Could my headaches be linked to my blood pressure?');
  if (l.sym['Swelling']) qs.push("Is the swelling I've had within the normal range?");
  if (l.sym['Insomnia'] || l.sym['Exhausted']) qs.push('What can I safely do to sleep better?');
  if (l.sym['Low mood'] || l.sym['Anxious'] || (avg !== null && avg < 3)) qs.push("I've been feeling low or anxious. What support is available?");
  if (s.mode === 'pregnant' && p && p.w >= 28) qs.push("What should I do if my baby's movements change?");
  if (s.mode === 'pregnant' && p && p.w < 14) qs.push('Which scans and tests should I book, and when?');
  qs.push("Is there anything in my notes you'd like me to keep an eye on?");
  return out + `\n**Questions worth asking**\n` + qs.slice(0, 4).map(x => `- ${x}`).join('\n');
}

export function demoReply(t: string, s: State): string {
  const p = preg(s), q = pp(s), x = t.toLowerCase();
  if (/summar|midwife|appointment|health visitor/.test(x)) return summaryText(s);
  if (/this week|happening|how big|baby size/.test(x)) {
    if (s.mode === 'pregnant' && p) { const w = weekInfo(p.w); return `At **${p.w} weeks** your baby is about the size of ${/^[aeiou]/i.test(w[0]) ? 'an' : 'a'} **${w[0]}**. ${w[1]}\n\nFor you: ${w[2]}\n\nNext step: log how you're feeling today so I can spot patterns.`; }
    if (q) { const n = ppInfo(q.w); return `**${n[0]}**\n\n${n[1]}`; }
  }
  if (/nause|sick|vomit|morning sickness/.test(x)) return `Nausea is really common in the first trimester and usually eases by 14 to 16 weeks.\n\n- Eat little and often, before you get hungry\n- Dry crackers or toast before getting up\n- Sip cold drinks; ginger can help\n- Rest, tiredness makes it worse\n\nIf you can't keep fluids down for 24 hours, are peeing very little, or feel faint, go to your antenatal clinic or a hospital the same day. That can be hyperemesis gravidarum, and it's treatable.`;
  if (/heartburn|indigestion|reflux/.test(x)) return `Heartburn is common as baby grows and hormones relax your stomach valve.\n\n- Smaller meals, and stay upright for an hour after eating\n- Avoid late, spicy or fatty meals\n- Prop your head up in bed\n\nSome antacids are fine in pregnancy, so ask a pharmacist which one suits you.`;
  if (/eat|food|avoid|cheese|fish|coffee|caffeine|alcohol/.test(x)) return `The main ones to avoid or limit in pregnancy (UK guidance):\n\n- Alcohol: none is the safest choice\n- Caffeine: under 200mg a day (about 2 mugs of instant coffee)\n- Soft mould-ripened cheese like brie, unless cooked until steaming\n- Raw or undercooked meat, liver and pâté\n- Shark, swordfish and marlin; max 2 portions of oily fish a week\n\nRunny eggs are fine if they're British Lion stamped.`;
  if (/sleep|insomnia|tired|exhaust/.test(x)) return `Sleep gets harder as pregnancy goes on, and it's brutal after birth too.\n\n- From 28 weeks, go to sleep on your side (either side)\n- A pillow between your knees and under your bump helps\n- Short daytime rests count\n\nAfter birth, sleep when you can and let others take a feed if you're bottle feeding or expressing.`;
  if (/exercise|gym|run|walk|yoga|swim/.test(x)) return `Staying active is good for you and baby. Aim for about 150 minutes of moderate activity a week, where you can still hold a conversation.\n\n- Walking, swimming and pregnancy yoga are great\n- Avoid contact sports and lying flat on your back for long after 16 weeks\n- Start pelvic floor exercises now\n\nStop and get advice if you feel dizzy, have pain, bleeding or leaking fluid.`;
  if (/back pain|backache|pelvi/.test(x)) return `Back and pelvic pain are common as your posture changes.\n\n- Bend your knees and keep your back straight when lifting\n- Flat shoes, and a pillow between your knees in bed\n- Swimming and gentle stretches help\n\nIf walking or turning in bed is very painful, ask your midwife about pelvic girdle pain. Physio helps a lot.`;
  if (/breastfeed|latch|feed|formula|bottle/.test(x)) return `However you feed, a fed and loved baby is the goal.\n\nIf breastfeeding hurts beyond the first few seconds of a feed, the latch often needs adjusting: tummy to tummy, nose to nipple, and wait for a wide open mouth.\n\nYour midwife, health visitor or infant feeding team can watch a feed and help. Signs it's going well: 6+ wet nappies a day from day 5 and steady weight gain.`;
  if (/blues|cry|crying|low|sad|anxious|anxiety|overwhelm/.test(x)) return `Thank you for telling me. Feeling teary and overwhelmed in the first couple of weeks after birth is really common (the baby blues).\n\nIf low mood, anxiety or not enjoying things lasts more than two weeks, or feels heavy, please speak to your GP, midwife or health visitor. Perinatal depression and anxiety are common and treatable.`;
  if (/contraction|labour|labor|braxton/.test(x)) return `Practice contractions (Braxton Hicks) are irregular, don't get stronger and often ease if you change position.\n\nReal labour contractions get longer, stronger and closer together. Use the contraction timer in Track, and call your maternity unit when they're regular and strong, if your waters break, or if you're worried.`;
  return `Good question. Without the AI server connected I can cover common topics like nausea, food safety, sleep, exercise, feeding, mood and contractions, and summarise your week.\n\nConnect the Moma server in **Me** and I'll answer anything, personalised to ${s.mode === 'pregnant' && p ? `week ${p.w}` : 'where you are'} and what you've logged.`;
}

export async function askMoma(history: ChatMsg[], s: State): Promise<string> {
  const msgs = history.filter(m => m.r !== 'f').slice(-12).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.c }));
  const url = apiBase(s);
  if (!url) { await new Promise(r => setTimeout(r, 600)); return demoReply(msgs[msgs.length - 1].content, s); }
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(`${url}/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ messages: msgs, context: buildContext(s), country: s.country, mode: s.mode }),
    });
    const j = await r.json().catch(() => ({}));
    if ((r.status === 404 && url === '/api') || (j && j.offline)) return demoReply(msgs[msgs.length - 1].content, s);
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j.reply as string;
  } finally { clearTimeout(to); }
}
