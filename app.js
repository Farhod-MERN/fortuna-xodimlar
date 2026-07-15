// SUPABASE SOZLAMALARI
const SUPABASE_URL = "https://xfvylqtqakwexcjqjktu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdnlscXRxYWt3ZXhjamdqa3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODA3OTgsImV4cCI6MjA5OTY1Njc5OH0.dl3Icafhlplh1_H6F8FOFde7ZflCEJgCcJxlyRgPGKs";

// Supabase mijozini yaratamiz
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Asosiy xodimlar massivi va global o'zgaruvchilar
let EMPLOYEES = [];
let selectedId = null;
let searchQuery = "";
let deptFilter = "all";

// Brauzer yuklanganda dastlabki ma'lumotlarni olish
window.onload = async function() {
    await fetchEmployees();
};

// Ilova boshlang'ich sozlamalarini yuklash
function initApp() {
    buildDeptFilter();
    render();
}

// Bazadan ma'lumotlarni tortib olish
async function fetchEmployees() {
    const { data, error } = await supabaseClient
        .from('employees')
        .select('*');

    if (error) {
        console.error("Ma'lumot yuklashda xatolik:", error);
        alert("Ma'lumotlarni yuklashda xatolik yuz berdi!");
    } else {
        // SQL bazadagi kichik ustunlarni JS kodingizdagi katta harfli formatga moslashtiramiz
        EMPLOYEES = data.map(item => ({
            ID: item.id,
            Ism: item.ism || "",
            Familiya: item.familiya || "",
            PINFL: item.pinfl || "",
            Bolim: item.bolim || "",
            Lavozim: item.lavozim || "",
            "Ishga kirgan sana": item.ish_sana || "",
            "Kuchli jihatlari": item.kuchli || ""
        }));

        // Agar baza bo'sh bo'lsa JSON fayldan yuklashga harakat qiladi
        if (EMPLOYEES.length === 0) {
            await loadInitialDataFromJSON();
        } else {
            initApp();
        }
    }
}

// Baza bo'sh bo'lsa JSON-dan dastlabki yuklash
async function loadInitialDataFromJSON() {
    try {
        const response = await fetch('employees.json');
        const initialData = await response.json();
        
        const formattedData = initialData.map(item => ({
            ism: item.Ism || "",
            familiya: item.Familiya || "",
            pinfl: item.PINFL || "",
            bolim: item.Bolim || "",
            lavozim: item.Lavozim || "",
            ish_sana: item["Ishga kirgan sana"] || "",
            kuchli: item["Kuchli jihatlari"] || ""
        }));

        const { error } = await supabaseClient
            .from('employees')
            .insert(formattedData);

        if (!error) {
            await fetchEmployees();
        } else {
            console.error("JSON-ni bazaga yozishda xato:", error);
            initApp(); // Xato bo'lsa ham dasturni boshlaymiz (bo'sh holda)
        }
    } catch (err) {
        console.log("JSON yuklashda xato yoki fayl mavjud emas:", err);
        initApp();
    }
}

// Bo'lim filtri ro'yxatini shakllantirish
function buildDeptFilter() {
    const deptSelect = document.getElementById("deptFilter");
    const currentVal = deptSelect ? deptSelect.value : "all";
    
    if (!deptSelect) return;

    const departments = [...new Set(EMPLOYEES.map(e => e.Bolim).filter(Boolean))];
    
    deptSelect.innerHTML = '<option value="all">Barcha bo\'limlar</option>';
    departments.forEach(dept => {
        const opt = document.createElement("option");
        opt.value = dept;
        opt.innerText = dept;
        deptSelect.appendChild(opt);
    });
    
    deptSelect.value = departments.includes(currentVal) ? currentVal : "all";
}

// INITIALS (Ism-familiya bosh harflari)
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

// SANA FORMATLASH (01-yanvar, 2026 shaklida)
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

// INTERFEYSNI TO'LIQ YANGILASH
function render() {
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
    if (countEl) {
        countEl.innerText = `${filtered.length} ta xodim topildi (Jami: ${EMPLOYEES.length})`;
    }

    const empList = document.getElementById("empList");
    if (!empList) return;

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

// Batafsil ma'lumot panelini chizish
function renderDetail() {
    const detailPanel = document.getElementById("detailPanel");
    if (!detailPanel) return;

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
    const pct = Math.min(100, Math.round((t.months / 60) * 100)); // 5 yillik faollik shkalasi

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

// 1. EXCEL/JSON IMPORT QILISH
function triggerImport() {
    document.getElementById("excelFileInput").click();
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'json') {
        reader.onload = async function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (Array.isArray(parsed)) {
                    const formatted = parsed.map(item => ({
                        ism: item.Ism || "",
                        familiya: item.Familiya || "",
                        pinfl: item.PINFL || "",
                        bolim: item.Bolim || "",
                        lavozim: item.Lavozim || "",
                        ish_sana: item["Ishga kirgan sana"] || "",
                        kuchli: item["Kuchli jihatlari"] || ""
                    }));

                    const { error } = await supabaseClient.from('employees').insert(formatted);
                    if (error) throw error;

                    await fetchEmployees();
                    alert(`Muvaffaqiyatli import qilindi!`);
                } else {
                    alert("JSON fayl noto'g'ri formatda.");
                }
            } catch (err) {
                alert("JSON o'qish yoki bazaga yuklashda xatolik.");
            }
        };
        reader.readAsText(file);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawJson = XLSX.utils.sheet_to_json(worksheet);
                
                if (rawJson.length > 0) {
                    const formatted = rawJson.map(row => ({
                        ism: row.Ism || row.Ismi || "",
                        familiya: row.Familiya || row.Familiyasi || "",
                        pinfl: row.PINFL || row.pinfl || "",
                        bolim: row.Bolim || row.Bo_lim || row["Bo'limi"] || row["Bo'lim"] || "",
                        lavozim: row.Lavozim || row.Lavozimi || "",
                        ish_sana: row["Ishga kirgan sana"] || row["Ishga_kirgan"] || row.Sana || "",
                        kuchli: row["Kuchli jihatlari"] || row["Kuchli_jihatlari"] || row.Kuchli || ""
                    }));

                    const { error } = await supabaseClient.from('employees').insert(formatted);
                    if (error) throw error;

                    await fetchEmployees();
                    alert(`Exceldan ma'lumotlar bazaga muvaffaqiyatli yuklandi!`);
                } else {
                    alert("Excel fayl bo'sh.");
                }
            } catch (err) {
                alert("Excel importda xatolik yuz berdi.");
            }
        };
        reader.readAsArrayBuffer(file);
    }
    event.target.value = ''; // Inputni tozalaymiz
}

// MODAL OYNALARNI BOSHQARISH
function openAddModal() {
    document.getElementById("modalTitle").innerText = "Yangi xodim qo'shish";
    document.getElementById("employeeForm").reset();
    document.getElementById("formEmployeeId").value = "";
    document.getElementById("saveBtn").innerText = "Tizimga qo'shish";
    document.getElementById("employeeModal").classList.add("active");
}

function openEditModal(id) {
    const e = EMPLOYEES.find(emp => emp.ID === id);
    if (!e) return;

    document.getElementById("modalTitle").innerText = "Xodim ma'lumotlarini tahrirlash";
    document.getElementById("formEmployeeId").value = e.ID;
    document.getElementById("formIsm").value = e.Ism || "";
    document.getElementById("formFamiliya").value = e.Familiya || "";
    document.getElementById("formPinfl").value = e.PINFL || "";
    document.getElementById("formBolim").value = e.Bolim || "";
    document.getElementById("formLavozim").value = e.Lavozim || "";
    
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

// FORM SAQLASH (SUPABASE: QO'SHISH VA TAHRIRLASH)
async function saveEmployee(event) {
    if (event) event.preventDefault();
    
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "Kuting...";
    }

    try {
        const idVal = document.getElementById("formEmployeeId").value;
        const ism = document.getElementById("formIsm").value;
        const familiya = document.getElementById("formFamiliya").value;
        const pinfl = document.getElementById("formPinfl").value;
        const bolim = document.getElementById("formBolim").value;
        const lavozim = document.getElementById("formLavozim").value;
        const ishSana = document.getElementById("formIshSana").value;
        const kuchli = document.getElementById("formKuchli").value;

        const payload = {
            ism: ism,
            familiya: familiya,
            pinfl: pinfl,
            bolim: bolim,
            lavozim: lavozim,
            ish_sana: ishSana,
            kuchli: kuchli
        };

        if (idVal) {
            // EDIT REJIM
            const { error } = await supabaseClient
                .from('employees')
                .update(payload)
                .eq('id', parseInt(idVal));

            if (error) throw error;
            alert("Xodim ma'lumotlari tahrirlandi!");
        } else {
            // ADD REJIM
            const { data, error } = await supabaseClient
                .from('employees')
                .insert([payload])
                .select();

            if (error) throw error;
            alert("Yangi xodim qo'shildi!");
            if (data && data.length > 0) {
                selectedId = data[0].id; // Yangi qo'shilganini tanlaymiz
            }
        }

        closeModal();
        await fetchEmployees(); // Ma'lumotlarni qayta yuklash va render qilish

    } catch (err) {
        console.error("Saqlashda xato:", err);
        alert("Xatolik yuz berdi: " + err.message);
    } finally {
        if (saveBtn) {
            const idVal = document.getElementById("formEmployeeId").value;
            saveBtn.disabled = false;
            saveBtn.innerText = idVal ? "O'zgarishlarni saqlash" : "Tizimga qo'shish";
        }
    }
}

// XODIMNI O'CHIRISH (DELETE)
async function deleteEmployee(id) {
    const e = EMPLOYEES.find(emp => emp.ID === id);
    if (!e) return;

    const conf = confirm(`${e.Ism} ${e.Familiya} xodimlar bazasidan butunlay o'chirilsinmi?`);
    if (conf) {
        const { error } = await supabaseClient
            .from('employees')
            .delete()
            .eq('id', id);

        if (error) {
            alert("O'chirishda xatolik yuz berdi: " + error.message);
        } else {
            alert("Xodim o'chirildi!");
            if (selectedId === id) selectedId = null;
            await fetchEmployees();
        }
    }
}

// EXCELGA YUKLAB OLISH (EXPORT)
function exportToExcel() {
    if (EMPLOYEES.length === 0) {
        alert("Eksport qilish uchun ma'lumot yo'q!");
        return;
    }

    try {
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

        const fileName = `Fortuna_Biznes_Xodimlar_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    } catch (err) {
        alert("Excelga yuklashda xatolik yuz berdi.");
        console.error(err);
    }
}