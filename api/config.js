// Public app config: announcement banner, whether Ask Moma and human support are on. No user data.
const { cors } = require('./_moma');
const { getConfig } = require('./_db');
module.exports = async (req, res) => {
  cors(res);
  const c = await getConfig();
  res.setHeader('cache-control', 'public, max-age=60');
  res.status(200).json({ announcement: c.announcementOn ? c.announcement : '', askEnabled: c.askEnabled !== false, supportOn: c.supportOn !== false, supportHours: c.supportHours });
};
