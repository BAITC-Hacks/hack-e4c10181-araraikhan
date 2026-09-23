import test from 'node:test';import assert from 'node:assert/strict';
import {handleApi} from '../api.mjs';import {example} from '../public/engine.mjs';
const req=body=>new Request('http://localhost:5173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('validates choices before contacting AI and distinguishes missing configuration',async()=>{
 assert.equal((await handleApi(req({selections:[]}))).status,400);
 assert.equal((await handleApi(req({selections:example}))).status,503);
 assert.equal((await handleApi(req(null))).status,400);
});
test('ignores tampered scores and sends authoritative facts to model',async()=>{
 let called=false;
 const response=await handleApi(req({selections:example,score:100}),{OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async(url,options)=>{
  called=true;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);const facts=JSON.parse(body.input);assert.ok(Math.abs(facts.result.score-56.54307)<1e-8);assert.equal(body.store,false);assert.equal(body.model,'test-model');
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Проверенное объяснение.'}]}]});
 });assert.ok(called);assert.equal(response.status,200);assert.equal((await response.json()).text,'Проверенное объяснение.');
});
test('rejects cross-origin, oversized and malformed requests',async()=>{
 const foreign=req({selections:example});foreign.headers.set('origin','https://other.example');assert.equal((await handleApi(foreign)).status,403);
 assert.equal((await handleApi(req({pad:'x'.repeat(17000)}))).status,413);
 const bad=new Request('http://localhost:5173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal((await handleApi(bad)).status,400);
});
test('provider errors do not expose keys or raw provider messages',async()=>{
 const response=await handleApi(req({selections:example}),{OPENAI_API_KEY:'test-only'},async()=>new Response('sensitive error',{status:401}));assert.equal(response.status,502);const body=await response.text();assert.ok(!body.includes('sensitive'));assert.ok(!body.includes('test-only'));
});
