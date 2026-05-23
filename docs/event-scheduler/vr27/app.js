import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

// ── Firebase ───────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDB0KEha279Kfpv5zAmYZxqBLE4NdZj74E",
  authDomain:        "vr27-scheduling.firebaseapp.com",
  projectId:         "vr27-scheduling",
  storageBucket:     "vr27-scheduling.firebasestorage.app",
  messagingSenderId: "553251049289",
  appId:             "1:553251049289:web:f13f6dad7ced1dfcd09498"
};
const _fbApp   = initializeApp(firebaseConfig);
const db       = getFirestore(_fbApp);
const DOC_REF  = doc(db, 'scheduler', 'shared');
const auth     = getAuth(_fbApp);
const provider = new GoogleAuthProvider();

// ── State ──────────────────────────────────────────────────────────────────
let events        = [];
let nextId        = 1;
let currentView   = 'list';
let calendarYear  = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-indexed
let calObserver   = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const dateInput     = document.getElementById('date-input');
const nameInput     = document.getElementById('name-input');
const addBtn        = document.getElementById('add-btn');
const eventsList    = document.getElementById('events-list');
const exportJsonBtn = document.getElementById('export-json');
const importBtn     = document.getElementById('import-btn');
const importFile    = document.getElementById('import-file');
const clearBtn      = document.getElementById('clear-btn');
const viewListBtn   = document.getElementById('view-list');
const viewCalBtn    = document.getElementById('view-calendar');
const calendarView  = document.getElementById('calendar-view');

const calGrid       = document.getElementById('cal-grid');
const calPopup      = document.getElementById('cal-popup');
const calGridWrap   = document.getElementById('cal-grid-wrap');
const authScreen    = document.getElementById('auth-screen');
const signinBtn     = document.getElementById('signin-btn');
const signoutBtn    = document.getElementById('signout-btn');
const userBar       = document.getElementById('user-bar');
const userEmailEl   = document.getElementById('user-email');
const authMessage   = document.getElementById('auth-message');

// ── Auth & Init ────────────────────────────────────────────────────────────
let unsubscribeFirestore = null;

signinBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(() => {});
});

signoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    authScreen.style.display = 'none';
    userBar.style.display    = 'flex';
    userEmailEl.textContent  = user.email;
    dateInput.value          = toISODate(new Date());
    unsubscribeFirestore = onSnapshot(DOC_REF,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.events)) {
            events = data.events;
            nextId  = data.nextId > 0 ? data.nextId : 1;
          }
        }
        render();
      },
      error => {
        if (error.code === 'permission-denied') {
          if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
          signOut(auth);
          authMessage.textContent = 'Access denied. This Google account is not authorised.';
        }
      }
    );
  } else {
    if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
    events = [];
    authScreen.style.display = 'flex';
    userBar.style.display    = 'none';
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sortedEvents() {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parse a YYYY-MM-DD string as a LOCAL date (avoids UTC midnight → day-off bug).
 */
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateDisplay(dateStr) {
  const d = parseLocalDate(dateStr);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const day  = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${yyyy}.${mm}.${dd} (${day})`;
}

function formatInterval(dateStr1, dateStr2) {
  const diffDays = Math.round(
    (parseLocalDate(dateStr2) - parseLocalDate(dateStr1)) / 86_400_000
  );

  if (diffDays === 0) return 'Same day';

  const abs    = Math.abs(diffDays);
  const weeks  = Math.floor(abs / 7);
  const days   = abs % 7;
  const suffix = diffDays < 0 ? ' before' : '';

  let label = '';
  if (weeks > 0) label += `${weeks} week${weeks !== 1 ? 's' : ''}`;
  if (weeks > 0 && days > 0) label += ' ';
  if (days > 0 || weeks === 0) label += `${days} day${days !== 1 ? 's' : ''}`;

  return label + suffix;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function persist() {
  setDoc(DOC_REF, { events, nextId });
}

// ── Add event ──────────────────────────────────────────────────────────────
addBtn.addEventListener('click', addEvent);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addEvent(); });

function addEvent() {
  const date = dateInput.value;
  const name = nameInput.value.trim();
  if (!date) { dateInput.focus(); return; }
  if (!name) { nameInput.focus(); return; }

  events.push({ id: nextId++, date, name, highlighted: true });
  nameInput.value = '';
  nameInput.focus();
  persist();
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  renderList();
  if (currentView === 'calendar') renderCalendar();
}

function renderList() {
  const sorted   = sortedEvents();
  const todayStr = toISODate(new Date());
  eventsList.innerHTML = '';

  if (sorted.length === 0) {
    eventsList.innerHTML = '<p class="empty-state">No events yet. Add one above!</p>';
    return;
  }

  // Today before all events → standalone pill first
  if (sorted[0].date > todayStr) {
    eventsList.appendChild(makeTodayPill(sorted[0]));
  }

  sorted.forEach((event, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      const todayBetween = prev.date <= todayStr && event.date > todayStr;
      if (todayBetween) {
        const days = Math.round(
          (parseLocalDate(event.date) - parseLocalDate(todayStr)) / 86_400_000
        );
        const countdown = days === 1 ? '1 day' : `${days} days`;
        eventsList.appendChild(makeIntervalSep(prev.date, event.date, countdown));
      } else {
        eventsList.appendChild(makeIntervalSep(prev.date, event.date));
      }
    }
    eventsList.appendChild(makeCard(event));
  });

  // Today after all events → standalone pill last
  if (sorted[sorted.length - 1].date <= todayStr) {
    eventsList.appendChild(makeTodayPill(null));
  }
}

function makeTodayPill(nextEv) {
  const el = document.createElement('div');
  el.className = 'today-standalone';
  let text = 'Today';
  if (nextEv) {
    const days = Math.round(
      (parseLocalDate(nextEv.date) - parseLocalDate(toISODate(new Date()))) / 86_400_000
    );
    text = `Today · ${days === 1 ? '1 day' : `${days} days`}`;
  }
  el.innerHTML = `<span class="today-badge">${text}</span>`;
  return el;
}

function makeIntervalSep(date1, date2, todayCountdown) {
  const label = formatInterval(date1, date2);
  const el = document.createElement('div');
  el.className = 'interval-sep';
  if (todayCountdown) {
    el.innerHTML = `
      <div class="interval-line"></div>
      <div class="interval-mid">
        <span class="today-badge">Today · ${escapeHtml(todayCountdown)}</span>
        <div class="interval-badge">${escapeHtml(label)}</div>
        <span></span>
      </div>
      <div class="interval-line"></div>
    `;
  } else {
    el.innerHTML = `
      <div class="interval-line"></div>
      <div class="interval-badge">${escapeHtml(label)}</div>
      <div class="interval-line"></div>
    `;
  }
  return el;
}

function makeCard(event) {
  const card = document.createElement('div');
  card.className  = 'event-card';
  if (event.highlighted) card.classList.add('selected');
  card.dataset.id = event.id;

  card.innerHTML = `
    <div class="card-view">
      <div class="card-info">
        <span class="card-date">${formatDateDisplay(event.date)}</span>
        <span class="card-name">${escapeHtml(event.name)}</span>
      </div>
      <div class="card-actions">
        <button class="icon-btn edit-btn" title="Edit event" aria-label="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"/>
          </svg>
        </button>
        <button class="icon-btn delete-btn" title="Delete event" aria-label="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-edit" style="display:none">
      <div class="edit-fields">
        <input type="date" class="edit-date" value="${event.date}">
        <input type="text"  class="edit-name" value="${escapeHtml(event.name)}">
      </div>
      <div class="edit-buttons">
        <button class="btn btn-primary btn-sm save-btn">Save</button>
        <button class="btn btn-ghost   btn-sm cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  const cardView  = card.querySelector('.card-view');
  const cardEdit  = card.querySelector('.card-edit');
  const editDate  = card.querySelector('.edit-date');
  const editName  = card.querySelector('.edit-name');

  // Highlight on click (toggle independently)
  cardView.addEventListener('click', (e) => {
    if (e.target.closest('.icon-btn')) return;
    card.classList.toggle('selected');
    const ev = events.find(ev => ev.id === event.id);
    if (ev) ev.highlighted = card.classList.contains('selected');
    persist();
  });

  // Open edit form
  card.querySelector('.edit-btn').addEventListener('click', () => {
    cardView.style.display = 'none';
    cardEdit.style.display = 'flex';
    editName.focus();
    editName.select();
  });

  // Close edit form
  card.querySelector('.cancel-btn').addEventListener('click', closeEdit);
  function closeEdit() {
    cardView.style.display = '';   // revert to CSS (flex)
    cardEdit.style.display = 'none';
  }

  // Save edit
  card.querySelector('.save-btn').addEventListener('click', saveEdit);
  editName.addEventListener('keydown', e => { if (e.key === 'Enter') saveEdit(); });
  editDate.addEventListener('keydown', e => { if (e.key === 'Enter') editName.focus(); });

  function saveEdit() {
    const newDate = editDate.value;
    const newName = editName.value.trim();
    if (!newDate || !newName) return;
    const ev = events.find(e => e.id === event.id);
    if (ev) { ev.date = newDate; ev.name = newName; }
    persist();
    render();
  }

  // Delete
  card.querySelector('.delete-btn').addEventListener('click', () => {
    if (confirm(`Delete "${event.name}"?`)) {
      events = events.filter(e => e.id !== event.id);
      persist();
      render();
    }
  });

  return card;
}

// ── Export JSON ────────────────────────────────────────────────────────────
exportJsonBtn.addEventListener('click', () => {
  const payload = { events: sortedEvents() };
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    'events.json'
  );
});

// ── Import ─────────────────────────────────────────────────────────────────
importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    if (/\.json$/i.test(file.name)) {
      importJSON(content);
    } else {
      alert('Unsupported file. Please use a .json file.');
    }
  };
  reader.readAsText(file);
  this.value = '';
});

function importJSON(content) {
  let data;
  try { data = JSON.parse(content); } catch (_) {
    alert('Could not parse JSON file.'); return;
  }
  if (!Array.isArray(data.events)) {
    alert('Invalid format: expected { "events": [ … ] }'); return;
  }
  if (!data.events.every(e => e.date && e.name)) {
    alert('Each event must have "date" (YYYY-MM-DD) and "name" fields.'); return;
  }
  if (events.length && !confirm('Replace existing events with imported data?')) return;

  events = data.events.map(e => ({ id: nextId++, date: e.date, name: String(e.name), highlighted: e.highlighted === true }));
  persist();
  render();
}

// ── Clear all ──────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (!events.length) return;
  if (!confirm('Delete all events? This cannot be undone.')) return;
  events = [];
  nextId  = 1;
  persist();
  render();
});

// ── View toggle ──────────────────────────────────────────────────────────────
viewListBtn.addEventListener('click',  () => setView('list'));
viewCalBtn.addEventListener('click',   () => setView('calendar'));

function setView(v) {
  currentView = v;
  viewListBtn.classList.toggle('active', v === 'list');
  viewCalBtn.classList.toggle('active',  v === 'calendar');
  eventsList.style.display   = v === 'list'     ? '' : 'none';
  calendarView.style.display = v === 'calendar' ? '' : 'none';
  if (v === 'calendar') renderCalendar();
}


// Close popup when clicking outside
document.addEventListener('click', e => {
  if (calPopup.style.display !== 'none' &&
      !calPopup.contains(e.target) &&
      !e.target.closest('.cal-chip')) {
    calPopup.style.display = 'none';
  }
});

// ── Calendar render ────────────────────────────────────────────────────────
const CAL_MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
const CAL_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderCalendar() {
  if (calObserver) { calObserver.disconnect(); calObserver = null; }

  // Build a date → events[] map
  const eventMap = {};
  for (const ev of events) {
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  }

  // Build interval ranges between consecutive sorted events
  const sortedEvs = sortedEvents();
  const ranges    = [];
  for (let i = 0; i < sortedEvs.length - 1; i++) {
    const a = sortedEvs[i].date;
    const b = sortedEvs[i + 1].date;
    if (a >= b) continue;
    const dayDiff = Math.round((parseLocalDate(b) - parseLocalDate(a)) / 86_400_000);
    const midDate = toISODate(new Date(parseLocalDate(a).getTime() + Math.floor(dayDiff / 2) * 86_400_000));
    ranges.push({ start: a, end: b, label: formatInterval(a, b), midDate });
  }

  // Determine month range: exactly the months containing events (today's month if no events)
  const now = new Date();
  let minY = now.getFullYear(), minM = now.getMonth();
  let maxY = now.getFullYear(), maxM = now.getMonth();
  if (sortedEvs.length > 0) {
    const [fY, fM] = sortedEvs[0].date.split('-').map(Number);
    const [lY, lM] = sortedEvs[sortedEvs.length - 1].date.split('-').map(Number);
    minY = fY; minM = fM - 1;
    maxY = lY; maxM = lM - 1;
  }

  const todayStr = toISODate(new Date());
  const nextEvent = sortedEvs.find(ev => ev.date > todayStr);

  // Render all month sections
  calGrid.innerHTML = '';
  let y = minY, m = minM;
  while (y < maxY || (y === maxY && m <= maxM)) {
    calGrid.appendChild(makeMonthSection(y, m, eventMap, ranges, nextEvent));
    if (++m > 11) { m = 0; y++; }
  }

  // Track which month is in view and update the title
  calObserver = new IntersectionObserver(entries => {
    const hit = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) {
      calendarYear  = +hit.target.dataset.year;
      calendarMonth = +hit.target.dataset.month;
    }
  }, { root: calGridWrap, threshold: 0.1 });
  calGrid.querySelectorAll('.cal-month-section').forEach(s => calObserver.observe(s));

  // Jump to the current target month immediately (no animation on re-render)
  scrollToMonth(calendarYear, calendarMonth, 'instant');
}

function makeMonthSection(year, month, eventMap, ranges, nextEvent) {
  const section = document.createElement('div');
  section.className    = 'cal-month-section';
  section.dataset.year  = year;
  section.dataset.month = month;

  const header = document.createElement('div');
  header.className   = 'cal-month-header';
  header.textContent = `${CAL_MONTHS[month]} ${year}`;
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'cal-month-grid';

  CAL_DAYS.forEach(d => {
    const el = document.createElement('div');
    el.className   = 'cal-day-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const todayStr    = toISODate(new Date());

  for (let i = 0; i < totalCells; i++) {
    const offset = i - firstDow + 1;
    let dateStr, dayNum, isCurrentMonth;

    if (offset < 1) {
      const pm    = month === 0 ? 11 : month - 1;
      const py    = month === 0 ? year - 1 : year;
      const dPrev = new Date(py, pm + 1, 0).getDate();
      dayNum = dPrev + offset;
      dateStr = `${py}-${String(pm + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isCurrentMonth = false;
    } else if (offset > daysInMonth) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      dayNum = offset - daysInMonth;
      dateStr = `${ny}-${String(nm + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isCurrentMonth = false;
    } else {
      dayNum = offset;
      dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isCurrentMonth = true;
    }

    let trackType = null, intervalLabel = null;
    for (const r of ranges) {
      if      (dateStr === r.start)                  { trackType = 'start'; break; }
      else if (dateStr === r.end)                    { trackType = 'end';   break; }
      else if (dateStr > r.start && dateStr < r.end) {
        trackType = 'inner';
        if (dateStr === r.midDate) intervalLabel = r.label;
        break;
      }
    }

    const cell = document.createElement('div');
    cell.className = ['cal-cell',
      isCurrentMonth ? '' : 'other-month',
      dateStr === todayStr ? 'today' : '',
      trackType ? `range-${trackType}` : '',
    ].filter(Boolean).join(' ');
    cell.dataset.date = dateStr;

    const numEl = document.createElement('div');
    numEl.className   = 'cal-day-num';
    numEl.textContent = dayNum;
    cell.appendChild(numEl);

    if (dateStr === todayStr) {
      const todayChip = document.createElement('div');
      todayChip.className = 'cal-today-chip';
      if (nextEvent) {
        const days = Math.round(
          (parseLocalDate(nextEvent.date) - parseLocalDate(todayStr)) / 86_400_000
        );
        todayChip.textContent = `Today · ${days === 1 ? '1 day' : `${days} days`}`;
      } else {
        todayChip.textContent = 'Today';
      }
      cell.appendChild(todayChip);
    }

    if (trackType) {
      const track = document.createElement('div');
      track.className = 'range-track';
      cell.appendChild(track);
      if (intervalLabel) {
        const lbl = document.createElement('div');
        lbl.className   = 'range-interval-label';
        lbl.textContent = `⇕ ${intervalLabel}`;
        cell.appendChild(lbl);
      }
    }

    const cellEvents = eventMap[dateStr] || [];
    const MAX_CHIPS  = 3;
    cellEvents.slice(0, MAX_CHIPS).forEach(ev => {
      const chip = document.createElement('div');
      chip.className   = 'cal-chip';
      chip.textContent = ev.name;
      chip.title       = ev.name;
      chip.addEventListener('click', e => { e.stopPropagation(); showCalPopup(ev, chip); });
      cell.appendChild(chip);
    });
    if (cellEvents.length > MAX_CHIPS) {
      const more = document.createElement('div');
      more.className   = 'cal-more';
      more.textContent = `+${cellEvents.length - MAX_CHIPS} more`;
      cell.appendChild(more);
    }

    cell.addEventListener('click', () => {
      dateInput.value = dateStr;
      nameInput.focus();
    });

    grid.appendChild(cell);
  }

  section.appendChild(grid);
  return section;
}

function scrollToMonth(year, month, behavior = 'smooth') {
  const section = calGrid.querySelector(
    `.cal-month-section[data-year="${year}"][data-month="${month}"]`
  );
  if (!section) return;
  const top = section.getBoundingClientRect().top
            - calGridWrap.getBoundingClientRect().top
            + calGridWrap.scrollTop;
  calGridWrap.scrollTo({ top, behavior });
}

// ── Calendar popup ─────────────────────────────────────────────────────────
function showCalPopup(event, anchorEl) {
  calPopup.innerHTML = `
    <div class="popup-date">${formatDateDisplay(event.date)}</div>
    <div class="popup-name">${escapeHtml(event.name)}</div>
    <div class="popup-actions">
      <button class="btn btn-primary btn-sm popup-edit-btn">Edit</button>
      <button class="btn btn-danger  btn-sm popup-delete-btn">Delete</button>
    </div>
  `;

  calPopup.querySelector('.popup-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    calPopup.style.display = 'none';
    setView('list');
    setTimeout(() => {
      const card = eventsList.querySelector(`.event-card[data-id="${event.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.querySelector('.edit-btn').click();
      }
    }, 50);
  });

  calPopup.querySelector('.popup-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    calPopup.style.display = 'none';
    if (confirm(`Delete "${event.name}"?`)) {
      events = events.filter(ev => ev.id !== event.id);
      persist();
      render();
    }
  });

  // Position the popup near the chip
  calPopup.style.display = 'block';
  const rect = anchorEl.getBoundingClientRect();
  const popW = 230;
  let left = rect.left + window.scrollX;
  let top  = rect.bottom + window.scrollY + 6;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
  if (left < 8) left = 8;
  calPopup.style.left  = `${left}px`;
  calPopup.style.top   = `${top}px`;
  calPopup.style.width = `${popW}px`;
}

// ── Utility ────────────────────────────────────────────────────────────────
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
