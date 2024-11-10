import next from 'next';
import https from 'https';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(process.cwd(), 'certificates/localhost-key.pem')),
  cert: fs.readFileSync(path.join(process.cwd(), 'certificates/localhost.pem')),
};

app.prepare().then(() => {
  https
    .createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    })
    .listen(port, () => {
      console.log(
        `> Ready on https://${hostname}:${port}`
      );
    });
}); 