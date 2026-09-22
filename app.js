"use strict";

/* ===================== State ===================== */
const state = {
  all: [],
  filters: { set: "all", domain: "all", order: "shuffle", count: 50 },
  queue: [],
  index: 0,
  selected: new Set(),
  answered: false,
  score: 0,
  sessionMistakeIds: [],
  isReviewMode: false,
};

const WRONG_KEY = "aib_quiz_wrong_ids_v1";
const LAST_MISTAKES_KEY = "aib_quiz_last_mistakes_v1";

/* ===================== Storage helpers ===================== */
function loadWrongIds() {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) { return new Set(); }
}
function saveWrongIds(set) {
  try { localStorage.setItem(WRONG_KEY, JSON.stringify([...set])); } catch (e) {}
}
function saveLastMistakes(ids) {
  try { localStorage.setItem(LAST_MISTAKES_KEY, JSON.stringify(ids)); } catch (e) {}
}
function loadLastMistakes() {
  try {
    const raw = localStorage.getItem(LAST_MISTAKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/* ===================== DOM refs ===================== */
const screenSetup = document.getElementById("screen-setup");
const screenQuiz = document.getElementById("screen-quiz");
const screenResult = document.getElementById("screen-result");

const setPicker = document.getElementById("set-picker");
const domainPicker = document.getElementById("domain-picker");
const orderPicker = document.getElementById("order-picker");
const countPicker = document.getElementById("count-picker");
const matchCountNum = document.getElementById("match-count-num");
const btnStart = document.getElementById("btn-start");
const reviewWrap = document.getElementById("review-wrap");
const btnReviewWrong = document.getElementById("btn-review-wrong");
const wrongCountEl = document.getElementById("wrong-count");

const btnQuit = document.getElementById("btn-quit");
const progressFill = document.getElementById("progress-fill");
const progressCurrent = document.getElementById("progress-current");
const progressTotal = document.getElementById("progress-total");
const scoreCorrectEl = document.getElementById("score-correct");

const qTagSet = document.getElementById("q-tag-set");
const qTagDomain = document.getElementById("q-tag-domain");
const qTagSkill = document.getElementById("q-tag-skill");
const qTagMulti = document.getElementById("q-tag-multi");
const qText = document.getElementById("q-text");
const qOptions = document.getElementById("q-options");
const btnSubmit = document.getElementById("btn-submit");
const answerPanel = document.getElementById("answer-panel");
const answerVerdict = document.getElementById("answer-verdict");
const answerExplanation = document.getElementById("answer-explanation");
const btnNext = document.getElementById("btn-next");

const resultCorrect = document.getElementById("result-correct");
const resultTotal = document.getElementById("result-total");
const resultPct = document.getElementById("result-pct");
const resultBreakdown = document.getElementById("result-domain-breakdown");
const btnRestart = document.getElementById("btn-restart");
const btnReviewMistakes = document.getElementById("btn-review-mistakes");
const mistakeCountEl = document.getElementById("mistake-count");

const domainNames = {
  1: "ドメイン1: AI基礎",
  2: "ドメイン2: 戦略と価値",
  3: "ドメイン3: ガバナンス",
  4: "ドメイン4: 変革",
};

/* ===================== Screen switching ===================== */
function showScreen(name) {
  screenSetup.hidden = name !== "setup";
  screenQuiz.hidden = name !== "quiz";
  screenResult.hidden = name !== "result";
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/* ===================== Setup screen ===================== */
function wireChipRow(container, key, onChange) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    container.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip-active"));
    btn.classList.add("chip-active");
    onChange(btn);
    updateMatchCount();
  });
}

function getFilteredQuestions() {
  return state.all.filter((q) => {
    if (state.filters.set !== "all" && String(q.set) !== state.filters.set) return false;
    if (state.filters.domain !== "all" && String(q.domain) !== state.filters.domain) return false;
    return true;
  });
}

function updateMatchCount() {
  const n = getFilteredQuestions().length;
  matchCountNum.textContent = n;
  btnStart.disabled = n === 0;
}

function initSetupScreen() {
  wireChipRow(setPicker, "set", (btn) => { state.filters.set = btn.dataset.set; });
  wireChipRow(domainPicker, "domain", (btn) => { state.filters.domain = btn.dataset.domain; });
  wireChipRow(orderPicker, "order", (btn) => { state.filters.order = btn.dataset.order; });
  wireChipRow(countPicker, "count", (btn) => { state.filters.count = btn.dataset.count; });

  const wrongIds = loadWrongIds();
  if (wrongIds.size > 0) {
    reviewWrap.hidden = false;
    wrongCountEl.textContent = wrongIds.size;
  }
  btnReviewWrong.addEventListener("click", () => {
    const ids = [...loadWrongIds()];
    const qs = state.all.filter((q) => ids.includes(q.id));
    if (qs.length === 0) return;
    startQuiz(qs, true);
  });

  btnStart.addEventListener("click", () => {
    let qs = getFilteredQuestions();
    if (state.filters.order === "shuffle") shuffleArray(qs);
    if (state.filters.count !== "all") {
      const n = parseInt(state.filters.count, 10);
      qs = qs.slice(0, n);
    }
    startQuiz(qs, false);
  });

  updateMatchCount();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ===================== Quiz screen ===================== */
function startQuiz(questions, isReview) {
  state.queue = questions;
  state.index = 0;
  state.score = 0;
  state.sessionMistakeIds = [];
  state.isReviewMode = isReview;
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = state.queue[state.index];
  state.selected = new Set();
  state.answered = false;

  progressCurrent.textContent = state.index + 1;
  progressTotal.textContent = state.queue.length;
  progressFill.style.width = `${((state.index) / state.queue.length) * 100}%`;
  scoreCorrectEl.textContent = state.score;

  qTagSet.textContent = `Set ${q.set}`;
  qTagDomain.textContent = domainNames[q.domain] || `ドメイン${q.domain}`;
  qTagSkill.textContent = `Skill ${q.skill}`;
  qTagMulti.hidden = !q.multi;
  if (q.multi) qTagMulti.textContent = `${q.answer.length}つ選択`;

  qText.textContent = q.text;

  qOptions.innerHTML = "";
  const letters = Object.keys(q.options).sort();
  letters.forEach((letter) => {
    const opt = document.createElement("div");
    opt.className = "option";
    opt.dataset.letter = letter;
    opt.innerHTML = `<span class="option-letter">${letter}</span><span class="option-text"></span>`;
    opt.querySelector(".option-text").textContent = q.options[letter];
    opt.addEventListener("click", () => onOptionClick(letter, q));
    qOptions.appendChild(opt);
  });

  btnSubmit.disabled = true;
  btnSubmit.textContent = "回答する";
  answerPanel.hidden = true;
}

function onOptionClick(letter, q) {
  if (state.answered) return;
  const isMulti = q.multi;
  if (isMulti) {
    if (state.selected.has(letter)) state.selected.delete(letter);
    else state.selected.add(letter);
  } else {
    state.selected = new Set([letter]);
  }
  refreshOptionSelection();
  btnSubmit.disabled = state.selected.size === 0;
}

function refreshOptionSelection() {
  qOptions.querySelectorAll(".option").forEach((el) => {
    el.classList.toggle("option-selected", state.selected.has(el.dataset.letter));
  });
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

btnSubmit.addEventListener("click", () => {
  if (state.answered || state.selected.size === 0) return;
  const q = state.queue[state.index];
  const correctSet = new Set(q.answer);
  const isCorrect = setsEqual(state.selected, correctSet);
  state.answered = true;

  qOptions.querySelectorAll(".option").forEach((el) => {
    const letter = el.dataset.letter;
    el.classList.add("option-disabled");
    if (correctSet.has(letter)) {
      el.classList.add("option-correct");
    } else if (state.selected.has(letter)) {
      el.classList.add("option-incorrect");
    }
  });

  const wrongIds = loadWrongIds();
  if (isCorrect) {
    state.score += 1;
    if (!state.isReviewMode) wrongIds.delete(q.id);
  } else {
    state.sessionMistakeIds.push(q.id);
    if (!state.isReviewMode) wrongIds.add(q.id);
  }
  saveWrongIds(wrongIds);

  scoreCorrectEl.textContent = state.score;
  progressFill.style.width = `${((state.index + 1) / state.queue.length) * 100}%`;

  answerVerdict.textContent = isCorrect
    ? `正解 ✓（正答: ${q.answer.join(", ")}）`
    : `不正解 ✗（正答: ${q.answer.join(", ")}）`;
  answerVerdict.className = "answer-verdict " + (isCorrect ? "verdict-correct" : "verdict-incorrect");
  answerExplanation.textContent = q.explanation;

  answerPanel.hidden = false;
  btnNext.textContent = state.index + 1 < state.queue.length ? "次の問題 →" : "結果を見る →";
});

btnNext.addEventListener("click", () => {
  if (state.index + 1 < state.queue.length) {
    state.index += 1;
    renderQuestion();
  } else {
    finishQuiz();
  }
});

btnQuit.addEventListener("click", () => {
  if (state.answered || state.index === 0 || confirm("学習を中断して設定画面に戻りますか？")) {
    showScreen("setup");
    updateMatchCount();
  }
});

/* ===================== Result screen ===================== */
function finishQuiz() {
  saveLastMistakes(state.sessionMistakeIds);

  resultCorrect.textContent = state.score;
  resultTotal.textContent = state.queue.length;
  const pct = state.queue.length ? Math.round((state.score / state.queue.length) * 100) : 0;
  resultPct.textContent = `正答率 ${pct}%`;

  const byDomain = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 }, 4: { c: 0, t: 0 } };
  const mistakeSet = new Set(state.sessionMistakeIds);
  state.queue.forEach((q) => {
    byDomain[q.domain].t += 1;
    if (!mistakeSet.has(q.id)) byDomain[q.domain].c += 1;
  });

  resultBreakdown.innerHTML = "";
  [1, 2, 3, 4].forEach((d) => {
    const { c, t } = byDomain[d];
    if (t === 0) return;
    const row = document.createElement("div");
    row.className = "breakdown-row";
    const barPct = Math.round((c / t) * 100);
    row.innerHTML = `
      <span class="breakdown-label">${domainNames[d]}</span>
      <span class="breakdown-bar-wrap"><span class="breakdown-bar" style="width:${barPct}%"></span></span>
      <span class="breakdown-num">${c}/${t}</span>
    `;
    resultBreakdown.appendChild(row);
  });

  if (state.sessionMistakeIds.length > 0) {
    btnReviewMistakes.hidden = false;
    mistakeCountEl.textContent = state.sessionMistakeIds.length;
  } else {
    btnReviewMistakes.hidden = true;
  }

  showScreen("result");
}

btnRestart.addEventListener("click", () => {
  showScreen("setup");
  updateMatchCount();
  const wrongIds = loadWrongIds();
  if (wrongIds.size > 0) {
    reviewWrap.hidden = false;
    wrongCountEl.textContent = wrongIds.size;
  } else {
    reviewWrap.hidden = true;
  }
});

btnReviewMistakes.addEventListener("click", () => {
  const ids = loadLastMistakes();
  const qs = state.all.filter((q) => ids.includes(q.id));
  if (qs.length === 0) return;
  startQuiz(qs, true);
});

/* ===================== Boot ===================== */
async function boot() {
  try {
    const res = await fetch("data/questions.json");
    state.all = await res.json();
  } catch (e) {
    qText.textContent = "問題データの読み込みに失敗しました。ページを再読み込みしてください。";
    console.error(e);
    return;
  }
  initSetupScreen();
}

boot();
