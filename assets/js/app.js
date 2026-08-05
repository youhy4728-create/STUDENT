/* =========================================================
   Mamdouh Fakhry Platform — Student Site App
   ========================================================= */

const state = {
  settings: { platformName: 'منصة مامدوح فخري التعليمية' },
  route: parseHash(),
  loginStep: 'code', // 'code' | 'details'
  pendingCode: null,
  examAnswers: {}
};

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}
window.addEventListener('hashchange', () => { state.route = parseHash(); render(); });

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem('mfx_theme');
  const theme = saved || (state.settings.defaultDarkMode ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon();
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mfx_theme', next);
  updateThemeIcon();
}
function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
}

// ---------- Toast ----------
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- App shell ----------
const app = document.getElementById('app');
const topbar = document.getElementById('topbar');

function updateTopbar() {
  const brandName = document.getElementById('brandName');
  brandName.textContent = state.settings.platformName;
  topbar.style.display = 'flex';
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.style.display = Auth.isLoggedIn() ? 'inline-flex' : 'none';
}

document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('logoutBtn').addEventListener('click', () => {
  Auth.clear();
  location.hash = '#/';
  render();
});
document.getElementById('brandName').addEventListener('click', () => { location.hash = '#/'; });

// ---------- Helpers ----------
function h(strings, ...vals) { // no-op tag, just for readability in template literals
  return strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ''), '');
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function loading() {
  app.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}
function iconFor(type) {
  return { video: '🎬', book: '📘', exam: '📝' }[type] || '📎';
}

// ---------- Main render dispatcher ----------
async function render() {
  updateTopbar();
  const { name, params } = state.route;

  if (!Auth.isLoggedIn()) {
    if (name === 'login') return renderLogin();
    return renderHome();
  }

  if (name === 'home') return renderDashboard();
  if (name === 'unit') return renderUnit(params[0]);
  if (name === 'video') return renderVideo(params[0]);
  if (name === 'book') return renderBook(params[0]);
  if (name === 'exam') return renderExamIntro(params[0]);
  if (name === 'exam-take') return renderExamTake(params[0]);
  if (name === 'exam-result') return renderExamResult(params[0]);
  if (name === 'exam-rank') return renderExamRankings(params[0]);
  return renderDashboard();
}

// ---------- Public home (logged out) ----------
async function renderHome() {
  loading();
  let units = [];
  try { units = await api.get('/units/public'); } catch (e) { /* ignore */ }

  app.innerHTML = `
    <section class="hero">
      <div class="eyebrow">✨ منصة تعليمية متكاملة</div>
      <h1>تعلّم بذكاء مع <span>${escapeHtml(state.settings.platformName)}</span></h1>
      <p>محتوى تعليمي احترافي — فيديوهات، كتب، وامتحانات تفاعلية — كل اللي محتاجه لتحقيق أعلى الدرجات في مكان واحد.</p>
      <div class="cta-row">
        <button class="btn primary" onclick="location.hash='#/login'">🔑 الدخول إلى الكورس</button>
      </div>
    </section>

    <div class="teacher-card">
      <div class="teacher-avatar">م</div>
      <div>
        <h3>المستر ممدوح فخري</h3>
        <p>مدرّس متخصص يقدّم شرحًا مبسطًا واحترافيًا، مع متابعة دقيقة لأداء كل طالب من خلال المنصة، وتقييم مستمر عبر الاختبارات التفاعلية.</p>
      </div>
    </div>

    <div class="section-head">
      <h2>الكورسات المتاحة</h2>
      <p>اختر الكود الخاص بك للوصول إلى المحتوى المخصص لك</p>
    </div>

    ${units.length ? `<div class="grid">${units.map(unitCardHtml).join('')}</div>` : `
      <div class="empty-state"><div class="em">📚</div>سيتم إضافة الكورسات قريبًا</div>
    `}

    <footer class="site-footer">© ${new Date().getFullYear()} ${escapeHtml(state.settings.platformName)} — جميع الحقوق محفوظة</footer>
  `;
}

function unitCardHtml(u) {
  return `
    <div class="card course-card">
      <div class="course-cover"><span class="emoji">📖</span></div>
      <div class="course-body">
        <h3>${escapeHtml(u.title)}</h3>
        <p>${escapeHtml(u.description || 'محتوى تعليمي شامل لهذه الوحدة')}</p>
        <div class="course-meta">
          <span class="badge locked">🔒 يتطلب كود دخول</span>
          <button class="btn secondary" style="padding:8px 16px;font-size:13px" onclick="location.hash='#/login'">الدخول</button>
        </div>
      </div>
    </div>`;
}

// ---------- Login (code -> details) ----------
function renderLogin() {
  if (state.loginStep === 'details') return renderLoginDetails();

  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="icon-badge">🔑</div>
        <h2>أدخل كود الدخول</h2>
        <p class="sub">اكتب الكود اللي معاك للوصول إلى الكورس</p>
        <div id="loginError"></div>
        <form id="codeForm">
          <div class="field code-field">
            <label>كود الدخول</label>
            <input type="text" id="codeInput" placeholder="XXXX-XXXX" required autofocus>
          </div>
          <button type="submit" class="btn primary block">متابعة</button>
        </form>
        <a class="hint-link" onclick="location.hash='#/'">→ العودة للصفحة الرئيسية</a>
      </div>
    </div>
  `;
  document.getElementById('codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('codeInput').value.trim();
    if (!code) return;
    state.pendingCode = code;
    state.loginStep = 'details';
    render();
  });
}

function renderLoginDetails() {
  app.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="icon-badge">👤</div>
        <h2>بياناتك</h2>
        <p class="sub">أول مرة تدخل بيها الكود ده، هنحتاج اسمك</p>
        <div id="loginError"></div>
        <form id="detailsForm">
          <div class="field">
            <label>الاسم بالكامل</label>
            <input type="text" id="nameInput" required autofocus>
          </div>
          <div class="field">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" id="phoneInput">
          </div>
          <button type="submit" class="btn primary block" id="submitBtn">دخول</button>
        </form>
        <a class="hint-link"><b onclick="state.loginStep='code';render()">→ تعديل الكود</b></a>
      </div>
    </div>
  `;
  document.getElementById('detailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('nameInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'جاري الدخول...';
    try {
      const data = await api.post('/auth/student/login', { code: state.pendingCode, name, phone });
      Auth.setSession(data);
      state.loginStep = 'code';
      state.pendingCode = null;
      location.hash = '#/';
      toast('تم الدخول بنجاح 🎉');
    } catch (err) {
      document.getElementById('loginError').innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
      btn.disabled = false; btn.textContent = 'دخول';
    }
  });
}

// ---------- Dashboard (logged in) ----------
async function renderDashboard() {
  loading();
  let units = [];
  try { units = await api.get('/students/me/units'); } catch (e) { toast(e.message, 'error'); }
  const user = Auth.getUser();

  app.innerHTML = `
    <section class="hero" style="padding-top:50px;padding-bottom:20px">
      <div class="eyebrow">👋 أهلاً بيك</div>
      <h1>مرحبًا <span>${escapeHtml(user?.name || '')}</span></h1>
      <p>دي الكورسات المتاحة ليك حاليًا. اختر الوحدة عشان تبدأ.</p>
    </section>
    ${units.length ? `<div class="grid">${units.map((u) => `
      <div class="card course-card" onclick="location.hash='#/unit/${u.id}'" style="cursor:pointer">
        <div class="course-cover"><span class="emoji">📖</span></div>
        <div class="course-body">
          <h3>${escapeHtml(u.title)}</h3>
          <p>${escapeHtml(u.description || '')}</p>
          <div class="course-meta">
            <span class="badge">✅ متاح</span>
            <button class="btn secondary" style="padding:8px 16px;font-size:13px">فتح</button>
          </div>
        </div>
      </div>`).join('')}</div>` : `
      <div class="empty-state"><div class="em">🔒</div>لا يوجد لديك كورسات متاحة حاليًا — تواصل مع المدرّس للحصول على كود دخول</div>
    `}
  `;
}

// ---------- Unit detail ----------
async function renderUnit(unitId) {
  loading();
  let unit, videos = [], books = [], exams = [];
  try {
    [videos, books, exams] = await Promise.all([
      api.get(`/videos/unit/${unitId}`),
      api.get(`/books/unit/${unitId}`),
      api.get(`/exams/unit/${unitId}`)
    ]);
    const myUnits = await api.get('/students/me/units');
    unit = myUnits.find((u) => u.id === unitId);
  } catch (e) { toast(e.message, 'error'); }

  if (!unit) {
    app.innerHTML = `<div class="empty-state"><div class="em">🚫</div>لا تملك صلاحية الوصول لهذه الوحدة</div>`;
    return;
  }

  const rows = [
    ...videos.map((v) => ({ type: 'video', item: v })),
    ...books.map((b) => ({ type: 'book', item: b })),
    ...exams.map((ex) => ({ type: 'exam', item: ex }))
  ];

  app.innerHTML = `
    <a class="back-link" onclick="location.hash='#/'">→ رجوع للكورسات</a>
    <div class="unit-hero">
      <h1>${escapeHtml(unit.title)}</h1>
      <p>${escapeHtml(unit.description || '')}</p>
    </div>
    ${rows.length ? rows.map(rowHtml).join('') : `<div class="empty-state"><div class="em">🗂️</div>لا يوجد محتوى منشور بعد لهذه الوحدة</div>`}
  `;
}

function rowHtml({ type, item }) {
  const link = type === 'video' ? `#/video/${item.id}` : type === 'book' ? `#/book/${item.id}` : `#/exam/${item.id}`;
  const metaLabel = type === 'video' ? 'فيديو' : type === 'book' ? 'كتاب PDF' : 'امتحان';
  return `
    <div class="item-row" style="cursor:pointer" onclick="location.hash='${link}'">
      <div class="item-icon">${iconFor(type)}</div>
      <div class="item-info">
        <h4>${escapeHtml(item.title)}</h4>
        <div class="meta">${metaLabel}</div>
      </div>
      <div style="font-size:20px;color:var(--text-muted)">›</div>
    </div>`;
}

// ---------- Video player + progress tracking ----------
async function renderVideo(id) {
  loading();
  let video, progress = null;
  try {
    video = await api.get(`/videos/${id}`);
    progress = await api.get(`/videos/${id}/my-progress`);
  } catch (e) { toast(e.message, 'error'); return; }

  const embedUrl = toDriveEmbed(video.driveUrl);
  const pct = progress ? Math.round(progress.watchPercentage) : 0;

  app.innerHTML = `
    <a class="back-link" onclick="location.hash='#/unit/${video.unitId}'">→ رجوع للوحدة</a>
    <h2 style="margin-bottom:16px">${escapeHtml(video.title)}</h2>
    <div class="player-wrap"><iframe src="${embedUrl}" allow="autoplay" allowfullscreen></iframe></div>
    <div class="item-row">
      <div class="item-icon">📊</div>
      <div class="item-info">
        <h4>نسبة المشاهدة: <span id="pctLabel">${pct}%</span></h4>
        <div class="progress-bar"><div id="pctBar" style="width:${pct}%"></div></div>
      </div>
      <button class="btn ${pct >= 95 ? 'secondary' : 'primary'}" id="markWatchedBtn">${pct >= 95 ? '✔️ تمت المشاهدة' : 'تحديد كمُشاهَد'}</button>
    </div>
  `;

  document.getElementById('markWatchedBtn').addEventListener('click', async () => {
    try {
      await api.post(`/videos/${id}/progress`, { watchSeconds: video.durationSeconds || 0, watchPercentage: 100 });
      document.getElementById('pctLabel').textContent = '100%';
      document.getElementById('pctBar').style.width = '100%';
      document.getElementById('markWatchedBtn').outerHTML = `<button class="btn secondary" disabled>✔️ تمت المشاهدة</button>`;
      toast('تم تسجيل المشاهدة ✅');
    } catch (e) { toast(e.message, 'error'); }
  });

  // Passive progress ping every 20s while the tab is open (best-effort)
  let watchedSeconds = 0;
  const ticker = setInterval(async () => {
    watchedSeconds += 20;
    const estPct = video.durationSeconds ? Math.min(90, Math.round((watchedSeconds / video.durationSeconds) * 100)) : 30;
    try { await api.post(`/videos/${id}/progress`, { watchSeconds: watchedSeconds, watchPercentage: estPct }); } catch (e) {}
  }, 20000);
  window.addEventListener('hashchange', () => clearInterval(ticker), { once: true });
}

function toDriveEmbed(url) {
  if (!url) return '';
  const match = url.match(/[-\w]{25,}/);
  if (match) return `https://drive.google.com/file/d/${match[0]}/preview`;
  return url;
}

// ---------- Book viewer + tracking ----------
async function renderBook(id) {
  loading();
  let book;
  try { book = await api.get(`/books/${id}`); } catch (e) { toast(e.message, 'error'); return; }

  try { await api.post(`/books/${id}/track`, { event: 'opened' }); } catch (e) {}

  app.innerHTML = `
    <a class="back-link" onclick="location.hash='#/unit/${book.unitId}'">→ رجوع للوحدة</a>
    <h2 style="margin-bottom:16px">${escapeHtml(book.title)}</h2>
    <div class="player-wrap" style="aspect-ratio:3/4;max-width:720px;margin:0 auto 20px">
      <iframe src="${toDriveEmbed(book.driveUrl)}"></iframe>
    </div>
    <div style="max-width:720px;margin:0 auto">
      <div class="item-row">
        <div class="item-icon">📘</div>
        <div class="item-info"><h4>هل انتهيت من قراءة الكتاب؟</h4></div>
        <button class="btn primary" id="finishBookBtn">✔️ أنهيت القراءة</button>
      </div>
    </div>
  `;
  document.getElementById('finishBookBtn').addEventListener('click', async () => {
    try {
      await api.post(`/books/${id}/track`, { event: 'finished' });
      toast('تم تسجيل إنهاء القراءة ✅');
      document.getElementById('finishBookBtn').outerHTML = `<button class="btn secondary" disabled>✔️ تم الإنهاء</button>`;
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ---------- Exam intro ----------
async function renderExamIntro(id) {
  loading();
  let exam, myAttempts = [];
  try {
    exam = await api.get(`/exams/${id}`);
    myAttempts = await api.get(`/attempts/my/${id}`);
  } catch (e) { toast(e.message, 'error'); return; }

  const maxAttempts = parseInt(exam.maxAttempts, 10) || 1;
  const usedAttempts = myAttempts.length;
  const canStart = usedAttempts < maxAttempts;
  const lastGraded = myAttempts.filter((a) => a.status !== 'in_progress').sort((a, b) => new Date(b.finishTime) - new Date(a.finishTime))[0];

  app.innerHTML = `
    <a class="back-link" onclick="location.hash='#/unit/${exam.unitId}'">→ رجوع للوحدة</a>
    <div class="unit-hero"><h1>📝 ${escapeHtml(exam.title)}</h1><p>${escapeHtml(exam.description || '')}</p></div>
    <div class="exam-meta-row">
      <div class="meta-chip">⏱️ ${exam.timerMinutes > 0 ? exam.timerMinutes + ' دقيقة' : 'بدون وقت محدد'}</div>
      <div class="meta-chip">🎯 درجة النجاح: ${exam.passingScore}%</div>
      <div class="meta-chip">🔁 المحاولات: ${usedAttempts}/${maxAttempts}</div>
      <div class="meta-chip">❓ عدد الأسئلة: ${(exam.questions || []).length}</div>
    </div>
    ${lastGraded ? `
      <div class="item-row">
        <div class="item-icon">📊</div>
        <div class="item-info"><h4>آخر نتيجة: ${lastGraded.percentage}%</h4><div class="meta">${lastGraded.passed ? 'ناجح ✅' : 'راسب ❌'}</div></div>
        <button class="btn secondary" onclick="location.hash='#/exam-result/${lastGraded.id}'">عرض النتيجة</button>
      </div>` : ''}
    <div style="text-align:center;margin-top:30px">
      ${canStart
        ? `<button class="btn primary" id="startExamBtn" style="padding:16px 40px">🚀 ${usedAttempts > 0 ? 'محاولة جديدة' : 'ابدأ الامتحان'}</button>`
        : `<div class="badge locked" style="padding:12px 22px;font-size:14px">لقد استنفدت عدد المحاولات المسموح بها</div>`}
    </div>
  `;

  const btn = document.getElementById('startExamBtn');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'جاري التجهيز...';
    try {
      const attempt = await api.post('/attempts/start', { examId: id });
      state.examAnswers = {};
      location.hash = `#/exam-take/${id}:${attempt.id}`;
    } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
  });
}

// ---------- Exam taking ----------
async function renderExamTake(param) {
  const [examId, attemptId] = param.split(':');
  loading();
  let exam;
  try { exam = await api.get(`/exams/${examId}`); } catch (e) { toast(e.message, 'error'); return; }

  const questions = exam.questions || [];
  state.examAnswers = state.examAnswers || {};

  app.innerHTML = `
    <div class="unit-hero"><h1>📝 ${escapeHtml(exam.title)}</h1><p>أجب على جميع الأسئلة ثم اضغط "تسليم الإجابات"</p></div>
    ${exam.timerMinutes > 0 ? `<div class="exam-meta-row"><div class="meta-chip">⏱️ الوقت المتبقي: <span id="timerLabel">${exam.timerMinutes}:00</span></div></div>` : ''}
    <div id="questionsWrap">${questions.map((q, i) => questionHtml(q, i)).join('')}</div>
    <div style="text-align:center;margin-top:20px">
      <button class="btn primary" id="submitExamBtn" style="padding:16px 40px">✅ تسليم الإجابات</button>
    </div>
  `;

  questions.forEach((q) => {
    const opts = document.querySelectorAll(`.option[data-qid="${q.id}"]`);
    opts.forEach((opt) => opt.addEventListener('click', () => selectOption(q, opt)));
    const fill = document.getElementById(`fill-${q.id}`);
    if (fill) fill.addEventListener('input', (e) => { state.examAnswers[q.id] = e.target.value; });
    const essay = document.getElementById(`essay-${q.id}`);
    if (essay) essay.addEventListener('input', (e) => { state.examAnswers[q.id] = e.target.value; });
  });

  document.getElementById('submitExamBtn').addEventListener('click', () => submitExam(attemptId, examId));

  if (exam.timerMinutes > 0) startExamTimer(exam.timerMinutes, () => submitExam(attemptId, examId, true));
}

function questionHtml(q, i) {
  const options = safeParseOptions(q.options);
  let body = '';
  if (q.type === 'mcq' || q.type === 'truefalse' || q.type === 'multi') {
    body = `<div class="option-list">${options.map((opt, idx) => `
      <div class="option" data-qid="${q.id}" data-val="${escapeHtml(String(idx))}">
        <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q-${q.id}" style="pointer-events:none">
        <span>${escapeHtml(opt)}</span>
      </div>`).join('')}</div>`;
  } else if (q.type === 'fillblank') {
    body = `<div class="field"><input type="text" id="fill-${q.id}" placeholder="اكتب إجابتك هنا"></div>`;
  } else {
    body = `<div class="field"><textarea id="essay-${q.id}" rows="4" placeholder="اكتب إجابتك هنا"></textarea></div>`;
  }
  return `
    <div class="question-card">
      <div class="qnum">سؤال ${i + 1} من ${q._total || ''}</div>
      <h4>${escapeHtml(q.text)}</h4>
      ${q.imageUrl ? `<img src="${q.imageUrl}" style="border-radius:12px;margin-bottom:16px;max-height:260px">` : ''}
      ${body}
    </div>`;
}

function safeParseOptions(raw) {
  try { return JSON.parse(raw) || []; } catch (e) { return []; }
}

function selectOption(q, optEl) {
  const qid = q.id;
  if (q.type === 'multi') {
    optEl.classList.toggle('selected');
    const selected = Array.from(document.querySelectorAll(`.option.selected[data-qid="${qid}"]`)).map((e) => e.dataset.val);
    state.examAnswers[qid] = selected;
  } else {
    document.querySelectorAll(`.option[data-qid="${qid}"]`).forEach((e) => e.classList.remove('selected'));
    optEl.classList.add('selected');
    state.examAnswers[qid] = optEl.dataset.val;
  }
}

function startExamTimer(minutes, onExpire) {
  let seconds = minutes * 60;
  const label = document.getElementById('timerLabel');
  const iv = setInterval(() => {
    seconds -= 1;
    if (label) {
      const m = Math.floor(seconds / 60), s = seconds % 60;
      label.textContent = `${m}:${String(s).padStart(2, '0')}`;
      if (seconds <= 60) label.style.color = 'var(--danger)';
    }
    if (seconds <= 0) { clearInterval(iv); onExpire(); }
  }, 1000);
  window.addEventListener('hashchange', () => clearInterval(iv), { once: true });
}

async function submitExam(attemptId, examId, auto = false) {
  const btn = document.getElementById('submitExamBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري التسليم...'; }
  try {
    await api.post(`/attempts/${attemptId}/submit`, { answers: state.examAnswers });
    state.examAnswers = {};
    location.hash = `#/exam-result/${attemptId}`;
    if (auto) toast('انتهى الوقت — تم تسليم الامتحان تلقائيًا', 'error');
  } catch (e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '✅ تسليم الإجابات'; }
  }
}

// ---------- Exam result ----------
async function renderExamResult(attemptId) {
  loading();
  let attempt, exam;
  try {
    attempt = await api.get(`/attempts/${attemptId}/result`);
    exam = await api.get(`/exams/${attempt.examId}`);
  } catch (e) { toast(e.message, 'error'); return; }

  const dur = attempt.durationSeconds || 0;
  const mm = Math.floor(dur / 60), ss = dur % 60;

  app.innerHTML = `
    <a class="back-link" onclick="location.hash='#/unit/${exam.unitId}'">→ رجوع للوحدة</a>
    <div class="card result-hero">
      <div class="result-score"><div class="num">${Math.round(attempt.percentage)}%</div><div class="lbl">النتيجة</div></div>
      <h2>${attempt.passed ? '🎉 مبروك، لقد نجحت!' : 'حاول مرة أخرى في المرة القادمة'}</h2>
      <p style="color:var(--text-muted)">${escapeHtml(exam.title)}</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="v">${attempt.score}</div><div class="l">الدرجة</div></div>
        <div class="stat-box"><div class="v">${attempt.maxScore}</div><div class="l">الدرجة الكلية</div></div>
        <div class="stat-box"><div class="v">${mm}:${String(ss).padStart(2, '0')}</div><div class="l">الوقت المستغرق</div></div>
        <div class="stat-box"><div class="v">${attempt.passed ? 'ناجح' : 'راسب'}</div><div class="l">الحالة</div></div>
      </div>
      <div class="cta-row" style="margin-top:10px">
        <button class="btn secondary" onclick="location.hash='#/exam-rank/${exam.id}'">🏆 لوحة الترتيب</button>
        <button class="btn primary" onclick="location.hash='#/exam/${exam.id}'">رجوع لصفحة الامتحان</button>
      </div>
    </div>
  `;
}

// ---------- Rankings ----------
async function renderExamRankings(examId) {
  loading();
  let rankings = [];
  try { rankings = await api.get(`/attempts/exam/${examId}/rankings`); } catch (e) { toast(e.message, 'error'); }
  const me = Auth.getUser();

  app.innerHTML = `
    <a class="back-link" onclick="history.back()">→ رجوع</a>
    <div class="section-head"><h2>🏆 لوحة الترتيب</h2></div>
    ${rankings.length ? `
      <table class="rank-table">
        <thead><tr><th>الترتيب</th><th>الاسم</th><th>الدرجة</th><th>الوقت</th></tr></thead>
        <tbody>
          ${rankings.map((r) => `
            <tr class="${r.studentId === me?.id ? 'me' : ''}">
              <td>#${r.rank}</td><td>${escapeHtml(r.studentName)}</td><td>${r.percentage}%</td>
              <td>${Math.floor((r.durationSeconds || 0) / 60)}:${String((r.durationSeconds || 0) % 60).padStart(2, '0')}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : `<div class="empty-state"><div class="em">📭</div>لا توجد نتائج بعد</div>`}
  `;
}

// ---------- Boot ----------
(async function boot() {
  try {
    const s = await api.get('/settings/public');
    state.settings = s;
  } catch (e) { /* fall back to defaults */ }
  initTheme();
  render();
})();
