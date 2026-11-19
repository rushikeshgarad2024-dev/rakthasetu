/* ============================================================
   रक्तसेतू कोपरगाव — ॲपचा गाभा
   कोणतीही लायब्ररी नाही. डेटा फोनमध्येच राहतो (localStorage).
   ============================================================ */

(function () {
  'use strict';

  var D = window.BLOOD_DATA || {};
  var view = document.getElementById('view');
  var tabsEl = document.getElementById('tabs');
  var toastEl = document.getElementById('toast');

  var TABS = [
    { id: 'need',   label: 'रक्त हवे',  ic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>' },
    { id: 'donate', label: 'रक्तदान',   ic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c-3.2 4.2-6.5 8.3-6.5 12.3a6.5 6.5 0 0 0 13 0c0-4-3.3-8.1-6.5-12.3z"/></svg>' },
    { id: 'info',   label: 'माहिती',    ic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' },
    { id: 'hosp',   label: 'रुग्णालये', ic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h6M12 6v6"/></svg>' },
    { id: 'more',   label: 'अधिक',      ic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' }
  ];

  var GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  /* ग्रुप → कुणाला रक्त देऊ शकतो */
  var DONATE_TO = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };

  var RECEIVE_FROM = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': GROUPS.slice()
  };

  var MS_PER_DAY = 86400000;
  var INTERVAL = { m: 90 * MS_PER_DAY, f: 120 * MS_PER_DAY }; /* NBTC/NACO प्रमाणे */

  /* ---------- छोटी हत्यारं ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* नोंद केलेली माहिती render करताना अयोग्य अक्षर काढून टाका */
  function stripCtrl(s) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, '');
  }

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  function currentTab() {
    var h = (location.hash || '').replace('#', '');
    for (var i = 0; i < TABS.length; i++) if (TABS[i].id === h) return h;
    return 'need';
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (e) { return fallback; }
  }

  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* फोन भरला */ }
  }

  /* ============ १. रक्त हवे ============ */

  function needView() {
    return '' +
      '<div class="live-beacon"><span class="radar-dot" aria-hidden="true"></span><span>108 / 104 — २४×७ मदत नेहमी उपलब्ध</span></div>' +
      '<div class="sos-strip">' +
        '<a class="sos108" href="tel:108"><b>🚑 108</b><span>रुग्णवाहिका — अपघात व वेळेवर वाहतूक</span></a>' +
        '<a class="sos104" href="tel:104"><b>☎ 104</b><span>आरोग्य सल्ला — रक्तपेढी कुठे?</span></a>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><h2>रक्ताची निकड — पाठवा</h2></div>' +
        '<div class="card-body">' +
          '<form id="reqForm" novalidate>' +
            '<div class="field">' +
              '<label id="grpLabel">कोणत्या गटाचे रक्त? <span class="req">*</span></label>' +
              '<div class="chips" id="fGroupChips" role="group" aria-labelledby="grpLabel">' +
                GROUPS.map(function (g) {
                  return '<button type="button" class="chip g-chip" data-g="' + g + '" aria-pressed="false">' + g + '</button>';
                }).join('') +
              '</div>' +
              '<input type="hidden" id="fGroup">' +
            '</div>' +
            '<div class="grid-2">' +
              '<div class="field"><label for="fUnits">किती युनिट?</label>' +
                '<select id="fUnits"><option>1 युनिट</option><option>2 युनिट</option><option>3 युनिट</option><option>4+ युनिट</option></select>' +
              '</div>' +
              '<div class="field"><label for="fUrgent">कधीपर्यंत हवे?</label>' +
                '<select id="fUrgent"><option>आत्ताच ❗</option><option>आज</option><option>उद्या</option><option>या आठवड्यात</option></select>' +
              '</div>' +
            '</div>' +
            '<div class="field"><label for="fPlace">रुग्णालय व पत्ता</label>' +
              '<input id="fPlace" type="text" autocomplete="off" placeholder="उदा. ग्रामीण रुग्णालय, कोपरगाव">' +
            '</div>' +
            '<div class="grid-2">' +
              '<div class="field"><label for="fName">आपले नाव</label>' +
                '<input id="fName" type="text" autocomplete="off" placeholder="उदा. राम ठाकरे">' +
              '</div>' +
              '<div class="field"><label for="fPhone">संपर्क नंबर <span class="req">*</span></label>' +
                '<input id="fPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="98xxxxxxxx" required>' +
              '</div>' +
            '</div>' +
            '<div class="live-pill" id="livePill" aria-live="polite"></div>' +
            '<button type="submit" class="btn btn-whatsapp">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.8-1.2A9 9 0 1 0 12 3z"/><path d="M9.4 9.6c.6 2.1 2 3.7 4.2 4.3l1.1-1.4.9.8c-.3 1.2-1 1.8-2 1.8-2.9 0-6.7-3.9-6.7-6.8 0-1 .7-1.8 1.8-2l.9 1z"/></svg>' +
              'WhatsApp वर पाठवा' +
            '</button>' +
            '<button type="button" id="copyBtn" class="btn ghost small" style="margin-top:8px">📋 संदेश कॉपी करा</button>' +
            '<p class="mstamp">एक मिनिटात पाठवा — जेव्हा गरज जास्त असेल</p>' +
          '</form>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><h2>माझ्या विनंत्या</h2><span class="hint" id="reqCount"></span></div>' +
        '<div class="card-body" id="reqList"><div class="empty">अद्याप कोणतीही विनंती पाठवलेली नाही.</div></div>' +
      '</div>' +

      '<div class="notice"><span aria-hidden="true">⚠️</span><span>रक्ताची खरेदी-विक्री बेकायदेशीर आहे — रक्तदात्याला पैसे देणे किंवा मागणे दोन्ही गुन्हा आहे. फक्त शासनमान्य रक्तपेढीचे <b>चाचणी/प्रक्रिया शुल्क कायदेशीर</b> असते. माहितीसाठी <b>१०४</b>.</span></div>';
  }

  function buildMessage() {
    var group = document.getElementById('fGroup').value;
    var units = document.getElementById('fUnits').value;
    var urgent = document.getElementById('fUrgent').value;
    var place = document.getElementById('fPlace').value.trim();
    var name = document.getElementById('fName').value.trim();
    var phone = stripCtrl(document.getElementById('fPhone').value).replace(/\D/g, '').replace(/^91/, '');

    var stamp = '';
    try {
      stamp = new Date().toLocaleString('mr-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      stamp = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    }

    var msg =
      '🩸 *रक्ताची निकड — कोपरगाव*\n\n' +
      'रक्तगट: ' + group + '\n' +
      'किती: ' + units + '\n' +
      'कधीपर्यंत: ' + urgent + '\n' +
      (place ? 'रुग्णालय व पत्ता: ' + stripCtrl(place) + '\n' : '') +
      (name ? 'नाव: ' + stripCtrl(name) + '\n' : '') +
      'संपर्क: ' + phone + '\n' +
      'मागणी वेळ: ' + stamp + '\n\n' +
      'रक्तदान नेहमी मोफत असते. ज्यांना शक्य असेल त्यांनी नंबरवर संपर्क करा.\n' +
      '— #रक्तसेतू कोपरगाव\n' +
      location.href.split('#')[0];
    return msg;
  }

  function wireNeed() {
    var form = document.getElementById('reqForm');
    if (!form) return;

    var chipsWrap = document.getElementById('fGroupChips');
    var groupInput = document.getElementById('fGroup');

    function updatePill() {
      var pill = document.getElementById('livePill');
      if (!pill) return;
      var g = groupInput.value;
      if (!g) { pill.textContent = ''; pill.classList.remove('show'); return; }
      var units = document.getElementById('fUnits').value.replace(' युनिट', '');
      var urgentRaw = document.getElementById('fUrgent').value.replace(' ❗', '');
      var place = document.getElementById('fPlace').value.trim();
      var parts = ['गट ' + g, units + ' युनिट', urgentRaw];
      if (place) parts.push(place);
      pill.textContent = parts.join(' · ');
      pill.classList.add('show');
    }

    chipsWrap.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      groupInput.value = b.getAttribute('data-g');
      chipsWrap.querySelectorAll('.chip').forEach(function (c) {
        c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      });
      updatePill();
    });

    ['fUnits', 'fUrgent'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', updatePill);
    });
    var placeInput = document.getElementById('fPlace');
    if (placeInput) placeInput.addEventListener('input', updatePill);

    /* संदेश कॉपी — ज्यांना WhatsApp उपलब्ध नाही */
    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      if (!groupInput.value) { toast('आधी रक्तगट निवडा'); return; }
      var txt = buildMessage();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('संदेश कॉपी झाला'); }).catch(function () { fallbackCopy(txt); });
      } else {
        fallbackCopy(txt);
      }
    });

    renderRequests();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var group = groupInput.value;
      var phone = stripCtrl(document.getElementById('fPhone').value).replace(/\D/g, '').replace(/^91/, '');

      if (!group) { toast('रक्तगट निवडा'); return; }
      if (!/^[6-9]\d{9}$/.test(phone)) { toast('कृपया वैध १० अंकी मोबाईल नंबर टाका'); return; }

      var msg = buildMessage();
      var url = 'https://wa.me/?text=' + encodeURIComponent(msg);

      var rec = {
        id: Date.now(),
        group: group,
        units: document.getElementById('fUnits').value,
        urgent: document.getElementById('fUrgent').value,
        place: stripCtrl(document.getElementById('fPlace').value.trim()),
        name: stripCtrl(document.getElementById('fName').value.trim()),
        phone: phone,
        at: Date.now(),
        done: false
      };
      var list = readJSON('rb_requests', []);
      list.unshift(rec);
      writeJSON('rb_requests', list);
      renderRequests();

      window.open(url, '_blank', 'noopener');
      toast('मागणी तयार झाली — WhatsApp वर पाठवा');
    });
  }

  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('संदेश कॉपी झाला'); }
    catch (e) { toast('कॉपी झाली नाही — WhatsApp वापरा'); }
    document.body.removeChild(ta);
  }

  function renderRequests() {
    var listEl = document.getElementById('reqList');
    var countEl = document.getElementById('reqCount');
    if (!listEl) return;
    var list = readJSON('rb_requests', []).filter(function (r) { return !r.done; });
    if (countEl) countEl.textContent = list.length ? list.length + ' चालू' : '';

    if (!list.length) {
      listEl.innerHTML = '<div class="empty">अद्याप कोणतीही विनंती पाठवलेली नाही.</div>';
      return;
    }

    listEl.innerHTML = list.map(function (r) {
      var g = stripCtrl(r.group), units = stripCtrl(r.units), urgent = stripCtrl(r.urgent), place = stripCtrl(r.place);
      return '<div class="diary-item">' +
        '<div class="dd"><b>' + esc(g) + '</b><span>' + esc(fmtDate(r.at).split(' ')[0] || '') + '</span></div>' +
        '<div class="info"><b>' + esc(g) + ' · ' + esc(units) + '</b><span>' + esc(urgent) + (place ? ' · ' + esc(place) : '') + '</span></div>' +
        '<button type="button" class="mini" data-closed="' + r.id + '" title="रक्त मिळाले — सर्वांना कळवा" aria-label="रक्त मिळाले — सर्वांना कळवा">📢</button>' +
        '<button type="button" class="mini" data-done="' + r.id + '" title="मिळाले अशी नोंद करा" aria-label="मिळाले अशी नोंद करा">✅</button>' +
        '<button type="button" class="mini" data-del="' + r.id + '" title="हटवा" aria-label="हटवा">🗑</button>' +
      '</div>';
    }).join('');

    listEl.onclick = function (e) {
      var t = e.target.closest('[data-closed], [data-done], [data-del]');
      if (!t) return;
      var id = +(t.getAttribute('data-closed') || t.getAttribute('data-done') || t.getAttribute('data-del'));
      var all = readJSON('rb_requests', []);

      if (t.hasAttribute('data-closed')) {
        var rec = all.find(function (r) { return r.id === id; });
        var grpText = rec ? ' (रक्तगट: *' + stripCtrl(rec.group) + '*)' : '';
        var msg = '✅ *रक्त मिळाले आहे!*' + grpText + '\n\nसंपर्क करणाऱ्या आणि मदत करणाऱ्या सर्वांचे मनःपूर्वक आभार. रुग्णाला आवश्यक रक्त मिळाले आहे, आता आणखी रक्तदात्यांची आवश्यकता नाही.\n— #रक्तसेतू कोपरगाव\n' + location.href.split('#')[0];
        window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
        return;
      }
      if (t.hasAttribute('data-done')) {
        all = all.map(function (r) { return r.id === id ? Object.assign({}, r, { done: true }) : r; });
        toast('नोंद पूर्ण झाली. रुग्णाला लवकर आराम मिळो.');
      } else {
        all = all.filter(function (r) { return r.id !== id; });
      }
      writeJSON('rb_requests', all);
      renderRequests();
    };
  }

  /* ============ २. रक्तदान ============ */

  var CHECKS = [
    'वय १८ ते ६५ वर्षे आहे',
    'वजन किमान ४५ किलो आहे',
    'गेले ९० (पुरुष) / १२० (महिला) दिवस रक्तदान केले नाही',
    'ताप, सर्दी, किडनी/हृदयरोग नाही',
    'दारू/व्यसन नाही',
    'गरोदरपणा किंवा स्तनपान नाही'
  ];

  function donateView() {
    var join = (D.JOIN_LINK || '').trim();
    var joinCard = join
      ? '<div class="card"><div class="card-body btn-row">' +
          '<a class="btn" href="' + esc(join) + '" target="_blank" rel="noopener">❤️ WhatsApp कम्युनिटी जॉइन करा</a>' +
          '<p class="mstamp">रक्तगटानुसार संपर्क आणि अद्यतनांसाठी</p>' +
        '</div></div>'
      : '';

    var savedGender = readJSON('rb_gender', 'm');

    return joinCard +
      '<p class="lede">तुमचे रक्त दुसऱ्याचे आयुष्य वाचवू शकते.</p>' +

      '<div class="card">' +
        '<div class="card-head"><h2>पात्रता तपासणी</h2><span class="hint">खालील निकष तपासा</span></div>' +
        '<div class="card-body">' +
          CHECKS.map(function (c, i) {
            return '<label class="call" style="border-top:' + (i === 0 ? '0' : '1px solid var(--line)') + ';cursor:pointer">' +
              '<input class="elig" type="checkbox" style="width:22px;height:22px;accent-color:var(--red);flex:none">' +
              '<span class="lbl"><b style="font-weight:600;font-size:13.5px">' + esc(c) + '</b></span></label>';
          }).join('') +
          '<div id="eligResult" class="notice green" style="margin:12px 0 0;display:none"><span aria-hidden="true">✅</span><span>तुम्ही बहुधा पात्र आहात — नजीकच्या रक्तपेढीला भेट द्या. अंतिम निर्णय ब्लड बँकेचा.</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><h2>माझी रक्तदान डायरी</h2><span class="hint">फोनमध्येच</span></div>' +
        '<div class="card-body">' +
          '<form id="logForm">' +
            '<div class="grid-2">' +
              '<div class="field"><label for="dDate">शेवटचे रक्तदान</label><input id="dDate" type="date" required></div>' +
              '<div class="field"><label for="dPlace">कुठे?</label><input id="dPlace" type="text" placeholder="शिबिर / रक्तपेढी" autocomplete="off"></div>' +
            '</div>' +
            '<div class="field"><label for="dGender">रक्तदान अंतराचा निकष <span style="font-weight:500;color:var(--faint)">— पुरुष: ९० दिवस, महिला: १२० दिवस</span></label>' +
              '<select id="dGender"><option value="m"' + (savedGender === 'm' ? ' selected' : '') + '>पुरुष</option><option value="f"' + (savedGender === 'f' ? ' selected' : '') + '>महिला</option></select>' +
            '</div>' +
            '<button type="submit" class="btn soft small">＋ नोंद करा</button>' +
          '</form>' +
          '<div id="nextBox"></div>' +
          '<div id="diaryList"></div>' +
        '</div>' +
      '</div>';
  }

  function wireDonate() {
    var elig = Array.prototype.slice.call(document.querySelectorAll('.elig'));
    var result = document.getElementById('eligResult');
    function checkElig() {
      var all = elig.length > 0 && elig.every(function (c) { return c.checked; });
      result.style.display = all ? 'flex' : 'none';
    }
    elig.forEach(function (c) { c.addEventListener('change', checkElig); });

    var form = document.getElementById('logForm');
    var input = document.getElementById('dDate');
    var genderSel = document.getElementById('dGender');
    if (input) { input.max = new Date().toISOString().slice(0, 10); input.value = new Date().toISOString().slice(0, 10); }

    if (genderSel) {
      genderSel.addEventListener('change', function () { writeJSON('rb_gender', genderSel.value); refresh(); });
    }

    function refresh() {
      var diary = readJSON('rb_diary', []);
      var listEl = document.getElementById('diaryList');
      var nextEl = document.getElementById('nextBox');
      if (!listEl || !nextEl) return;

      var gender = readJSON('rb_gender', 'm');
      var gap = gender === 'f' ? INTERVAL.f : INTERVAL.m;

      /* पुढची तारीख */
      var last = diary.length ? Math.max.apply(null, diary.map(function (r) { return r.ts; })) : null;
      if (last) {
        var next = last + gap;
        var daysLeft = Math.ceil((next - Date.now()) / MS_PER_DAY);
        var pct = Math.max(0, Math.min(100, Math.round(((Date.now() - last) / gap) * 100)));
        var eligible = daysLeft <= 0;
        nextEl.innerHTML =
          '<div class="notice ' + (eligible ? 'green' : '') + '" style="margin:12px 0 0"><span aria-hidden="true">' +
            (eligible ? '✅' : '⏳') + '</span><span>' +
            (eligible
              ? 'तुम्ही <b>पुन्हा रक्तदान करू शकता!</b> जवळच्या रक्तपेढीला भेट द्या.'
              : 'पुढचे रक्तदान: <b>' + fmtDate(next) + '</b> — आणखी ' + daysLeft + ' दिवस (' + (gender === 'f' ? 'महिला · १२० दिवस' : 'पुरुष · ९० दिवस') + ')') +
          '</span></div>' +
          '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
          (eligible ? '' : '<button id="icsBtn" class="btn ghost small" type="button" style="margin-top:8px">📅 पुढच्या रक्तदानाची आठवण (कॅलेंडर)</button>');
        var ics = document.getElementById('icsBtn');
        if (ics) ics.addEventListener('click', function () { downloadICS(next); });
      } else {
        nextEl.innerHTML = '<p class="mstamp" style="margin-top:12px">पहिली नोंद केल्यावर पुढची तारीख दिसते.</p>';
      }

      /* यादी */
      if (!diary.length) {
        listEl.innerHTML = '<div class="empty" style="padding-bottom:10px">अद्याप नोंद नाही.</div>';
        return;
      }
      var sorted = diary.slice().sort(function (a, b) { return b.ts - a.ts; });
      listEl.innerHTML = sorted.map(function (r) {
        var d = new Date(r.ts);
        return '<div class="diary-item">' +
          '<div class="dd"><b>' + ('0' + d.getDate()).slice(-2) + '</b><span>' + d.toLocaleDateString('en-IN', { month: 'short' }) + '</span></div>' +
          '<div class="info"><b>' + esc(stripCtrl(r.place || 'रक्तदान')) + '</b><span>' + esc(fmtDate(d)) + '</span></div>' +
          '<button type="button" class="mini" data-dellog="' + r.ts + '" aria-label="हटवा">🗑</button>' +
        '</div>';
      }).join('');

      listEl.onclick = function (e) {
        var t = e.target.closest('[data-dellog]');
        if (!t) return;
        var ts = +t.getAttribute('data-dellog');
        var rows = readJSON('rb_diary', []).filter(function (r) { return r.ts !== ts; });
        writeJSON('rb_diary', rows);
        refresh();
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = document.getElementById('dDate').value;
      var place = document.getElementById('dPlace').value.trim();
      if (!d) { toast('तारीख निवडा'); return; }
      var ts = new Date(d + 'T12:00:00').getTime();
      if (!ts || ts > Date.now()) { toast('तारीख बरोबर नाही'); return; }
      var diary = readJSON('rb_diary', []);
      diary.push({ ts: ts, place: stripCtrl(place) });
      writeJSON('rb_diary', diary);
      document.getElementById('dPlace').value = '';
      toast('नोंद झाली 🩸');
      refresh();
    });

    refresh();
  }

  function downloadICS(next) {
    var d = new Date(next);
    var dEnd = new Date(next + MS_PER_DAY);
    function p(n) { return ('0' + n).slice(-2); }
    function icsDate(x) { return x.getFullYear() + p(x.getMonth() + 1) + p(x.getDate()); }
    var dt = icsDate(d);
    var dtEnd = icsDate(dEnd);
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rakthasetu//mr-IN//',
      'BEGIN:VEVENT',
      'UID:rakthasetu-' + Date.now() + '@kopergaon',
      'DTSTART;VALUE=DATE:' + dt,
      'DTEND;VALUE=DATE:' + dtEnd,
      'SUMMARY:🩸 रक्तदान पात्र — रक्तसेतू कोपरगाव',
      'DESCRIPTION:गेले ९० (पुरुष) / १२० (महिला) दिवस पूर्ण झाले. जवळच्या रक्तपेढीला भेट द्या.',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:उद्या रक्तदान करता येईल',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rakthasetu-reminder.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 4000);
  }

  /* ============ ३. माहिती ============ */

  function infoView() {
    var faqHtml = (D.faq || []).map(function (f) {
      return '<details class="faq-item"><summary class="faq-q">' + esc(f.q) +
        '<span class="chev" aria-hidden="true">＋</span></summary>' +
        '<p class="faq-a">' + esc(f.a) + '</p></details>';
    }).join('');

    return '<p class="lede">कोणाला रक्त देऊ शकता आणि कोणाकडून घेऊ शकता — लगेच तपासा.</p>' +
      '<div class="card">' +
        '<div class="card-head"><h2>तुमचा गट</h2></div>' +
        '<div class="card-body">' +
          '<div class="chips" id="grpChips">' +
            GROUPS.map(function (g) {
              return '<button class="chip" type="button" data-g="' + g + '" aria-pressed="false">' + g + '</button>';
            }).join('') +
          '</div>' +
          '<div class="chart-out" id="chartOut" hidden>' +
            '<div class="chart-block"><h3>रक्त देऊ शकता</h3><div class="drops" id="giveList"></div></div>' +
            '<div class="chart-block"><h3>रक्त घेऊ शकता</h3><div class="drops" id="takeList"></div></div>' +
            '<p class="notice" style="margin:10px 0 0;font-size:11.5px"><span aria-hidden="true">ℹ️</span><span>हे केवळ रक्तगट मार्गदर्शक आहे — अंतिम क्रॉस-मॅच रक्तपेढीतच होते.</span></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-head"><h2>सतत विचारले जाणारे प्रश्न</h2></div>' +
        '<div class="card-body">' + faqHtml + '</div>' +
      '</div>' +
      '<div class="notice"><span aria-hidden="true">🚫</span><span>रक्त <b>खरेदी-विक्री बेकायदेशीर</b> आहे. रक्तदात्याला पैसे मागितले तर गुन्हा. रक्तपेढीचे <b>अधिकृत चाचणी शुल्क</b> कायदेशीर असते. माहितीसाठी <b>१०४</b>.</span></div>';
  }

  function wireInfo() {
    var chips = document.getElementById('grpChips');
    var out = document.getElementById('chartOut');
    if (!chips) return;
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      var g = b.getAttribute('data-g');
      chips.querySelectorAll('.chip').forEach(function (c) {
        c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      });
      document.getElementById('giveList').innerHTML = DONATE_TO[g].map(function (x) {
        return '<span class="drop' + (DONATE_TO[g].length === 8 ? ' all' : '') + '">' + x + '</span>';
      }).join('');
      document.getElementById('takeList').innerHTML = RECEIVE_FROM[g].map(function (x) {
        return '<span class="drop' + (RECEIVE_FROM[g].length === 8 ? ' all' : '') + '">' + x + '</span>';
      }).join('');
      out.hidden = false;
    });
  }

  /* ============ ४. रुग्णालये ============ */

  function hospView() {
    var rows = (D.hospitals || []).filter(function (h) { return h && h.name; });

    var list = rows.map(function (h) {
      var bank = h.bank ? '<span class="badge">रक्तपेढी</span>' : '';
      var src = h.source ? '<span style="display:block;font-size:10px;color:var(--faint);margin-top:2px">स्त्रोत: ' + esc(h.source) + '</span>' : '';
      var real = h.tel && String(h.tel).replace(/\D/g, '').length >= 6;
      if (real) {
        return '<a class="call" href="tel:' + esc(h.tel) + '"><span class="lbl"><b>' + esc(h.name) + bank + '</b>' +
          '<span>' + esc(h.area) + '</span>' + src + '</span><span class="go">📞</span></a>';
      }
      return '<div class="call"><span class="lbl"><b>' + esc(h.name) + bank +
        '</b><span>' + esc(h.area || '') + '</span>' + src + '</span></div>';
    }).join('');

    var info = rows.length
      ? '<div class="card"><div class="card-body">' + list + '</div></div>' +
        (D.hospitalNote ? '<p class="mstamp" style="margin:-6px 0 14px">' + esc(D.hospitalNote) + '</p>' : '')
      : '<div class="card"><div class="card-body"><div class="empty">माहिती उपलब्ध नाही.<br>जवळच्या रक्तपेढीला फोन करा किंवा <b>१०४</b> वर संपर्क साधा.</div></div></div>';

    return '<p class="lede">कोपरगाव परिसरातील रक्तपेढ्या व रुग्णालये.</p>' +
      info +
      '<div class="card"><div class="card-body">' +
        '<a class="btn soft" href="https://eraktkosh.in" target="_blank" rel="noopener" style="min-height:46px">🌐 eraktkosh.in — अधिकृत रक्त साठा पोर्टल</a>' +
        '<p class="mstamp" style="margin-top:8px">तुमच्या जिल्ह्यातील रक्त साठ्याची अधिकृत माहिती</p>' +
      '</div></div>' +
      '<div class="card"><div class="card-body">' +
        '<a class="call" href="tel:108"><span class="lbl"><b>108 — रुग्णवाहिका</b><span>अपघात, वेळेवर वाहतूक — केवळ आणीबाणीसाठी</span></span><span class="go">📞</span></a>' +
        '<a class="call" href="tel:104"><span class="lbl"><b>104 — आरोग्य सल्ला</b><span>रक्तपेढी कुठे आहे, जवळचा रक्त साठा — १०४</span></span><span class="go">📞</span></a>' +
      '</div></div>';
  }

  /* ============ ५. अधिक ============ */

  function moreView() {
    var notices = (D.notices || []).filter(function (n) { return n && n.trim(); });
    var noticeCard = notices.length
      ? '<div class="card"><div class="card-head"><h2>सूचना</h2></div><div class="card-body">' +
          notices.map(function (n) { return '<div class="diary-item"><div class="info"><b>📢 ' + esc(n) + '</b></div></div>'; }).join('') +
        '</div></div>'
      : '';

    return noticeCard +
      '<div class="card"><div class="card-head"><h2>रक्तसेतू कसा वापराल?</h2></div><div class="card-body">' +
        '<ol style="margin:0;padding-left:18px;font-size:13.5px;color:var(--muted);line-height:1.6">' +
          '<li>रक्ताची गरज भासल्यास <b>रक्त हवे</b> उघडून २ मिनिटांत मागणी तयार करा.</li>' +
          '<li><b>WhatsApp वर पाठवा</b> — तयार झालेला संदेश WhatsApp वर थेट पाठवा.</li>' +
          '<li>ज्याला रक्तदान करता येईल तो थेट नंबरवर संपर्क करतो. कोणत्याही मध्यस्थाची गरज नाही.</li>' +
        '</ol>' +
      '</div></div>' +
      '<div class="card"><div class="card-body btn-row">' +
        '<button class="btn" id="shareBtn2" type="button">↗ ॲप शेअर करा</button>' +
        '<button class="btn ghost installBtn" id="installBtn" type="button" hidden>📲 फोनवर इन्स्टॉल करा</button>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>गोपनीयता</h2></div><div class="card-body">' +
        '<p style="margin:0;font-size:13px;color:var(--muted);line-height:1.55">सगळी माहिती फक्त तुमच्या फोनवर राहते. कोणतीही माहिती आमच्याकडे किंवा कोणत्या सर्व्हरकडे जात नाही. नंबर तेव्हाच दिसतात जेव्हा तुम्ही स्वतः WhatsApp वर पाठवता.</p>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><h2>माहिती</h2></div><div class="card-body">' +
        '<div class="diary-item" style="border-top:0"><div class="info"><b>शेवटची उजळणी</b><span>' + esc(D.updated || '—') + '</span></div></div>' +
        '<div class="diary-item"><div class="info"><b>भाग</b><span>' + esc(D.town || 'कोपरगाव') + '</span></div></div>' +
      '</div></div>' +
      '<p class="mstamp">रक्तसेतू · मोफत · जाहिरात नाही</p>';
  }

  /* ============ रेंडर ============ */

  var VIEWS = { need: needView, donate: donateView, info: infoView, hosp: hospView, more: moreView };
  var WIRES = { need: wireNeed, donate: wireDonate, info: wireInfo, hosp: null, more: null };

  function renderTabs(active) {
    tabsEl.innerHTML = TABS.map(function (t) {
      return '<button class="tab" role="tab" data-id="' + t.id + '" aria-selected="' + (t.id === active) + '">' +
        '<span class="ic" aria-hidden="true">' + t.ic + '</span><span>' + t.label + '</span></button>';
    }).join('');
  }

  function render() {
    var id = currentTab();
    renderTabs(id);
    view.innerHTML = (VIEWS[id] || needView)();

    /* fade-slide view entrance re-trigger */
    view.style.animation = 'none';
    void view.offsetWidth; /* reflow */
    view.style.animation = '';
    if (id === 'more') { wireShareMore(); } else if (WIRES[id]) { WIRES[id](); }
    updateInstallButtons();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ============ शेअर व इन्स्टॉल ============ */

  function shareApp() {
    var launchText =
      '🩸 *रक्तसेतू — कोपरगाव (Blood Bridge)* 🩸\n' +
      'आपत्कालीन रक्ताची गरज भासल्यास १ मिनिटात थेट मदत!\n\n' +
      'एखाद्या रुग्णाला तातडीने रक्ताची गरज पडल्यास ३० नातेवाईकांना फोन करत बसण्याऐवजी, आता एका मिनिटात अचूक माहिती असलेला WhatsApp मेसेज तयार करा आणि ग्रुप्समध्ये पाठवा.\n\n' +
      '✨ *वैशिष्ट्ये:*\n' +
      '• 💯% मोफत, कोणतीही जाहिरात नाही, लॉगिन नाही.\n' +
      '• सर्व माहिती फक्त तुमच्या फोनवरच राहते (पूर्ण गोपनीयता).\n' +
      '• रक्तदान कधी करता येईल याचे कॅलेंडर (पुरुष: ९० दिवस / महिला: १२० दिवस).\n' +
      '• साईनाथ रक्तपेढी (शिर्डी) चे थेट २४ तास संपर्क नंबर व रक्तगट माहिती.\n' +
      '• इंटरनेट नसले (Offline) तरीही चालते.\n\n' +
      '📲 *वेबसाईट लिंक:*\n' +
      '👉 ' + location.href.split('#')[0] + '\n' +
      '(ही लिंक तुमच्या फोनमध्ये सेव्ह ठेवा. गरजेच्या वेळी कोणाचाही जीव वाचू शकतो!)\n' +
      '— जनहितार्थ समर्पित · #रक्तसेतू कोपरगाव';
    var payload = { title: 'रक्तसेतू कोपरगाव', text: launchText, url: location.href.split('#')[0] };
    if (navigator.share) { navigator.share(payload).catch(function () {}); return; }
    var shareUrl = 'https://wa.me/?text=' + encodeURIComponent(payload.text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload.text)
        .then(function () { toast('लिंक कॉपी झाली — WhatsApp वर पाठवा'); })
        .catch(function () { window.open(shareUrl, '_blank'); });
      return;
    }
    window.open(shareUrl, '_blank', 'noopener');
  }

  var installEvent = null;

  function updateInstallButtons() {
    var b = document.getElementById('installBtn');
    if (b) b.hidden = !installEvent;
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    updateInstallButtons();
  });

  function wireShareMore() {
    var s = document.getElementById('shareBtn2');
    if (s) s.addEventListener('click', shareApp);
    updateInstallButtons();
    var i = document.getElementById('installBtn');
    if (i) i.addEventListener('click', function () {
      if (!installEvent) { toast('मेनू → “Add to Home screen”'); return; }
      installEvent.prompt();
      installEvent = null;
      updateInstallButtons();
    });
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tab');
    if (!b) return;
    var id = b.getAttribute('data-id');
    if (('#' + id) === location.hash) render(); else location.hash = id;
  });

  window.addEventListener('hashchange', render);
  document.getElementById('shareBtn').addEventListener('click', shareApp);

  render();

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
