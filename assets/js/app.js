const app = document.getElementById('app');
const topbar = document.getElementById('topbar');

function initTheme() {
  const saved = localStorage.getItem('mfx_theme');
  const theme = saved || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mfx_theme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  Auth.clear();
  location.hash = '#/login';
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { initTheme(); loadBrand(); router(); });

async function loadBrand() {
  try {
    const settings = await api.get('/settings/public');
    document.getElementById('brandName').textContent = settings.platformName;
    document.title = settings.platformName;
  } catch (e) { /* non-fatal */ }
}

function route(path) { return (location.hash || '#/login').startsWith(path); }
function param(idx) { return (location.hash || '').split('/')[idx]; }

function router() {
  if (!Auth.isLoggedIn() && !route('#/login')) { location.hash = '#/login'; return; }
  topbar.style.display = Auth.isLoggedIn() ? 'flex' : 'none';

  if (route('#/login')) return renderLogin();
  if (route('#/units') && location.hash === '#/units') return renderUnits();
  if (route('#/unit/')) return renderUnitDetail(param(2));
  if (route('#/video/')) return renderVideo(param(2));
  if (route('#/book/')) return renderBook(param(2));
  if (route('#/exam/')) return renderExam(param(2));
  if (route('#/result/')) return renderResult(param(2));
  if (route('#/leaderboard/')) return renderLeaderboard(param(2));
  location.hash = '#/units';
}

function loading() { app.innerHTML = `<div class="spinner"></div>`; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- LOGIN ----------
function renderLogin() {
  app.innerHTML = `
    <div class="center-screen">
      <div class="card" style="width:100%;max-width:380px">
        <h2 style="margin-top:0;text-align:center">تسجيل دخول الطالب</h2>
        <div style="margin-bottom:14px">
          <label>كود الوحدة</label>
          <input id="loginCode" placeholder="مثال: MFX-A1B2C3">
        </div>
        <div style="margin-bottom:18px">
          <label>الاسم بالكامل</label>
          <input id="loginName" placeholder="اكتب اسمك">
        </div>
        <button class="btn" style="width:100%" id="loginBtn">دخول</button>
        <p id="loginError" style="color:var(--danger);margin-top:10px"></p>
      </div>
    </div>`;

  const savedName = localStorage.getItem('mfx_saved_name');
  if (savedName) document.getElementById('loginName').value = savedName;

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const code = document.getElementById('loginCode').value.trim();
    const name = document.getElementById('loginName').value.trim();
    const errEl = document.getElementById('loginError');
    if (!code || !name) { errEl.textContent = 'من فضلك أدخل الكود والاسم'; return; }
    try {
      const data = await api.post('/auth/student/login', { code, name });
      Auth.setSession(data);
      localStorage.setItem('mfx_saved_name', name);
      location.hash = '#/units';
    } catch (e) {
      errEl.textContent = e.message;
    }
  });
}

// ---------- UNITS LIST ----------
async function renderUnits() {
  loading();
  const units = await api.get('/students/me/units');
  if (!units.length) {
    app.innerHTML = `<div class="empty-state">لا توجد وحدات مفعّلة بعد. تأكد من كود الوحدة.</div>`;
    return;
  }
  app.innerHTML = `
    <h2>الوحدات المتاحة</h2>
    <div class="grid cols-3">
      ${units.map(u => `
        <a class="card" href="#/unit/${u.id}">
          <h3 style="margin-top:0">${esc(u.title)}</h3>
          <p style="color:var(--text-muted);font-size:14px">${esc(u.description || '')}</p>
        </a>`).join('')}
    </div>`;
}

// ---------- UNIT DETAIL ----------
async function renderUnitDetail(unitId) {
  loading();
  const [unit, videos, books, exams] = await Promise.all([
    api.get(`/units/${unitId}`).catch(() => null),
    api.get(`/videos/unit/${unitId}`),
    api.get(`/books/unit/${unitId}`),
    api.get(`/exams/unit/${unitId}`)
  ]);

  app.innerHTML = `
    <a href="#/units" class="btn ghost">→ رجوع للوحدات</a>
    <h2>${esc(unit ? unit.title : '')}</h2>

    <h3>🎬 الفيديوهات</h3>
    <div class="grid cols-3">
      ${videos.map(v => `<a class="card" href="#/video/${v.id}"><b>${esc(v.title)}</b></a>`).join('') || '<p class="empty-state">لا يوجد فيديوهات</p>'}
    </div>

    <h3>📘 الكتب</h3>
    <div class="grid cols-3">
      ${books.map(b => `<a class="card" href="#/book/${b.id}"><b>${esc(b.title)}</b></a>`).join('') || '<p class="empty-state">لا يوجد كتب</p>'}
    </div>

    <h3>📝 الاختبارات</h3>
    <div class="grid cols-3">
      ${exams.map(e => `
        <div class="card">
          <b>${esc(e.title)}</b>
          <p style="color:var(--text-muted);font-size:13px">مدة الاختبار: ${esc(e.timerMinutes)} دقيقة</p>
          <div style="display:flex;gap:8px;margin-top:8px">
            <a class="btn" href="#/exam/${e.id}">ابدأ</a>
            <a class="btn secondary" href="#/leaderboard/${e.id}">الترتيب</a>
          </div>
        </div>`).join('') || '<p class="empty-state">لا يوجد اختبارات</p>'}
    </div>`;
}

// ---------- VIDEO PLAYER ----------
async function renderVideo(videoId) {
  loading();
  const video = await api.get(`/videos/${videoId}`);
  app.innerHTML = `
    <a href="#/unit/${video.unitId}" class="btn ghost">→ رجوع</a>
    <h2>${esc(video.title)}</h2>
    <div class="card" style="padding:0;overflow:hidden">
      <iframe id="videoFrame" src="${video.driveUrl.replace('/view', '/preview')}"
        style="width:100%;aspect-ratio:16/9;border:0" allow="autoplay"></iframe>
    </div>
    <div class="progress-bar" style="margin-top:14px"><div id="videoProgressBar" style="width:0%"></div></div>
    <p id="videoProgressText" style="color:var(--text-muted);font-size:13px"></p>`;

  // Google Drive's embedded preview doesn't expose real play/pause/position events
  // via postMessage, so progress is tracked as time-on-page while this view is open.
  let seconds = 0;
  const timer = setInterval(async () => {
    seconds += 5;
    const pct = Math.min(100, Math.round((seconds / (parseFloat(video.durationSeconds) || 600)) * 100));
    document.getElementById('videoProgressBar').style.width = pct + '%';
    document.getElementById('videoProgressText').textContent = `${pct}% مشاهدة`;
    try { await api.post(`/videos/${videoId}/progress`, { watchSeconds: seconds, watchPercentage: pct }); } catch (e) {}
  }, 5000);
  window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
}

// ---------- BOOK VIEWER ----------
async function renderBook(bookId) {
  loading();
  const book = await api.get(`/books/${bookId}`);
  await api.post(`/books/${bookId}/track`, { event: 'opened' }).catch(() => {});
  app.innerHTML = `
    <a href="#/unit/${book.unitId}" class="btn ghost">→ رجوع</a>
    <h2>${esc(book.title)}</h2>
    <div class="card" style="padding:0;overflow:hidden">
      <iframe src="${book.driveUrl.replace('/view', '/preview')}" style="width:100%;height:80vh;border:0"></iframe>
    </div>
    <button class="btn" style="margin-top:14px" id="markFinished">تم الانتهاء من القراءة ✔</button>`;

  api.post(`/books/${bookId}/track`, { event: 'reading' }).catch(() => {});
  document.getElementById('markFinished').addEventListener('click', async () => {
    await api.post(`/books/${bookId}/track`, { event: 'finished' });
    alert('تم تسجيل انتهاء القراءة');
  });
}

// ---------- EXAM TAKING ----------
async function renderExam(examId) {
  loading();
  const exam = await api.get(`/exams/${examId}`);
  const attempt = await api.post('/attempts/start', { examId }).catch((e) => { alert(e.message); return null; });
  if (!attempt) { location.hash = `#/unit/${exam.unitId}`; return; }

  let remaining = (parseFloat(exam.timerMinutes) || 0) * 60;
  const answers = {};

  app.innerHTML = `
    <h2>${esc(exam.title)}</h2>
    ${remaining > 0 ? `<p><b>⏱ الوقت المتبقي: <span id="timer"></span></b></p>` : ''}
    <div id="questions"></div>
    <button class="btn" id="submitExamBtn" style="margin-top:16px">تسليم الاختبار</button>`;

  const qContainer = document.getElementById('questions');
  exam.questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '14px';
    div.innerHTML = `<p><b>${i + 1}. ${esc(q.text)}</b></p>${renderQuestionInput(q)}`;
    qContainer.appendChild(div);
    bindQuestionInput(div, q, answers);
  });

  if (remaining > 0) {
    const timerEl = document.getElementById('timer');
    const tick = () => {
      const m = Math.floor(remaining / 60), s = remaining % 60;
      timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
      if (remaining <= 0) { clearInterval(interval); submitExam(); }
      remaining--;
    };
    tick();
    var interval = setInterval(tick, 1000);
  }

  document.getElementById('submitExamBtn').addEventListener('click', submitExam);

  async function submitExam() {
    document.getElementById('submitExamBtn').disabled = true;
    try {
      await api.post(`/attempts/${attempt.id}/submit`, { answers });
      location.hash = `#/result/${attempt.id}`;
    } catch (e) {
      alert(e.message);
      document.getElementById('submitExamBtn').disabled = false;
    }
  }
}

function renderQuestionInput(q) {
  const options = q.options ? JSON.parse(q.options) : [];
  switch (q.type) {
    case 'mcq':
      return options.map((o, i) => `
        <label style="display:block;font-weight:400;margin:6px 0">
          <input type="radio" name="q_${q.id}" value="${i}"> ${esc(o)}
        </label>`).join('');
    case 'truefalse':
      return `
        <label style="display:block;font-weight:400"><input type="radio" name="q_${q.id}" value="true"> صح</label>
        <label style="display:block;font-weight:400"><input type="radio" name="q_${q.id}" value="false"> خطأ</label>`;
    case 'multi':
      return options.map((o, i) => `
        <label style="display:block;font-weight:400;margin:6px 0">
          <input type="checkbox" name="q_${q.id}" value="${i}"> ${esc(o)}
        </label>`).join('');
    case 'fillblank':
      return `<input type="text" name="q_${q.id}" placeholder="اكتب الإجابة">`;
    case 'essay':
      return `<textarea name="q_${q.id}" rows="4" placeholder="اكتب إجابتك هنا"></textarea>`;
    case 'image':
      return `${q.imageUrl ? `<img src="${esc(q.imageUrl)}" style="max-width:100%;border-radius:8px;margin-bottom:8px">` : ''}
              <textarea name="q_${q.id}" rows="3" placeholder="اكتب إجابتك"></textarea>`;
    default: return '';
  }
}

function bindQuestionInput(container, q, answers) {
  container.addEventListener('input', () => {
    if (q.type === 'mcq' || q.type === 'truefalse') {
      const checked = container.querySelector(`input[name="q_${q.id}"]:checked`);
      answers[q.id] = checked ? checked.value : undefined;
    } else if (q.type === 'multi') {
      answers[q.id] = [...container.querySelectorAll(`input[name="q_${q.id}"]:checked`)].map(c => c.value);
    } else {
      const field = container.querySelector(`[name="q_${q.id}"]`);
      answers[q.id] = field ? field.value : '';
    }
  });
}

// ---------- RESULT ----------
async function renderResult(attemptId) {
  loading();
  const attempt = await api.get(`/attempts/${attemptId}/result`);
  app.innerHTML = `
    <div class="center-screen">
      <div class="card" style="max-width:420px;width:100%;text-align:center">
        <h2>نتيجتك</h2>
        <p style="font-size:40px;font-weight:800;color:var(--primary)">${esc(attempt.percentage)}%</p>
        <p>الدرجة: ${esc(attempt.score)} / ${esc(attempt.maxScore)}</p>
        <p class="badge ${String(attempt.passed) === 'true' ? 'finished' : 'not_started'}">
          ${String(attempt.passed) === 'true' ? 'ناجح' : 'راسب'}
        </p>
        ${String(attempt.needsManualGrading) === 'true' ? '<p style="color:var(--warning)">بعض الأسئلة تحتاج تصحيح يدوي من المدرّس</p>' : ''}
        <a class="btn" href="#/leaderboard/${attempt.examId}">عرض الترتيب</a>
      </div>
    </div>`;
}

// ---------- LEADERBOARD ----------
async function renderLeaderboard(examId) {
  loading();
  const rankings = await api.get(`/attempts/exam/${examId}/rankings`);
  app.innerHTML = `
    <h2>🏆 الترتيب</h2>
    <div class="card">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="text-align:right;color:var(--text-muted);font-size:13px">
          <th style="padding:8px">#</th><th>الاسم</th><th>الدرجة</th><th>الوقت</th>
        </tr></thead>
        <tbody>
          ${rankings.map(r => `
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:8px">${esc(r.rank)}</td>
              <td>${esc(r.studentName)}</td>
              <td>${esc(r.percentage)}%</td>
              <td>${Math.round((parseFloat(r.durationSeconds) || 0) / 60)} د</td>
            </tr>`).join('') || '<tr><td colspan="4" class="empty-state">لا توجد نتائج بعد</td></tr>'}
        </tbody>
      </table>
    </div>`;
}
