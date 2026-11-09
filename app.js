const $ = (id) => document.getElementById(id);
const state = {
  words: [], view: "home", practiceIndex: 0, selected: null,
  xp: Number(localStorage.getItem("da_xp") || 0),
  known: JSON.parse(localStorage.getItem("da_known") || "[]"),
  lessons: Number(localStorage.getItem("da_lessons") || 0),
  lessonStep: 0, lessonCorrect: false
};
const questions = [
  {q:"Как будет «спасибо»?", a:["dank je","alsjeblieft","tot ziens","goed"], correct:"dank je"},
  {q:"Что означает «huis»?", a:["книга","дом","вода","улица"], correct:"дом"},
  {q:"Как сказать «да»?", a:["nee","sorry","ja","ik"], correct:"ja"},
  {q:"Что означает «water»?", a:["молоко","кофе","хлеб","вода"], correct:"вода"},
  {q:"Как будет «друг»?", a:["vriend","vrouw","man","familie"], correct:"vriend"}
];
const lesson = [
  {type:"intro", title:"Начнём знакомство", hint:"В нидерландском языке приветствие «hallo» звучит почти как «халло».", word:"hallo", translation:"привет"},
  {type:"choice", title:"Выбери перевод слова", hint:"Что означает нидерландское слово «dank je»?", options:["спасибо","пожалуйста","до свидания"], answer:"спасибо"},
  {type:"input", title:"Вспомни нидерландское слово", hint:"Напиши по-нидерландски: «да».", answer:"ja"},
  {type:"choice", title:"Проверь себя", hint:"Как сказать «до свидания»?", options:["goed","tot ziens","pardon"], answer:"tot ziens"},
  {type:"finish", title:"Урок завершён!", hint:"Отличная работа. Повтори слова ещё раз завтра.", word:"Goed gedaan!", translation:"Молодец!"}
];
function save(){localStorage.setItem("da_xp",state.xp);localStorage.setItem("da_known",JSON.stringify(state.known));localStorage.setItem("da_lessons",state.lessons);}
function updateStats(){
  $("todayPoints").textContent=state.xp%21;
  $("goalBar").style.width=Math.min(100,(state.xp%21)/20*100)+"%";
  $("progressXP").textContent=state.xp;
  $("knownCount").textContent=state.known.length;
  $("lessonCount").textContent=state.lessons;
}
function showView(name){
  state.view=name;
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(name+"View").classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  if(name==="vocabulary") renderWords($("searchInput").value||"");
  if(name==="practice") renderPractice();
  if(name==="progress") updateStats();
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
function speak(word){if(!("speechSynthesis" in window)){alert("Озвучка не поддерживается этим браузером.");return;}const u=new SpeechSynthesisUtterance(word);u.lang="nl-NL";speechSynthesis.cancel();speechSynthesis.speak(u);}
function renderWords(query=""){
  const q=query.trim().toLowerCase();
  const found=state.words.filter(w=>[w.en,w.nl,w.ru].some(x=>x.toLowerCase().includes(q)));
  $("wordList").innerHTML=found.map(w=>{
    const key=w.nl; const known=state.known.includes(key);
    return `<article class="word-row"><div><strong>${w.nl}</strong><small>${w.en} · ${w.ru}</small></div><div class="word-actions"><button class="sound-button" data-say="${w.nl}" aria-label="Прослушать ${w.nl}">🔊</button><button class="known-button ${known?"done":""}" data-known="${w.nl}">${known?"Выучено ✓":"Знаю"}</button></div></article>`;
  }).join("") || '<p class="muted">Ничего не найдено. Попробуй другое слово.</p>';
  $("wordList").querySelectorAll("[data-say]").forEach(b=>b.addEventListener("click",()=>speak(b.dataset.say)));
  $("wordList").querySelectorAll("[data-known]").forEach(b=>b.addEventListener("click",()=>{
    const w=b.dataset.known;
    state.known=state.known.includes(w)?state.known.filter(x=>x!==w):[...state.known,w];
    save();renderWords(query);updateStats();
  }));
}
$("searchInput").addEventListener("input",e=>renderWords(e.target.value));
function renderPractice(){
  const q=questions[state.practiceIndex%questions.length];state.selected=null;
  $("practiceFeedback").textContent="";$("nextQuestion").disabled=true;
  $("practiceOptions").innerHTML=q.a.map(a=>`<button class="option" data-answer="${a}">${a}</button>`).join("");
  $("practiceOptions").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    if($("nextQuestion").disabled===false)return;
    state.selected=b.dataset.answer;
    $("practiceOptions").querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
    const ok=state.selected===q.correct;
    b.classList.add(ok?"correct":"wrong");
    if(ok){state.xp+=5;save();$("practiceFeedback").textContent="Верно! +5 XP";}else $("practiceFeedback").textContent="Пока неверно. Правильный ответ: "+q.correct;
    $("nextQuestion").disabled=false;updateStats();
  }));
}
$("nextQuestion").addEventListener("click",()=>{state.practiceIndex++;renderPractice();});
$("startLesson").addEventListener("click",openLesson);
function openLesson(){state.lessonStep=0;$("lessonModal").classList.remove("hidden");renderLesson();}
$("closeLesson").addEventListener("click",()=>$("lessonModal").classList.add("hidden"));
function renderLesson(){
  const s=lesson[state.lessonStep];state.lessonCorrect=false;
  $("lessonStepLabel").textContent=(state.lessonStep+1)+" / "+lesson.length;
  $("lessonBar").style.width=((state.lessonStep)/lesson.length*100)+"%";
  $("lessonFeedback").textContent="";$("checkAnswer").classList.remove("hidden");$("continueLesson").classList.add("hidden");
  let html=`<h2 class="lesson-question">${s.title}</h2><p class="lesson-hint">${s.hint}</p>`;
  if(s.type==="intro"||s.type==="finish") html+=`<div class="lesson-word">${s.word}</div><p class="muted">${s.translation}</p><button class="sound-button" id="lessonSpeak">🔊 Прослушать</button>`;
  if(s.type==="choice") html+=`<div class="options">${s.options.map(o=>`<button class="option lesson-option" data-value="${o}">${o}</button>`).join("")}</div>`;
  if(s.type==="input") html+=`<input class="lesson-input" id="lessonInput" placeholder="Твой ответ…" autocomplete="off">`;
  $("lessonContent").innerHTML=html;
  $("lessonSpeak")?.addEventListener("click",()=>speak(s.word));
  document.querySelectorAll(".lesson-option").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".lesson-option").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");b.dataset.chosen="yes";}));
  if(s.type==="intro"||s.type==="finish") $("checkAnswer").textContent=s.type==="finish"?"Завершить":"Продолжить";
  else $("checkAnswer").textContent="Проверить";
}
$("checkAnswer").addEventListener("click",()=>{
  const s=lesson[state.lessonStep];
  if(s.type==="intro"){nextLesson();return;}
  if(s.type==="finish"){state.lessons++;state.xp+=10;save();updateStats();$("lessonModal").classList.add("hidden");return;}
  let answer="";
  if(s.type==="choice") answer=document.querySelector(".lesson-option[data-chosen='yes']")?.dataset.value||"";
  if(s.type==="input") answer=$("lessonInput").value.trim().toLowerCase();
  if(!answer){$("lessonFeedback").textContent="Выбери или введи ответ.";return;}
  if(answer.toLowerCase()===s.answer.toLowerCase()){
    state.lessonCorrect=true;state.xp+=5;save();updateStats();$("lessonFeedback").textContent="Правильно! +5 XP";$("checkAnswer").classList.add("hidden");$("continueLesson").classList.remove("hidden");
  }else $("lessonFeedback").textContent="Почти! Попробуй ещё раз.";
});
function nextLesson(){state.lessonStep++;renderLesson();}
$("continueLesson").addEventListener("click",nextLesson);
$("resetProgress").addEventListener("click",()=>{if(confirm("Точно сбросить весь прогресс на этом устройстве?")){state.xp=0;state.known=[];state.lessons=0;save();updateStats();}});
$("explainLanguage").addEventListener("change",e=>{document.documentElement.lang=e.target.value;});
fetch("./data/words.json").then(r=>{if(!r.ok)throw new Error("Не удалось загрузить словарь");return r.json();}).then(data=>{state.words=data;renderWords();}).catch(err=>{$("wordList").innerHTML='<p class="muted">Не удалось загрузить словарь. Проверь, что папка data и файл words.json загружены вместе с сайтом.</p>';console.error(err);});
updateStats();
