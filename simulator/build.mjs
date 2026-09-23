import { readFile, mkdir, writeFile } from 'node:fs/promises';
await mkdir('dist/server', { recursive: true });
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.mjs': ['app.mjs', 'text/javascript; charset=utf-8'],
  '/engine.mjs': ['engine.mjs', 'text/javascript; charset=utf-8'],
  '/icons.mjs': ['icons.mjs', 'text/javascript; charset=utf-8'],
  '/scenarios.mjs': ['scenarios.mjs', 'text/javascript; charset=utf-8'],
  '/scenario-worker.mjs': ['scenario-worker.mjs', 'text/javascript; charset=utf-8'],
};
const assets = {};
for (const [url, [file, type]] of Object.entries(files))
  assets[url] = { body: await readFile(`public/${file}`, 'utf8'), type };
const engine = await readFile('public/engine.mjs', 'utf8');
const api = (await readFile('api.mjs', 'utf8')).replace(/^import[\s\S]*?;\n/, '');
const worker = `${engine}\n${api}\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){const path=new URL(request.url).pathname;if(path.startsWith('/api/'))return handleApi(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=assets[path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}});}};\n`;
await writeFile('dist/server/index.js', worker);
await writeFile('dist/server/package.json', JSON.stringify({ type: 'module' }));
console.log('Built self-contained Cloudflare Worker: dist/server/index.js');
