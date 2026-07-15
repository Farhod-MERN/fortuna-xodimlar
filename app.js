// Baza boshlang'ich holati (LocalStorage tekshiriladi)
// SUPABASE SOZLAMALARI
const SUPABASE_URL = "https://xfvylqtqakwexcjqjktu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdnlscXRxYWt3ZXhjamdqa3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODA3OTgsImV4cCI6MjA5OTY1Njc5OH0.dl3Icafhlplh1_H6F8FOFde7ZflCEJgCcJxlyRgPGKs";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let EMPLOYEES = JSON.parse(localStorage.getItem('fortuna_employees')) || [];
let selectedId = null;
let searchQuery = "";
let deptFilter = "all";


// Brauzer birinchi marta ochilganda dastlabki ma'lumotlarni yuklash (tizim bo'sh bo'lsa)
window.onload = function() {
  if (EMPLOYEES.length === 0) {
    // Agar local storage bo'sh bo'lsa JSON dan yuklashga urinib ko'ramiz
    fetch('employees.json')
      .then(response => response.json())
      .then(data => {
        EMPLOYEES = data;
        saveToLocalStorage();
        initApp();
      })
      .catch(err => {
        console.log("Dastlabki json yuklanmadi, bo'sh baza yaratildi.");
        initApp();
      });
  } else {
    initApp();
  }
};

function initApp() {
  buildDeptFilter();
  render();
}

function saveToLocalStorage() {
  localStorage.setItem('fortuna_employees', JSON.stringify(EMPLOYEES));
}

// Bo'lim filtri ro'yxatini shakllantirish
function buildDeptFilter() {
  const deptSelect = document.getElementById("deptFilter");
  const currentVal = deptSelect.value;
  
  // Takrorlanmas bo'limlar ro'yxati
  const departments = [...new Set(EMPLOYEES.map(e => e.Bolim).filter(Boolean))];
  
  deptSelect.innerHTML = '<option value="all">Barcha bo\'limlar</option>';
  departments.forEach(dept => {
    const opt = document.createElement("option");
    opt.value = dept;
    opt.innerText = dept;
    deptSelect.appendChild(opt);
  });
  
  deptSelect.value = currentVal;
}

// INITIALS OLISH
function initials(f, l) { 
  return ((f ? f[0] : '') + (l ? l[0] : '')).toUpperCase(); 
}

// TAJRIBA HISOBLASH
function tenureText(dateStr) {
  if (!dateStr) return { txt: "Ma'lumot yo'q", months: 0 };
  const start = new Date(dateStr);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const rem = months % 12;
  let txt = "";
  if (years > 0) txt += years + " yil ";
  if (rem > 0 || years === 0) txt += rem + " oy";
  return { txt, months };
}

// SANA FORMATLASH
function formatDate(d) {
  if (!d) return "Sana kiritilmagan";
  const parts = d.split("-");
  if(parts.length < 3) return d;
  const [y, m, day] = parts;
  const oylar = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  return `${parseInt(day)}-${oylar[parseInt(m) - 1]}, ${y}`;
}

// QIDIRUV & FILTRLASH FUNKSIYALARI
function onSearch(v) {
  searchQuery = v;
  render();
}

function onDeptChange(v) {
  deptFilter = v;
  render();
}

function selectEmployee(id) {
  selectedId = id;
  renderDetail();
  renderListOnly();
}

// INTERFEYSNI YANGILASH (RENDER)
function render() {
  buildDeptFilter();
  renderListOnly();
  renderDetail();
}

// Ro'yxatni chizish
function renderListOnly() {
  const filtered = EMPLOYEES.filter(e => {
    const matchesSearch = !searchQuery ? true : (
      (e.Ism + " " + e.Familiya).toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.PINFL && e.PINFL.toString().includes(searchQuery))
    );
    const matchesDept = deptFilter === "all" || e.Bolim === deptFilter;
    return matchesSearch && matchesDept;
  });

  const countEl = document.getElementById("resultCount");
  countEl.innerText = `${filtered.length} ta xodim topildi (Jami: ${EMPLOYEES.length})`;

  const empList = document.getElementById("empList");
  if (filtered.length === 0) {
    empList.innerHTML = `<div style="text-align:center; padding: 25px; color: var(--text-muted); font-size:13px;">Xodim topilmadi.</div>`;
    return;
  }

  empList.innerHTML = filtered.map(e => `
    <div class="emp-row ${e.ID === selectedId ? 'active' : ''}" onclick="selectEmployee(${e.ID})">
      <div class="avatar">${initials(e.Ism, e.Familiya)}</div>
      <div class="info">
        <div class="fio">${e.Ism} ${e.Familiya}</div>
        <div class="role">${e.Lavozim || "Lavozim ko'rsatilmagan"}</div>
      </div>
    </div>
  `).join("");
}

// Batafsil sohani chizish
function renderDetail() {
  const detailPanel = document.getElementById("detailPanel");
  if (!selectedId) {
    detailPanel.innerHTML = `
      <div class="detail-empty">
        <div style="font-size:40px;">👥</div>
        <div>Chap tomondagi ro'yxatdan xodimni tanlang<br>yoki Excel / JSON faylni yuklang.</div>
      </div>`;
    return;
  }

  const e = EMPLOYEES.find(emp => emp.ID === selectedId);
  if (!e) {
    selectedId = null;
    renderDetail();
    return;
  }

  const t = tenureText(e["Ishga kirgan sana"]);
  const pct = Math.min(100, Math.round((t.months / 60) * 100)); // 5 yillik shkala asosida vizual foiz

  // Kuchli jihatlar teglari
  let skillsHtml = "Kiritilmagan";
  if (e["Kuchli jihatlari"]) {
    const list = e["Kuchli jihatlari"].split(",").map(i => i.trim()).filter(Boolean);
    skillsHtml = list.map(k => `<span class="tag">${k}</span>`).join("");
  }

  detailPanel.innerHTML = `
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="avatar-lg">${initials(e.Ism, e.Familiya)}</div>
        <div>
          <h2>${e.Ism} ${e.Familiya}</h2>
          <div class="position">${e.Lavozim}</div>
          <div class="dept">${e.Bolim}</div>
        </div>
      </div>
      
      <!-- Edit va Delete Tugmalari -->
      <div style="display:flex; gap:8px;">
        <button class="btn btn-blue btn-sm" onclick="openEditModal(${e.ID})">📝 Tahrirlash</button>
        <button class="btn btn-red btn-sm" onclick="deleteEmployee(${e.ID})">🗑️ O'chirish</button>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="label">PINFL</div>
        <div class="value" style="font-family: monospace;">${e.PINFL || "—"}</div>
      </div>
      <div class="meta-item">
        <div class="label">Ishga kirgan sana</div>
        <div class="value">${formatDate(e["Ishga kirgan sana"])}</div>
      </div>
      <div class="meta-item">
        <div class="label">Bo'lim</div>
        <div class="value">${e.Bolim || "—"}</div>
      </div>
      <div class="meta-item">
        <div class="label">Lavozim</div>
        <div class="value">${e.Lavozim || "—"}</div>
      </div>
    </div>

    <div class="section-block">
      <h4>Fortuna Biznesdagi faoliyat davri</h4>
      <div style="font-size:14px; font-weight:600; margin-bottom:5px; color: var(--blue-primary);">${t.txt}</div>
      <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:var(--red-primary);"></div>
      </div>
    </div>

    <div class="section-block">
      <h4>Kuchli jihatlari & Professional ko'nikmalari</h4>
      <div class="tags">
        ${skillsHtml}
      </div>
    </div>
  `;
}

// 1. IMPORT TUGMASI VAZIFASI
function triggerImport() {
  document.getElementById("excelFileInput").click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  const fileType = file.name.split('.').pop().toLowerCase();

  if (fileType === 'json') {
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          EMPLOYEES = parsed;
          saveToLocalStorage();
          initApp();
          alert(`Muvaffaqiyatli import qilindi: ${parsed.length} ta xodim yuklandi.`);
        } else {
          alert("JSON fayl noto'g'ri formatda. Massiv ko'rinishida bo'lishi kerak.");
        }
      } catch (err) {
        alert("JSON o'qishda xatolik yuz berdi.");
      }
    };
    reader.readAsText(file);
  } else if (fileType === 'xlsx' || fileType === 'xls') {
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Excel jadvalini JSON formatiga o'tkazish
        const rawJson = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawJson.length > 0) {
          // Ustun nomlarini bizning formatga to'g'irlash
          EMPLOYEES = rawJson.map((row, index) => ({
            ID: row.ID || (index + 1),
            Ism: row.Ism || row.Ismi || "",
            Familiya: row.Familiya || row.Familiyasi || "",
            PINFL: row.PINFL || row.pinfl || "",
            Bolim: row.Bolim || row.Bo_lim || row["Bo'limi"] || row["Bo'lim"] || "",
            Lavozim: row.Lavozim || row.Lavozimi || "",
            "Ishga kirgan sana": row["Ishga kirgan sana"] || row["Ishga_kirgan"] || row.Sana || "",
            "Kuchli jihatlari": row["Kuchli jihatlari"] || row["Kuchli_jihatlari"] || row.Kuchli || ""
          }));
          
          saveToLocalStorage();
          initApp();
          alert(`Muvaffaqiyatli import qilindi: Exceldan ${EMPLOYEES.length} ta xodim yuklandi!`);
        } else {
          alert("Excel fayl bo'sh yoki o'qib bo'lmadi.");
        }
      } catch (err) {
        alert("Excel faylini tahlil qilishda xatolik yuz berdi.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

// 2. EDIT VA 3. ADD TUGMASI UCHUN MODAL OYNA
function openAddModal() {
  document.getElementById("modalTitle").innerText = "Yangi xodim qo'shish (Add)";
  document.getElementById("employeeForm").reset();
  document.getElementById("formEmployeeId").value = "";
  document.getElementById("saveBtn").innerText = "Tizimga qo'shish";
  document.getElementById("employeeModal").classList.add("active");
}

function openEditModal(id) {
  const e = EMPLOYEES.find(emp => emp.ID === id);
  if (!e) return;

  document.getElementById("modalTitle").innerText = "Xodim ma'lumotlarini tahrirlash (Edit)";
  document.getElementById("formEmployeeId").value = e.ID;
  document.getElementById("formIsm").value = e.Ism || "";
  document.getElementById("formFamiliya").value = e.Familiya || "";
  document.getElementById("formPinfl").value = e.PINFL || "";
  document.getElementById("formBolim").value = e.Bolim || "";
  document.getElementById("formLavozim").value = e.Lavozim || "";
  
  // Sanani HTML date inputga moslash formatda (YYYY-MM-DD) kiritish
  let dateVal = e["Ishga kirgan sana"] || "";
  if (dateVal.includes('.')) {
    const parts = dateVal.split('.');
    dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  document.getElementById("formIshSana").value = dateVal;
  document.getElementById("formKuchli").value = e["Kuchli jihatlari"] || "";

  document.getElementById("saveBtn").innerText = "O'zgarishlarni saqlash";
  document.getElementById("employeeModal").classList.add("active");
}

function closeModal() {
  document.getElementById("employeeModal").classList.remove("active");
}

// FORM SAQLASH (ADD & EDIT)
function saveEmployee(event) {
  event.preventDefault();
  
  const idVal = document.getElementById("formEmployeeId").value;
  const ism = document.getElementById("formIsm").value;
  const familiya = document.getElementById("formFamiliya").value;
  const pinfl = document.getElementById("formPinfl").value;
  const bolim = document.getElementById("formBolim").value;
  const lavozim = document.getElementById("formLavozim").value;
  const ishSana = document.getElementById("formIshSana").value;
  const kuchli = document.getElementById("formKuchli").value;

  if (idVal) {
    // EDIT REJIM: Ma'lumotlarni yangilash
    const idx = EMPLOYEES.findIndex(e => e.ID === parseInt(idVal));
    if (idx !== -1) {
      EMPLOYEES[idx] = {
        ...EMPLOYEES[idx],
        Ism: ism,
        Familiya: familiya,
        PINFL: pinfl,
        Bolim: bolim,
        Lavozim: lavozim,
        "Ishga kirgan sana": ishSana,
        "Kuchli jihatlari": kuchli
      };
      alert("Xodim ma'lumotlari muvaffaqiyatli tahrirlandi!");
    }
  } else {
    // ADD REJIM: Yangi xodim yaratish
    const newId = EMPLOYEES.length > 0 ? Math.max(...EMPLOYEES.map(e => e.ID)) + 1 : 1;
    const newEmp = {
      ID: newId,
      Ism: ism,
      Familiya: familiya,
      PINFL: pinfl,
      Bolim: bolim,
      Lavozim: lavozim,
      "Ishga kirgan sana": ishSana,
      "Kuchli jihatlari": kuchli
    };
    EMPLOYEES.push(newEmp);
    selectedId = newId; // Avtomatik ochib ko'rsatish
    alert("Yangi xodim muvaffaqiyatli qo'shildi!");
  }

  saveToLocalStorage();
  closeModal();
  initApp();
  renderDetail();
}

// 4. DELETE TUGMASI VAZIFASI
function deleteEmployee(id) {
  const e = EMPLOYEES.find(emp => emp.ID === id);
  if (!e) return;

  const conf = confirm(`${e.Ism} ${e.Familiya} xodimlar bazasidan butunlay o'chirilsinmi? (Bu amalni ortga qaytarib bo'lmaydi)`);
  if (conf) {
    EMPLOYEES = EMPLOYEES.filter(emp => emp.ID !== id);
    if (selectedId === id) selectedId = null;
    saveToLocalStorage();
    initApp();
    renderDetail();
  }
}

// 5. DOWNLOAD TUGMASI VAZIFASI (EXCEL EKSPORT)
function exportToExcel() {
  if (EMPLOYEES.length === 0) {
    alert("Eksport qilish uchun hech qanday ma'lumot yo'q!");
    return;
  }

  try {
    // Ma'lumotlar ustunlarini tartib bilan tayyorlaymiz
    const dataToExport = EMPLOYEES.map(e => ({
      "ID": e.ID,
      "Ism": e.Ism,
      "Familiya": e.Familiya,
      "PINFL": e.PINFL,
      "Bo'limi": e.Bolim,
      "Lavozimi": e.Lavozim,
      "Ishga kirgan sana": e["Ishga kirgan sana"],
      "Kuchli jihatlari": e["Kuchli jihatlari"]
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Xodimlar");

    // Excel fayl nomi
    const fileName = `Fortuna_Biznes_Xodimlar_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Faylni brauzerga yuklab berish
    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    alert("Excelga yuklashda xatolik yuz berdi.");
    console.error(err);
  }
}