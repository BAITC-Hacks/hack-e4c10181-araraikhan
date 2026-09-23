import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,simulate,validate,example,improvements,measures,indicators,summarize} from '../public/engine.mjs';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('source baseline and documented example reproduce without intermediate rounding',()=>{
 close(baseline.score,52.55768);close(baseline.average,56.8624);assert.equal(baseline.critical.length,2);
 const r=simulate(example);assert.equal(r.valid,true);assert.equal(r.cost,95);close(r.score,56.54307);close(r.rows[4][4],48);close(r.rows[4][5],43.75);close(r.rows[4][6],67.5);assert.equal(r.critical.length,0);
});
test('rules reject malformed, duplicate, over-budget, incomplete and extra decisions',()=>{
 for(const s of [null,{},[null],[{id:'unknown'}],example.slice(0,4),[...example,example[0]],[...example.slice(0,4),example[0]],[{id:'M3',district:'nura'},{id:'M5',district:'saryarka'},{id:'M7',district:'yesil'},{id:'M10',district:'nura'},{id:'M13',district:'yesil'}]])assert.ok(validate(s).length);
 assert.equal(simulate(example.slice(0,4)).score,null);assert.equal(simulate(example.slice(0,4),{partial:true}).score,null);
 assert.ok(validate([{id:'M7',district:'bad'}],{partial:true}).length);
 assert.ok(validate([{id:'M12',district:'nura'}],{partial:true}).length);
 assert.ok(validate([{id:'M12',district:null}],{partial:true}).length);
 assert.ok(validate([{id:'M7',district:'nura'},{id:'M8',district:'nura'},{id:'M9',district:'yesil'}],{partial:true}).length);
});
test('global and district-specific conflicts differ',()=>{
 assert.ok(validate([{id:'M1',district:'nura'},{id:'M3',district:'yesil'}],{partial:true}).length);
 for(const [a,b]of [['M4','M7'],['M5','M13']]){
  assert.ok(validate([{id:a,district:'nura'},{id:b,district:'nura'}],{partial:true}).length);
  assert.equal(validate([{id:a,district:'nura'},{id:b,district:'yesil'}],{partial:true}).length,0);
 }
});
test('all catalog effects honor their own lag and district or city scope',()=>{
 for(const m of measures){const r=simulate([{id:m.id,...(m.scope==='district'?{district:'nura'}:{})}],{partial:true});
  r.rows.forEach((row,d)=>row.forEach((v,k)=>close(v-baseline.rows[d][k],m.scope==='city'||d===4?(m.effects[indicators[k][0]]||0)*(8-m.lag)/8:0)));
 }
});
test('synergy is fixed and applied only to first measure district',()=>{
 for(const [a,b,k]of [['M1','M2',0],['M10','M12',6],['M5','M6',3]]){
  const first={id:a,district:'nura'},second={id:b};const pair=simulate([first,second],{partial:true});
  const one=simulate([first],{partial:true}),two=simulate([second],{partial:true});
  close(pair.rows[4][k]-(one.rows[4][k]+two.rows[4][k]-baseline.rows[4][k]),2);
  close(pair.rows[0][k]-(one.rows[0][k]+two.rows[0][k]-baseline.rows[0][k]),0);
 }
});
test('threshold is strictly below 40 and action order does not matter',()=>{
 const rows=baseline.rows.map(r=>[...r]);rows[4][4]=40;rows[4][5]=40;
 assert.equal(summarize(rows).critical.length,0);rows[4][5]=39.999;assert.equal(summarize(rows).critical.length,1);
 close(simulate([...example].reverse()).score,simulate(example).score);
});
test('clipping holds even if catalog effects would exceed bounds',()=>{
 const old=measures[0].effects;try{measures[0].effects={T1:1000,T2:-1000};const r=simulate([{id:'M1',district:'nura'}],{partial:true});assert.equal(r.rows[4][0],100);assert.equal(r.rows[4][1],0);}finally{measures[0].effects=old;}
});
test('recommendations are feasible and recompute to claimed score',()=>{
 const options=improvements(example);assert.ok(options.length);
 for(const opt of options){const next=example.map(s=>s.id===opt.remove.id?opt.add:s);assert.equal(validate(next).length,0);close(simulate(next).score,opt.score);assert.ok(opt.gain>0);}
});
