export const H = 8;
export const BUDGET = 100;
export const indicators = [
  ['T1','Разгрузка дорог',.10],['T2','Общественный транспорт',.10],
  ['E1','Озеленение',.09],['E2','Качество воздуха',.11],
  ['S1','Школы и детсады',.11],['S2','Поликлиники',.11],
  ['B1','Безопасность улиц',.09],['B2','Безопасность движения',.09],
  ['C1','Надёжность ЖКХ',.10],['C2','Обращения жителей',.10]
];
export const districts = [
  {id:'yesil',name:'Есиль',pop:.27,values:[45,62,68,72,48,55,78,60,75,70],profile:'Пробки на мостах и переполненные школы.'},
  {id:'almaty',name:'Алматы',pop:.24,values:[40,75,50,55,60,65,62,52,50,60],profile:'Пробки и изношенные коммунальные сети.'},
  {id:'saryarka',name:'Сарыарка',pop:.20,values:[50,70,42,40,62,68,58,55,45,55],profile:'Смог от частного сектора, недостаток зелени.'},
  {id:'baikonur',name:'Байконур',pop:.13,values:[52,68,55,50,58,60,52,58,55,58],profile:'Умеренные показатели без резких перекосов.'},
  {id:'nura',name:'Нура',pop:.16,values:[55,40,45,65,38,35,55,50,60,50],profile:'Критический дефицит школ и медицинской помощи.'}
];
export const areas = ['Транспорт','Экология','Соцсфера','Безопасность','Сервисы'];
export const measures = [
 ['M1',0,'Выделенные полосы для автобусов','district',18,2,{T1:6,T2:9}],
 ['M2',0,'Умные светофоры','city',22,2,{T1:4,B2:3}],
 ['M3',0,'Линия ЛРТ / расширение','district',30,4,{T1:16,T2:20,E2:4}],
 ['M4',1,'Парк / сквер','district',15,2,{E1:12,E2:3,B1:2}],
 ['M5',1,'Перевод на чистое топливо','district',25,3,{E2:14,C1:4}],
 ['M6',1,'Озеленение и ветрозащитные полосы','city',20,4,{E1:5,E2:3}],
 ['M7',2,'Школа + детсад','district',24,3,{S1:16}],
 ['M8',2,'Центр семейного здоровья','district',20,3,{S2:14}],
 ['M9',2,'Дворовые спорт-хабы','district',10,1,{S1:3,S2:3,B1:3}],
 ['M10',3,'Освещение и камеры','district',12,1,{B1:12,B2:2}],
 ['M11',3,'Безопасные переходы и школьные зоны','district',10,1,{B2:12,T1:-2}],
 ['M12',4,'Цифровая платформа обращений','city',14,1,{C2:5}],
 ['M13',4,'Модернизация тепло- и водосетей','district',28,4,{C1:18,E2:2}],
 ['M14',4,'Аварийные бригады ЖКХ','city',16,1,{C1:5,C2:2}]
].map(([id,area,name,scope,cost,lag,effects])=>({id,area,name,scope,cost,lag,effects}));
export const example = [{id:'M7',district:'nura'},{id:'M8',district:'nura'},{id:'M10',district:'nura'},{id:'M12'},{id:'M5',district:'saryarka'}];
export function validate(selections,{partial=false}={}) {
 const errors=[];
 if(!Array.isArray(selections))return ['Нужен список мероприятий.'];
 if(selections.length>5||(!partial&&selections.length!==5))errors.push('Нужно выбрать ровно 5 мероприятий.');
 const seen=new Set(),counts=Array(5).fill(0);let cost=0;
 for(const s of selections){
  const m=measures.find(m=>m.id===s?.id);
  if(!m){errors.push('Неизвестное мероприятие.');continue;}
  if(seen.has(m.id))errors.push(`${m.id}: повтор мероприятия запрещён.`);
  seen.add(m.id);counts[m.area]++;cost+=m.cost;
  if(m.scope==='district'&&!districts.some(d=>d.id===s.district))errors.push(`${m.id}: выберите район.`);
  if(m.scope==='city'&&s.district!==undefined)errors.push(`${m.id}: городская мера не должна иметь район.`);
 }
 if(cost>BUDGET)errors.push(`Превышение бюджета: ${cost} из ${BUDGET}.`);
 counts.forEach((n,i)=>{if(n>2)errors.push(`${areas[i]}: не более 2 мер.`);});
 const get=id=>selections.find(s=>s?.id===id);
 if(get('M1')&&get('M3'))errors.push('M1 и M3 несовместимы в любых районах.');
 for(const [a,b] of [['M4','M7'],['M5','M13']])if(get(a)&&get(b)&&get(a).district===get(b).district)errors.push(`${a} и ${b} нельзя выбрать в одном районе.`);
 return [...new Set(errors)];
}
export function summarize(rows){
 const scores=rows.map(row=>row.reduce((sum,v,k)=>sum+v*indicators[k][2],0));
 const average=scores.reduce((sum,v,d)=>sum+v*districts[d].pop,0);
 const minimum=Math.min(...scores);
 const critical=[];
 rows.forEach((row,d)=>row.forEach((v,k)=>{if(v<40)critical.push({district:districts[d].name,indicator:indicators[k][0],value:v});}));
 return {rows,scores,average,minimum,weakest:districts[scores.indexOf(minimum)].name,critical,score:.7*average+.3*minimum-critical.length};
}
export const baseline=summarize(districts.map(d=>[...d.values]));
// Draft projections intentionally have no final Score until all five choices are valid.
export function simulate(selections,{partial=false}={}){
 const errors=validate(selections,{partial});
 if(errors.length)return {valid:false,errors,score:null};
 const rows=districts.map(d=>[...d.values]),effects=[],synergies=[];
 let cost=0;
 for(const s of selections){
  const m=measures.find(m=>m.id===s.id);cost+=m.cost;
  const targets=m.scope==='city'?districts:districts.filter(d=>d.id===s.district);
  const realized=Object.fromEntries(Object.entries(m.effects).map(([k,v])=>[k,v*(H-m.lag)/H]));
  for(const d of targets)for(const [key,v]of Object.entries(realized))rows[districts.indexOf(d)][indicators.findIndex(k=>k[0]===key)]+=v;
  effects.push({id:m.id,name:m.name,target:targets.map(d=>d.name).join(', '),cost:m.cost,lag:m.lag,realized});
 }
 for(const [a,b,k,v]of [['M1','M2','T1',2],['M10','M12','B1',2],['M5','M6','E2',2]]){
  const first=selections.find(s=>s.id===a);
  if(first&&selections.some(s=>s.id===b)){
   const d=districts.findIndex(d=>d.id===first.district);
   rows[d][indicators.findIndex(i=>i[0]===k)]+=v;
   synergies.push({pair:`${a} + ${b}`,district:districts[d].name,indicator:k,value:v});
  }
 }
 const clipped=rows.map(r=>r.map(v=>Math.max(0,Math.min(100,v))));
 const result=summarize(clipped),complete=selections.length===5;
 return {...result,score:complete?result.score:null,valid:true,complete,cost,remaining:BUDGET-cost,effects,synergies,errors:[]};
}
export function explain(result){
 if(!result.valid||!result.complete)return [];
 const gain=result.score-baseline.score;
 const changes=result.scores.map((v,d)=>({name:districts[d].name,delta:v-baseline.scores[d]})).sort((a,b)=>b.delta-a.delta);
 return [
  `Итоговый Score — ${result.score.toFixed(2)} (${gain>=0?'+':''}${gain.toFixed(2)} к исходным ${baseline.score.toFixed(2)}). Использовано ${result.cost} из 100 единиц бюджета.`,
  `Самое большое изменение у района ${changes[0].name}: +${changes[0].delta.toFixed(2)} к оценке района. Самый слабый район после решений — ${result.weakest}, ${result.minimum.toFixed(2)} балла.`,
  result.critical.length?`Осталось критических показателей: ${result.critical.length}. ${result.critical.map(c=>`${c.district}: ${c.indicator} = ${c.value.toFixed(2)}`).join('; ')}. Каждый даёт штраф 1 балл.`:'Критических показателей ниже 40 больше нет. Штраф за них равен нулю.',
  result.synergies.length?`Сработали синергии: ${result.synergies.map(s=>`${s.pair}: ${s.indicator} +${s.value} (${s.district})`).join('; ')}.`:'В этом наборе нет синергий.',
  'Эффекты относятся к условным двум годам и уменьшены с учётом срока запуска. Остаток бюджета не добавляет баллы. Это результат синтетической модели, а не прогноз реального города.'
 ];
}
export function improvements(selections){
 const initial=simulate(selections);if(!initial.valid)return [];
 const candidates=[];
 selections.forEach((old,index)=>{
  for(const m of measures)for(const d of m.scope==='city'?[undefined]:districts.map(d=>d.id)){
   const replacement={id:m.id,...(d?{district:d}:{})};
   const next=selections.map((s,i)=>i===index?replacement:s),r=simulate(next);
   if(r.valid&&r.score>initial.score+1e-9)candidates.push({remove:old,add:replacement,score:r.score,gain:r.score-initial.score,cost:r.cost});
  }
 });
 return candidates.sort((a,b)=>b.gain-a.gain).slice(0,3);
}
