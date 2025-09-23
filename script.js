// Data handling
let DATA = {};
let ORIGINAL_DATA = {};
const LS_KEY = 'rrb_ntpc_dataset_v1';

const contentDiv = document.getElementById('content');
const breadcrumbNav = document.getElementById('breadcrumb');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Load dataset (from localStorage or sample)
(async function init(){
  const saved = localStorage.getItem(LS_KEY);
  if(saved){
    DATA = JSON.parse(saved);
  } else {
    const res = await fetch('data/questions.json');
    DATA = await res.json();
    localStorage.setItem(LS_KEY, JSON.stringify(DATA));
  }
  ORIGINAL_DATA = JSON.parse(JSON.stringify(DATA));
  showSections();
})();

// Tabs
for(const t of tabs){
  t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    panels.forEach(p=>p.classList.remove('visible'));
    document.getElementById('panel-'+t.dataset.tab).classList.add('visible');
  })
}

// Breadcrumb
let breadcrumb = [];
function updateBreadcrumb(){
  breadcrumbNav.innerHTML = breadcrumb.map((x,i)=>`<span onclick="goTo(${i})">${x}</span>${i<breadcrumb.length-1?' ▸ ':''}`).join('');
}
function goTo(i){
  breadcrumb = breadcrumb.slice(0,i+1);
  if(i===0) showSections();
  else if(i===1) showTopics(breadcrumb[1]);
  else if(i===2) showSubtopics(breadcrumb[1], breadcrumb[2]);
}

// Learn Panel navigation
function showSections(){
  breadcrumb=['Home']; updateBreadcrumb();
  const keys = Object.keys(DATA);
  contentDiv.innerHTML = `<ul>${keys.map(k=>`<li onclick="showTopics('${k.replace(/'/g,"&apos;")}')">${k}</li>`).join('')}</ul>`;
}
function showTopics(section){
  breadcrumb=['Home', section]; updateBreadcrumb();
  const keys = Object.keys(DATA[section]);
  contentDiv.innerHTML = `<ul>${keys.map(k=>`<li onclick="showSubtopics('${section.replace(/'/g,"&apos;")}', '${k.replace(/'/g,"&apos;")}')">${k}</li>`).join('')}</ul>`;
}
function showSubtopics(section, topic){
  breadcrumb=['Home', section, topic]; updateBreadcrumb();
  const keys = Object.keys(DATA[section][topic]);
  contentDiv.innerHTML = `<ul>${keys.map(k=>`<li onclick="showQuestions('${section.replace(/'/g,"&apos;")}', '${topic.replace(/'/g,"&apos;")}', '${k.replace(/'/g,"&apos;")}')">${k}</li>`).join('')}</ul>`;
}
function showQuestions(section, topic, subtopic){
  breadcrumb=['Home', section, topic, subtopic]; updateBreadcrumb();
  const arr = DATA[section][topic][subtopic] || [];
  const html = arr.map((q,i)=>renderQuestionCard(q,i,true)).join('');
  contentDiv.innerHTML = `<div class="controls"><button class="primary" onclick="prepQuiz('${section}','${topic}','${subtopic}')">Start Quiz from this subtopic</button></div>` + html;
}

function renderQuestionCard(q, idx, expandable=false){
  if(q.options){
    return `<div class="q-card"><div class="q">Q${idx+1}. ${q.q}</div>
      <div class="options">${q.options.map((op,oi)=>`<div class="option ${oi===q.answer? 'correct':''}">${String.fromCharCode(65+oi)}. ${op}</div>`).join('')}</div>
      ${q.explanation?`<div class="hint">Explanation: ${q.explanation}</div>`:''}
      ${q.source?`<div class="hint">Source: ${q.source}</div>`:''}
    </div>`
  } else {
    return `<div class="q-card"><div class="q">Q${idx+1}. ${q.q}</div>
      ${q.explanation?`<div class="hint">Note: ${q.explanation}</div>`:''}
      ${q.source?`<div class="hint">Source: ${q.source}</div>`:''}
    </div>`
  }
}

// Search
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') doSearch(); });

function doSearch(){
  const q = searchInput.value.trim().toLowerCase();
  if(!q){ showSections(); return; }
  breadcrumb=['Home','Search']; updateBreadcrumb();
  const hits = [];
  for(const [sec, topics] of Object.entries(DATA)){
    if(sec.toLowerCase().includes(q)) hits.push({path:[sec], snippet:sec});
    for(const [top, subs] of Object.entries(topics)){
      if(top.toLowerCase().includes(q)) hits.push({path:[sec,top], snippet:top});
      for(const [sub, qs] of Object.entries(subs)){
        if(sub.toLowerCase().includes(q)) hits.push({path:[sec,top,sub], snippet:sub});
        qs.forEach((obj)=>{
          if((obj.q||'').toLowerCase().includes(q) || (obj.explanation||'').toLowerCase().includes(q)){
            hits.push({path:[sec,top,sub], snippet:obj.q});
          }
        })
      }
    }
  }
  contentDiv.innerHTML = `<div class='search-results'>${hits.map(h=>`<div class='hit'>
    <div><strong>${h.path.join(' ▸ ')}</strong></div>
    <div>${h.snippet}</div>
    <button class='primary' onclick="navigateTo('${h.path[0]}','${h.path[1]||''}','${h.path[2]||''}')">Go</button>
  </div>`).join('') || '<p>No matches found.</p>'}</div>`
}
function navigateTo(sec, top, sub){
  if(!top) return showTopics(sec);
  if(!sub) return showSubtopics(sec, top);
  return showQuestions(sec, top, sub);
}

// Quiz Mode
const scopePickers = document.getElementById('scopePickers');
const quizScope = document.getElementById('quizScope');
const quizCount = document.getElementById('quizCount');
const quizShuffle = document.getElementById('quizShuffle');
const quizTimer = document.getElementById('quizTimer');
const startQuizBtn = document.getElementById('startQuiz');
const quizArea = document.getElementById('quizArea');

quizScope.addEventListener('change', renderScopePickers);
function renderScopePickers(){
  let html='';
  if(quizScope.value==='section'){
    html = `<label>Section</label><select id='pickSection'>${Object.keys(DATA).map(x=>`<option>${x}</option>`).join('')}</select>`;
  } else if(quizScope.value==='topic'){
    const firstSec = Object.keys(DATA)[0];
    html = `<label>Section</label><select id='pickSection' onchange='renderTopicPicker()'>${Object.keys(DATA).map(x=>`<option>${x}</option>`).join('')}</select>
            <label>Topic</label><select id='pickTopic'></select>`;
    setTimeout(renderTopicPicker, 0);
  } else if(quizScope.value==='subtopic'){
    const firstSec = Object.keys(DATA)[0];
    html = `<label>Section</label><select id='pickSection' onchange='renderTopicPicker(true)'>${Object.keys(DATA).map(x=>`<option>${x}</option>`).join('')}</select>
            <label>Topic</label><select id='pickTopic' onchange='renderSubtopicPicker()'></select>
            <label>Subtopic</label><select id='pickSubtopic'></select>`;
    setTimeout(()=>renderTopicPicker(true), 0);
  }
  scopePickers.innerHTML = html;
}
window.renderTopicPicker = function(sub=false){
  const sec = document.getElementById('pickSection').value;
  const topics = Object.keys(DATA[sec]);
  const topicSel = document.getElementById('pickTopic');
  if(topicSel){ topicSel.innerHTML = topics.map(x=>`<option>${x}</option>`).join(''); }
  if(sub) renderSubtopicPicker();
}
window.renderSubtopicPicker = function(){
  const sec = document.getElementById('pickSection').value;
  const top = document.getElementById('pickTopic').value;
  const subs = Object.keys(DATA[sec][top]);
  const subSel = document.getElementById('pickSubtopic');
  subSel.innerHTML = subs.map(x=>`<option>${x}</option>`).join('');
}
renderScopePickers();

startQuizBtn.addEventListener('click', ()=>{
  const n = Math.max(5, Math.min(100, parseInt(quizCount.value||'10')));
  let list = [];
  if(quizScope.value==='all'){
    list = flatQuestions(DATA);
  } else if(quizScope.value==='section'){
    const sec = document.getElementById('pickSection').value;
    list = flatQuestions({[sec]: DATA[sec]});
  } else if(quizScope.value==='topic'){
    const sec = document.getElementById('pickSection').value;
    const top = document.getElementById('pickTopic').value;
    list = flatQuestions({[sec]: {[top]: DATA[sec][top]}});
  } else {
    const sec = document.getElementById('pickSection').value;
    const top = document.getElementById('pickTopic').value;
    const sub = document.getElementById('pickSubtopic').value;
    list = DATA[sec][top][sub].map(q=>({...q, __path:[sec,top,sub]}));
  }
  if(quizShuffle.checked) shuffle(list);
  list = list.slice(0, n);
  startQuiz(list, quizTimer.checked);
});

function flatQuestions(obj){
  const out=[];
  for(const [sec, tops] of Object.entries(obj)){
    for(const [top, subs] of Object.entries(tops)){
      for(const [sub, arr] of Object.entries(subs)){
        arr.forEach(q=> out.push({...q, __path:[sec, top, sub]}));
      }
    }
  }
  return out;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} }

// Quiz engine
let QUIZ = null;
function startQuiz(list, timer){
  QUIZ = {i:0, score:0, list, timer, remaining: timer? list.length*30: 0, answers: []};
  document.querySelector('#panel-quiz .quiz-setup').style.display='none';
  quizArea.classList.remove('hidden');
  renderQuizQuestion();
  if(timer){
    QUIZ._tick = setInterval(()=>{ QUIZ.remaining--; updateTimer(); if(QUIZ.remaining<=0){ finishQuiz(); } }, 1000);
  }
}
function updateTimer(){
  const t = document.getElementById('timerBox');
  if(t) t.textContent = `Time left: ${QUIZ.remaining}s`;
}
function renderQuizQuestion(){
  const q = QUIZ.list[QUIZ.i];
  const total = QUIZ.list.length;
  let html = `<div class='q-card'>`;
  if(QUIZ.timer) html += `<div id='timerBox' class='hint' style='float:right'>Time left: ${QUIZ.remaining}s</div>`;
  html += `<div class='hint'>${QUIZ.i+1} / ${total} • ${q.__path? q.__path.join(' ▸ ') : ''}</div>`;
  html += `<div class='q'>${q.q}</div>`;
  if(q.options){
    html += `<div class='options'>` + q.options.map((op,oi)=>`<div class='option' onclick='pick(${oi})'>${String.fromCharCode(65+oi)}. ${op}</div>`).join('') + `</div>`;
  } else {
    html += `<textarea id='txtAnswer' rows='3' style='width:100%' placeholder='Type your answer (subjective)'></textarea>`;
  }
  html += `<div class='controls'>
    <button onclick='prevQ()'>Prev</button>
    <button onclick='skipQ()'>Skip</button>
    <button class='primary' onclick='nextQ()'>Next</button>
  </div>`;
  if(q.explanation){ html += `<div class='hint' style='margin-top:8px'>Explanation: ${q.explanation}</div>`; }
  html += `</div>`;
  quizArea.innerHTML = html;
}

window.pick = function(opt){
  const q = QUIZ.list[QUIZ.i];
  if(typeof q.answer === 'number'){
    const options = document.querySelectorAll('.option');
    options.forEach((el, i)=>{
      if(i===q.answer) el.classList.add('correct');
      else if(i===opt) el.classList.add('wrong');
    });
    QUIZ.answers[QUIZ.i] = {picked: opt, correct: q.answer, ok: opt===q.answer};
    if(opt===q.answer) QUIZ.score++;
  }
}
window.prevQ = function(){ if(QUIZ.i>0){ QUIZ.i--; renderQuizQuestion(); }}
window.skipQ = function(){ QUIZ.answers[QUIZ.i] = {skipped:true}; nextQ(); }
window.nextQ = function(){ if(QUIZ.i<QUIZ.list.length-1){ QUIZ.i++; renderQuizQuestion(); } else { finishQuiz(); } }

function finishQuiz(){
  if(QUIZ._tick) clearInterval(QUIZ._tick);
  const total = QUIZ.list.length;
  const msg = `You scored ${QUIZ.score} / ${total}`;
  let detail = '<ol>';
  QUIZ.list.forEach((q,idx)=>{
    const ans = QUIZ.answers[idx]||{};
    const ok = ans.ok? '✅' : ans.skipped? '⏭️' : '❌';
    detail += `<li>${ok} ${q.q} ${typeof q.answer==='number'? `(Answer: ${String.fromCharCode(65+q.answer)})`:''}</li>`;
  });
  detail += '</ol>';
  quizArea.innerHTML = `<div class='results'><h3>Results</h3><p class='${QUIZ.score*2>=total? 'result-ok':'result-bad'}'>${msg}</p>${detail}<div class='controls'><button class='primary' onclick='restartQuiz()'>Restart</button> <button onclick='exitQuiz()'>Exit</button></div></div>`;
}
window.restartQuiz = function(){ document.querySelector('#panel-quiz .quiz-setup').style.display='block'; quizArea.classList.add('hidden'); }
window.exitQuiz = function(){ restartQuiz(); tabs.forEach(x=>x.classList.remove('active')); document.querySelector(".tab[data-tab='learn']").classList.add('active'); panels.forEach(p=>p.classList.remove('visible')); document.getElementById('panel-learn').classList.add('visible'); }

window.prepQuiz = function(sec, top, sub){
  tabs.forEach(x=>x.classList.remove('active')); document.querySelector(".tab[data-tab='quiz']").classList.add('active');
  panels.forEach(p=>p.classList.remove('visible')); document.getElementById('panel-quiz').classList.add('visible');
  quizScope.value='subtopic'; renderScopePickers();
  document.getElementById('pickSection').value = sec; renderTopicPicker(true);
  document.getElementById('pickTopic').value = top; renderSubtopicPicker();
  document.getElementById('pickSubtopic').value = sub;
}

// Import/Export
const fileInput = document.getElementById('fileInput');
const btnImport = document.getElementById('btnImport');
const btnExportJSON = document.getElementById('btnExportJSON');
const btnReset = document.getElementById('btnReset');
const importLog = document.getElementById('importLog');
const btnTemplateJSON = document.getElementById('btnDownloadTemplateJSON');
const btnTemplateCSV = document.getElementById('btnDownloadTemplateCSV');

btnTemplateJSON.addEventListener('click', ()=>{
  const sample = {"General Awareness":{"History":{"Ancient India":[{"q":"Sample modeled MCQ?","options":["A","B","C","D"],"answer":0,"explanation":"Reason ...","source":"modeled"}]}}}};
  const blob = new Blob([JSON.stringify(sample, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'template.json'; a.click();
});
btnTemplateCSV.addEventListener('click', ()=>{
  const header = 'section,topic,subtopic,question,optA,optB,optC,optD,answer,explanation,source\n';
  const blob = new Blob([header], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='template.csv'; a.click();
});

btnImport.addEventListener('click', async()=>{
  importLog.innerHTML = '';
  if(!fileInput.files.length){ importLog.textContent='Please choose a JSON or CSV file.'; return; }
  const file = fileInput.files[0];
  const text = await file.text();
  try {
    let added=0;
    if(file.name.toLowerCase().endsWith('.json')){
      const obj = JSON.parse(text);
      mergeDataset(obj); added = countQuestions(obj);
    } else if(file.name.toLowerCase().endsWith('.csv')){
      const rows = text.split(/\r?\n/).filter(x=>x.trim());
      const header = rows.shift().split(',').map(x=>x.trim());
      const idx = (k)=> header.indexOf(k);
      for(const row of rows){
        const cols = row.split(',');
        if(cols.length<header.length) continue;
        const sec = cols[idx('section')];
        const top = cols[idx('topic')];
        const sub = cols[idx('subtopic')];
        const q = cols[idx('question')];
        const optA = cols[idx('optA')];
        const optB = cols[idx('optB')];
        const optC = cols[idx('optC')];
        const optD = cols[idx('optD')];
        const ans = parseInt(cols[idx('answer')]);
        const exp = cols[idx('explanation')];
        const src = cols[idx('source')];
        const item = { q, options:[optA,optB,optC,optD].filter(Boolean), answer:isFinite(ans)? ans: undefined, explanation:exp, source:src };
        addItem(sec, top, sub, item); added++;
      }
    }
    localStorage.setItem(LS_KEY, JSON.stringify(DATA));
    importLog.innerHTML = `<div>Imported ${added} questions successfully.</div>`;
  } catch(e){
    importLog.textContent = 'Import failed: ' + e.message;
  }
});

btnExportJSON.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='rrb_ntpc_dataset.json'; a.click();
});
btnReset.addEventListener('click', ()=>{
  if(confirm('Reset to sample data?')){
    DATA = JSON.parse(JSON.stringify(ORIGINAL_DATA));
    localStorage.setItem(LS_KEY, JSON.stringify(DATA));
    showSections(); importLog.textContent='Reset complete.';
  }
});

function mergeDataset(obj){
  for(const [sec, tops] of Object.entries(obj)){
    for(const [top, subs] of Object.entries(tops)){
      for(const [sub, arr] of Object.entries(subs)){
        arr.forEach(item=> addItem(sec, top, sub, item));
      }
    }
  }
}
function addItem(sec, top, sub, item){
  DATA[sec] = DATA[sec]||{};
  DATA[sec][top] = DATA[sec][top]||{};
  DATA[sec][top][sub] = DATA[sec][top][sub]||[];
  DATA[sec][top][sub].push(item);
}
function countQuestions(obj){
  let c=0; for(const tops of Object.values(obj)){ for(const subs of Object.values(tops)){ for(const arr of Object.values(subs)){ c+=arr.length; } } } return c;
}
