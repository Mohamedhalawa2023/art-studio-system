// =======================================================================
// ART STUDIO & ACADEMY MANAGEMENT SYSTEM (Dynamic SaaS Architecture)
// 100% Light Mode • Non-AI Human-Centric UI • Zero Hardcoded Logic
// Full Student ID Card (QR Badge) • Instant QR Attendance Scanner
// =======================================================================

// Application State Store
const state = {
  activeBranch: 'all',
  currentView: 'admin',
  currentAdminTab: 'overview',
  stats: null,
  settings: null,
  branches: [],
  courses: [],
  schedules: [],
  students: [],
  enrollments: [],
  expenses: [],
  gallery: [],
  selectedAttendanceSchedule: null,
  gateVoiceEnabled: true,
  gateAudioEnabled: true
};

// Initial App Startup
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  initGlobalBarcodeScanner();
  lucide.createIcons();
});

// Toast Notifications (Clean Light Design)
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600';
  toast.className = `${bg} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 z-50`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Pleasant Audio Synth Beep on successful QR scan
function playSuccessBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) {
    console.log('Audio feedback error:', e);
  }
}

// Global Data Loader
async function loadAllData() {
  try {
    const branchParam = state.activeBranch !== 'all' ? `?branchId=${state.activeBranch}` : '';

    const [statsRes, settingsRes, branchesRes, coursesRes, schedulesRes, studentsRes, enrollmentsRes, expensesRes, galleryRes] = await Promise.all([
      fetch(`/api/stats${branchParam}`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch(`/api/courses${branchParam}`).then(r => r.json()),
      fetch(`/api/schedules${branchParam}`).then(r => r.json()),
      fetch(`/api/students${branchParam}`).then(r => r.json()),
      fetch(`/api/enrollments${branchParam}`).then(r => r.json()),
      fetch(`/api/expenses${branchParam}`).then(r => r.json()),
      fetch(`/api/gallery${branchParam}`).then(r => r.json())
    ]);

    if (statsRes.success) state.stats = statsRes.stats;
    if (settingsRes.success) state.settings = settingsRes.data;
    if (branchesRes.success) state.branches = branchesRes.data;
    if (coursesRes.success) state.courses = coursesRes.data;
    if (schedulesRes.success) state.schedules = schedulesRes.data;
    if (studentsRes.success) state.students = studentsRes.data;
    if (enrollmentsRes.success) state.enrollments = enrollmentsRes.data;
    if (expensesRes.success) state.expenses = expensesRes.data;
    if (galleryRes.success) state.gallery = galleryRes.data;

    applySettings();
    updateHeaderBranchDropdown();
    renderCurrentView();
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('حدث خطأ في تحميل البيانات من الخادم', 'error');
  }
}

// Branch Filter Switcher
function changeBranch(branchId) {
  state.activeBranch = branchId;
  const bannerTitle = document.getElementById('bannerBranchName');
  if (bannerTitle) {
    if (branchId === 'all') {
      bannerTitle.textContent = 'لوحة التحكم المركزية لجميع المقرات';
    } else {
      const branch = state.branches.find(b => b.id === branchId);
      bannerTitle.textContent = branch ? `لوحة تحكم: ${branch.name}` : 'لوحة تحكم الفرع';
    }
  }
  loadAllData();
}

// View Mode Switcher (Admin Dashboard vs Student Portal)
function switchView(viewName) {
  state.currentView = viewName;
  const adminView = document.getElementById('adminView');
  const portalView = document.getElementById('portalView');
  const btnAdmin = document.getElementById('viewBtnAdmin');
  const btnPortal = document.getElementById('viewBtnPortal');

  if (viewName === 'admin') {
    adminView.classList.remove('hidden');
    portalView.classList.add('hidden');
    btnAdmin.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-indigo-600 text-white shadow-sm';
    btnPortal.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition';
  } else {
    adminView.classList.add('hidden');
    portalView.classList.remove('hidden');
    btnPortal.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-indigo-600 text-white shadow-sm';
    btnAdmin.className = 'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition';
  }
  renderCurrentView();
}

// Admin Tab Switcher (Light & Clean Active States)
function switchAdminTab(tabName) {
  // Stop gate camera if switching away from gate
  if (state.currentAdminTab === 'gate' && tabName !== 'gate') {
    stopGateCameraScanner();
  }

  state.currentAdminTab = tabName;
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.className = 'admin-tab flex items-center gap-2 px-4 py-2.5 rounded-xl transition text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold';
  });

  const activeSec = document.getElementById(`section-${tabName}`);
  const activeTabBtn = document.getElementById(`tab-${tabName}`);
  if (activeSec) activeSec.classList.remove('hidden');
  if (activeTabBtn) activeTabBtn.className = 'admin-tab active flex items-center gap-2 px-4 py-2.5 rounded-xl transition bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold shadow-sm';

  renderCurrentView();
}

// Render Master Dispatcher
function renderCurrentView() {
  if (state.currentView === 'admin') {
    switch (state.currentAdminTab) {
      case 'overview':
        renderOverview();
        break;
      case 'branches':
        renderBranches();
        break;
      case 'courses':
        renderCourses();
        break;
      case 'schedules':
        renderSchedules();
        break;
      case 'students':
        renderStudentsTable();
        break;
      case 'attendance':
        populateAttendanceSchedules();
        break;
      case 'gate':
        renderGateView();
        break;
      case 'finances':
        renderFinances();
        break;
      case 'gallery':
        renderGalleryAdmin();
        break;
      case 'settings':
        renderSettings();
        break;
    }
  } else {
    renderPortalView();
  }
  lucide.createIcons();
}

// -----------------------------------------------------------------------
// 1. OVERVIEW RENDERING (Light & Clean)
// -----------------------------------------------------------------------
function renderOverview() {
  const stats = state.stats || {};
  const curr = state.settings?.currency || 'ج.م';

  const kpiTotalStudents = document.getElementById('kpiTotalStudents');
  if (kpiTotalStudents) kpiTotalStudents.textContent = stats.totalStudentsCount || 0;

  const kpiOccupancyRate = document.getElementById('kpiOccupancyRate');
  if (kpiOccupancyRate) kpiOccupancyRate.textContent = `${stats.occupancyRate || 0}%`;

  const kpiSeatsSummary = document.getElementById('kpiSeatsSummary');
  if (kpiSeatsSummary) kpiSeatsSummary.textContent = `(${stats.totalBookedSeats || 0} / ${stats.totalMaxSeats || 0} مقعد)`;

  const kpiOccupancyBar = document.getElementById('kpiOccupancyBar');
  if (kpiOccupancyBar) kpiOccupancyBar.style.width = `${stats.occupancyRate || 0}%`;

  const kpiTotalIncome = document.getElementById('kpiTotalIncome');
  if (kpiTotalIncome) kpiTotalIncome.textContent = (stats.totalIncome || 0).toLocaleString();

  const kpiTotalPending = document.getElementById('kpiTotalPending');
  if (kpiTotalPending) kpiTotalPending.textContent = (stats.totalPending || 0).toLocaleString();

  const kpiTotalExpenses = document.getElementById('kpiTotalExpenses');
  if (kpiTotalExpenses) kpiTotalExpenses.textContent = (stats.totalExpenses || 0).toLocaleString();

  const kpiNetProfit = document.getElementById('kpiNetProfit');
  if (kpiNetProfit) kpiNetProfit.textContent = (stats.netProfit || 0).toLocaleString();

  // Recent Enrollments Table
  const enrollmentsBody = document.getElementById('overviewRecentEnrollmentsBody');
  if (enrollmentsBody) {
    const recent = [...state.enrollments].reverse().slice(0, 5);

    if (recent.length === 0) {
      enrollmentsBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500 font-medium">لا توجد اشتراكات مسجلة بعد</td></tr>`;
    } else {
      enrollmentsBody.innerHTML = recent.map(e => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="py-3 px-3 font-bold text-slate-900">
            ${e.studentName || 'طالب جديد'}
            <div class="text-[11px] text-slate-500 font-medium">${e.studentPhone || ''}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-bold text-indigo-700">${e.courseTitle || 'كورس'}</div>
            <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">${e.branchName || ''}</span>
          </td>
          <td class="py-3 px-3">
            <span class="text-emerald-700 font-black">${(e.paidAmount || 0).toLocaleString()}</span>
            <span class="text-slate-500 font-bold">/ ${(e.totalFee || 0).toLocaleString()} ${curr}</span>
          </td>
          <td class="py-3 px-3">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              e.paymentStatus === 'مدفوع بالكامل' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              e.paymentStatus === 'مدفوع جزء' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              'bg-rose-50 text-rose-700 border border-rose-200'
            }">
              ${e.paymentStatus || 'غير محدد'}
            </span>
          </td>
          <td class="py-3 px-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="openStudentCardModal('${e.studentId}')" title="عرض كارنيه الطالب (QR)" class="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition border border-indigo-200">
                <i data-lucide="badge" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="openArtEvaluationModal('${e.studentId}')" title="شهادة التميز وتقرير التطور الفني" class="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition border border-amber-300">
                <i data-lucide="award" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="openReceiptModal('${e.id}')" title="طباعة إيصال رسمي" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200">
                <i data-lucide="printer" class="w-3.5 h-3.5 text-slate-700"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  // Active Schedules Capacity
  const schedulesGrid = document.getElementById('overviewSchedulesGrid');
  if (schedulesGrid) {
    schedulesGrid.innerHTML = state.schedules.slice(0, 4).map(sch => {
      const isFull = sch.remainingSeats <= 0;
      return `
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 hover:border-indigo-200 transition">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-900 truncate max-w-[180px]">${sch.courseTitle || sch.groupName}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-md font-bold ${isFull ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${isFull ? 'مكتمل المقاعد' : `متبقي ${sch.remainingSeats} مقاعد`}
            </span>
          </div>
          <div class="text-[11px] text-slate-600 flex items-center justify-between font-medium">
            <span>${sch.days} (${sch.time})</span>
            <span class="text-indigo-700 font-bold">${sch.branchName}</span>
          </div>
          <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div class="${isFull ? 'bg-rose-500' : 'bg-indigo-600'} h-full rounded-full transition-all duration-300" style="width: ${sch.occupancyPercent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Branch Comparison Summary Cards
  const branchSummary = document.getElementById('overviewBranchSummaryCards');
  if (branchSummary) {
    branchSummary.innerHTML = state.branches.map(b => {
      const branchSchedules = state.schedules.filter(s => s.branchId === b.id);
      const branchEnrollments = state.enrollments.filter(e => e.branchId === b.id);
      const branchIncome = branchEnrollments.reduce((sum, e) => sum + (Number(e.paidAmount) || 0), 0);

      return `
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-900">${b.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold">${b.city}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200">
            <div>
              <div class="text-slate-500 text-[10px] font-bold">المجموعات</div>
              <div class="font-black text-slate-900">${branchSchedules.length}</div>
            </div>
            <div>
              <div class="text-slate-500 text-[10px] font-bold">الطلاب</div>
              <div class="font-black text-slate-900">${branchEnrollments.length}</div>
            </div>
            <div>
              <div class="text-slate-500 text-[10px] font-bold">التحصيل</div>
              <div class="font-black text-emerald-700">${branchIncome.toLocaleString()} ${curr}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// -----------------------------------------------------------------------
// 2. BRANCHES RENDERING (Dynamic & Editable SaaS)
// -----------------------------------------------------------------------
function renderBranches() {
  const container = document.getElementById('branchesContainer');
  if (!container) return;
  const curr = state.settings?.currency || 'ج.م';

  container.innerHTML = state.branches.map(b => {
    const branchSchedules = state.schedules.filter(s => s.branchId === b.id);
    const branchEnrollments = state.enrollments.filter(e => e.branchId === b.id);
    const branchExpenses = state.expenses.filter(e => e.branchId === b.id);
    const income = branchEnrollments.reduce((sum, e) => sum + (Number(e.paidAmount) || 0), 0);
    const expenses = branchExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm hover:shadow-md transition">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">${b.city}</span>
            <h3 class="text-lg font-black text-slate-900 mt-2">${b.name}</h3>
            <p class="text-xs text-slate-500 mt-1 font-medium">${b.address}</p>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <i data-lucide="building-2" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span class="text-slate-500 text-[11px] font-bold">القاعات</span>
            <div class="font-black text-slate-900 mt-0.5">${b.rooms} قاعات فنية</div>
          </div>
          <div>
            <span class="text-slate-500 text-[11px] font-bold">السعة القصوى</span>
            <div class="font-black text-amber-600 mt-0.5">${b.maxCapacity} مقعد</div>
          </div>
          <div>
            <span class="text-slate-500 text-[11px] font-bold">الطلاب المسجلين</span>
            <div class="font-black text-slate-900 mt-0.5">${branchEnrollments.length} طالب</div>
          </div>
          <div>
            <span class="text-slate-500 text-[11px] font-bold">صافي الدخل</span>
            <div class="font-black text-emerald-700 mt-0.5">${(income - expenses).toLocaleString()} ${curr}</div>
          </div>
        </div>

        <div class="space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
          <div class="flex items-center gap-2">
            <i data-lucide="user-check" class="w-4 h-4 text-slate-400"></i>
            <span>المشرف المسؤول: <b class="text-slate-900 font-bold">${b.manager}</b></span>
          </div>
          <div class="flex items-center gap-2">
            <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
            <span>رقم الهاتف (واتساب): <b class="text-slate-900 font-bold" dir="ltr">${b.phone}</b></span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="flex items-center gap-2">
            <button onclick="openEditBranchModal('${b.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              <span>تعديل بيانات الفرع</span>
            </button>
            <button onclick="deleteBranch('${b.id}')" class="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>حذف</span>
            </button>
          </div>
          <span class="text-[10px] text-slate-400 font-mono font-bold">${b.id}</span>
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------
// 3. COURSES RENDERING (Light & Clean Cards + Edit Option)
// -----------------------------------------------------------------------
function renderCourses() {
  const grid = document.getElementById('adminCoursesGrid');
  if (!grid) return;
  const curr = state.settings?.currency || 'ج.م';

  grid.innerHTML = state.courses.map(c => {
    const branchNames = (c.branches || []).map(bId => {
      const b = state.branches.find(x => x.id === bId);
      return b ? b.name : bId;
    }).join(' • ');

    return `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div class="relative h-44 overflow-hidden bg-slate-100">
          <img src="${c.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600'}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          <span class="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-indigo-700 font-bold border border-slate-200 shadow-sm">
            ${c.category}
          </span>
          <span class="absolute bottom-3 right-3 text-sm font-black text-white bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
            ${c.price.toLocaleString()} ${curr}
          </span>
        </div>

        <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-sm text-slate-900 leading-snug">${c.title}</h3>
            <p class="text-xs text-slate-600 mt-1 line-clamp-2">${c.description || ''}</p>
          </div>

          <div class="space-y-1.5 pt-2 border-t border-slate-100 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-bold">المدة والمستوى:</span>
              <span class="font-bold text-slate-800">${c.duration} (${c.level})</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-bold">المدرب:</span>
              <span class="font-bold text-indigo-700">${c.instructor || 'الفنان المسؤول'}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-bold">الفروع المتاحة:</span>
              <span class="font-bold text-amber-700">${branchNames || 'كل الفروع'}</span>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button onclick="openEnrollWithCourse('${c.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
                <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
                <span>تسجيل طالب</span>
              </button>
              <button onclick="openEditCourseModal('${c.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 border border-slate-200">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span>تعديل</span>
              </button>
            </div>
            <button onclick="deleteCourse('${c.id}')" title="حذف الكورس" class="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------
// 4. SCHEDULES & SEATS RENDERING (Light & Clean + Edit Option)
// -----------------------------------------------------------------------
function renderSchedules() {
  const grid = document.getElementById('adminSchedulesGrid');
  if (!grid) return;

  grid.innerHTML = state.schedules.map(sch => {
    const isFull = sch.remainingSeats <= 0;
    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm hover:shadow-md transition">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">${sch.branchName}</span>
            <h3 class="font-bold text-sm text-slate-900 mt-1.5">${sch.groupName || sch.courseTitle}</h3>
            <p class="text-xs text-indigo-700 font-bold">${sch.courseTitle}</p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-xl font-bold ${isFull ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
            ${isFull ? 'مكتمل' : `${sch.remainingSeats} شاغر`}
          </span>
        </div>

        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-bold">الموعد والأيام:</span>
            <span class="font-bold text-slate-900">${sch.days}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-bold">التوقيت:</span>
            <span class="font-bold text-slate-900">${sch.time}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-bold">القاعة / الاستوديو:</span>
            <span class="font-bold text-amber-700">${sch.room || 'القاعة الرئيسية'}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-bold">المدرب:</span>
            <span class="font-bold text-slate-800">${sch.instructor || '-'}</span>
          </div>
        </div>

        <!-- Seats Progress Bar -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500 font-bold">إشغال المقاعد:</span>
            <span class="font-bold text-slate-900">${sch.bookedSeats} من ${sch.maxSeats} مقعد (${sch.occupancyPercent}%)</span>
          </div>
          <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div class="${isFull ? 'bg-rose-500' : 'bg-indigo-600'} h-full rounded-full transition-all duration-300" style="width: ${sch.occupancyPercent}%"></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1.5">
            <button onclick="openEnrollWithSchedule('${sch.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm">
              <i data-lucide="ticket" class="w-3.5 h-3.5"></i>
              <span>حجز بالمجموعة</span>
            </button>
            <button onclick="openEditScheduleModal('${sch.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 border border-slate-200">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              <span>تعديل</span>
            </button>
          </div>
          <button onclick="deleteSchedule('${sch.id}')" title="حذف الموعد" class="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------
// 5. STUDENTS & ENROLLMENTS TABLE RENDERING (With QR Card Badge Action)
// -----------------------------------------------------------------------
function renderStudentsTable() {
  const tableBody = document.getElementById('adminStudentsTableBody');
  if (!tableBody) return;
  const curr = state.settings?.currency || 'ج.م';
  const query = (document.getElementById('studentsSearchInput')?.value || '').toLowerCase().trim();
  const paymentFilter = document.getElementById('studentsPaymentFilter')?.value || 'all';

  let list = state.enrollments;

  if (paymentFilter !== 'all') {
    if (paymentFilter === 'غير مدفوع') {
      list = list.filter(e => e.paymentStatus === 'غير مدفوع' || e.paymentStatus.includes('معلق'));
    } else {
      list = list.filter(e => e.paymentStatus === paymentFilter);
    }
  }

  if (query) {
    list = list.filter(e =>
      (e.studentName && e.studentName.toLowerCase().includes(query)) ||
      (e.studentPhone && e.studentPhone.includes(query)) ||
      (e.courseTitle && e.courseTitle.toLowerCase().includes(query)) ||
      (e.receiptNumber && e.receiptNumber.toLowerCase().includes(query))
    );
  }

  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500 font-medium">لا توجد اشتراكات مطابقة للبحث أو التصفية</td></tr>`;
    return;
  }

  tableBody.innerHTML = list.map(e => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-mono font-bold text-indigo-700">${e.receiptNumber || '-'}</td>
      <td class="py-3 px-4">
        <div class="font-bold text-slate-900">${e.studentName}</div>
        <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
          <span dir="ltr">${e.studentPhone || ''}</span>
        </div>
      </td>
      <td class="py-3 px-4">
        <div class="font-bold text-slate-900">${e.courseTitle}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold">${e.branchName}</span>
      </td>
      <td class="py-3 px-4 text-slate-700">
        <div class="font-bold">${e.scheduleDays || e.groupName || '-'}</div>
        <div class="text-[10px] text-slate-500">${e.scheduleTime || ''} (${e.scheduleRoom || ''})</div>
      </td>
      <td class="py-3 px-4">
        <div class="text-emerald-700 font-black">${(e.paidAmount || 0).toLocaleString()} ${curr}</div>
        ${e.remainingAmount > 0 ? `<div class="text-[10px] text-rose-600 font-bold">متبقي: ${e.remainingAmount.toLocaleString()} ${curr}</div>` : `<div class="text-[10px] text-slate-500 font-bold">مسدد بالكامل</div>`}
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium">${e.paymentMethod || '-'}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
          e.paymentStatus === 'مدفوع بالكامل' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          e.paymentStatus === 'مدفوع جزء' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
          'bg-rose-50 text-rose-700 border border-rose-200'
        }">
          ${e.paymentStatus || 'غير محدد'}
        </span>
      </td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="openStudentCardModal('${e.studentId}')" title="عرض وطباعة كارنيه وبطاقة الطالب (QR)" class="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition">
            <i data-lucide="badge" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="openArtEvaluationModal('${e.studentId}')" title="شهادة التميز الأكاديمي وتقرير التطور الفني" class="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 transition">
            <i data-lucide="award" class="w-3.5 h-3.5"></i>
          </button>
          ${e.remainingAmount > 0 ? `
            <button onclick="openPaymentUpdateModal('${e.id}')" title="تحصيل دفعة متبقية" class="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition">
              <i data-lucide="badge-dollar-sign" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
          <button onclick="openReceiptModal('${e.id}')" title="طباعة إيصال رسمي" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteEnrollment('${e.id}')" title="حذف الاشتراك" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterStudentsTable() {
  renderStudentsTable();
  lucide.createIcons();
}

// -----------------------------------------------------------------------
// 6. ATTENDANCE SHEET RENDERING (Light & Clean + QR Integration)
// -----------------------------------------------------------------------
function populateAttendanceSchedules() {
  const select = document.getElementById('attendanceScheduleSelect');
  const dateInput = document.getElementById('attendanceDateInput');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  if (select) {
    select.innerHTML = state.schedules.map(s => `
      <option value="${s.id}">${s.branchName} - ${s.groupName || s.courseTitle} (${s.days})</option>
    `).join('');
  }

  loadAttendanceSheet();
}

function loadAttendanceSheet() {
  const scheduleId = document.getElementById('attendanceScheduleSelect')?.value;
  const tableBody = document.getElementById('attendanceSheetTableBody');
  const countBadge = document.getElementById('attendanceSheetCountBadge');
  const sheetTitle = document.getElementById('attendanceSheetTitle');

  if (!tableBody) return;

  if (!scheduleId) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-medium">يرجى اختيار مجموعة</td></tr>`;
    return;
  }

  const sch = state.schedules.find(s => s.id === scheduleId);
  if (sch && sheetTitle) {
    sheetTitle.textContent = `كشف حضور: ${sch.groupName || sch.courseTitle} (${sch.branchName})`;
  }

  const enrolled = state.enrollments.filter(e => e.scheduleId === scheduleId);
  if (countBadge) countBadge.textContent = `${enrolled.length} طلاب مسجلين`;

  if (enrolled.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-medium">لا يوجد طلاب مسجلين في هذه المجموعة حتى الآن</td></tr>`;
    return;
  }

  tableBody.innerHTML = enrolled.map((e, index) => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100" data-student-id="${e.studentId}">
      <td class="py-3 px-4 font-mono text-slate-500 font-bold">${index + 1}</td>
      <td class="py-3 px-4">
        <div class="font-bold text-slate-900">${e.studentName}</div>
        <div class="text-[10px] text-slate-400 font-mono">ID: ${e.studentId}</div>
      </td>
      <td class="py-3 px-4 text-slate-500 font-medium" dir="ltr">${e.studentPhone || '-'}</td>
      <td class="py-3 px-4 text-center">
        <div class="inline-flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <label class="flex items-center gap-1.5 cursor-pointer text-emerald-700 font-bold text-xs">
            <input type="radio" name="att_status_${e.studentId}" value="حاضر" checked class="text-emerald-600 focus:ring-0">
            <span>حاضر</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer text-rose-700 font-bold text-xs">
            <input type="radio" name="att_status_${e.studentId}" value="غائب" class="text-rose-600 focus:ring-0">
            <span>غائب</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer text-amber-700 font-bold text-xs">
            <input type="radio" name="att_status_${e.studentId}" value="معتذر" class="text-amber-600 focus:ring-0">
            <span>معتذر</span>
          </label>
        </div>
      </td>
      <td class="py-3 px-4">
        <input type="text" placeholder="ملاحظة عن أداء الطالب اليوم..." class="att-note w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500">
      </td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="openStudentCardModal('${e.studentId}')" title="عرض كارنيه الطالب (QR)" class="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition">
            <i data-lucide="badge" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="openArtEvaluationModal('${e.studentId}')" title="شهادة التميز وتقرير التطور الفني" class="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition">
            <i data-lucide="award" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

function markAllAttendance(status) {
  document.querySelectorAll(`input[type="radio"][value="${status}"]`).forEach(r => r.checked = true);
  showToast(`تم تحديد الجميع كـ (${status})`, 'success');
}

async function saveAttendanceSheet() {
  const scheduleId = document.getElementById('attendanceScheduleSelect')?.value;
  const sessionDate = document.getElementById('attendanceDateInput')?.value;
  const sessionTopic = document.getElementById('attendanceTopicInput')?.value;

  const sch = state.schedules.find(s => s.id === scheduleId);
  const rows = document.querySelectorAll('#attendanceSheetTableBody tr[data-student-id]');

  const records = [];
  rows.forEach(r => {
    const studentId = r.getAttribute('data-student-id');
    const checkedRadio = r.querySelector(`input[name="att_status_${studentId}"]:checked`);
    const noteInput = r.querySelector('.att-note');
    records.push({
      studentId,
      status: checkedRadio ? checkedRadio.value : 'حاضر',
      note: noteInput ? noteInput.value : ''
    });
  });

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleId,
        branchId: sch ? sch.branchId : (state.branches[0]?.id || 'branch-1'),
        sessionDate,
        sessionTopic,
        records
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('تم حفظ كشف الحضور بنجاح!', 'success');
    }
  } catch (err) {
    showToast('فشل في حفظ الحضور', 'error');
  }
}

// -----------------------------------------------------------------------
// 7. FINANCES & EXPENSES RENDERING (Light & Clean)
// -----------------------------------------------------------------------
function renderFinances() {
  const stats = state.stats || {};
  const curr = state.settings?.currency || 'ج.م';

  const finInc = document.getElementById('financesTotalIncome');
  if (finInc) finInc.textContent = `${(stats.totalIncome || 0).toLocaleString()} ${curr}`;

  const finExp = document.getElementById('financesTotalExpenses');
  if (finExp) finExp.textContent = `${(stats.totalExpenses || 0).toLocaleString()} ${curr}`;

  const finNet = document.getElementById('financesNetProfit');
  if (finNet) finNet.textContent = `${(stats.netProfit || 0).toLocaleString()} ${curr}`;

  const tableBody = document.getElementById('expensesTableBody');
  if (!tableBody) return;

  if (state.expenses.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500 font-medium">لا توجد مصروفات مسجلة</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.expenses.map(exp => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-bold text-slate-900">${exp.title}</td>
      <td class="py-3 px-4"><span class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">${exp.branchName || 'الفرع'}</span></td>
      <td class="py-3 px-4 text-slate-600 font-medium">${exp.category || '-'}</td>
      <td class="py-3 px-4 font-black text-rose-600">${(exp.amount || 0).toLocaleString()} ${curr}</td>
      <td class="py-3 px-4 text-slate-500 font-medium">${exp.date}</td>
      <td class="py-3 px-4 text-slate-700 font-bold">${exp.recordedBy || '-'}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="deleteExpense('${exp.id}')" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------------------
// 8. GALLERY ADMIN RENDERING (Light & Clean)
// -----------------------------------------------------------------------
function renderGalleryAdmin() {
  const grid = document.getElementById('adminGalleryGrid');
  if (!grid) return;
  const curr = state.settings?.currency || 'ج.م';

  grid.innerHTML = state.gallery.map(art => `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div class="relative h-48 bg-slate-100">
        <img src="${art.image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600'}" class="w-full h-full object-cover">
        <span class="absolute top-2 right-2 text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm ${
          art.status === 'متاحة للبيع' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
        }">${art.status}</span>
        <span class="absolute bottom-2 left-2 text-xs font-black text-slate-900 px-2.5 py-1 rounded-lg bg-white/95 shadow-sm border border-slate-200">
          ${art.price.toLocaleString()} ${curr}
        </span>
      </div>
      <div class="p-4 space-y-2">
        <h3 class="font-bold text-sm text-slate-900">${art.title}</h3>
        <p class="text-[11px] text-slate-500 font-medium">${art.medium} (${art.dimensions})</p>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold">
          <span class="text-indigo-700">${art.branchName || ''}</span>
          <button onclick="deleteGalleryItem('${art.id}')" class="text-rose-600 hover:text-rose-700">حذف</button>
        </div>
      </div>
    </div>
  `).join('');
}

// -----------------------------------------------------------------------
// 9. STUDENT PORTAL RENDERING (Light & Artistic Exhibition)
// -----------------------------------------------------------------------
function renderPortalView() {
  const curr = state.settings?.currency || 'ج.م';

  // Render Courses
  const coursesGrid = document.getElementById('portalCoursesGrid');
  if (coursesGrid) {
    coursesGrid.innerHTML = state.courses.map(c => `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <div class="relative h-52 bg-slate-100">
          <img src="${c.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600'}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          <span class="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-indigo-700 font-bold border border-slate-200 shadow-sm">
            ${c.category}
          </span>
          <div class="absolute bottom-3 right-3 bg-slate-900/80 px-3 py-1 rounded-xl backdrop-blur-sm">
            <span class="text-xl font-black text-white">${c.price.toLocaleString()}</span>
            <span class="text-xs text-slate-200 font-bold">${curr} فقط</span>
          </div>
        </div>

        <div class="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">${c.title}</h3>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed font-medium">${c.description}</p>
          </div>

          <div class="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">المدة والمنهج:</span>
              <span class="font-bold text-slate-900">${c.duration}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">المستوى:</span>
              <span class="font-bold text-indigo-700">${c.level}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 font-bold">المدرب:</span>
              <span class="font-bold text-amber-700">${c.instructor}</span>
            </div>
          </div>

          <button onclick="openPortalBooking('${c.id}')" class="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
            <span>احجز مقعدك الآن أونلاين</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  // Render Art Gallery Exhibition
  const galleryGrid = document.getElementById('portalGalleryGrid');
  if (galleryGrid) {
    galleryGrid.innerHTML = state.gallery.map(art => `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition space-y-3 p-3">
        <div class="relative h-60 rounded-xl overflow-hidden group bg-slate-100">
          <img src="${art.image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600'}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60"></div>
          <span class="absolute top-2.5 right-2.5 text-[10px] px-2.5 py-1 rounded-full font-bold shadow-sm ${
            art.status === 'متاحة للبيع' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
          }">${art.status}</span>
        </div>

        <div class="px-2 space-y-1">
          <h4 class="font-bold text-sm text-slate-900">${art.title}</h4>
          <p class="text-xs text-slate-600 font-medium">${art.medium}</p>
          <p class="text-[11px] text-slate-500">المقاس: ${art.dimensions} • معروضة في ${art.branchName}</p>
          <div class="pt-2 flex items-center justify-between border-t border-slate-100">
            <span class="text-sm font-black text-emerald-700">${art.price.toLocaleString()} ${curr}</span>
            <button onclick="showToast('تم نسخ تفاصيل اللوحة، يرجى التواصل مع الفرع لمعاينتها أو شرائها', 'success')" class="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 transition">
              طلب اقتناء
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render Portal Branches Dynamically
  const pBranchesGrid = document.getElementById('portalBranchesGrid');
  if (pBranchesGrid) {
    pBranchesGrid.innerHTML = state.branches.map(b => `
      <div class="bg-white p-6 rounded-2xl border border-slate-200 relative overflow-hidden shadow-sm hover:shadow-md transition space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <i data-lucide="map-pin" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="font-bold text-base text-slate-900">${b.name}</h3>
            <p class="text-xs text-slate-500 font-medium">${b.city} - ${b.address}</p>
          </div>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed font-medium">
          يضم ${b.rooms} قاعات فنية متخصصة ومجهزة بأحدث حوامل الرسم وأدوات العمل الحر.
        </p>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-600 font-medium">هاتف وتواصل: <b class="text-slate-900 font-bold" dir="ltr">${b.phone}</b></span>
          <span class="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">سعة ${b.maxCapacity} مقعد</span>
        </div>
      </div>
    `).join('');
  }
}

// -----------------------------------------------------------------------
// 10. SAAS SETTINGS & SYSTEM BRANDING
// -----------------------------------------------------------------------
function applySettings() {
  if (!state.settings) return;
  const s = state.settings;

  if (document.getElementById('headerBrandTitle')) document.getElementById('headerBrandTitle').textContent = s.academyName || 'أكاديمية الفنون';
  if (document.getElementById('headerBadge')) document.getElementById('headerBadge').textContent = s.badgeText || 'خدمة SaaS';
  if (document.getElementById('headerSubtitle')) document.getElementById('headerSubtitle').textContent = s.academySubtitle || 'نظام إدارة المقرات، الكورسات والمعرض';
  if (document.getElementById('portalHeroTitle')) document.getElementById('portalHeroTitle').textContent = s.academyName || 'أكاديمية الفنون التشكيلية';
  if (document.getElementById('portalHeroSubtitle')) document.getElementById('portalHeroSubtitle').textContent = s.aboutText || s.academySubtitle || '';
  if (document.getElementById('portalBadgeText')) document.getElementById('portalBadgeText').textContent = s.badgeText || 'رحلتك الاحترافية في عالم الفن تبدأ هنا';
}

function renderSettings() {
  if (!state.settings) return;
  const s = state.settings;
  if (document.getElementById('settingsInputAcademyName')) document.getElementById('settingsInputAcademyName').value = s.academyName || '';
  if (document.getElementById('settingsInputSubtitle')) document.getElementById('settingsInputSubtitle').value = s.academySubtitle || '';
  if (document.getElementById('settingsInputOwner')) document.getElementById('settingsInputOwner').value = s.ownerName || '';
  if (document.getElementById('settingsInputCurrency')) document.getElementById('settingsInputCurrency').value = s.currency || 'ج.م';
  if (document.getElementById('settingsInputBadge')) document.getElementById('settingsInputBadge').value = s.badgeText || '';
  if (document.getElementById('settingsInputPhone')) document.getElementById('settingsInputPhone').value = s.primaryPhone || '';
  if (document.getElementById('settingsInputEmail')) document.getElementById('settingsInputEmail').value = s.primaryEmail || '';
  if (document.getElementById('settingsInputAbout')) document.getElementById('settingsInputAbout').value = s.aboutText || '';
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const payload = {
    academyName: document.getElementById('settingsInputAcademyName').value,
    academySubtitle: document.getElementById('settingsInputSubtitle').value,
    ownerName: document.getElementById('settingsInputOwner').value,
    currency: document.getElementById('settingsInputCurrency').value,
    badgeText: document.getElementById('settingsInputBadge').value,
    defaultTheme: 'canvas',
    primaryPhone: document.getElementById('settingsInputPhone').value,
    primaryEmail: document.getElementById('settingsInputEmail').value,
    aboutText: document.getElementById('settingsInputAbout').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      state.settings = res.data;
      applySettings();
      showToast('تم حفظ وتحديث إعدادات وبيانات الأكاديمية بنجاح!', 'success');
      await loadAllData();
    }
  } catch (err) {
    showToast('فشل في حفظ إعدادات النظام', 'error');
  }
}

// -----------------------------------------------------------------------
// 11. BRANCH MANAGEMENT (Add, Edit, Delete)
// -----------------------------------------------------------------------
async function handleNewBranchSubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('newBranchName').value,
    city: document.getElementById('newBranchCity').value,
    phone: document.getElementById('newBranchPhone').value,
    address: document.getElementById('newBranchAddress').value,
    manager: document.getElementById('newBranchManager').value,
    rooms: Number(document.getElementById('newBranchRooms').value),
    maxCapacity: Number(document.getElementById('newBranchCapacity').value)
  };

  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تمت إضافة وتفعيل الفرع الجديد بنجاح!', 'success');
      closeModal('newBranchModal');
      document.getElementById('newBranchForm').reset();
      await loadAllData();
    }
  } catch (err) {
    showToast('فشل في إضافة الفرع الجديد', 'error');
  }
}

function openEditBranchModal(branchId) {
  const branch = state.branches.find(b => b.id === branchId);
  if (!branch) return;
  document.getElementById('branchEditId').value = branch.id;
  document.getElementById('branchEditName').value = branch.name || '';
  document.getElementById('branchEditCity').value = branch.city || '';
  document.getElementById('branchEditPhone').value = branch.phone || '';
  document.getElementById('branchEditAddress').value = branch.address || '';
  document.getElementById('branchEditManager').value = branch.manager || '';
  document.getElementById('branchEditRooms').value = branch.rooms || 2;
  document.getElementById('branchEditCapacity').value = branch.maxCapacity || 30;
  openModal('branchEditModal');
}

async function handleBranchEditSubmit(e) {
  e.preventDefault();
  const branchId = document.getElementById('branchEditId').value;
  const payload = {
    name: document.getElementById('branchEditName').value,
    city: document.getElementById('branchEditCity').value,
    phone: document.getElementById('branchEditPhone').value,
    address: document.getElementById('branchEditAddress').value,
    manager: document.getElementById('branchEditManager').value,
    rooms: Number(document.getElementById('branchEditRooms').value),
    maxCapacity: Number(document.getElementById('branchEditCapacity').value)
  };

  try {
    const res = await fetch(`/api/branches/${branchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تم حفظ وتعديل بيانات الفرع بنجاح!', 'success');
      closeModal('branchEditModal');
      await loadAllData();
      updateHeaderBranchDropdown();
    } else {
      showToast(res.message || 'حدث خطأ في التعديل', 'error');
    }
  } catch (err) {
    showToast('فشل في حفظ بيانات الفرع', 'error');
  }
}

async function deleteBranch(branchId) {
  if (state.branches.length <= 1) {
    alert('تنبيه: يجب الإبقاء على مقر واحد على الأقل في النظام!');
    return;
  }
  if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;

  try {
    const res = await fetch(`/api/branches/${branchId}`, { method: 'DELETE' }).then(r => r.json());
    if (res.success) {
      showToast('تم حذف الفرع بنجاح', 'success');
      if (state.activeBranch === branchId) state.activeBranch = 'all';
      await loadAllData();
    }
  } catch (err) {
    showToast('فشل في حذف الفرع', 'error');
  }
}

// -----------------------------------------------------------------------
// 12. COURSE MANAGEMENT (Add, Edit, Delete)
// -----------------------------------------------------------------------
async function handleCourseSubmit(e) {
  e.preventDefault();
  const branches = Array.from(document.querySelectorAll('input[name="courseBranchCheckbox"]:checked')).map(cb => cb.value);
  if (branches.length === 0 && state.branches.length > 0) {
    branches.push(state.branches[0].id);
  }

  const payload = {
    title: document.getElementById('courseInputTitle').value,
    category: document.getElementById('courseInputCategory').value,
    level: document.getElementById('courseInputLevel').value,
    price: Number(document.getElementById('courseInputPrice').value),
    duration: document.getElementById('courseInputDuration').value,
    instructor: document.getElementById('courseInputInstructor').value,
    branches,
    image: document.getElementById('courseInputImage').value,
    description: document.getElementById('courseInputDesc').value
  };

  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تمت إضافة الكورس بنجاح!', 'success');
      closeModal('courseModal');
      document.getElementById('courseForm').reset();
      loadAllData();
    }
  } catch (err) {
    showToast('حدث خطأ أثناء حفظ الكورس', 'error');
  }
}

function openEditCourseModal(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;

  document.getElementById('courseEditId').value = course.id;
  document.getElementById('courseEditTitle').value = course.title || '';
  document.getElementById('courseEditCategory').value = course.category || 'رسم زيتي';
  document.getElementById('courseEditLevel').value = course.level || 'جميع المستويات';
  document.getElementById('courseEditPrice').value = course.price || 0;
  document.getElementById('courseEditDuration').value = course.duration || '';
  document.getElementById('courseEditInstructor').value = course.instructor || '';
  document.getElementById('courseEditImage').value = course.image || '';
  document.getElementById('courseEditDesc').value = course.description || '';

  const chkContainer = document.getElementById('courseEditBranchesCheckboxesContainer');
  if (chkContainer) {
    const courseBranches = course.branches || [];
    chkContainer.innerHTML = state.branches.map(b => `
      <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
        <input type="checkbox" name="courseEditBranchCheckbox" value="${b.id}" ${courseBranches.includes(b.id) ? 'checked' : ''} class="rounded text-indigo-600 focus:ring-0">
        <span>${b.name}</span>
      </label>
    `).join('');
  }

  openModal('courseEditModal');
}

async function handleCourseEditSubmit(e) {
  e.preventDefault();
  const courseId = document.getElementById('courseEditId').value;
  const branches = Array.from(document.querySelectorAll('input[name="courseEditBranchCheckbox"]:checked')).map(cb => cb.value);

  const payload = {
    title: document.getElementById('courseEditTitle').value,
    category: document.getElementById('courseEditCategory').value,
    level: document.getElementById('courseEditLevel').value,
    price: Number(document.getElementById('courseEditPrice').value),
    duration: document.getElementById('courseEditDuration').value,
    instructor: document.getElementById('courseEditInstructor').value,
    branches,
    image: document.getElementById('courseEditImage').value,
    description: document.getElementById('courseEditDesc').value
  };

  try {
    const res = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تم حفظ تعديلات الكورس بنجاح!', 'success');
      closeModal('courseEditModal');
      await loadAllData();
    }
  } catch (err) {
    showToast('فشل في حفظ تعديلات الكورس', 'error');
  }
}

async function deleteCourse(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;
  await fetch(`/api/courses/${id}`, { method: 'DELETE' });
  showToast('تم حذف الكورس', 'success');
  loadAllData();
}

// -----------------------------------------------------------------------
// 13. SCHEDULE MANAGEMENT (Add, Edit, Delete)
// -----------------------------------------------------------------------
async function handleScheduleSubmit(e) {
  e.preventDefault();
  const payload = {
    courseId: document.getElementById('schInputCourse').value,
    branchId: document.getElementById('schInputBranch').value,
    groupName: document.getElementById('schInputGroupName').value,
    days: document.getElementById('schInputDays').value,
    time: document.getElementById('schInputTime').value,
    room: document.getElementById('schInputRoom').value,
    maxSeats: Number(document.getElementById('schInputMaxSeats').value),
    instructor: document.getElementById('schInputInstructor').value,
    startDate: document.getElementById('schInputStartDate').value,
    status: 'نشط'
  };

  try {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تمت إضافة المجموعة والموعد بنجاح!', 'success');
      closeModal('scheduleModal');
      document.getElementById('scheduleForm').reset();
      loadAllData();
    }
  } catch (err) {
    showToast('حدث خطأ في إضافة الموعد', 'error');
  }
}

function openEditScheduleModal(scheduleId) {
  const sch = state.schedules.find(s => s.id === scheduleId);
  if (!sch) return;

  document.getElementById('schEditId').value = sch.id;
  document.getElementById('schEditGroupName').value = sch.groupName || '';
  document.getElementById('schEditDays').value = sch.days || '';
  document.getElementById('schEditTime').value = sch.time || '';
  document.getElementById('schEditRoom').value = sch.room || '';
  document.getElementById('schEditMaxSeats').value = sch.maxSeats || 10;
  document.getElementById('schEditInstructor').value = sch.instructor || '';
  document.getElementById('schEditStartDate').value = sch.startDate || '';

  const courseSel = document.getElementById('schEditCourse');
  if (courseSel) {
    courseSel.innerHTML = state.courses.map(c => `
      <option value="${c.id}" ${c.id === sch.courseId ? 'selected' : ''}>${c.title}</option>
    `).join('');
  }

  const branchSel = document.getElementById('schEditBranch');
  if (branchSel) {
    branchSel.innerHTML = state.branches.map(b => `
      <option value="${b.id}" ${b.id === sch.branchId ? 'selected' : ''}>${b.name}</option>
    `).join('');
  }

  openModal('scheduleEditModal');
}

async function handleScheduleEditSubmit(e) {
  e.preventDefault();
  const scheduleId = document.getElementById('schEditId').value;
  const payload = {
    courseId: document.getElementById('schEditCourse').value,
    branchId: document.getElementById('schEditBranch').value,
    groupName: document.getElementById('schEditGroupName').value,
    days: document.getElementById('schEditDays').value,
    time: document.getElementById('schEditTime').value,
    room: document.getElementById('schEditRoom').value,
    maxSeats: Number(document.getElementById('schEditMaxSeats').value),
    instructor: document.getElementById('schEditInstructor').value,
    startDate: document.getElementById('schEditStartDate').value
  };

  try {
    const res = await fetch(`/api/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تم حفظ تعديلات الموعد والمقاعد بنجاح!', 'success');
      closeModal('scheduleEditModal');
      await loadAllData();
    }
  } catch (err) {
    showToast('فشل في حفظ تعديلات الموعد', 'error');
  }
}

async function deleteSchedule(id) {
  if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
  await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
  showToast('تم حذف المجموعة والموعد', 'success');
  loadAllData();
}

// -----------------------------------------------------------------------
// 14. ENROLLMENTS & PAYMENT UPDATES
// -----------------------------------------------------------------------
async function handleEnrollmentSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('enrInputName').value;
  const phone = document.getElementById('enrInputPhone').value;
  const email = document.getElementById('enrInputEmail').value;
  const age = document.getElementById('enrInputAge').value;
  const branchId = document.getElementById('enrInputBranch').value;
  const courseId = document.getElementById('enrInputCourse').value;
  const scheduleId = document.getElementById('enrInputSchedule').value;
  const totalFee = Number(document.getElementById('enrInputTotalFee').value);
  const paidAmount = Number(document.getElementById('enrInputPaid').value);
  const paymentMethod = document.getElementById('enrInputPaymentMethod').value;
  const notes = document.getElementById('enrInputNotes').value;

  try {
    let student = state.students.find(s => s.phone === phone);
    if (!student) {
      const stdRes = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, age, branchId })
      }).then(r => r.json());
      student = stdRes.data;
    }

    const enrRes = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        courseId,
        scheduleId,
        branchId,
        totalFee,
        paidAmount,
        paymentMethod,
        notes
      })
    }).then(r => r.json());

    if (enrRes.success) {
      showToast('تم تسجيل الاشتراك وإصدار الإيصال!', 'success');
      closeModal('enrollmentModal');
      document.getElementById('enrollmentForm').reset();
      await loadAllData();
      openReceiptModal(enrRes.data.id);
    }
  } catch (err) {
    showToast('فشل في تسجيل الاشتراك', 'error');
  }
}

function openPaymentUpdateModal(enrollmentId) {
  const enr = state.enrollments.find(e => e.id === enrollmentId);
  if (!enr) return;
  const curr = state.settings?.currency || 'ج.م';

  document.getElementById('payUpdateEnrollmentId').value = enr.id;
  document.getElementById('payUpdateStudentName').textContent = enr.studentName || '-';
  document.getElementById('payUpdateCourseTitle').textContent = enr.courseTitle || '-';
  document.getElementById('payUpdateTotalFee').textContent = `${(enr.totalFee || 0).toLocaleString()} ${curr}`;
  document.getElementById('payUpdateAlreadyPaid').textContent = `${(enr.paidAmount || 0).toLocaleString()} ${curr}`;
  document.getElementById('payUpdateRemainingAmount').textContent = `${(enr.remainingAmount || 0).toLocaleString()} ${curr}`;
  document.getElementById('payUpdateAddAmount').value = enr.remainingAmount || 0;

  openModal('paymentUpdateModal');
}

async function handlePaymentUpdateSubmit(e) {
  e.preventDefault();
  const enrollmentId = document.getElementById('payUpdateEnrollmentId').value;
  const addAmount = Number(document.getElementById('payUpdateAddAmount').value) || 0;
  const paymentMethod = document.getElementById('payUpdateMethod').value;
  const note = document.getElementById('payUpdateNotes').value;

  const enr = state.enrollments.find(x => x.id === enrollmentId);
  if (!enr) return;

  const newPaidAmount = (Number(enr.paidAmount) || 0) + addAmount;

  try {
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paidAmount: newPaidAmount,
        paymentMethod,
        notes: enr.notes ? `${enr.notes} | ${note}` : note
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('تم تسجيل الدفعة وتحديث الرصيد!', 'success');
      closeModal('paymentUpdateModal');
      await loadAllData();
      openReceiptModal(enrollmentId);
    }
  } catch (err) {
    showToast('فشل في تحديث الدفعة', 'error');
  }
}

async function deleteEnrollment(id) {
  if (!confirm('هل أنت متأكد من إلغاء وحذف هذا الاشتراك؟')) return;
  await fetch(`/api/enrollments/${id}`, { method: 'DELETE' });
  showToast('تم حذف الاشتراك', 'success');
  loadAllData();
}

// -----------------------------------------------------------------------
// 15. EXPENSES & GALLERY MANAGEMENT
// -----------------------------------------------------------------------
async function handleExpenseSubmit(e) {
  e.preventDefault();
  const payload = {
    branchId: document.getElementById('expInputBranch').value,
    title: document.getElementById('expInputTitle').value,
    amount: Number(document.getElementById('expInputAmount').value),
    category: document.getElementById('expInputCategory').value,
    recordedBy: document.getElementById('expInputRecordedBy').value
  };

  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تم تسجيل سند المصروف بنجاح!', 'success');
      closeModal('expenseModal');
      document.getElementById('expenseForm').reset();
      loadAllData();
    }
  } catch (err) {
    showToast('حدث خطأ في تسجيل المصروف', 'error');
  }
}

async function deleteExpense(id) {
  if (!confirm('هل أنت متأكد من حذف سند الصرف؟')) return;
  await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  showToast('تم حذف المصروف', 'success');
  loadAllData();
}

async function handleGallerySubmit(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('artInputTitle').value,
    medium: document.getElementById('artInputMedium').value,
    dimensions: document.getElementById('artInputDimensions').value,
    price: Number(document.getElementById('artInputPrice').value),
    status: document.getElementById('artInputStatus').value,
    branchId: document.getElementById('artInputBranch').value,
    image: document.getElementById('artInputImage').value,
    description: document.getElementById('artInputDesc').value
  };

  try {
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تمت إضافة اللوحة لمعرض الفنان!', 'success');
      closeModal('galleryModal');
      document.getElementById('galleryForm').reset();
      loadAllData();
    }
  } catch (err) {
    showToast('فشل في حفظ اللوحة', 'error');
  }
}

async function deleteGalleryItem(id) {
  if (!confirm('هل أنت متأكد من حذف هذه اللوحة؟')) return;
  await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
  showToast('تم حذف اللوحة', 'success');
  loadAllData();
}

// -----------------------------------------------------------------------
// 16. STUDENT LOOKUP & PUBLIC BOOKING
// -----------------------------------------------------------------------
function openPortalBooking(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;
  const curr = state.settings?.currency || 'ج.م';

  document.getElementById('portalBookCourseId').value = course.id;
  document.getElementById('portalBookingCourseSub').textContent = `حجز في كورس: ${course.title}`;
  document.getElementById('portalBookPriceTag').textContent = `${course.price.toLocaleString()} ${curr}`;

  filterPortalBookingSchedules();
  openModal('portalBookingModal');
}

function filterPortalBookingSchedules() {
  const courseId = document.getElementById('portalBookCourseId').value;
  const branchId = document.getElementById('portalBookBranch').value;
  const scheduleSelect = document.getElementById('portalBookSchedule');

  const matching = state.schedules.filter(s => s.courseId === courseId && s.branchId === branchId);
  if (matching.length === 0) {
    scheduleSelect.innerHTML = `<option value="">لا توجد مواعيد متاحة حالياً في هذا الفرع</option>`;
  } else {
    scheduleSelect.innerHTML = matching.map(s => `
      <option value="${s.id}">${s.days} (${s.time}) - متبقي ${s.remainingSeats} مقاعد</option>
    `).join('');
  }
}

async function handlePortalBookingSubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('portalBookName').value,
    phone: document.getElementById('portalBookPhone').value,
    age: document.getElementById('portalBookAge').value,
    courseId: document.getElementById('portalBookCourseId').value,
    branchId: document.getElementById('portalBookBranch').value,
    scheduleId: document.getElementById('portalBookSchedule').value,
    notes: document.getElementById('portalBookNotes').value
  };

  try {
    const res = await fetch('/api/public/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      closeModal('portalBookingModal');
      document.getElementById('portalBookingForm').reset();
      showToast(res.message, 'success');
      loadAllData();
    } else {
      showToast(res.message || 'فشل في إتمام الحجز', 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال بالخادم', 'error');
  }
}

async function performStudentLookup() {
  const phone = document.getElementById('lookupPhoneInput').value.trim();
  const resultsDiv = document.getElementById('lookupResultsContainer');
  const curr = state.settings?.currency || 'ج.م';

  if (!phone) {
    showToast('يرجى إدخال رقم الهاتف', 'error');
    return;
  }

  resultsDiv.innerHTML = `<div class="text-center py-4 text-slate-500 font-bold">جاري البحث...</div>`;

  try {
    const res = await fetch(`/api/public/lookup?query=${encodeURIComponent(phone)}`).then(r => r.json());
    if (res.success && res.data) {
      const { student, enrollments } = res.data;
      if (enrollments.length === 0) {
        resultsDiv.innerHTML = `<div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-600 font-bold">لا توجد ورش مسجلة لهذا الطالب حالياً.</div>`;
        return;
      }

      resultsDiv.innerHTML = `
        <div class="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-slate-900 font-bold text-xs flex justify-between items-center gap-2">
          <div>
            <span>مرحباً، <b>${student.name}</b></span>
            <span class="text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 mr-2 font-bold">${enrollments.length} اشتراك مسجل</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="openStudentCardModal('${student.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-sm transition text-[11px]">
              <i data-lucide="badge" class="w-3.5 h-3.5"></i>
              <span>الكارنيه</span>
            </button>
            <button onclick="openArtEvaluationModal('${student.id}')" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 shadow-sm transition text-[11px]">
              <i data-lucide="award" class="w-3.5 h-3.5"></i>
              <span>الشهادة الفنية</span>
            </button>
          </div>
        </div>
        ${enrollments.map(enr => `
          <div class="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs shadow-xs">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-bold text-slate-900 text-xs">${enr.courseTitle}</h4>
                <p class="text-[11px] text-indigo-700 font-bold">${enr.branchName}</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${enr.paymentStatus === 'مدفوع بالكامل' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
                ${enr.paymentStatus}
              </span>
            </div>
            <div class="text-[11px] text-slate-600 pt-2 border-t border-slate-100 space-y-1 font-medium">
              <div>المواعيد: <b class="text-slate-900">${enr.days} (${enr.time})</b></div>
              <div>المكان: <b class="text-slate-900">${enr.room}</b></div>
              <div>المدرب: <b class="text-slate-900">${enr.instructor}</b></div>
              <div class="flex justify-between pt-1 text-slate-700 border-t border-slate-100">
                <span>المسدد: <b class="text-emerald-700">${enr.paidAmount} ${curr}</b></span>
                <span>المتبقي: <b class="text-rose-600">${enr.remainingAmount} ${curr}</b></span>
              </div>
            </div>
          </div>
        `).join('')}
      `;
      lucide.createIcons();
    } else {
      resultsDiv.innerHTML = `<div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-rose-600 font-bold">لم يتم العثور على اشتراكات مسجلة برقم الهاتف هذا.</div>`;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-rose-600 font-bold">حدث خطأ أثناء البحث</div>`;
  }
}

// -----------------------------------------------------------------------
// 17. OFFICIAL PRINTABLE RECEIPT
// -----------------------------------------------------------------------
function openReceiptModal(enrollmentId) {
  const enr = state.enrollments.find(e => e.id === enrollmentId);
  if (!enr) return;

  const branch = state.branches.find(b => b.id === enr.branchId) || {};
  const curr = state.settings?.currency || 'ج.م';
  const academyTitleEl = document.querySelector('#printReceiptArea h2');
  if (academyTitleEl && state.settings?.academyName) {
    academyTitleEl.textContent = state.settings.academyName;
  }

  document.getElementById('receiptBranchName').textContent = `${branch.name || 'فرع الأكاديمية'}`;
  document.getElementById('receiptBranchAddress').textContent = branch.address || '';
  document.getElementById('receiptNumberTag').textContent = enr.receiptNumber || 'REC-001';
  document.getElementById('receiptDateTag').textContent = `التاريخ: ${enr.enrollmentDate || new Date().toISOString().slice(0, 10)}`;

  document.getElementById('receiptStudentName').textContent = enr.studentName || '-';
  document.getElementById('receiptStudentPhone').textContent = enr.studentPhone || '-';
  document.getElementById('receiptCourseTitle').textContent = enr.courseTitle || '-';
  document.getElementById('receiptScheduleDetails').textContent = `${enr.scheduleDays || ''} (${enr.scheduleTime || ''})`;
  document.getElementById('receiptRoomDetails').textContent = enr.scheduleRoom || 'القاعة المخصصة';

  document.getElementById('receiptTotalFee').textContent = `${(enr.totalFee || 0).toLocaleString()} ${curr}`;
  document.getElementById('receiptPaid').textContent = `${(enr.paidAmount || 0).toLocaleString()} ${curr}`;
  document.getElementById('receiptRemaining').textContent = `${(enr.remainingAmount || 0).toLocaleString()} ${curr}`;
  document.getElementById('receiptPaymentMethod').textContent = enr.paymentMethod || 'نقدي (كاش)';

  openModal('receiptModal');
}

function printReceipt() {
  document.body.classList.add('printing-receipt');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-receipt');
  }, 1000);
}

// -----------------------------------------------------------------------
// 18. STUDENT MEMBERSHIP CARD & QR CODE (كارت وكارنيه الطالب)
// -----------------------------------------------------------------------
async function openStudentCardModal(studentId) {
  try {
    currentStudentCardId = studentId;
    const res = await fetch(`/api/students/${studentId}/card`).then(r => r.json());
    if (!res.success || !res.card) {
      showToast('لم يتم العثور على بيانات كارت الطالب', 'error');
      return;
    }
    const c = res.card;
    document.getElementById('cardAcademyName').textContent = c.academyName || state.settings?.academyName || 'أكاديمية الفنون التشكيلية';
    document.getElementById('cardAcademySubtitle').textContent = c.academySubtitle || state.settings?.academySubtitle || 'المرسم الأكاديمي المعتمد';
    document.getElementById('cardStudentName').textContent = c.studentName || '-';
    document.getElementById('cardStudentIdTag').textContent = `ID: ${c.studentId.toUpperCase()}`;
    document.getElementById('cardCourseTitle').textContent = c.courseTitle || '-';
    document.getElementById('cardBranchName').textContent = c.branchName || '-';
    document.getElementById('cardScheduleDetails').textContent = c.groupName || `${c.days || ''} (${c.time || ''})`;
    document.getElementById('cardStudentPhone').textContent = c.studentPhone || '-';
    document.getElementById('cardBackPhone').textContent = c.branchPhone || state.settings?.primaryPhone || '-';

    // Set QR code image from Data URL
    const qrImg = document.getElementById('cardQrImage');
    if (qrImg) {
      qrImg.src = c.qrDataUrl || '';
    }

    // Reset card face to front
    const front = document.getElementById('studentCardFront');
    const back = document.getElementById('studentCardBack');
    const toggleBtn = document.getElementById('toggleCardFaceBtn');
    if (front && back) {
      front.classList.remove('hidden');
      back.classList.add('hidden');
      if (toggleBtn) toggleBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>قلب الكارت (الظهر)</span>`;
    }

    openModal('studentCardModal');
    lucide.createIcons();
  } catch (err) {
    showToast('حدث خطأ في استخراج بيانات الكارنيه', 'error');
  }
}

function toggleCardFace() {
  const front = document.getElementById('studentCardFront');
  const back = document.getElementById('studentCardBack');
  const toggleBtn = document.getElementById('toggleCardFaceBtn');
  if (!front || !back) return;

  if (front.classList.contains('hidden')) {
    front.classList.remove('hidden');
    back.classList.add('hidden');
    if (toggleBtn) toggleBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>قلب الكارت (الظهر)</span>`;
  } else {
    front.classList.add('hidden');
    back.classList.remove('hidden');
    if (toggleBtn) toggleBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i><span>وجه الكارنيه</span>`;
  }
  lucide.createIcons();
}

function printStudentCard() {
  document.body.classList.add('printing-card');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-card');
  }, 1000);
}

// -----------------------------------------------------------------------
// 19. INSTANT QR CODE ATTENDANCE SCANNER (كاميرا ومسح الحضور)
// -----------------------------------------------------------------------
let html5QrCodeScanner = null;
let lastScannedStudentId = null;
let lastScanTime = 0;

function openQRScannerModal() {
  const schSelect = document.getElementById('attendanceScheduleSelect');
  const activeSchName = schSelect && schSelect.options[schSelect.selectedIndex] ? schSelect.options[schSelect.selectedIndex].text : 'المجموعة المحددة';
  const label = document.getElementById('qrScannerCurrentScheduleName');
  if (label) label.textContent = activeSchName;

  const banner = document.getElementById('qrScanFeedbackBanner');
  if (banner) banner.classList.add('hidden');

  openModal('qrScannerModal');
  startCameraScanner();
}

function closeQRScannerModal() {
  stopCameraScanner();
  closeModal('qrScannerModal');
}

async function startCameraScanner() {
  const statusText = document.getElementById('qrCameraStatusText');

  if (typeof Html5Qrcode === 'undefined') {
    if (statusText) statusText.textContent = 'مكتبة الكاميرا غير محملة. استخدم الإدخال السريع أو قارئ الباركود.';
    return;
  }

  try {
    if (html5QrCodeScanner) {
      await html5QrCodeScanner.stop().catch(() => {});
    }

    html5QrCodeScanner = new Html5Qrcode("qrReaderViewport");
    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      if (statusText) statusText.textContent = 'لم يتم العثور على كاميرا موصولة بالجهاز.';
      return;
    }

    const cameraId = cameras[cameras.length - 1].id;
    if (statusText) statusText.textContent = 'الكاميرا تعمل.. وجّه كود QR الموجود بالكارنيه نحو المربع';

    await html5QrCodeScanner.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 220, height: 220 }
      },
      (decodedText) => {
        handleScannedQRCode(decodedText);
      },
      (errorMessage) => {
        // ongoing frame scanning errors ignored
      }
    );
  } catch (err) {
    console.error('Camera start error:', err);
    if (statusText) statusText.textContent = 'تعذر تشغيل الكاميرا (يرجى السماح بصلاحية الكاميرا في المتصفح).';
  }
}

async function stopCameraScanner() {
  if (html5QrCodeScanner) {
    try {
      await html5QrCodeScanner.stop();
    } catch (e) {}
    html5QrCodeScanner = null;
  }
}

async function handleScannedQRCode(decodedText) {
  const now = Date.now();
  if (decodedText === lastScannedStudentId && now - lastScanTime < 2500) {
    return;
  }

  lastScannedStudentId = decodedText;
  lastScanTime = now;

  const scheduleId = document.getElementById('attendanceScheduleSelect')?.value || null;
  const sessionDate = document.getElementById('attendanceDateInput')?.value || null;

  try {
    const res = await fetch('/api/attendance/scan-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qrData: decodedText,
        scheduleId,
        sessionDate
      })
    }).then(r => r.json());

    if (res.success && res.data) {
      playWelcomeChord();
      speakWelcomeGreeting(res.data.student.name, res.data.course.title);
      showScanFeedbackSuccess(res.data);
      showToast(`✅ ${res.message}`, 'success');
      loadAttendanceSheet();
    } else {
      playSuccessBeep();
      showScanFeedbackError(res.message || 'كود غير معروف');
      showToast(res.message || 'كود غير معروف', 'error');
    }
  } catch (err) {
    showScanFeedbackError('فشل الاتصال بالخادم أثناء تسجيل الحضور');
  }
}

function showScanFeedbackSuccess(data) {
  const banner = document.getElementById('qrScanFeedbackBanner');
  if (!banner) return;
  banner.className = 'p-3.5 rounded-2xl border bg-emerald-50 border-emerald-200 text-xs space-y-1 block shadow-xs';
  banner.innerHTML = `
    <div class="flex items-center justify-between font-bold text-emerald-950">
      <span class="flex items-center gap-1.5 text-emerald-700">
        <i data-lucide="check-circle-2" class="w-4 h-4"></i>
        <span>تم تسجيل الحضور بنجاح!</span>
      </span>
      <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold">${data.time}</span>
    </div>
    <div class="font-black text-sm text-slate-900 mt-1">${data.student.name}</div>
    <div class="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-emerald-100 font-medium">
      <span>الكورس: <b class="text-indigo-700">${data.course.title}</b></span>
      <span>المجموعة: <b class="text-slate-800">${data.schedule.groupName}</b></span>
    </div>
  `;
  lucide.createIcons();
}

function showScanFeedbackError(msg) {
  const banner = document.getElementById('qrScanFeedbackBanner');
  if (!banner) return;
  banner.className = 'p-3 rounded-2xl border bg-rose-50 border-rose-200 text-xs text-rose-700 font-bold block';
  banner.innerHTML = `
    <div class="flex items-center gap-1.5">
      <i data-lucide="alert-circle" class="w-4 h-4"></i>
      <span>${msg}</span>
    </div>
  `;
  lucide.createIcons();
}

function handleQuickScannerKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    processQuickScannerInput();
  }
}

function processQuickScannerInput() {
  const input = document.getElementById('quickScannerInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  handleScannedQRCode(val);
}

// -----------------------------------------------------------------------
// 19.5 AUDIO CHIMES & SPEECH SYNTHESIS (الصوت والترحيب الآلي)
// -----------------------------------------------------------------------
function playSuccessBeep() {
  if (!state.gateAudioEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function playWelcomeChord() {
  if (!state.gateAudioEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const chord = [523.25, 659.25, 783.99]; // C5, E5, G5 Major
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
    });
  } catch (e) {}
}

function speakWelcomeGreeting(studentName, courseTitle) {
  if (!state.gateVoiceEnabled) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanName = (studentName || '').split(' ')[0] || studentName;
    const text = `مرحباً بك يا ${cleanName} في المرسم، نتمنى لك حصة إبداعية ممتعة!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

// -----------------------------------------------------------------------
// 19.6 GLOBAL BARCODE SCANNER INTERCEPTOR (المسح في أي مكان بالنظام)
// -----------------------------------------------------------------------
let globalScanBuffer = '';
let lastScanKeyTime = 0;

function initGlobalBarcodeScanner() {
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isSpecialInput = activeEl && (activeEl.id === 'gateQuickInput' || activeEl.id === 'quickScannerInput');
    const isOtherInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !isSpecialInput;

    const now = Date.now();
    const timeDiff = now - lastScanKeyTime;
    lastScanKeyTime = now;

    if (e.key === 'Enter') {
      if (globalScanBuffer.length >= 3) {
        const potentialCode = globalScanBuffer.trim();
        if (potentialCode.startsWith('ATELIER-') || potentialCode.startsWith('STD:') || potentialCode.startsWith('std-') || potentialCode.startsWith('stu-') || potentialCode.startsWith('01') || timeDiff < 100) {
          if (!isSpecialInput) {
            e.preventDefault();
            processGateEntry(potentialCode, state.currentAdminTab !== 'gate');
          }
          globalScanBuffer = '';
          return;
        }
      }
      globalScanBuffer = '';
    } else if (e.key.length === 1) {
      if (timeDiff > 160 && !isOtherInput) {
        globalScanBuffer = '';
      }
      globalScanBuffer += e.key;
    }
  });
}

// -----------------------------------------------------------------------
// 19.7 SMART GATE & RECEPTION KIOSK (بوابة الدخول الذكية)
// -----------------------------------------------------------------------
let gateCameraScanner = null;
let gateClockInterval = null;
let gateCountdownInterval = null;
let gateResetTimer = null;
let currentGateStudentId = null;
let lastGateScanText = '';
let lastGateScanTime = 0;

function renderGateView() {
  startGateClock();
  startGateCameraScanner();
  updateGateKpis();
  loadGateTodayLog();
  const input = document.getElementById('gateQuickInput');
  if (input) setTimeout(() => input.focus(), 250);
}

function startGateClock() {
  if (gateClockInterval) clearInterval(gateClockInterval);
  const updateClock = () => {
    const clockEl = document.getElementById('gateLiveClock');
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  updateClock();
  gateClockInterval = setInterval(updateClock, 1000);
}

async function startGateCameraScanner() {
  const badge = document.getElementById('gateCameraBadge');
  if (typeof Html5Qrcode === 'undefined') {
    if (badge) badge.textContent = 'المكتبة غير محملة';
    return;
  }

  try {
    if (gateCameraScanner) {
      await gateCameraScanner.stop().catch(() => {});
    }

    gateCameraScanner = new Html5Qrcode('gateCameraViewport');
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      if (badge) {
        badge.textContent = 'الكاميرا غير متصلة';
        badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold';
      }
      return;
    }

    const cameraId = cameras[cameras.length - 1].id;
    if (badge) {
      badge.textContent = 'الكاميرا نشطة وجاهزة للمسح';
      badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
    }

    await gateCameraScanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 230, height: 230 } },
      (decodedText) => {
        processGateEntry(decodedText, false);
      },
      (err) => {}
    );
  } catch (err) {
    console.error('Gate camera error:', err);
    if (badge) {
      badge.textContent = 'بانتظار إذن الكاميرا';
      badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold';
    }
  }
}

async function stopGateCameraScanner() {
  if (gateCameraScanner) {
    try {
      await gateCameraScanner.stop();
    } catch (e) {}
    gateCameraScanner = null;
  }
}

async function processGateEntry(qrData, isGlobal = false) {
  if (!qrData) return;
  const now = Date.now();
  if (qrData === lastGateScanText && now - lastGateScanTime < 3000) {
    return;
  }
  lastGateScanText = qrData;
  lastGateScanTime = now;

  try {
    const res = await fetch('/api/attendance/scan-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData: qrData.trim() })
    }).then(r => r.json());

    if (res.success && res.data) {
      const d = res.data;
      currentGateStudentId = d.student.id;

      playWelcomeChord();
      speakWelcomeGreeting(d.student.name, d.course.title);
      showToast(`🎨 أهلاً بك يا ${d.student.name}!`, 'success');

      if (state.currentAdminTab === 'gate' && !isGlobal) {
        displayGateWelcomeCard(d);
      } else {
        displayGlobalGateModal(d);
      }

      loadGateTodayLog();
      updateGateKpis();
    } else {
      playSuccessBeep();
      showToast(res.message || 'لم يتم التعرف على كود الكارنيه', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ أثناء الاتصال بالخادم لمسح الكارت', 'error');
  }
}

function displayGateWelcomeCard(data) {
  const idleState = document.getElementById('gateIdleState');
  const welcomeCard = document.getElementById('gateWelcomeCard');
  if (!idleState || !welcomeCard) return;

  idleState.classList.add('hidden');
  welcomeCard.classList.remove('hidden');

  const firstLetter = (data.student.name || 'ط').trim()[0];
  document.getElementById('gateCardAvatar').textContent = firstLetter;
  document.getElementById('gateCardStudentName').textContent = data.student.name;
  document.getElementById('gateCardStudentId').textContent = data.student.id.toUpperCase();
  document.getElementById('gateCardStudentPhone').textContent = data.student.phone || '-';
  document.getElementById('gateCardBranchName').textContent = data.branch.name || '-';
  document.getElementById('gateCardCourseTitle').textContent = data.course.title || 'دورة فنية تشكيلية';
  document.getElementById('gateCardRoom').textContent = data.schedule.room || 'القاعة الرئيسية';
  document.getElementById('gateCardInstructor').textContent = data.schedule.instructor || 'الفنان المسؤول';
  document.getElementById('gateCardScheduleDetails').textContent = data.schedule.groupName || `${data.schedule.days || ''} (${data.schedule.time || ''})`;

  const statsText = `الحصة ${data.stats.attendedCount} من ${data.stats.totalSessions}`;
  document.getElementById('gateCardSessionStats').textContent = statsText;

  const paymentBadge = document.getElementById('gateCardPaymentStatus');
  if (paymentBadge) {
    paymentBadge.textContent = data.payment.status;
    paymentBadge.className = data.payment.remainingAmount === 0 
      ? 'font-bold block text-emerald-700' 
      : 'font-bold block text-amber-700';
  }

  document.getElementById('gateCardEntryTime').textContent = data.time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  startGateCountdown(4);
  lucide.createIcons();
}

function startGateCountdown(seconds = 4) {
  if (gateCountdownInterval) clearInterval(gateCountdownInterval);
  if (gateResetTimer) clearTimeout(gateResetTimer);

  let remaining = seconds;
  const countEl = document.getElementById('gateCountdownSeconds');
  const bar = document.getElementById('gateCountdownProgressBar');

  if (countEl) countEl.textContent = remaining;
  if (bar) {
    bar.classList.remove('countdown-bar-active');
    void bar.offsetWidth;
    bar.classList.add('countdown-bar-active');
  }

  gateCountdownInterval = setInterval(() => {
    remaining--;
    if (countEl) countEl.textContent = Math.max(0, remaining);
    if (remaining <= 0) {
      clearInterval(gateCountdownInterval);
      resetGateToIdle();
    }
  }, 1000);
}

function resetGateToIdle() {
  if (gateCountdownInterval) clearInterval(gateCountdownInterval);
  if (gateResetTimer) clearTimeout(gateResetTimer);

  const idleState = document.getElementById('gateIdleState');
  const welcomeCard = document.getElementById('gateWelcomeCard');
  if (idleState && welcomeCard) {
    welcomeCard.classList.add('hidden');
    idleState.classList.remove('hidden');
  }

  const input = document.getElementById('gateQuickInput');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function displayGlobalGateModal(data) {
  const modal = document.getElementById('globalGateModal');
  if (!modal) return;

  const firstLetter = (data.student.name || 'ط').trim()[0];
  document.getElementById('globalGateAvatar').textContent = firstLetter;
  document.getElementById('globalGateStudentName').textContent = data.student.name;
  document.getElementById('globalGateStudentPhone').textContent = data.student.phone || '-';
  document.getElementById('globalGateBranchName').textContent = data.branch.name || '-';
  document.getElementById('globalGateCourseTitle').textContent = data.course.title;
  document.getElementById('globalGateRoom').textContent = data.schedule.room;
  document.getElementById('globalGateInstructor').textContent = data.schedule.instructor;
  document.getElementById('globalGateSessionStats').textContent = `الحصة ${data.stats.attendedCount} من ${data.stats.totalSessions}`;

  openModal('globalGateModal');

  setTimeout(() => {
    closeGlobalGateModal();
  }, 4000);
}

function closeGlobalGateModal() {
  closeModal('globalGateModal');
}

async function loadGateTodayLog() {
  try {
    const res = await fetch('/api/attendance/today-log').then(r => r.json());
    if (!res.success) return;

    const countBadge = document.getElementById('gateTodayTableCountBadge');
    if (countBadge) countBadge.textContent = `${res.count} طلاب حاضرين اليوم`;

    const idleCount = document.getElementById('gateIdlePresentCount');
    if (idleCount) idleCount.textContent = res.count;

    const tbody = document.getElementById('gateTodayTableBody');
    if (!tbody) return;

    if (!res.entries || res.entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-6 text-center text-slate-400 font-bold">
            لم يتم تسجيل دخول أي طالب اليوم بعد. ابدأ بمسح كارت أول طالب!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = res.entries.map(entry => `
      <tr class="hover:bg-emerald-50/40 transition">
        <td class="py-3 px-4 font-mono font-bold text-emerald-800 text-xs">
          <span class="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200">${entry.time}</span>
        </td>
        <td class="py-3 px-4 font-bold text-slate-900">${entry.studentName}</td>
        <td class="py-3 px-4 font-mono text-slate-600" dir="ltr">${entry.studentPhone}</td>
        <td class="py-3 px-4 font-bold text-indigo-700">${entry.courseTitle}</td>
        <td class="py-3 px-4 font-bold text-slate-800">${entry.room} (${entry.branchName})</td>
        <td class="py-3 px-4 text-slate-600">${entry.groupName}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="openStudentCardModal('${entry.studentId}')" title="معاينة وطباعة الكارنيه" class="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition">
            <i data-lucide="badge-check" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();
  } catch (e) {
    console.error('loadGateTodayLog error:', e);
  }
}

function updateGateKpis() {
  const activeSchedulesCount = state.schedules.filter(s => s.status === 'نشط').length;
  const schCountEl = document.getElementById('gateIdleSchedulesCount');
  if (schCountEl) schCountEl.textContent = activeSchedulesCount;
}

function handleGateQuickInputKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    processGateQuickInput();
  }
}

function processGateQuickInput() {
  const input = document.getElementById('gateQuickInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  processGateEntry(val, false);
}

function handleGateManualLookup(query) {
  const container = document.getElementById('gateManualLookupResults');
  if (!container) return;
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    container.innerHTML = '';
    return;
  }

  const matching = state.students.filter(s => 
    (s.name && s.name.toLowerCase().includes(q)) || 
    (s.phone && s.phone.includes(q)) || 
    (s.id && s.id.toLowerCase().includes(q))
  ).slice(0, 4);

  if (matching.length === 0) {
    container.innerHTML = `<div class="text-[11px] text-slate-400 p-2">لا يوجد طالب مطابق لهذا البحث</div>`;
    return;
  }

  container.innerHTML = matching.map(s => `
    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition text-xs">
      <div>
        <span class="font-bold text-slate-900 block">${s.name}</span>
        <span class="text-[10px] text-slate-500 font-mono" dir="ltr">${s.phone}</span>
      </div>
      <button onclick="processGateEntry('${s.id}', false)" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition shadow-xs">
        تسجيل الدخول
      </button>
    </div>
  `).join('');
}

function toggleGateFullscreen() {
  const section = document.getElementById('section-gate');
  if (!section) return;

  if (!document.fullscreenElement) {
    if (section.requestFullscreen) {
      section.requestFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
    section.classList.add('kiosk-fullscreen');
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    section.classList.remove('kiosk-fullscreen');
  }
}

document.addEventListener('fullscreenchange', () => {
  const section = document.getElementById('section-gate');
  if (section && !document.fullscreenElement) {
    section.classList.remove('kiosk-fullscreen');
  }
});

function toggleGateVoice() {
  state.gateVoiceEnabled = !state.gateVoiceEnabled;
  const textEl = document.getElementById('gateVoiceToggleText');
  const btn = document.getElementById('gateVoiceToggleBtn');
  if (textEl) {
    textEl.textContent = state.gateVoiceEnabled ? 'الترحيب الصوتي: مفعّل' : 'الترحيب الصوتي: معطّل';
  }
  if (btn) {
    btn.className = state.gateVoiceEnabled
      ? 'px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition'
      : 'px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-400 flex items-center gap-1.5 shadow-xs transition';
  }
  showToast(state.gateVoiceEnabled ? 'تم تفعيل الترحيب الصوتي' : 'تم كتم الترحيب الصوتي', 'info');
}

function printCurrentGateStudentCard() {
  if (currentGateStudentId) {
    openStudentCardModal(currentGateStudentId);
  }
}

// -----------------------------------------------------------------------
// 20. MODAL HELPERS & DROPDOWNS
// -----------------------------------------------------------------------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function populateAllBranchDropdowns() {
  // 1. Header Select
  const headerSelect = document.getElementById('branchSelect');
  if (headerSelect) {
    const currentVal = state.activeBranch || 'all';
    headerSelect.innerHTML = `
      <option value="all">🏢 جميع المقرات والفروع</option>
      ${state.branches.map(b => `<option value="${b.id}">📍 ${b.name}</option>`).join('')}
    `;
    headerSelect.value = currentVal;
  }

  // 2. Modals with branch select dropdowns
  const modalSelectIds = ['enrInputBranch', 'schInputBranch', 'expInputBranch', 'artInputBranch', 'portalBookBranch'];
  modalSelectIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const prev = el.value;
      el.innerHTML = state.branches.map(b => `
        <option value="${b.id}">${b.name} (${b.city || ''})</option>
      `).join('');
      if (prev && state.branches.some(b => b.id === prev)) el.value = prev;
    }
  });

  // 3. Course modal checkboxes
  const chkContainer = document.getElementById('courseBranchesCheckboxesContainer');
  if (chkContainer) {
    chkContainer.innerHTML = state.branches.map(b => `
      <label class="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
        <input type="checkbox" name="courseBranchCheckbox" value="${b.id}" checked class="rounded text-indigo-600 focus:ring-0">
        <span>${b.name}</span>
      </label>
    `).join('');
  }
}

function updateHeaderBranchDropdown() {
  populateAllBranchDropdowns();
}

function openEnrollWithCourse(courseId) {
  openModal('enrollmentModal');
  const courseSelect = document.getElementById('enrInputCourse');
  populateEnrollmentCoursesDropdown();
  if (courseSelect) courseSelect.value = courseId;
  updateEnrollmentSchedulesDropdown();
}

function openEnrollWithSchedule(scheduleId) {
  const sch = state.schedules.find(s => s.id === scheduleId);
  if (!sch) return;
  openModal('enrollmentModal');
  populateEnrollmentCoursesDropdown();
  document.getElementById('enrInputBranch').value = sch.branchId;
  document.getElementById('enrInputCourse').value = sch.courseId;
  updateEnrollmentSchedulesDropdown();
  document.getElementById('enrInputSchedule').value = scheduleId;
}

function populateEnrollmentCoursesDropdown() {
  const select = document.getElementById('enrInputCourse');
  const curr = state.settings?.currency || 'ج.م';
  if (!select) return;
  select.innerHTML = state.courses.map(c => `
    <option value="${c.id}" data-price="${c.price}">${c.title} (${c.price} ${curr})</option>
  `).join('');
  updateEnrollmentSchedulesDropdown();
}

function updateEnrollmentSchedulesDropdown() {
  const branchId = document.getElementById('enrInputBranch')?.value;
  const courseId = document.getElementById('enrInputCourse')?.value;
  const schSelect = document.getElementById('enrInputSchedule');
  const totalFeeInput = document.getElementById('enrInputTotalFee');

  const course = state.courses.find(c => c.id === courseId);
  if (course && totalFeeInput) {
    totalFeeInput.value = course.price;
  }

  if (!schSelect) return;
  const matching = state.schedules.filter(s => s.courseId === courseId && s.branchId === branchId);
  if (matching.length === 0) {
    schSelect.innerHTML = `<option value="">-- لا توجد مواعيد متاحة في هذا الفرع حالياً --</option>`;
  } else {
    schSelect.innerHTML = matching.map(s => `
      <option value="${s.id}">${s.groupName || `${s.days} (${s.time})`} - متبقي ${s.remainingSeats} مقاعد</option>
    `).join('');
  }
}

// -----------------------------------------------------------------------
// 21. BACKUPS & EXPORTS
// -----------------------------------------------------------------------
async function triggerBackup() {
  try {
    const res = await fetch('/api/system/backup').then(r => r.json());
    if (res.success) {
      showToast('تم حفظ نسخة احتياطية محلية لقاعدة البيانات بنجاح!', 'success');
    }
  } catch (err) {
    showToast('فشل في أخذ نسخة احتياطية', 'error');
  }
}

function exportDataFile() {
  window.location.href = '/api/system/export-data';
}

// -----------------------------------------------------------------------
// 22. WORLD-CLASS ARTISTIC EVALUATION & MASTER CERTIFICATE (شهادة التميز الفني الفاخرة)
// -----------------------------------------------------------------------
let currentEvaluationData = null;
let currentStudentCardId = null;
let currentCertStudentId = null;
let currentCertTheme = 'gold';

async function openArtEvaluationModal(studentId) {
  try {
    currentCertStudentId = studentId;
    const res = await fetch(`/api/students/${studentId}/evaluation`).then(r => r.json());
    if (!res.success || !res.data) {
      showToast(res.message || 'تعذر تحميل التقييم الفني للطالب', 'error');
      return;
    }

    const d = res.data;
    currentEvaluationData = d;

    // 1. Certificate Canvas Fields
    const certNumberTag = document.getElementById('certNumberTag');
    if (certNumberTag) certNumberTag.textContent = d.certificateNumber;

    const certIssueDate = document.getElementById('certIssueDate');
    if (certIssueDate) certIssueDate.textContent = `التاريخ: ${d.issuanceDate}`;

    const certAcademyName = document.getElementById('certAcademyName');
    if (certAcademyName) certAcademyName.textContent = d.academy.name || 'أكاديمية الفنون التشكيلية';

    const certAcademySubtitle = document.getElementById('certAcademySubtitle');
    if (certAcademySubtitle) certAcademySubtitle.textContent = d.academy.subtitle || 'المرسم الأكاديمي للدراسات الحرة والفنون الجميلة';
    
    const certStudentName = document.getElementById('certStudentName');
    if (certStudentName) certStudentName.textContent = d.student.name;

    const certCourseTitle = document.getElementById('certCourseTitle');
    if (certCourseTitle) certCourseTitle.textContent = d.course.title;

    const certBranchName = document.getElementById('certBranchName');
    if (certBranchName) certBranchName.textContent = d.branch.name;

    const certGradeLevel = document.getElementById('certGradeLevel');
    if (certGradeLevel) certGradeLevel.textContent = d.gradeLevel;

    // Skills Meters
    const brushScore = d.skills.brushwork.score;
    const compScore = d.skills.composition.score;
    const lightScore = d.skills.chiaroscuro.score;
    const colorScore = d.skills.colorHarmony.score;

    document.getElementById('certSkillBrush').textContent = `${brushScore}%`;
    document.getElementById('certBarBrush').style.width = `${brushScore}%`;

    document.getElementById('certSkillComp').textContent = `${compScore}%`;
    document.getElementById('certBarComp').style.width = `${compScore}%`;

    document.getElementById('certSkillLight').textContent = `${lightScore}%`;
    document.getElementById('certBarLight').style.width = `${lightScore}%`;

    document.getElementById('certSkillColor').textContent = `${colorScore}%`;
    document.getElementById('certBarColor').style.width = `${colorScore}%`;

    // Critique Commentary
    document.getElementById('certCritiqueText').textContent = d.critiqueText;

    // Signatures
    document.getElementById('certInstructorName').textContent = d.schedule.instructor || 'الفنان أستاذ الورشة';
    document.getElementById('certDirectorName').textContent = d.directorName || 'المدير الأكاديمي للمرسم';

    // QR Image
    const qrImg = document.getElementById('certQrImage');
    if (qrImg) qrImg.src = d.qrDataUrl;

    // Visibility toggles
    const skillsContainer = document.getElementById('certSkillsContainer');
    if (skillsContainer) skillsContainer.style.display = d.showSkills !== false ? 'grid' : 'none';

    const sealContainer = document.getElementById('certSealContainer');
    if (sealContainer) sealContainer.style.display = d.showSeal !== false ? 'flex' : 'none';

    const qrContainer = document.getElementById('certQrContainer');
    if (qrContainer) qrContainer.style.display = d.showQr !== false ? 'flex' : 'none';

    // 2. Populate Editor Drawer Inputs
    const editStudentName = document.getElementById('editCertStudentName');
    if (editStudentName) editStudentName.value = d.student.name;

    const editCourseTitle = document.getElementById('editCertCourseTitle');
    if (editCourseTitle) editCourseTitle.value = d.course.title;

    const editBranchName = document.getElementById('editCertBranchName');
    if (editBranchName) editBranchName.value = d.branch.name;

    const editGradeLevel = document.getElementById('editCertGradeLevel');
    if (editGradeLevel) editGradeLevel.value = d.gradeLevel;

    const editCritiqueText = document.getElementById('editCertCritiqueText');
    if (editCritiqueText) editCritiqueText.value = d.critiqueText;

    const editSkillBrush = document.getElementById('editCertSkillBrush');
    if (editSkillBrush) editSkillBrush.value = brushScore;
    const labelSkillBrush = document.getElementById('labelSkillBrush');
    if (labelSkillBrush) labelSkillBrush.textContent = `${brushScore}%`;

    const editSkillComp = document.getElementById('editCertSkillComp');
    if (editSkillComp) editSkillComp.value = compScore;
    const labelSkillComp = document.getElementById('labelSkillComp');
    if (labelSkillComp) labelSkillComp.textContent = `${compScore}%`;

    const editSkillLight = document.getElementById('editCertSkillLight');
    if (editSkillLight) editSkillLight.value = lightScore;
    const labelSkillLight = document.getElementById('labelSkillLight');
    if (labelSkillLight) labelSkillLight.textContent = `${lightScore}%`;

    const editSkillColor = document.getElementById('editCertSkillColor');
    if (editSkillColor) editSkillColor.value = colorScore;
    const labelSkillColor = document.getElementById('labelSkillColor');
    if (labelSkillColor) labelSkillColor.textContent = `${colorScore}%`;

    const editShowSkills = document.getElementById('editCertShowSkills');
    if (editShowSkills) editShowSkills.checked = d.showSkills !== false;

    const editInstructor = document.getElementById('editCertInstructorName');
    if (editInstructor) editInstructor.value = d.schedule.instructor || 'الفنان أستاذ الورشة';

    const editDirector = document.getElementById('editCertDirectorName');
    if (editDirector) editDirector.value = d.directorName || 'المدير الأكاديمي للمرسم';

    const editIssueDate = document.getElementById('editCertIssueDate');
    if (editIssueDate) editIssueDate.value = d.issuanceDate;

    const editNumberTag = document.getElementById('editCertNumberTag');
    if (editNumberTag) editNumberTag.value = d.certificateNumber;

    const editShowSeal = document.getElementById('editCertShowSeal');
    if (editShowSeal) editShowSeal.checked = d.showSeal !== false;

    const editShowQr = document.getElementById('editCertShowQr');
    if (editShowQr) editShowQr.checked = d.showQr !== false;

    // Theme setup
    setCertTheme(d.theme || 'gold');

    // Customized badge
    const badge = document.getElementById('certCustomizedBadge');
    if (badge) {
      if (d.isCustomized) badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }

    // View 2 (Growth Roadmap)
    const recText = document.getElementById('evalRecommendationsText');
    if (recText) recText.textContent = d.recommendations;
    const nextCourseText = document.getElementById('evalNextCourseText');
    if (nextCourseText) nextCourseText.textContent = d.nextSuggestedCourse;

    // Reset drawer state (collapsed by default for clean presentation)
    const drawer = document.getElementById('certEditorDrawer');
    if (drawer) drawer.classList.add('hidden');

    openModal('artEvaluationModal');
    lucide.createIcons();
  } catch (err) {
    console.error('openArtEvaluationModal error:', err);
    showToast('فشل فتح شهادة التقييم الفني', 'error');
  }
}

// Sync from Inputs drawer to Certificate Canvas (Live preview)
function syncFromInputsToCert() {
  const studentName = document.getElementById('editCertStudentName')?.value || '';
  const courseTitle = document.getElementById('editCertCourseTitle')?.value || '';
  const branchName = document.getElementById('editCertBranchName')?.value || '';
  const gradeLevel = document.getElementById('editCertGradeLevel')?.value || '';
  const critiqueText = document.getElementById('editCertCritiqueText')?.value || '';
  const instructor = document.getElementById('editCertInstructorName')?.value || '';
  const director = document.getElementById('editCertDirectorName')?.value || '';
  const issueDate = document.getElementById('editCertIssueDate')?.value || '';
  const certNumber = document.getElementById('editCertNumberTag')?.value || '';

  const brushVal = document.getElementById('editCertSkillBrush')?.value || 90;
  const compVal = document.getElementById('editCertSkillComp')?.value || 90;
  const lightVal = document.getElementById('editCertSkillLight')?.value || 90;
  const colorVal = document.getElementById('editCertSkillColor')?.value || 90;

  const showSkills = document.getElementById('editCertShowSkills')?.checked ?? true;
  const showSeal = document.getElementById('editCertShowSeal')?.checked ?? true;
  const showQr = document.getElementById('editCertShowQr')?.checked ?? true;

  // Update Canvas
  if (document.getElementById('certStudentName')) document.getElementById('certStudentName').textContent = studentName;
  if (document.getElementById('certCourseTitle')) document.getElementById('certCourseTitle').textContent = courseTitle;
  if (document.getElementById('certBranchName')) document.getElementById('certBranchName').textContent = branchName;
  if (document.getElementById('certGradeLevel')) document.getElementById('certGradeLevel').textContent = gradeLevel;
  if (document.getElementById('certCritiqueText')) document.getElementById('certCritiqueText').textContent = critiqueText;
  if (document.getElementById('certInstructorName')) document.getElementById('certInstructorName').textContent = instructor;
  if (document.getElementById('certDirectorName')) document.getElementById('certDirectorName').textContent = director;
  if (document.getElementById('certIssueDate')) document.getElementById('certIssueDate').textContent = issueDate.startsWith('التاريخ:') ? issueDate : `التاريخ: ${issueDate}`;
  if (document.getElementById('certNumberTag')) document.getElementById('certNumberTag').textContent = certNumber;

  // Update Skills
  if (document.getElementById('certSkillBrush')) document.getElementById('certSkillBrush').textContent = `${brushVal}%`;
  if (document.getElementById('certBarBrush')) document.getElementById('certBarBrush').style.width = `${brushVal}%`;
  if (document.getElementById('labelSkillBrush')) document.getElementById('labelSkillBrush').textContent = `${brushVal}%`;

  if (document.getElementById('certSkillComp')) document.getElementById('certSkillComp').textContent = `${compVal}%`;
  if (document.getElementById('certBarComp')) document.getElementById('certBarComp').style.width = `${compVal}%`;
  if (document.getElementById('labelSkillComp')) document.getElementById('labelSkillComp').textContent = `${compVal}%`;

  if (document.getElementById('certSkillLight')) document.getElementById('certSkillLight').textContent = `${lightVal}%`;
  if (document.getElementById('certBarLight')) document.getElementById('certBarLight').style.width = `${lightVal}%`;
  if (document.getElementById('labelSkillLight')) document.getElementById('labelSkillLight').textContent = `${lightVal}%`;

  if (document.getElementById('certSkillColor')) document.getElementById('certSkillColor').textContent = `${colorVal}%`;
  if (document.getElementById('certBarColor')) document.getElementById('certBarColor').style.width = `${colorVal}%`;
  if (document.getElementById('labelSkillColor')) document.getElementById('labelSkillColor').textContent = `${colorVal}%`;

  // Visibility
  const skillsContainer = document.getElementById('certSkillsContainer');
  if (skillsContainer) skillsContainer.style.display = showSkills ? 'grid' : 'none';

  const sealContainer = document.getElementById('certSealContainer');
  if (sealContainer) sealContainer.style.display = showSeal ? 'flex' : 'none';

  const qrContainer = document.getElementById('certQrContainer');
  if (qrContainer) qrContainer.style.display = showQr ? 'flex' : 'none';
}

// Sync from Canvas inline contenteditable back to Inputs drawer
function syncFromCertToInputs() {
  const studentName = document.getElementById('certStudentName')?.textContent?.trim() || '';
  const courseTitle = document.getElementById('certCourseTitle')?.textContent?.trim() || '';
  const branchName = document.getElementById('certBranchName')?.textContent?.trim() || '';
  const gradeLevel = document.getElementById('certGradeLevel')?.textContent?.trim() || '';
  const critiqueText = document.getElementById('certCritiqueText')?.textContent?.trim() || '';
  const instructor = document.getElementById('certInstructorName')?.textContent?.trim() || '';
  const director = document.getElementById('certDirectorName')?.textContent?.trim() || '';
  let issueDate = document.getElementById('certIssueDate')?.textContent?.trim() || '';
  issueDate = issueDate.replace('التاريخ:', '').trim();
  const certNumber = document.getElementById('certNumberTag')?.textContent?.trim() || '';

  if (document.getElementById('editCertStudentName')) document.getElementById('editCertStudentName').value = studentName;
  if (document.getElementById('editCertCourseTitle')) document.getElementById('editCertCourseTitle').value = courseTitle;
  if (document.getElementById('editCertBranchName')) document.getElementById('editCertBranchName').value = branchName;
  if (document.getElementById('editCertGradeLevel')) document.getElementById('editCertGradeLevel').value = gradeLevel;
  if (document.getElementById('editCertCritiqueText')) document.getElementById('editCertCritiqueText').value = critiqueText;
  if (document.getElementById('editCertInstructorName')) document.getElementById('editCertInstructorName').value = instructor;
  if (document.getElementById('editCertDirectorName')) document.getElementById('editCertDirectorName').value = director;
  if (document.getElementById('editCertIssueDate')) document.getElementById('editCertIssueDate').value = issueDate;
  if (document.getElementById('editCertNumberTag')) document.getElementById('editCertNumberTag').value = certNumber;
}

// Toggle Editor Drawer
function toggleCertEditorDrawer() {
  const drawer = document.getElementById('certEditorDrawer');
  const btn = document.getElementById('certEditorToggleBtn');
  if (!drawer) return;

  const isHidden = drawer.classList.contains('hidden');
  if (isHidden) {
    drawer.classList.remove('hidden');
    if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-amber-600 text-white border border-amber-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs';
  } else {
    drawer.classList.add('hidden');
    if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition';
  }
}

// Toggle Live Click-to-Edit Mode on the Certificate Canvas
function toggleCertLiveEdit() {
  const certArea = document.getElementById('printCertificateArea');
  const btn = document.getElementById('certLiveEditBtn');
  const txt = document.getElementById('certLiveEditText');
  if (!certArea) return;

  const isActive = certArea.classList.toggle('cert-live-edit-active');
  if (isActive) {
    if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-amber-600 text-white border border-amber-700 text-xs font-bold flex items-center gap-1.5 transition shadow-xs';
    if (txt) txt.textContent = 'التعديل بالنقر: مفعّل ✓';
    showToast('وضع التعديل المباشر مفعّل: انقر على أي نص بالشهادة وعدّله مباشرة ✍️', 'info');
  } else {
    if (btn) btn.className = 'px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition';
    if (txt) txt.textContent = 'التعديل بالنقر';
  }
}

// Set Certificate Theme
function setCertTheme(theme) {
  currentCertTheme = theme;
  const certArea = document.getElementById('printCertificateArea');
  if (certArea) {
    certArea.classList.remove('theme-gold', 'theme-emerald', 'theme-sapphire', 'theme-burgundy');
    certArea.classList.add(`theme-${theme}`);
  }

  // Update theme buttons styles
  const themes = ['gold', 'emerald', 'sapphire', 'burgundy'];
  themes.forEach(t => {
    const btn = document.getElementById(`themeBtn-${t}`);
    if (btn) {
      if (t === theme) {
        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-white shadow-xs text-slate-900 border border-slate-300';
      } else {
        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 text-slate-600 hover:bg-white';
      }
    }
  });
}

// Set Quick Grade preset
function setQuickGrade(gradeText) {
  const input = document.getElementById('editCertGradeLevel');
  if (input) {
    input.value = gradeText;
    syncFromInputsToCert();
  }
}

// Apply Eloquent Critique Preset
function applyCritiquePreset(type) {
  const studentName = document.getElementById('editCertStudentName')?.value || 'الطالب';
  const presets = {
    oil: `أظهر الفنان ${studentName} نضجاً تشكيلياً ملموساً في التعامل مع ألوان الزيت وقماش الكانفاس، حيث برز تمكنه من تأسيس الأرضيات وتوزيع الكتل اللونية بجرأة وثقة، وتطبيق قواعد التظليل والدمج وبناء طبقات اللون (Fat over Lean) باقتدار وحس لوني رفيع.`,
    portrait: `تميز أداء الفنان ${studentName} بالدقة التشريحية وضبط نسب الوجه الإنساني، مع إتقان لافت في توزيع مستويات التظليل بالفحم والمدعكة لإنشاء تدرجات ضوئية غنية وعمق تعبيري فريد في النظرات والملامح.`,
    water: `قدم الفنان ${studentName} تحكماً متميزاً في سيولة وانسياب الألوان المائية والشفافية وإدارة مساحات البلل (Wet-on-Wet)، مع الحفاظ على نقاء درجات الضوء والمساحات البيضاء المشرقة بروح انطباعية خلابة.`,
    kids: `يمتلك الفنان المبدع ${studentName} حساسية بصرية فطرية وشغفاً إبداعياً رائعاً، وقد أظهر شجاعة مبهرة في مزج الألوان وتوزيع عناصر القصة التشكيلية بخيال واسع وشخصية فنية واعدة ومميزة.`,
    general: `اجتاز الفنان ${studentName} متطلبات البرنامج التدريبي بجدارة واستحقاق فني متقدم، مقدماً أعمالاً متميزة تعكس التزامه بتوجيهات المرسم وتطوره التقني وحسه الجمالي المتوازن والمبدع.`
  };

  const text = presets[type] || presets.general;
  const textarea = document.getElementById('editCertCritiqueText');
  if (textarea) {
    textarea.value = text;
    syncFromInputsToCert();
    showToast('تم تطبيق الصيغة الفنية الراقية بنجاح 🎨', 'success');
  }
}

// Save Custom Certificate Modifications to Backend
async function saveCertCustomizations() {
  if (!currentCertStudentId) return;

  const payload = {
    studentName: document.getElementById('certStudentName')?.textContent?.trim(),
    courseTitle: document.getElementById('certCourseTitle')?.textContent?.trim(),
    branchName: document.getElementById('certBranchName')?.textContent?.trim(),
    gradeLevel: document.getElementById('certGradeLevel')?.textContent?.trim(),
    critiqueText: document.getElementById('certCritiqueText')?.textContent?.trim(),
    instructorName: document.getElementById('certInstructorName')?.textContent?.trim(),
    directorName: document.getElementById('certDirectorName')?.textContent?.trim(),
    issuanceDate: document.getElementById('editCertIssueDate')?.value || document.getElementById('certIssueDate')?.textContent?.replace('التاريخ:', '')?.trim(),
    certificateNumber: document.getElementById('certNumberTag')?.textContent?.trim(),
    theme: currentCertTheme,
    showSkills: document.getElementById('editCertShowSkills')?.checked ?? true,
    showSeal: document.getElementById('editCertShowSeal')?.checked ?? true,
    showQr: document.getElementById('editCertShowQr')?.checked ?? true,
    skills: {
      brushwork: { score: Number(document.getElementById('editCertSkillBrush')?.value || 90) },
      composition: { score: Number(document.getElementById('editCertSkillComp')?.value || 90) },
      chiaroscuro: { score: Number(document.getElementById('editCertSkillLight')?.value || 90) },
      colorHarmony: { score: Number(document.getElementById('editCertSkillColor')?.value || 90) }
    }
  };

  try {
    const res = await fetch(`/api/students/${currentCertStudentId}/evaluation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('تم حفظ التعديلات المخصصة في ملف الطالب بنجاح! 💾', 'success');
      const badge = document.getElementById('certCustomizedBadge');
      if (badge) badge.classList.remove('hidden');
    } else {
      showToast(res.message || 'فشل حفظ التعديلات', 'error');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('فشل الاتصال لحفظ الشهادة', 'error');
  }
}

// Reset Custom Certificate Modifications back to Auto-Calculated
async function resetCertCustomizations() {
  if (!currentCertStudentId) return;
  if (!confirm('هل تريد استعادة التقييم التلقائي الأصلي وإلغاء التعديلات اليدوية؟')) return;

  try {
    const res = await fetch(`/api/students/${currentCertStudentId}/evaluation/reset`, {
      method: 'POST'
    }).then(r => r.json());

    if (res.success) {
      showToast('تمت استعادة التقييم التلقائي الأصلي 🔄', 'info');
      await openArtEvaluationModal(currentCertStudentId);
    } else {
      showToast(res.message || 'فشل استعادة التقييم الأصلي', 'error');
    }
  } catch (err) {
    console.error('Reset error:', err);
    showToast('فشل استعادة التقييم', 'error');
  }
}

function printArtCertificate() {
  document.body.classList.add('printing-certificate');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-certificate');
  }, 1000);
}

function closeArtEvaluationModal() {
  closeModal('artEvaluationModal');
}

function enrollStudentInNextCourse() {
  closeArtEvaluationModal();
  openModal('enrollmentModal');
  if (currentEvaluationData && currentEvaluationData.student) {
    const s = currentEvaluationData.student;
    const nameInput = document.getElementById('enrInputName');
    const phoneInput = document.getElementById('enrInputPhone');
    if (nameInput) nameInput.value = s.name;
    if (phoneInput) phoneInput.value = s.phone;
  }
}
