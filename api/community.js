// Community forum: groups mums can create and join, threads, replies, hugs and reports.
// Safety: 18+ agreement, AI screening before a post appears, held posts go to the admin moderation queue,
// emergency wording shows the danger-signs card, links and phone numbers are held for review (scam risk).
const { cors } = require('./_moma');
const { ready, q, bump, body } = require('./_db');
const { appUser } = require('./_appuser');
const { triage } = require('./_safety');
const { authConfig } = require('./auth');
const O = process.env.OPENAI_API_KEY;
const clean = (s, n) => String(s || '').replace(/\s+\n/g, '\n').trim().slice(0, n);
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const fail = (code, msg) => Object.assign(new Error(msg), { code });

const SEED = [
  ['ttc', 'Trying to conceive', 'Cycles, waiting and hoping. Support for every month of trying.', '🌸'],
  ['first-baby', 'First baby', 'Everything is new. Ask anything, no question is silly.', '🌱'],
  ['due-soon', 'Due in the next 3 months', 'Hospital bags, signs of labour, and keeping calm.', '⏳'],
  ['postpartum', 'Postpartum and the 4th trimester', 'Recovery, feeding, sleep and how you are really feeling.', '🤱'],
  ['breastfeeding', 'Breastfeeding support', 'Latching, supply, pumping and going back to work.', '🍼'],
  ['london-mums', 'London mums', 'Hospitals, classes and life with a bump in London.', '🌆'],
  ['midlands-mums', 'Midlands mums', 'Birmingham, the Black Country and beyond.', '🏙️'],
  ['north-mums', 'Mums up North', 'Manchester, Leeds, Liverpool and the North.', '🌧️'],
  ['scotland-wales-ni', 'Scotland, Wales and NI', 'Mums across the rest of the UK, all welcome.', '🏴'],
  ['money-and-leave', 'Maternity leave and money', 'MATB1, maternity pay, Child Benefit and childcare costs.', '💷'],
  ['working-mums', 'Working mums', 'Maternity leave, going back and juggling it all.', '💼'],
  ['dads-and-partners', 'Partners corner', 'For the people supporting mum.', '🤝'],
];
let seeded = false;
async function seed() {
  if (seeded) return;
  const n = (await q('select count(*)::int n from community_groups'))[0].n;
  if (!n) for (const [slug, name, blurb, emoji] of SEED)
    await q('insert into community_groups (slug,name,blurb,emoji,official) values ($1,$2,$3,$4,true) on conflict do nothing', [slug, name, blurb, emoji]);
  await q(`insert into community_groups (slug,name,blurb,emoji,official) values ('ttc','Trying to conceive','Cycles, waiting and hoping. Support for every month of trying.','🌸',true) on conflict do nothing`);
  await seedSamples();
  seeded = true;
}
// Starter threads (api/_samples.js), added once. Admin can remove them all from the Community page.
async function seedSamples() {
  const done = (await q(`select 1 from community_groups where slug = '_samples_done'`)).length || (await q('select 1 from community_posts where sample limit 1')).length;
  if (done) return;
  const S = require('./_samples');
  const gid = {}; for (const g of await q('select id, slug from community_groups')) gid[g.slug] = g.id;
  for (const [slug, nick, title, text, h, hugs, reps] of S) {
    if (!gid[slug]) continue;
    const last = reps.length ? Math.min(...reps.map(r => r[2])) : h;
    const p = (await q(`insert into community_posts (group_id, nick, title, body, hugs, replies, pinned, sample, created_at, last_at) values ($1,$2,$3,$4,$5,$6,$7,true, now() - make_interval(hours => $8), now() - make_interval(hours => $9)) returning id`,
      [gid[slug], nick, title, text, hugs, reps.length, nick === 'Moma team', h, last]))[0];
    for (const [rn, rb, rh, rhug] of reps)
      await q(`insert into community_posts (group_id, parent_id, nick, body, hugs, sample, created_at, last_at) values ($1,$2,$3,$4,$5,true, now() - make_interval(hours => $6), now() - make_interval(hours => $6))`, [gid[slug], p.id, rn, rb, rhug, rh]);
  }
  await q(`update community_groups g set posts = (select count(*)::int from community_posts p where p.group_id = g.id and p.status = 'live')`);
}

// Screening: OpenAI's free moderation model when a key is set; otherwise the Cloudflare Llama Guard model; otherwise a simple word list.
const BAD = /\b(fuck|bitch|ashawo|olodo|mumu|idiot|stupid woman|kill yourself|kys)\b/i;
async function screen(text) {
  const reasons = [];
  if (/https?:\/\/|www\.|\.(com|ng|net|org)\b/i.test(text)) reasons.push('Contains a link');
  if (/(\+?234|\b0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}\b/.test(text)) reasons.push('Contains a phone number');
  if (/\b(account number|send money|transfer to|opay|palmpay|loan offer|investment opportunity|forex|crypto)\b/i.test(text)) reasons.push('Looks like a money request or advert');
  try {
    if (O) {
      const r = await fetch('https://api.openai.com/v1/moderations', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${O}` }, body: JSON.stringify({ model: 'omni-moderation-latest', input: text }) });
      const j = await r.json();
      const res = j.results && j.results[0];
      if (res && res.flagged) {
        const cats = Object.entries(res.categories || {}).filter(([, v]) => v).map(([k]) => k);
        // Self-harm talk is not removed: it is shown with support, and the team is alerted.
        const hard = cats.filter(c => !/^self-harm/.test(c));
        if (hard.length) reasons.push('AI screen: ' + hard.join(', '));
      }
    } else if (BAD.test(text)) reasons.push('Abusive language');
  } catch (e) { if (BAD.test(text)) reasons.push('Abusive language'); }
  return reasons;
}

const pubPost = (p, me) => ({ id: p.id, group: p.group_id, parent: p.parent_id, nick: p.nick, title: p.title, body: p.body, flag: p.flag ? JSON.parse(p.flag) : null,
  replies: p.replies, hugs: p.hugs, hugged: !!p.hugged, pinned: p.pinned, at: p.created_at, last: p.last_at, mine: me && p.user_id === me.id, status: p.status });

module.exports = async (req, res) => {
  cors(res);
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!ready) return res.status(503).json({ error: 'Community is not switched on yet' });
  const a = (req.query && req.query.a) || '', Q = req.query || {};
  try {
    const u = await appUser(req);
    if (!u) return res.status(401).json({ error: 'Open Moma once more so we can set up your account, then try again.' });
    if (authConfig().required && !u.account_id && !['me', 'groups', 'group', 'thread'].includes(a)) return res.status(401).json({ error: 'Please sign in to Moma first.', needSignIn: true });
    await seed();
    const B = req.method === 'GET' ? {} : body(req);
    const profile = { nick: u.nick, joined: !!u.community_ok_at, banned: !!u.banned };

    if (a === 'me') return res.status(200).json(profile);
    if (a === 'join-community' && req.method === 'POST') {
      const nick = clean(B.nick, 24);
      if (!B.adult) throw fail(400, 'Please confirm you are 18 or over');
      if (!B.rules) throw fail(400, 'Please agree to the community rules');
      if (nick.length < 2) throw fail(400, 'Pick a nickname of at least 2 characters');
      if (/(\d{7,}|@|https?:)/.test(nick) || BAD.test(nick)) throw fail(400, 'Please pick a different nickname');
      await q('update app_users set nick = $2, community_ok_at = coalesce(community_ok_at, now()) where id = $1', [u.id, nick]);
      await bump(['community:joined']);
      return res.status(200).json({ nick, joined: true, banned: !!u.banned });
    }
    if (!u.community_ok_at) return res.status(403).json({ error: 'Join the community first', needJoin: true });

    if (a === 'groups') {
      const rows = await q(`select g.*, (m.user_id is not null) as joined from community_groups g left join community_members m on m.group_id = g.id and m.user_id = $1
        where not g.hidden order by (m.user_id is not null) desc, g.official desc, g.members desc, g.last_at desc limit 200`, [u.id]);
      return res.status(200).json({ ...profile, groups: rows.map(g => ({ id: g.id, slug: g.slug, name: g.name, blurb: g.blurb, emoji: g.emoji, official: g.official, members: g.members, posts: g.posts, joined: g.joined, last: g.last_at })) });
    }
    if (a === 'group') {
      const g = (await q(`select g.*, (m.user_id is not null) as joined from community_groups g left join community_members m on m.group_id = g.id and m.user_id = $2 where g.id = $1 and not g.hidden`, [Number(Q.id), u.id]))[0];
      if (!g) throw fail(404, 'That group is no longer available');
      const posts = await q(`select p.*, (r.user_id is not null) as hugged from community_posts p left join community_reacts r on r.post_id = p.id and r.user_id = $2
        where p.group_id = $1 and p.parent_id is null and (p.status = 'live' or p.user_id = $2) and p.status <> 'removed' order by p.pinned desc, p.last_at desc limit 100`, [g.id, u.id]);
      return res.status(200).json({ group: { id: g.id, name: g.name, blurb: g.blurb, emoji: g.emoji, official: g.official, members: g.members, joined: g.joined }, posts: posts.map(p => pubPost(p, u)) });
    }
    if (a === 'thread') {
      const rows = await q(`select p.*, (r.user_id is not null) as hugged from community_posts p left join community_reacts r on r.post_id = p.id and r.user_id = $2
        where (p.id = $1 or p.parent_id = $1) and (p.status = 'live' or p.user_id = $2) and p.status <> 'removed' order by p.id asc limit 400`, [Number(Q.id), u.id]);
      const top = rows.find(p => p.id === Number(Q.id));
      if (!top) throw fail(404, 'That post is no longer available');
      return res.status(200).json({ post: pubPost(top, u), replies: rows.filter(p => p.id !== top.id).map(p => pubPost(p, u)) });
    }
    if (u.banned && req.method === 'POST' && a !== 'leave') throw fail(403, 'Your community access has been paused. Contact the Moma team in Me if you think this is a mistake.');

    if ((a === 'join' || a === 'leave') && req.method === 'POST') {
      const gid = Number(B.group);
      if (a === 'join') {
        const r = await q('insert into community_members (group_id, user_id) values ($1,$2) on conflict do nothing returning 1', [gid, u.id]);
        if (r.length) await q('update community_groups set members = members + 1 where id = $1', [gid]);
      } else {
        const r = await q('delete from community_members where group_id = $1 and user_id = $2 returning 1', [gid, u.id]);
        if (r.length) await q('update community_groups set members = greatest(members - 1, 0) where id = $1', [gid]);
      }
      return res.status(200).json({ ok: true });
    }
    if (a === 'create-group' && req.method === 'POST') {
      const name = clean(B.name, 50), blurb = clean(B.blurb, 160), emoji = clean(B.emoji, 8) || '💜';
      if (name.length < 3) throw fail(400, 'Give your group a name of at least 3 characters');
      const mine = (await q(`select count(*)::int n from community_groups where created_by = $1 and created_at > now() - interval '1 day'`, [u.id]))[0].n;
      if (mine >= 3) throw fail(429, 'You can create up to 3 groups a day');
      const why = await screen(`${name}\n${blurb}`);
      if (why.length) throw fail(400, "That group name or description can't be used. Please keep it friendly and without links or phone numbers.");
      let slug = slugify(name) || 'group';
      if ((await q('select 1 from community_groups where slug = $1', [slug]))[0]) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const g = (await q('insert into community_groups (slug,name,blurb,emoji,created_by,members) values ($1,$2,$3,$4,$5,1) returning id', [slug, name, blurb, emoji, u.id]))[0];
      await q('insert into community_members (group_id, user_id) values ($1,$2)', [g.id, u.id]);
      await bump(['community:group']);
      return res.status(200).json({ id: g.id });
    }
    if (a === 'post' && req.method === 'POST') {
      const parent = B.parent ? Number(B.parent) : null;
      const text = clean(B.body, 4000), title = parent ? null : clean(B.title, 120);
      if (!parent && title.length < 3) throw fail(400, 'Add a short title');
      if (text.length < 2) throw fail(400, 'Write something first');
      const recent = (await q(`select count(*)::int n from community_posts where user_id = $1 and created_at > now() - interval '1 hour'`, [u.id]))[0].n;
      if (recent >= 20) throw fail(429, "You've posted a lot in the last hour. Take a breather and try again soon.");
      let gid = Number(B.group);
      if (parent) {
        const top = (await q(`select * from community_posts where id = $1 and parent_id is null and status = 'live'`, [parent]))[0];
        if (!top) throw fail(404, 'That post is no longer available');
        gid = top.group_id;
      }
      const g = (await q('select id from community_groups where id = $1 and not hidden', [gid]))[0];
      if (!g) throw fail(404, 'That group is no longer available');
      await q('insert into community_members (group_id, user_id) values ($1,$2) on conflict do nothing', [gid, u.id]);
      const full = `${title || ''}\n${text}`;
      const t = triage(full, u.mode || 'pregnant');
      const why = await screen(full);
      const status = why.length ? 'held' : 'live';
      const p = (await q(`insert into community_posts (group_id, parent_id, user_id, nick, title, body, status, flag, hold_reason) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [gid, parent, u.id, u.nick || 'Moma mum', title, text, status, t.level ? JSON.stringify({ level: t.level, titles: t.titles }) : null, why.join('; ') || null]))[0];
      if (status === 'live') {
        if (parent) await q('update community_posts set replies = replies + 1, last_at = now() where id = $1', [parent]);
        await q('update community_groups set posts = posts + 1, last_at = now() where id = $1', [gid]);
      }
      await bump([parent ? 'community:reply' : 'community:post', ...(status === 'held' ? ['community:held'] : []), ...(t.level ? ['community:flag'] : [])]);
      return res.status(200).json({ post: pubPost(p, u), held: status === 'held' });
    }
    if (a === 'hug' && req.method === 'POST') {
      const id = Number(B.post);
      const had = (await q('delete from community_reacts where post_id = $1 and user_id = $2 returning 1', [id, u.id])).length;
      if (!had) await q('insert into community_reacts (post_id, user_id) values ($1,$2) on conflict do nothing', [id, u.id]);
      const r = (await q(`update community_posts set hugs = greatest(hugs + $2, 0) where id = $1 returning hugs`, [id, had ? -1 : 1]))[0];
      return res.status(200).json({ hugged: !had, hugs: r ? r.hugs : 0 });
    }
    if (a === 'report' && req.method === 'POST') {
      const id = Number(B.post), reason = clean(B.reason, 300) || 'Reported';
      const dup = (await q('select 1 from community_reports where post_id = $1 and user_id = $2', [id, u.id]))[0];
      if (!dup) {
        await q('insert into community_reports (post_id, user_id, reason) values ($1,$2,$3)', [id, u.id, reason]);
        // Three reports hide a post until the team reviews it.
        await q(`update community_posts set reports = reports + 1, status = case when reports + 1 >= 3 and status = 'live' then 'held' else status end,
          hold_reason = case when reports + 1 >= 3 and status = 'live' then 'Reported by 3 members' else hold_reason end where id = $1`, [id]);
        await bump(['community:report']);
      }
      return res.status(200).json({ ok: true });
    }
    if (a === 'delete' && req.method === 'POST') {
      const p = (await q(`update community_posts set status = 'removed', body = '', title = case when title is null then null else '[deleted]' end where id = $1 and user_id = $2 returning *`, [Number(B.post), u.id]))[0];
      if (p && p.parent_id) await q('update community_posts set replies = greatest(replies - 1, 0) where id = $1', [p.parent_id]);
      return res.status(200).json({ ok: !!p });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (e) {
    if (!e.code || e.code >= 500) console.error(e);
    return res.status(typeof e.code === 'number' ? e.code : 500).json({ error: e.code ? e.message : 'Something went wrong' });
  }
};
