// ── Zustand ───────────────────────────────────────────────────────────────
const SK = 'wep3';

let S = {
  persons:  [],   // [{ id, name }]
  roles:    [],   // [{ id, name }]
  dates:    [],   // [{ id, label }]
  asgn:     {},   // { "dateId|roleId": personId }
  editMode: false
};

let _id = Date.now();
const uid = prefix => prefix + (++_id);

// ── Speichern / Laden ─────────────────────────────────────────────────────
function save() {
  try {
    localStorage.setItem(SK, JSON.stringify({
      persons: S.persons,
      roles:   S.roles,
      dates:   S.dates,
      asgn:    S.asgn
    }));
  } catch (e) {}
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SK) || 'null');
    if (d && d.persons) { Object.assign(S, d); return true; }
  } catch (e) {}
  return false;
}

// ── Beispieldaten ─────────────────────────────────────────────────────────
function loadExample() {
  S.persons = [
    { id: 'p1', name: 'Smynna'   },
    { id: 'p2', name: 'Ebina'    },
    { id: 'p3', name: 'Mirrun'   },
    { id: 'p4', name: 'Sabina'   },
    { id: 'p5', name: 'Donath'   },
    { id: 'p6', name: 'Godwin'   },
    { id: 'p7', name: 'Jonathan' },
    { id: 'p8', name: 'Selva'    },
  ];
  S.roles = [
    { id: 'r1', name: 'Leader'   },
    { id: 'r2', name: 'Keyboard' },
    { id: 'r3', name: 'Drums'    },
  ];
  S.dates = [
    { id: 'd1', label: '14.06.2026' },
    { id: 'd2', label: '28.06.2026' },
    { id: 'd3', label: '05.07.2026' },
    { id: 'd4', label: '12.07.2026' },
    { id: 'd5', label: '19.07.2026' },
    { id: 'd6', label: '02.08.2026' },
  ];
  S.asgn = {
    'd1|r1': 'p1', 'd1|r2': 'p2', 'd1|r3': 'p6',
    'd2|r1': 'p3', 'd2|r2': 'p4', 'd2|r3': 'p5',
    'd3|r1': 'p2', 'd3|r2': 'p4', 'd3|r3': 'p7',
    'd4|r1': 'p1', 'd4|r2': 'p3', 'd4|r3': 'p7',
    'd5|r1': 'p8', 'd5|r2': 'p4', 'd5|r3': 'p7',
    'd6|r1': 'p3', 'd6|r2': 'p2', 'd6|r3': 'p6',
  };
  save();
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
const byId       = (arr, id) => arr.find(x => x.id === id);
const esc        = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const getA       = (di, ri) => S.asgn[`${di}|${ri}`] || null;
const isoToLabel = iso  => { const [y,m,d] = iso.split('-'); return `${d}.${m}.${y}`; };
const labelToIso = lbl  => { const p = lbl.split('.'); return p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : ''; };

function setA(di, ri, pid) {
  if (pid) S.asgn[`${di}|${ri}`] = pid;
  else     delete S.asgn[`${di}|${ri}`];
  save();
}

// ── Rendern ───────────────────────────────────────────────────────────────
function render() {
  renderPersons();
  renderTable();
}

function renderPersons() {
  const el = document.getElementById('plist');
  el.innerHTML = '';
  S.persons.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (S.editMode ? '' : ' grab');
    chip.dataset.personId = p.id;
    chip.innerHTML = `<span>${esc(p.name)}</span>
      <span class="chip-acts">
        <button class="ca" onclick="dlgRenamePerson('${p.id}')" title="Umbenennen">✎</button>
        <button class="ca" onclick="dlgDelPerson('${p.id}')"    title="Löschen">✕</button>
      </span>`;
    if (!S.editMode) {
      chip.draggable = true;
      chip.addEventListener('dragstart', e => {
        dSrc = { type: 'list', pid: p.id };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', p.id);
        setTimeout(() => chip.classList.add('dsrc'), 0);
      });
      chip.addEventListener('dragend', clearDragClasses);
      chip.addEventListener('touchstart', e => tStart(e, 'list', p.id), { passive: false });
    }
    el.appendChild(chip);
  });
}

function renderTable() {
  const tbl = document.getElementById('tbl');
  tbl.innerHTML = '';

  // Tabellenkopf
  const thead = tbl.createTHead();
  const hrow  = thead.insertRow();

  const th0 = document.createElement('th');
  th0.className = 'th0';
  th0.textContent = 'Datum';
  hrow.appendChild(th0);

  S.roles.forEach(r => {
    const th = document.createElement('th');
    th.innerHTML = `<div class="rh">
      <span>${esc(r.name)}</span>
      <span class="rh-acts">
        <button class="ca" onclick="dlgRenameRole('${r.id}')" title="Umbenennen">✎</button>
        <button class="ca" onclick="dlgDelRole('${r.id}')"    title="Löschen">✕</button>
      </span>
    </div>`;
    hrow.appendChild(th);
  });

  if (S.editMode) {
    const thA = document.createElement('th');
    thA.className = 'ar';
    thA.innerHTML = `<button class="btn btn-sm" onclick="dlgRole()">+ Rolle</button>`;
    hrow.appendChild(thA);
  }

  // Tabelleninhalt
  const tbody = tbl.createTBody();

  S.dates.forEach(d => {
    const tr = tbody.insertRow();

    // Datumszelle
    const tdc = tr.insertCell();
    tdc.className = 'dc';
    tdc.innerHTML = `<div class="dc-in">
      <span>${esc(d.label)}</span>
      <span class="dc-acts">
        <button class="ca" onclick="dlgEditDate('${d.id}')" title="Bearbeiten">✎</button>
        <button class="ca" onclick="dlgDelDate('${d.id}')"  title="Löschen">✕</button>
      </span>
    </div>`;

    // Einsatzzellen
    S.roles.forEach(r => {
      const td  = tr.insertCell();
      td.className = 'ac';
      const pid    = getA(d.id, r.id);
      const person = pid ? byId(S.persons, pid) : null;

      const inner = document.createElement('div');
      inner.className   = 'ac-in ' + (person ? 'fil' : 'emp');
      inner.dataset.dateId = d.id;
      inner.dataset.roleId = r.id;

      if (person) {
        inner.innerHTML = `<span class="ac-nm">${esc(person.name)}</span><button class="ac-x" title="Leeren">✕</button>`;
        inner.querySelector('.ac-x').addEventListener('click', e => {
          e.stopPropagation();
          setA(d.id, r.id, null);
          render();
        });
        inner.querySelector('.ac-x').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        inner.draggable = true;
        inner.addEventListener('dragstart', e => {
          dSrc = { type: 'cell', pid, di: d.id, ri: r.id };
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', pid);
          setTimeout(() => inner.classList.add('dsrc'), 0);
        });
        inner.addEventListener('dragend', clearDragClasses);
        inner.addEventListener('touchstart', e => tStart(e, 'cell', pid, d.id, r.id), { passive: false });
      } else {
        inner.innerHTML = `<span>+ zuweisen</span>`;
        inner.tabIndex  = 0;
        inner.addEventListener('click',   () => openSelector(d.id, r.id));
        inner.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openSelector(d.id, r.id); });
      }

      // Drop-Ziel für alle Zellen
      inner.addEventListener('dragover',  e => { e.preventDefault(); inner.classList.add('dov'); });
      inner.addEventListener('dragleave', ()  => inner.classList.remove('dov'));
      inner.addEventListener('drop',      e  => { e.preventDefault(); inner.classList.remove('dov'); doDrop(d.id, r.id); });

      td.appendChild(inner);
    });

    if (S.editMode) tr.insertCell().className = 'ar';
  });

  // Zeile «Datum hinzufügen»
  if (S.editMode) {
    const tr = tbody.insertRow();
    tr.className = 'ar';
    const td = tr.insertCell();
    td.colSpan = S.roles.length + 2;
    td.innerHTML = `<button class="btn btn-sm" onclick="dlgDate()">+ Datum hinzufügen</button>`;
  }
}

// ── Bearbeiten-Modus ──────────────────────────────────────────────────────
function toggleEdit() {
  S.editMode = !S.editMode;
  document.body.classList.toggle('edit-mode', S.editMode);
  document.getElementById('btn-edit').classList.toggle('on', S.editMode);
  render();
}

// ── Drag & Drop (Maus) ────────────────────────────────────────────────────
let dSrc = null;

function clearDragClasses() {
  document.querySelectorAll('.dsrc, .dov').forEach(el => {
    el.classList.remove('dsrc');
    el.classList.remove('dov');
  });
}

function doDrop(di, ri) {
  if (!dSrc) return;
  const cur = getA(di, ri);

  if (dSrc.type === 'list') {
    setA(di, ri, dSrc.pid);
  } else {
    const sk = `${dSrc.di}|${dSrc.ri}`;
    const tk = `${di}|${ri}`;
    if (sk === tk) { dSrc = null; return; }
    if (cur) S.asgn[sk] = cur;
    else     delete S.asgn[sk];
    S.asgn[tk] = dSrc.pid;
    save();
  }

  dSrc = null;
  render();
}

// ── Drag & Drop (Touch) ───────────────────────────────────────────────────
let T = { on: false, src: null, ghost: null, sx: 0, sy: 0, moved: false, over: null };

function tStart(e, type, pid, di, ri) {
  if (e.target.classList.contains('ac-x') || e.target.classList.contains('ca')) return;
  T = { on: true, src: { type, pid, di, ri }, ghost: null, sx: e.touches[0].clientX, sy: e.touches[0].clientY, moved: false, over: null };
}

document.addEventListener('touchmove', e => {
  if (!T.on) return;
  const t  = e.touches[0];
  const dx = t.clientX - T.sx;
  const dy = t.clientY - T.sy;

  if (!T.ghost && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    T.moved = true;
    const p = byId(S.persons, T.src.pid);
    const g = document.createElement('div');
    g.className   = 'tg';
    g.textContent = p.name;
    document.body.appendChild(g);
    T.ghost = g;
    document.querySelectorAll(`[data-person-id="${T.src.pid}"]`).forEach(el => el.classList.add('dsrc'));
  }

  if (T.ghost) {
    T.ghost.style.left = t.clientX + 'px';
    T.ghost.style.top  = t.clientY + 'px';
    T.ghost.style.visibility = 'hidden';
    const el   = document.elementFromPoint(t.clientX, t.clientY);
    T.ghost.style.visibility = '';
    const cell = el?.closest('.ac-in');
    if (T.over) T.over.classList.remove('dov');
    if (cell)   { cell.classList.add('dov'); T.over = cell; }
    else        T.over = null;
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', () => {
  if (!T.on) return;
  T.ghost?.remove();
  clearDragClasses();

  if (T.moved && T.over) {
    dSrc = T.src;
    doDrop(T.over.dataset.dateId, T.over.dataset.roleId);
  }

  T = { on: false, src: null, ghost: null, sx: 0, sy: 0, moved: false, over: null };
});

// ── Personenauswahl ───────────────────────────────────────────────────────
function openSelector(di, ri) {
  const items = S.persons.map(p =>
    `<div class="ps-it" onclick="assignFromModal('${di}','${ri}','${p.id}')">${esc(p.name)}</div>`
  ).join('');
  openMo(
    'Person zuweisen',
    `<div class="ps">${items || '<p style="color:var(--muted);font-size:13px">Keine Personen vorhanden.</p>'}</div>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>`
  );
}

function assignFromModal(di, ri, pid) {
  setA(di, ri, pid);
  closeMo();
  render();
}

// ── Modal-System ──────────────────────────────────────────────────────────
function openMo(title, body, footer) {
  document.getElementById('mo-ttl').innerHTML = title;
  document.getElementById('mo-bd').innerHTML  = body;
  document.getElementById('mo-ft').innerHTML  = footer || '';
  document.getElementById('mo').classList.add('on');
  setTimeout(() => document.getElementById('mo-bd').querySelector('input, button')?.focus(), 60);
}

function closeMo() {
  document.getElementById('mo').classList.remove('on');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMo(); });

function inputField(label, placeholder, value, onEnter) {
  return `<div class="fg">
    <label>${label}</label>
    <input class="fi" id="mi" placeholder="${placeholder}" value="${value || ''}"
      onkeydown="if(event.key==='Enter')(${onEnter})()">
  </div>`;
}

// ── Personen verwalten ────────────────────────────────────────────────────
function dlgPerson() {
  openMo(
    'Person hinzufügen',
    inputField('Name', 'Name eingeben', '', 'doAddPerson'),
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doAddPerson()">Hinzufügen</button>`
  );
}
function doAddPerson() {
  const n = document.getElementById('mi')?.value.trim();
  if (!n) return;
  S.persons.push({ id: uid('p'), name: n });
  save(); closeMo(); render();
}

function dlgRenamePerson(id) {
  const p = byId(S.persons, id);
  openMo(
    'Person umbenennen',
    inputField('Neuer Name', '', esc(p.name), `doRenamePerson('${id}')`),
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doRenamePerson('${id}')">Speichern</button>`
  );
}
function doRenamePerson(id) {
  const n = document.getElementById('mi')?.value.trim();
  if (!n) return;
  const p = byId(S.persons, id);
  if (p) p.name = n;
  save(); closeMo(); render();
}

function dlgDelPerson(id) {
  const p = byId(S.persons, id);
  openMo(
    'Person löschen',
    `<p style="font-size:14px">Soll <strong>${esc(p.name)}</strong> wirklich gelöscht werden? Alle Einträge dieser Person werden entfernt.</p>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-danger" onclick="doDelPerson('${id}')">Löschen</button>`
  );
}
function doDelPerson(id) {
  S.persons = S.persons.filter(p => p.id !== id);
  Object.keys(S.asgn).forEach(k => { if (S.asgn[k] === id) delete S.asgn[k]; });
  save(); closeMo(); render();
}

// ── Rollen verwalten ──────────────────────────────────────────────────────
function dlgRole() {
  openMo(
    'Rolle hinzufügen',
    inputField('Bezeichnung', 'z.B. Gitarre', '', 'doAddRole'),
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doAddRole()">Hinzufügen</button>`
  );
}
function doAddRole() {
  const n = document.getElementById('mi')?.value.trim();
  if (!n) return;
  S.roles.push({ id: uid('r'), name: n });
  save(); closeMo(); render();
}

function dlgRenameRole(id) {
  const r = byId(S.roles, id);
  openMo(
    'Rolle umbenennen',
    inputField('Neuer Name', '', esc(r.name), `doRenameRole('${id}')`),
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doRenameRole('${id}')">Speichern</button>`
  );
}
function doRenameRole(id) {
  const n = document.getElementById('mi')?.value.trim();
  if (!n) return;
  const r = byId(S.roles, id);
  if (r) r.name = n;
  save(); closeMo(); render();
}

function dlgDelRole(id) {
  const r = byId(S.roles, id);
  openMo(
    'Rolle löschen',
    `<p style="font-size:14px">Soll die Rolle <strong>${esc(r.name)}</strong> wirklich gelöscht werden?</p>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-danger" onclick="doDelRole('${id}')">Löschen</button>`
  );
}
function doDelRole(id) {
  S.roles = S.roles.filter(r => r.id !== id);
  Object.keys(S.asgn).forEach(k => { if (k.split('|')[1] === id) delete S.asgn[k]; });
  save(); closeMo(); render();
}

// ── Daten verwalten ───────────────────────────────────────────────────────
function dlgDate() {
  openMo(
    'Datum hinzufügen',
    `<div class="fg"><label>Datum</label>
     <input class="fi" id="mi" type="date" onkeydown="if(event.key==='Enter')doAddDate()">
     </div>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doAddDate()">Hinzufügen</button>`
  );
}
function doAddDate() {
  const v = document.getElementById('mi')?.value;
  if (!v) return;
  S.dates.push({ id: uid('d'), label: isoToLabel(v) });
  save(); closeMo(); render();
}

function dlgEditDate(id) {
  const d = byId(S.dates, id);
  openMo(
    'Datum bearbeiten',
    `<div class="fg"><label>Datum</label>
     <input class="fi" id="mi" type="date" value="${labelToIso(d.label)}"
      onkeydown="if(event.key==='Enter')doEditDate('${id}')">
     </div>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-accent" onclick="doEditDate('${id}')">Speichern</button>`
  );
}
function doEditDate(id) {
  const v = document.getElementById('mi')?.value;
  if (!v) return;
  const d = byId(S.dates, id);
  if (d) d.label = isoToLabel(v);
  save(); closeMo(); render();
}

function dlgDelDate(id) {
  const d = byId(S.dates, id);
  openMo(
    'Datum löschen',
    `<p style="font-size:14px">Soll <strong>${esc(d.label)}</strong> wirklich gelöscht werden?</p>`,
    `<button class="btn" onclick="closeMo()">Abbrechen</button>
     <button class="btn btn-danger" onclick="doDelDate('${id}')">Löschen</button>`
  );
}
function doDelDate(id) {
  S.dates = S.dates.filter(d => d.id !== id);
  Object.keys(S.asgn).forEach(k => { if (k.split('|')[0] === id) delete S.asgn[k]; });
  save(); closeMo(); render();
}

// ── PDF erstellen ─────────────────────────────────────────────────────────
function genPDF() {
  if (!window.jspdf) {
    alert('PDF-Bibliothek wird noch geladen. Bitte kurz warten und nochmals versuchen.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();
  const PH  = doc.internal.pageSize.getHeight();

  const cAcc = [107, 123, 110];
  const cBg2 = [242, 239, 233];
  const cTxt = [44,  42,  39 ];
  const cBrd = [224, 221, 216];

  // Logo
  const logoImg = document.querySelector('.hdr-logo');
  let logoLoaded = false;
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    try {
      const canvas  = document.createElement('canvas');
      canvas.width  = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      canvas.getContext('2d').drawImage(logoImg, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      doc.addImage(dataUrl, 'PNG', 14, 10, 18, 18);
      logoLoaded = true;
    } catch (e) {}
  }

  // Titel
  const tx = logoLoaded ? 36 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...cTxt);
  doc.text('Worship Einsatzplan', tx, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...cAcc);
  doc.text('El Bethel Church', tx, 24);

  // Tabelle
  const head = [['Datum', ...S.roles.map(r => r.name)]];
  const body = S.dates.map(d =>
    [d.label, ...S.roles.map(r => {
      const pid = getA(d.id, r.id);
      return pid ? (byId(S.persons, pid)?.name || '') : '';
    })]
  );

  doc.autoTable({
    startY: 30,
    head,
    body,
    theme: 'plain',
    headStyles: {
      fillColor:   cBg2,
      textColor:   cAcc,
      fontStyle:   'bold',
      fontSize:    9,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
      lineColor:   cBrd,
      lineWidth:   0.3,
    },
    bodyStyles: {
      textColor:   cTxt,
      fontSize:    10,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      lineColor:   cBrd,
      lineWidth:   0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: cAcc, cellWidth: 32 },
    },
    alternateRowStyles: { fillColor: [251, 250, 248] },
    margin: { left: 14, right: 14 },
  });

  // Fusszeile
  const pages = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...cAcc);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text('El Bethel Church – Worship Einsatzplan', 14, PH - 7);
    doc.text(`Seite ${i} von ${pages}`, PW - 14, PH - 7, { align: 'right' });
  }

  doc.save('worship-einsatzplan.pdf');
}

// ── Start ─────────────────────────────────────────────────────────────────
if (!load()) loadExample();
render();
