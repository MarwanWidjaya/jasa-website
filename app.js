/* MAGERWEB — App Logic (vanilla JS, localStorage, no backend) */
'use strict';

/* ---------- Utilities ---------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

let toastTimer;
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

function copyText(elId){
  const el = $(elId);
  const text = el.value !== undefined ? el.value : el.textContent;
  if(!text || !text.trim() || text.trim()==='Hasil muncul di sini...'){ toast('Nggak ada yang bisa disalin 😅'); return; }
  navigator.clipboard.writeText(text).then(()=>{
    toast('Disalin! ✅');
    bumpStat('copies');
    logActivity('Menyalin hasil ke clipboard');
  }).catch(()=>{
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); toast('Disalin! ✅'); bumpStat('copies'); }
    catch(e){ toast('Gagal menyalin 😢'); }
    document.body.removeChild(ta);
  });
}

/* ---------- Navigation ---------- */
function toggleNav(){ $('navLinks').classList.toggle('open'); }
$('navToggle').addEventListener('click', toggleNav);

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el = $('view-'+name);
  if(el) el.classList.add('active');
  $('navLinks').classList.remove('open');
  window.scrollTo({top:0, behavior:'smooth'});
  if(window.lucide) lucide.createIcons();
}
function scrollToId(id){
  const el = $(id);
  if(el) el.scrollIntoView({behavior:'smooth'});
}
function openTool(tool){
  showView(tool);
  bumpStat('toolsOpened');
  const names = {'prompt-studio':'AI Prompt Studio','text-tools':'Smart Text Tools','prompt-library':'Prompt Library','dashboard':'Dashboard'};
  logActivity('Membuka ' + (names[tool]||tool));
  if(tool==='dashboard') renderDashboard();
  if(tool==='prompt-library') renderLibrary();
}

/* ---------- FAQ ---------- */
function toggleFaq(btn){
  const item = btn.closest('.faq-item');
  const ans = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i=>{ i.classList.remove('open'); i.querySelector('.faq-a').style.maxHeight = null; });
  if(!isOpen){ item.classList.add('open'); ans.style.maxHeight = ans.scrollHeight + 'px'; }
}

/* ---------- Animated counters ---------- */
function animateCounters(){
  document.querySelectorAll('.stat-num').forEach(el=>{
    const target = parseInt(el.dataset.count||'0',10);
    let cur = 0;
    const step = Math.max(1, Math.ceil(target/40));
    const timer = setInterval(()=>{
      cur += step;
      if(cur >= target){ cur = target; clearInterval(timer); }
      el.textContent = cur;
    }, 40);
  });
}

/* ---------- Tools Explorer ---------- */
const TOOLS = [
  {id:'prompt-studio', name:'AI Prompt Studio', desc:'Generate prompt terstruktur dari kebutuhanmu.', cat:'ai', icon:'sparkles', demo:true},
  {id:'text-tools', name:'Smart Text Tools', desc:'Hitung kata, ubah kapital, bersihkan teks.', cat:'teks', icon:'type'},
  {id:'prompt-library', name:'Prompt Library', desc:'Simpan, cari & kelola prompt favoritmu.', cat:'produktivitas', icon:'library'},
  {id:'text-tools', name:'Word Counter', desc:'Hitung kata, karakter & estimasi baca — live.', cat:'teks', icon:'bar-chart-3', tab:'counter'},
  {id:'text-tools', name:'Case Converter', desc:'UPPER, lower, Title Case dalam sekali klik.', cat:'teks', icon:'case-sensitive', tab:'case'},
  {id:'dashboard', name:'Dashboard', desc:'Statistik & aktivitas penggunaanmu.', cat:'produktivitas', icon:'layout-dashboard'},
  {id:null, name:'Caption Generator', desc:'Bikin caption sosmed otomatis.', cat:'ai', icon:'message-square', soon:true},
  {id:null, name:'Image Prompt Helper', desc:'Rancang prompt untuk AI image generator.', cat:'ai', icon:'image', soon:true},
];
let toolFilter = 'all';
function setToolFilter(cat){
  toolFilter = cat;
  document.querySelectorAll('#toolFilters .pill').forEach(p=>p.classList.toggle('active', p.dataset.cat===cat));
  renderTools();
}
function renderTools(){
  const searchEl = $('toolSearch'), grid = $('toolsGrid');
  if(!searchEl || !grid) return; // explorer dipindah jadi bonus compact
  const q = (searchEl.value||'').toLowerCase();
  const list = TOOLS.filter(t =>
    (toolFilter==='all' || t.cat===toolFilter) &&
    (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
  );
  if(!list.length){ grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:32px">Nggak ketemu tools-nya 😅 coba kata kunci lain.</p>'; }
  else{
    grid.innerHTML = list.map(t=>`
      <div class="tool-card${t.soon?' soon':''}" ${t.id?`onclick="openToolWithTab('${t.id}','${t.tab||''}')"`:""}>
        <div class="tool-top">
          <span class="tool-cat">${t.cat}</span>
          ${t.soon?'<span class="soon-badge">COMING SOON</span>':(t.demo?'<span class="demo-badge" style="position:static">DEMO</span>':'')}
        </div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.desc)}</p>
      </div>`).join('');
  }
  if(window.lucide) lucide.createIcons();
}
function openToolWithTab(tool, tab){
  openTool(tool);
  if(tab) switchTab('text-tools', tab);
}

/* ---------- Tabs ---------- */
function switchTab(group, name){
  document.querySelectorAll('#view-'+group+' .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#view-'+group+' .tab-panel').forEach(p=>p.classList.remove('active'));
  const btns = document.querySelectorAll('#view-'+group+' .tab');
  btns.forEach(b=>{ if(b.getAttribute('onclick').includes("'"+name+"'")) b.classList.add('active'); });
  const panel = $('ttp-'+name);
  if(panel) panel.classList.add('active');
}

/* ---------- Stats (localStorage) ---------- */
const STATS_KEY = 'magerweb_stats_v1';
function getStats(){
  try{ return Object.assign({toolsOpened:0, copies:0, generated:0}, JSON.parse(localStorage.getItem(STATS_KEY)||'{}')); }
  catch(e){ return {toolsOpened:0, copies:0, generated:0}; }
}
function bumpStat(k){
  const s = getStats(); s[k] = (s[k]||0)+1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}
const ACT_KEY = 'magerweb_activity_v1';
function logActivity(text){
  try{
    const arr = JSON.parse(localStorage.getItem(ACT_KEY)||'[]');
    arr.unshift({text, at: Date.now()});
    localStorage.setItem(ACT_KEY, JSON.stringify(arr.slice(0,20)));
  }catch(e){}
}
function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return s+' dtk lalu';
  if(s<3600) return Math.floor(s/60)+' mnt lalu';
  if(s<86400) return Math.floor(s/3600)+' jam lalu';
  return Math.floor(s/86400)+' hari lalu';
}

/* ---------- Prompt Studio ---------- */
const PS_TEMPLATES = {
  coding: {
    role:'Seorang senior software engineer yang sabar dan detail',
    instr:['Pahami dulu masalah/tugas yang diberikan','Berikan solusi kode yang bersih dan terdokumentasi','Jelaskan setiap bagian penting dengan bahasa sederhana','Sertakan contoh penggunaan jika relevan','Ingatkan potensi edge-case atau bug umum'],
  },
  writing: {
    role:'Seorang penulis profesional yang engaging',
    instr:['Pahami topik dan target pembaca','Buat struktur tulisan yang mengalir (pembuka-isi-penutup)','Gunakan bahasa yang hidup, hindari kalimat kaku','Akhiri dengan ajakan/pertanyaan yang memancing respons'],
  },
  marketing: {
    role:'Seorang digital marketer yang paham psikologi konsumen',
    instr:['Identifikasi target audiens dan pain point mereka','Tonjolkan manfaat, bukan sekadar fitur','Sisipkan unsur urgensi atau social proof yang wajar','Akhiri dengan call-to-action yang jelas'],
  },
  belajar: {
    role:'Seorang tutor yang sabar dan pandai menyederhanakan',
    instr:['Mulai dari konsep paling dasar','Gunakan analogi sehari-hari','Berikan contoh konkret, bukan teori doang','Akhiri dengan rangkuman + 1 pertanyaan latihan'],
  },
  bisnis: {
    role:'Seorang konsultan bisnis UMKM yang praktis',
    instr:['Fokus ke solusi yang realistis buat skala kecil','Hindari jargon, pakai bahasa sehari-hari','Berikan langkah konkret yang bisa langsung dieksekusi','Sertakan perkiraan effort/biaya secara jujur'],
  },
  fun: {
    role:'Seorang kreator konten yang kocak dan out-of-the-box',
    instr:['Bebas berkreasi, makin absurd makin bagus','Tetap jaga agar hasilnya menghibur','Pakai referensi pop culture yang relatable'],
  },
};
const TONE_GUIDE = {
  santai:'Bahasa santai ala Gen Z, boleh pakai slang secukupnya tapi tetap jelas.',
  formal:'Bahasa baku formal, struktur rapi, tanpa slang.',
  profesional:'Bahasa profesional yang sopan dan meyakinkan, cocok untuk konteks kerja.',
  persuasif:'Bahasa persuasif yang memancing emosi dan aksi, tanpa terkesan maksa.',
};
const DETAIL_GUIDE = {
  singkat:'Jawaban singkat dan padat, maksimal 3-5 poin/bagian.',
  sedang:'Jawaban seimbang: cukup detail tapi tidak bertele-tele.',
  detail:'Jawaban mendalam dan komprehensif dengan sub-bagian yang jelas.',
};
function generatePrompt(){
  const cat = $('psCategory').value;
  const task = $('psTask').value.trim();
  const tone = $('psTone').value;
  const detail = $('psDetail').value;
  if(!task){ toast('Isi dulu kebutuhan/tugasnya 😅'); $('psTask').focus(); return; }
  const tpl = PS_TEMPLATES[cat];
  const out =
`# PERAN
Bertindaklah sebagai ${tpl.role}.

# TUGAS
${task}

# INSTRUKSI
${tpl.instr.map((x,i)=>`${i+1}. ${x}`).join('\n')}

# GAYA BAHASA
${TONE_GUIDE[tone]}

# LEVEL DETAIL
${DETAIL_GUIDE[detail]}

---
*Dibuat dengan MAGERWEB AI Prompt Studio (Demo — template berbasis aturan)*`;
  $('psOutput').textContent = out;
  $('psResultPanel').style.display = 'block';
  $('psResultPanel').scrollIntoView({behavior:'smooth', block:'nearest'});
  bumpStat('generated');
  logActivity('Generate prompt ('+$('psCategory').selectedOptions[0].textContent.trim()+')');
  toast('Prompt jadi! ✨');
}
function savePromptFromStudio(){
  const content = $('psOutput').textContent;
  if(!content || content.includes('Hasil')) return;
  const cat = $('psCategory').value;
  const task = $('psTask').value.trim().slice(0,40);
  addLibraryItem({title:'Studio: '+(task||'tanpa judul'), content, category:cat, tags:['prompt-studio']});
  toast('Tersimpan ke Library! 📚');
}

/* ---------- Text Tools ---------- */
function updateCounter(){
  const t = $('tcInput').value;
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  $('cWords').textContent = words;
  $('cChars').textContent = t.length;
  $('cCharsNoSpace').textContent = t.replace(/\s/g,'').length;
  const sentences = t.trim() ? (t.match(/[^.!?]+[.!?]+/g)||[]).length || (t.trim()?1:0) : 0;
  $('cSentences').textContent = sentences;
  const paras = t.trim() ? t.split(/\n+/).filter(p=>p.trim()).length : 0;
  $('cParagraphs').textContent = paras;
  $('cReadTime').textContent = Math.max(words?Math.ceil(words/200):0, 0);
}
function convertCase(mode){
  const t = $('caseInput').value;
  if(!t.trim()){ toast('Isi dulu teksnya 😅'); return; }
  let r = t;
  if(mode==='upper') r = t.toUpperCase();
  else if(mode==='lower') r = t.toLowerCase();
  else if(mode==='title') r = t.toLowerCase().replace(/(?:^|\s)\S/g, c=>c.toUpperCase());
  else if(mode==='sentence') r = t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c=>c.toUpperCase());
  else if(mode==='alternating') r = t.split('').map((c,i)=>i%2?c.toUpperCase():c.toLowerCase()).join('');
  $('caseOutput').textContent = r;
  logActivity('Menggunakan Case Converter');
  toast('Beres! 🔠');
}
function cleanText(mode){
  const t = $('cleanInput').value;
  if(!t.trim()){ toast('Isi dulu teksnya 😅'); return; }
  let r = t;
  if(mode==='spaces'||mode==='all') r = r.replace(/[ \t]+/g,' ');
  if(mode==='lines'||mode==='all') r = r.split('\n').filter(l=>l.trim()).join('\n');
  if(mode==='all') r = r.split('\n').map(l=>l.trim()).join('\n').trim();
  $('cleanOutput').textContent = r;
  logActivity('Membersihkan teks');
  toast('Teks bersih! 🧹');
}
function reverseText(mode){
  const t = $('revInput').value;
  if(!t.trim()){ toast('Isi dulu teksnya 😅'); return; }
  let r = t;
  if(mode==='chars') r = t.split('').reverse().join('');
  else if(mode==='words') r = t.split(/\s+/).reverse().join(' ');
  else if(mode==='lines') r = t.split('\n').reverse().join('\n');
  $('revOutput').textContent = r;
  logActivity('Membalik teks (for fun)');
  toast('Kebalik! 🔄');
}

/* ---------- Prompt Library ---------- */
const LIB_KEY = 'magerweb_library_v1';
const SAMPLE_PROMPTS = [
  {title:'Caption IG Warung Kopi', category:'marketing', tags:['instagram','umkm','kopi'], content:'Buatkan 3 variasi caption Instagram untuk warung kopi yang baru buka. Tone santai ala Gen Z, sertakan 5 hashtag relevan, dan akhiri dengan ajakan mampir. Maksimal 150 kata per caption.'},
  {title:'Jelaskan Konsep Coding ke Pemula', category:'belajar', tags:['coding','pemula'], content:'Jelaskan konsep [NAMA KONSEP] dalam programming seolah aku anak 10 tahun. Pakai analogi sehari-hari, kasih 1 contoh kode sederhana, dan 1 pertanyaan latihan di akhir.'},
  {title:'Email Lamaran Kerja', category:'writing', tags:['karier','email'], content:'Tuliskan email lamaran kerja untuk posisi [POSISI] di [PERUSAHAAN]. Bahasa profesional tapi hangat, 3 paragraf: perkenalan, pengalaman relevan, penutup. Maksimal 200 kata.'},
  {title:'Ide Konten TikTok UMKM', category:'bisnis', tags:['tiktok','umkm','konten'], content:'Berikan 10 ide konten TikTok untuk usaha [JENIS USAHA] dengan budget nol rupiah. Setiap ide: hook 3 detik pertama + konsep isi + durasi. Fokus ke yang berpotensi FYP.'},
  {title:'Review Kode Python', category:'coding', tags:['python','review'], content:'Review kode Python berikut sebagai senior engineer. Cari: bug potensial, masalah performa, dan gaya penulisan yang bisa diperbaiki. Berikan saran konkret per baris bermasalah:\n\n[KODE DI SINI]'},
];
function getLibrary(){
  try{
    const raw = localStorage.getItem(LIB_KEY);
    if(raw===null){
      const seeded = SAMPLE_PROMPTS.map((p,i)=>Object.assign({id:'seed-'+i, createdAt:Date.now()}, p));
      localStorage.setItem(LIB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  }catch(e){ return []; }
}
function setLibrary(arr){ localStorage.setItem(LIB_KEY, JSON.stringify(arr)); }
function addLibraryItem(item){
  const arr = getLibrary();
  arr.unshift(Object.assign({id:'p'+Date.now(), createdAt:Date.now()}, item));
  setLibrary(arr);
  logActivity('Menyimpan prompt: '+(item.title||'tanpa judul'));
  renderLibrary();
}
let libFilter = 'all';
function setLibFilter(cat){
  libFilter = cat;
  document.querySelectorAll('#libFilters .pill').forEach(p=>p.classList.toggle('active', p.dataset.cat===cat));
  renderLibrary();
}
function saveLibraryPrompt(){
  const title = $('libTitle').value.trim();
  const content = $('libContent').value.trim();
  const category = $('libCategory').value;
  const tags = $('libTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  if(!title || !content){ toast('Judul & isi prompt wajib diisi 😅'); return; }
  const editId = $('libEditId').value;
  if(editId){
    const arr = getLibrary();
    const it = arr.find(x=>x.id===editId);
    if(it){ it.title=title; it.content=content; it.category=category; it.tags=tags; setLibrary(arr); logActivity('Mengedit prompt: '+title); toast('Perubahan tersimpan! ✏️'); }
    resetLibForm(); renderLibrary(); return;
  }
  addLibraryItem({title, content, category, tags});
  resetLibForm(); toast('Prompt tersimpan! 📚');
}
function resetLibForm(){
  $('libTitle').value=''; $('libContent').value=''; $('libTags').value=''; $('libEditId').value='';
  $('libFormTitle').textContent='Tambah Prompt Baru'; $('libCancelEdit').style.display='none';
}
function editLibraryPrompt(id){
  const it = getLibrary().find(x=>x.id===id);
  if(!it) return;
  $('libTitle').value=it.title; $('libContent').value=it.content;
  $('libCategory').value=it.category; $('libTags').value=(it.tags||[]).join(', ');
  $('libEditId').value=id; $('libFormTitle').textContent='Edit Prompt';
  $('libCancelEdit').style.display='inline-flex';
  window.scrollTo({top:0, behavior:'smooth'});
}
function deleteLibraryPrompt(id){
  const arr = getLibrary();
  const it = arr.find(x=>x.id===id);
  if(!it) return;
  if(!confirm('Hapus prompt "'+it.title+'"?')) return;
  setLibrary(arr.filter(x=>x.id!==id));
  logActivity('Menghapus prompt: '+it.title);
  renderLibrary(); toast('Prompt dihapus 🗑️');
}
function copyLibraryPrompt(id){
  const it = getLibrary().find(x=>x.id===id);
  if(!it) return;
  navigator.clipboard.writeText(it.content).then(()=>{
    toast('Disalin! ✅'); bumpStat('copies'); logActivity('Menyalin prompt: '+it.title);
  }).catch(()=>toast('Gagal menyalin 😢'));
}
function renderLibrary(){
  const q = ($('libSearch').value||'').toLowerCase();
  const list = $('libraryList');
  const items = getLibrary().filter(p =>
    (libFilter==='all' || p.category===libFilter) &&
    (!q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q))
  );
  if(!items.length){ list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:32px">Belum ada prompt. Tambah yang pertama di atas! 📚</p>'; return; }
  const catEmoji = {coding:'💻',writing:'✍️',marketing:'📣',belajar:'📚',bisnis:'💼',fun:'🎮',lainnya:'📦'};
  list.innerHTML = items.map(p=>`
    <div class="lib-item">
      <div class="lib-item-head">
        <h4>${catEmoji[p.category]||'📦'} ${esc(p.title)}</h4>
        <span class="tag">${esc(p.category)}</span>
      </div>
      <div class="lib-tags">${(p.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div>
      <div class="lib-content">${esc(p.content)}</div>
      <div class="lib-actions">
        <button class="icon-btn" onclick="copyLibraryPrompt('${p.id}')"><i data-lucide="copy"></i> Salin</button>
        <button class="icon-btn" onclick="editLibraryPrompt('${p.id}')"><i data-lucide="pencil"></i> Edit</button>
        <button class="icon-btn danger" onclick="deleteLibraryPrompt('${p.id}')"><i data-lucide="trash-2"></i> Hapus</button>
      </div>
    </div>`).join('');
  if(window.lucide) lucide.createIcons();
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const s = getStats();
  $('dPrompts').textContent = getLibrary().length;
  $('dToolsUsed').textContent = s.toolsOpened||0;
  $('dCopies').textContent = s.copies||0;
  $('dGenerated').textContent = s.generated||0;
  let arr = [];
  try{ arr = JSON.parse(localStorage.getItem(ACT_KEY)||'[]'); }catch(e){}
  $('activityFeed').innerHTML = arr.length
    ? arr.slice(0,10).map(a=>`<div class="activity-item"><span class="activity-dot"></span><span>${esc(a.text)}</span><span class="activity-time">${timeAgo(a.at)}</span></div>`).join('')
    : '<p style="color:var(--muted)">Belum ada aktivitas. Coba pakai salah satu tools! 🚀</p>';
}
function wipeData(){
  if(!confirm('Yakin hapus SEMUA data lokal MAGERWEB?')) return;
  [STATS_KEY, ACT_KEY, LIB_KEY].forEach(k=>localStorage.removeItem(k));
  renderDashboard(); renderLibrary();
  toast('Semua data dihapus 🧹');
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  if(window.lucide) lucide.createIcons();
  animateCounters();
  renderTools();
  renderLibrary();
});
