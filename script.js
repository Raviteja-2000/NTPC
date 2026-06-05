// Data handling
let DATA = {};
let ORIGINAL_DATA = {};
const LS_KEY = 'rrb_ntpc_dataset_v1';

const contentDiv = document.getElementById('content');
const breadcrumbNav = document.getElementById('breadcrumb');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

// Load dataset
(async function init(){
  try {
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
  } catch(e){
    console.error("Init error:", e);
  }
})();

// Tabs
tabs.forEach(t=>{
  t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');

    panels.forEach(p=>p.classList.remove('visible'));
    const target = document.getElementById('panel-'+t.dataset.tab);
    if(target) target.classList.add('visible');
  });
});

// Breadcrumb
let breadcrumb = [];

function updateBreadcrumb(){
  breadcrumbNav.innerHTML = breadcrumb.map((x,i)=>
    `<span onclick="goTo(${i})">${x}</span>${i<breadcrumb.length-1?' ▸ ':''}`
  ).join('');
}

function goTo(i){
  breadcrumb = breadcrumb.slice(0,i+1);
  if(i===0) showSections();
  else if(i===1) showTopics(breadcrumb[1]);
  else if(i===2) showSubtopics(breadcrumb[1], breadcrumb[2]);
}

// Navigation
function showSections(){
  breadcrumb=['Home']; updateBreadcrumb();
  const keys = Object.keys(DATA);
  contentDiv.innerHTML =
    `<ul>${keys.map(k=>
      `<li onclick="showTopics('${k.replace(/'/g,"\\'")}')">${k}</li>`
    ).join('')}</ul>`;
}

function showTopics(section){
  breadcrumb=['Home', section]; updateBreadcrumb();
  const keys = Object.keys(DATA[section] || {});
  contentDiv.innerHTML =
    `<ul>${keys.map(k=>
      `<li onclick="showSubtopics('${section}','${k}')">${k}</li>`
    ).join('')}</ul>`;
}

function showSubtopics(section, topic){
  breadcrumb=['Home', section, topic]; updateBreadcrumb();
  const keys = Object.keys(DATA[section]?.[topic] || {});
  contentDiv.innerHTML =
    `<ul>${keys.map(k=>
      `<li onclick="showQuestions('${section}','${topic}','${k}')">${k}</li>`
    ).join('')}</ul>`;
}

function showQuestions(section, topic, subtopic){
  breadcrumb=['Home', section, topic, subtopic]; updateBreadcrumb();
  const arr = DATA[section]?.[topic]?.[subtopic] || [];

  const html = arr.map((q,i)=>renderQuestionCard(q,i)).join('');

  contentDiv.innerHTML =
    `<div class="controls">
       <button class="primary" onclick="prepQuiz('${section}','${topic}','${subtopic}')">
         Start Quiz from this subtopic
       </button>
     </div>` + html;
}

function renderQuestionCard(q, idx){
  if(q.options){
    return `<div class="q-card">
      <div class="q">Q${idx+1}. ${q.q}</div>
      <div class="options">
        ${q.options.map((op,oi)=>
          `<div class="option ${oi===q.answer?'correct':''}">
          ${String.fromCharCode(65+oi)}. ${op}</div>`).join('')}
      </div>
      ${q.explanation?`<div class="hint">Explanation: ${q.explanation}</div>`:''}
    </div>`;
  } else {
    return `<div class="q-card">
      <div class="q">Q${idx+1}. ${q.q}</div>
      ${q.explanation?`<div class="hint">${q.explanation}</div>`:''}
    </div>`;
  }
}

// Quiz
let QUIZ = null;

function startQuiz(list){
  QUIZ = {i:0, score:0, list, answered:{}};
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const q = QUIZ.list[QUIZ.i];

  let html = `<div class='q-card'>
    <div class='q'>${q.q}</div>`;

  if(q.options){
    html += `<div class='options'>
      ${q.options.map((op,oi)=>
        `<div class='option' onclick='pick(${oi})'>
         ${String.fromCharCode(65+oi)}. ${op}
        </div>`).join('')}
    </div>`;
  }

  html += `<div class='controls'>
    <button onclick='prevQ()'>Prev</button>
    <button onclick='nextQ()'>Next</button>
  </div></div>`;

  quizArea.innerHTML = html;
}

window.pick = function(opt){
  // ✅ Prevent double clicking scoring bug
  if(QUIZ.answered[QUIZ.i]) return;

  const q = QUIZ.list[QUIZ.i];

  const options = document.querySelectorAll('.option');

  options.forEach((el,i)=>{
    if(i===q.answer) el.classList.add('correct');
    else if(i===opt) el.classList.add('wrong');
  });

  if(opt===q.answer) QUIZ.score++;

  QUIZ.answered[QUIZ.i] = true;
}

window.prevQ = function(){
  if(QUIZ.i>0){
    QUIZ.i--;
    renderQuizQuestion();
  }
}

window.nextQ = function(){
  if(QUIZ.i<QUIZ.list.length-1){
    QUIZ.i++;
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
}

function finishQuiz(){
  quizArea.innerHTML =
    `<h3>Score: ${QUIZ.score}/${QUIZ.list.length}</h3>`;
}

// Template fix
const btnTemplateJSON = document.getElementById('btnDownloadTemplateJSON');

btnTemplateJSON?.addEventListener('click', ()=>{
  const sample = {
    "General Awareness":{
      "History":{
        "Ancient India":[
          {
            "q":"Sample question?",
            "options":["A","B","C","D"],
            "answer":0
          }
        ]
      }
    }
  };

  const blob = new Blob([JSON.stringify(sample, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'template.json';
  a.click();
});
