import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {handleApi} from './api.mjs';
const publicDir=fileURLToPath(new URL('./public/',import.meta.url));
const assets={'/':['index.html','text/html; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/app.mjs':['app.mjs','text/javascript; charset=utf-8'],'/engine.mjs':['engine.mjs','text/javascript; charset=utf-8']};
const port=Number(process.env.PORT||5173);
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,`http://localhost:${port}`).pathname;
  if(pathname.startsWith('/api/')){
   const request=new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const response=await handleApi(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const asset=assets[pathname];if(!asset){res.writeHead(404);res.end('Not found');return;}
  const content=await readFile(`${publicDir}${asset[0]}`);res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(500);res.end('Server error');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
