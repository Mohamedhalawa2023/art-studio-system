'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { formatLocalDate } from '@/lib/dates';
import {
  BookOpen, Plus, ChevronDown, ChevronUp, Users, Calendar,
  Clock, Star, Pencil, Trash2, X, Palette
} from 'lucide-react';

export default function CoursesPage() {
  const { courses, groups, users, createCourse, updateCourse, deleteCourse, createGroup, updateGroup, deleteGroup } = useMarsam();
  const [expanded, setExpanded] = useState<string | null>(courses[0]?.id || null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<(typeof courses)[number] | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<(typeof groups)[number] | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [formError, setFormError] = useState('');
  const [groupDateDefaults, setGroupDateDefaults] = useState({ startDate: '', endDate: '' });
  const supervisors = users.filter(user => user.role === 'supervisor');

  const handleCreateCourse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const input = {
        name: String(form.get('name') || ''), description: String(form.get('description') || ''),
        ageGroup: String(form.get('ageGroup') || ''), price: Number(form.get('price')),
        sessionsCount: Number(form.get('sessionsCount')),
        levels: String(form.get('levels') || '').split(/[،,\n]/).map(level => level.trim()).filter(Boolean),
      };
      const course = courseToEdit ? updateCourse(courseToEdit.id, input) : createCourse(input);
      setExpanded(course.id);
      setCourseToEdit(null);
      setShowNewCourse(false);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ الكورس.');
    }
  };

  const handleDeleteCourse = (course: (typeof courses)[number]) => {
    if (!window.confirm(`حذف الكورس «${course.name}»؟`)) return;
    try { deleteCourse(course.id); setFormError(''); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'تعذر حذف الكورس.'); }
  };

  const handleEditGroup = (group: (typeof groups)[number]) => {
    setGroupToEdit(group);
    setFormError('');
  };

  const handleUpdateGroup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupToEdit) return;
    const form = new FormData(event.currentTarget);
    try {
      updateGroup(groupToEdit.id, {
        supervisorId: String(form.get('supervisorId') || ''),
        capacity: Number(form.get('capacity')),
        room: String(form.get('room') || ''),
      });
      setGroupToEdit(null);
      setFormError('');
    } catch (error) { setFormError(error instanceof Error ? error.message : 'تعذر تعديل المجموعة.'); }
  };

  const handleDeleteGroup = (group: (typeof groups)[number]) => {
    if (!window.confirm('حذف المجموعة وكل مواعيدها المجدولة؟')) return;
    try { deleteGroup(group.id); setFormError(''); }
    catch (error) { setFormError(error instanceof Error ? error.message : 'تعذر حذف المجموعة.'); }
  };

  const handleCreateGroup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      createGroup({
        courseId: selectedCourseId, supervisorId: String(form.get('supervisorId') || ''),
        weekdays: form.getAll('weekdays').map(value => Number(value)), time: String(form.get('time') || ''),
        capacity: Number(form.get('capacity')), startDate: String(form.get('startDate') || ''),
        endDate: String(form.get('endDate') || ''), room: String(form.get('room') || ''),
      });
      setShowNewGroup(false);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ المجموعة.');
    }
  };

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488]/20 border border-[#0D9488]/40 flex items-center justify-center text-[#2DD4BF]">
              <BookOpen size={22} />
            </div>
            الكورسات والورش الفنية
          </h1>
          <p className="text-[#94A3B8] text-xs mt-1">
            إدارة مناهج الرسم، الورش المتخصصة، والمجموعات التدريبية بالمرسم
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setCourseToEdit(null); setShowNewCourse(true); }}
          className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#0D9488]/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          إضافة كورس جديد
        </button>
      </div>

      {formError && !showNewCourse && !showNewGroup && !groupToEdit && (
        <p role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400">
          {formError}
        </p>
      )}

      {/* Courses List */}
      <div className="space-y-4">
        {courses.map(course => {
          const courseGroups = groups.filter(g => g.courseId === course.id);
          const isOpen = expanded === course.id;

          return (
            <div key={course.id} className="bg-[#1B2537] rounded-2xl overflow-hidden border border-[#2A3B56] shadow-xl transition-all">
              {/* Course Header */}
              <button
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-[#111827]/40 transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : course.id)}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2DD4BF] flex items-center justify-center text-[#0E1629] text-2xl shrink-0 shadow-md shadow-[#0D9488]/20 font-bold border border-[#2DD4BF]">
                  <Palette size={24} className="text-[#0E1629]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-base text-[#F8FAFC]">{course.name}</h3>
                    <span className="bg-[#115E59] border border-[#2DD4BF]/40 text-[#2DD4BF] text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                      {course.ageGroup}
                    </span>
                  </div>
                  <p className="text-[#94A3B8] text-xs mt-1 line-clamp-1">{course.description}</p>
                </div>
                <div className="text-left shrink-0 ml-2">
                  <p className="text-xl font-black text-[#2DD4BF] font-mono">{course.price?.toLocaleString()} ج</p>
                  <p className="text-[11px] text-[#94A3B8] font-bold">{course.sessionsCount} حصص</p>
                </div>
                <div className="text-[#94A3B8] shrink-0 p-1">
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Levels & Groups Details */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-[#2A3B56] pt-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2DD4BF]/50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      onClick={() => { setCourseToEdit(course); setFormError(''); setShowNewCourse(true); }}
                    >
                      <Pencil size={13} />
                      تعديل الكورس
                    </button>
                    <button
                      type="button"
                      className="bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-red-400 hover:border-red-500/50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      onClick={() => handleDeleteCourse(course)}
                    >
                      <Trash2 size={13} />
                      حذف الكورس
                    </button>
                  </div>

                  {/* Levels row */}
                  {course.levels && course.levels.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#2A3B56] space-y-2">
                      <p className="text-xs font-bold text-[#F8FAFC]">المستويات والمحاور المستهدفة:</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {course.levels.map((level, i) => (
                          <span
                            key={i}
                            className="bg-[#115E59] border border-[#2DD4BF]/30 text-[#2DD4BF] text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm"
                          >
                            <Star size={11} className="text-[#2DD4BF]" />
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groups Section Header */}
                  <div className="flex items-center justify-between pt-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                      <Users size={16} className="text-[#2DD4BF]" />
                      المجموعات المفتوحة ({courseGroups.length})
                    </h4>
                    <button
                      className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#0D9488]/20 transition-all cursor-pointer"
                      onClick={() => {
                        const start = new Date();
                        const end = new Date(start);
                        end.setMonth(end.getMonth() + 3);
                        setGroupDateDefaults({ startDate: formatLocalDate(start), endDate: formatLocalDate(end) });
                        setSelectedCourseId(course.id);
                        setFormError('');
                        setShowNewGroup(true);
                      }}
                    >
                      <Plus size={14} /> مجموعة جديدة
                    </button>
                  </div>

                  {/* Groups Grid */}
                  {courseGroups.length === 0 ? (
                    <p className="text-[#94A3B8] text-xs text-center py-6 bg-[#111827] rounded-xl border border-[#2A3B56]">
                      لا توجد مجموعات مسجلة لهذا الكورس حالياً
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {courseGroups.map(group => {
                        const supervisor = users.find(u => u.id === group.supervisorId);
                        const enrolled = group.enrolled || 0;
                        const capacity = group.capacity || 10;
                        const pct = Math.round((enrolled / capacity) * 100);

                        return (
                          <div key={group.id} className="bg-[#111827] border border-[#2A3B56] p-4.5 rounded-2xl space-y-3.5 shadow-md hover:border-[#0D9488]/40 transition-all">
                            <div className="flex justify-between items-center">
                              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${group.status === 'active' ? 'bg-[#115E59] border-[#2DD4BF]/40 text-[#2DD4BF]' : 'bg-[#1B2537] border-[#2A3B56] text-[#94A3B8]'}`}>
                                {group.status === 'active' ? 'نشطة' : group.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                              </span>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  className="bg-[#1B2537] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  onClick={() => handleEditGroup(group)}
                                >
                                  <Pencil size={11} /> تعديل
                                </button>
                                <button
                                  type="button"
                                  className="bg-[#1B2537] border border-[#334155] text-[#94A3B8] hover:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  onClick={() => handleDeleteGroup(group)}
                                >
                                  <Trash2 size={11} /> حذف
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <p className="font-bold text-sm text-[#F8FAFC]">إشراف {supervisor?.name || 'مشرف المرسم'}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] pt-0.5">
                                <Clock size={12} className="text-[#2DD4BF]" />
                                <span>{group.schedule}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                                <Calendar size={12} className="text-[#2DD4BF]" />
                                <span className="font-mono">{group.startDate} — {group.endDate}</span>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#94A3B8]">المقاعد المشغولة:</span>
                                <span className={`font-bold font-mono ${pct >= 100 ? 'text-red-400' : 'text-[#2DD4BF]'}`}>
                                  {enrolled}/{capacity} طالب (%{pct})
                                </span>
                              </div>

                              <div className="w-full bg-[#334155] h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#0D9488] h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>

                            {group.room && (
                              <p className="text-[11px] text-[#94A3B8] font-medium pt-1 border-t border-[#2A3B56]/60">
                                📍 القاعة: {group.room}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= MODAL: NEW / EDIT COURSE ================= */}
      {showNewCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }}>
          <form onSubmit={handleCreateCourse} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3B56] pb-3">
              <h2 className="text-lg font-black text-[#F8FAFC]">{courseToEdit ? 'تعديل بيانات الكورس' : 'إضافة كورس جديد'}</h2>
              <button type="button" className="text-[#94A3B8] hover:text-white" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }} aria-label="إغلاق"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">اسم الكورس:</label>
              <input name="name" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required maxLength={100} defaultValue={courseToEdit?.name} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">الوصف:</label>
              <textarea name="description" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" rows={3} required maxLength={1000} defaultValue={courseToEdit?.description} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">السعر بالجنيه:</label>
                <input name="price" type="number" min="1" step="0.01" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2DD4BF] focus:outline-none focus:border-[#0D9488]" required defaultValue={courseToEdit?.price} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">عدد الحصص:</label>
                <input name="sessionsCount" type="number" min="1" step="1" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue={courseToEdit?.sessionsCount} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">الفئة العمرية:</label>
              <input name="ageGroup" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]" placeholder="مثال: 6-12 سنة" required maxLength={80} defaultValue={courseToEdit?.ageGroup} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">المستويات (افصل بينها بفاصلة):</label>
              <input name="levels" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]" placeholder="المستوى الأول — الخطوط، المستوى الثاني — الأشكال" defaultValue={courseToEdit?.levels.join('، ')} />
            </div>
            {formError && <p role="alert" className="text-xs text-red-400 font-bold">{formError}</p>}
            <div className="flex gap-2 pt-2">
              <button className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#0D9488]/20 transition-all" type="submit">
                {courseToEdit ? 'حفظ التعديلات' : 'حفظ الكورس'}
              </button>
              <button className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all" type="button" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: NEW GROUP ================= */}
      {showNewGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowNewGroup(false)}>
          <form onSubmit={handleCreateGroup} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3B56] pb-3">
              <h2 className="text-lg font-black text-[#F8FAFC]">إضافة مجموعة تدريبية</h2>
              <button type="button" className="text-[#94A3B8] hover:text-white" onClick={() => setShowNewGroup(false)} aria-label="إغلاق"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">المشرف:</label>
              <select name="supervisorId" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue="">
                <option value="" disabled className="bg-[#111827] text-[#94A3B8]">اختر المشرف</option>
                {supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id} className="bg-[#111827] text-[#F8FAFC]">{supervisor.name}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="text-xs font-bold text-[#94A3B8] mb-2">أيام الانعقاد:</legend>
              <div className="flex flex-wrap gap-2">
                {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => (
                  <label key={day} className="flex items-center gap-1.5 rounded-lg border border-[#2A3B56] bg-[#111827] px-3 py-1.5 text-xs text-[#F8FAFC] cursor-pointer hover:border-[#0D9488]/40">
                    <input type="checkbox" name="weekdays" value={index} className="accent-[#0D9488]" />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">موعد الحصة:</label>
                <input name="time" type="time" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue="16:00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">سعة المجموعة:</label>
                <input name="capacity" type="number" min="1" max="200" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue="10" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">تاريخ البداية:</label>
                <input name="startDate" type="date" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue={groupDateDefaults.startDate} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">تاريخ النهاية:</label>
                <input name="endDate" type="date" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue={groupDateDefaults.endDate} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">القاعة (اختياري):</label>
              <input name="room" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]" placeholder="مثال: القاعة الأولى" maxLength={80} />
            </div>
            <p className="text-[11px] text-[#94A3B8]">سيُنشئ النظام مواعيد الحصص حتى العدد المحدد في إعدادات الكورس.</p>
            {formError && <p role="alert" className="text-xs text-red-400 font-bold">{formError}</p>}
            <div className="flex gap-2 pt-2">
              <button className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#0D9488]/20 transition-all disabled:opacity-50" type="submit" disabled={!supervisors.length}>
                حفظ المجموعة وإنشاء الحصص
              </button>
              <button className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all" type="button" onClick={() => setShowNewGroup(false)}>
                إلغاء
              </button>
            </div>
            {!supervisors.length && <p role="alert" className="text-xs text-red-400 font-bold">أضف مشرفًا من حسابات النظام أولاً.</p>}
          </form>
        </div>
      )}

      {/* ================= MODAL: EDIT GROUP ================= */}
      {groupToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setGroupToEdit(null)}>
          <form onSubmit={handleUpdateGroup} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3B56] pb-3">
              <h2 className="text-lg font-black text-[#F8FAFC]">تعديل المجموعة</h2>
              <button type="button" className="text-[#94A3B8] hover:text-white" onClick={() => setGroupToEdit(null)} aria-label="إغلاق"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">المشرف:</label>
              <select name="supervisorId" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue={groupToEdit.supervisorId}>
                {supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id} className="bg-[#111827] text-[#F8FAFC]">{supervisor.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">السعة:</label>
              <input name="capacity" type="number" min={Math.max(1, groupToEdit.enrolled || 0)} max="200" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]" required defaultValue={groupToEdit.capacity} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">القاعة:</label>
              <input name="room" className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]" maxLength={80} defaultValue={groupToEdit.room || ''} />
            </div>
            {formError && <p role="alert" className="text-xs text-red-400 font-bold">{formError}</p>}
            <div className="flex gap-2 pt-2">
              <button className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#0D9488]/20 transition-all" type="submit">
                حفظ التعديلات
              </button>
              <button className="bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all" type="button" onClick={() => setGroupToEdit(null)}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
