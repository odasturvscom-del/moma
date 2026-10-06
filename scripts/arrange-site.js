// Site layout (Vercel):
//   /        the marketing landing page (site/)
//   /app/    the Moma web app (Expo export)
//   /admin   the admin portal (public/admin)
// Expo writes the app shell to dist/index.html with absolute asset paths, so it can move to /app/ as-is.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist');
const shell = path.join(dist, 'index.html');
if (!fs.existsSync(shell)) { console.error('arrange-site: dist/index.html missing'); process.exit(1); }
fs.mkdirSync(path.join(dist, 'app'), { recursive: true });
fs.renameSync(shell, path.join(dist, 'app', 'index.html'));
fs.cpSync(path.join(root, 'site'), dist, { recursive: true });
console.log('arrange-site: app -> /app/, landing -> /');
