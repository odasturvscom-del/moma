// Public app config: the announcement banner and whether Ask Moma is on. No user data here.
const { cors } = require('./_moma');
const { getConfig } = require('./_store');
module.exports = async (req, res) => {
  cors(res);
  const c = await getConfig();
  res.setHeader('cache-control', 'public, max-age=60');
  res.status(200).json({ announcement: c.announcementOn ? c.announcement : '', askEnabled: c.askEnabled !== false });
};
