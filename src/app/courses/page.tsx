'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { BookOpen, Users, Clock, Plus, ChevronDown, ChevronUp, Star, Calendar, X, Pencil, Trash2 } from 'lucide-react';
import { formatLocalDate } from '@/lib/dates';

export default function CoursesPage() {
  const { courses, groups, users, createCourse, updateCourse, deleteCourse, createGroup, updateGroup, deleteGroup } = useMarsam();
  const [expanded, setExpanded] = useState<string | null>(courses[0]?.id || 'c1');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<(typeof courses)[number] | null>(null);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <BookOpen className="text-teal-400" size={26} />
            الكورسات والورش الفنية
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            إدارة مناهج الرسم، الورش المتخصصة، والمجموعات التدريبية بالمرسم
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setCourseToEdit(null); setShowNewCourse(true); }}
          className="btn btn-primary text-xs font-bold"
        >
          <Plus size={15} />
          إضافة كورس جديد
        </button>
      </div>
      {formError && !showNewCourse && !showNewGroup && !groupToEdit && <p role="alert" className="text-sm text-red-600">{formError}</p>}

      <div className="space-y-4">
        {courses.map(course => {
          const courseGroups = groups.filter(g => g.courseId === course.id);
          const isOpen = expanded === course.id;

          return (
            <div key={course.id} className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white">
              {/* Course Header */}
              <button
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-teal-500/10/30 transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : course.id)}
              >
                <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white text-2xl shrink-0 shadow-md shadow-blue-600/20">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900">{course.name}</h3>
                    <span className="badge badge-teal text-xs">{course.ageGroup}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 line-clamp-1">{course.description}</p>
                </div>
                <div className="text-left shrink-0 ml-2">
                  <p className="text-xl font-black text-teal-300">{course.price?.toLocaleString()} ج</p>
                  <p className="text-[11px] text-[#94A3B8]">{course.sessionsCount} حصص</p>
                </div>
                <div className="text-[#94A3B8] shrink-0">
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Levels & Syllabus */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCourseToEdit(course); setFormError(''); setShowNewCourse(true); }}><Pencil size={13} />تعديل الكورس</button>
                    <button type="button" className="btn btn-secondary btn-sm text-red-600" onClick={() => handleDeleteCourse(course)}><Trash2 size={13} />حذف الكورس</button>
                  </div>
                  {/* Levels row */}
                  {course.levels && course.levels.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-teal-500/10/40 border border-blue-100">
                      <p className="w-full text-xs font-bold text-slate-600 mb-1">المستويات والمحاور المعتمدة:</p>
                      {course.levels.map((level, i) => (
                        <span key={i} className="flex items-center gap-1 badge badge-teal text-xs">
                          <Star size={11} className="text-teal-400" />
                          {level}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Groups */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Users size={15} className="text-teal-400" />
                      المجموعات المفتوحة ({courseGroups.length})
                    </h4>
                    <button
                      className="btn btn-secondary btn-sm"
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

                  {courseGroups.length === 0 ? (
                    <p className="text-[#94A3B8] text-xs text-center py-4">لا توجد مجموعات مسجلة لهذا الكورس حالياً</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {courseGroups.map(group => {
                        const supervisor = users.find(u => u.id === group.supervisorId);
                        const enrolled = group.enrolled || 0;
                        const capacity = group.capacity || 10;
                        const pct = Math.round((enrolled / capacity) * 100);

                        return (
                          <div key={group.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <div className="flex justify-end gap-2">
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleEditGroup(group)}><Pencil size={12} />تعديل</button>
                              <button type="button" className="btn btn-secondary btn-sm text-red-600" onClick={() => handleDeleteGroup(group)}><Trash2 size={12} />حذف</button>
                            </div>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-xs text-slate-900">إشراف: {supervisor?.name || 'مشرف المرسم'}</p>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                                  <Clock size={12} />
                                  {group.schedule}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                  <Calendar size={12} />
                                  {group.startDate} — {group.endDate}
                                </div>
                              </div>
                              <span className={`badge ${group.status === 'active' ? 'badge-teal' : group.status === 'upcoming' ? 'badge-info' : 'badge-gray'}`}>
                                {group.status === 'active' ? 'نشطة' : group.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>المقاعد المشغولة:</span>
                              <span className={`font-bold ${pct >= 100 ? 'text-red-500' : 'text-teal-300'}`}>
                                {enrolled}/{capacity} طالب ({pct}%)
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-teal-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>

                            {group.room && (
                              <p className="text-[11px] text-slate-500">📍 القاعة: {group.room}</p>
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

      {showNewCourse && (
        <div className="modal-overlay" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }}>
          <form key={courseToEdit?.id || 'new-course'} onSubmit={handleCreateCourse} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-xl fade-in text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3B56] pb-3">
              <h2 className="text-xl font-bold">{courseToEdit ? 'تعديل بيانات الكورس' : 'إضافة كورس جديد'}</h2>
              <button type="button" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }} aria-label="إغلاق"><X size={20} /></button>
            </div>
            <label className="block text-sm font-semibold">اسم الكورس<input name="name" className="input mt-1" required maxLength={100} defaultValue={courseToEdit?.name} /></label>
            <label className="block text-sm font-semibold">الوصف<textarea name="description" className="input mt-1" rows={3} required maxLength={1000} defaultValue={courseToEdit?.description} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">السعر بالجنيه<input name="price" type="number" min="1" step="0.01" className="input mt-1" required defaultValue={courseToEdit?.price} /></label>
              <label className="block text-sm font-semibold">عدد الحصص<input name="sessionsCount" type="number" min="1" step="1" className="input mt-1" required defaultValue={courseToEdit?.sessionsCount} /></label>
            </div>
            <label className="block text-sm font-semibold">الفئة العمرية<input name="ageGroup" className="input mt-1" placeholder="مثال: 8+ سنوات" required maxLength={80} defaultValue={courseToEdit?.ageGroup} /></label>
            <label className="block text-sm font-semibold">المستويات (افصل بينها بفاصلة)<input name="levels" className="input mt-1" placeholder="أساسيات الرسم، التلوين" defaultValue={courseToEdit?.levels.join('، ')} /></label>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            <div className="flex gap-3 pt-2"><button className="btn btn-primary flex-1" type="submit">{courseToEdit ? 'حفظ التعديلات' : 'حفظ الكورس'}</button><button className="btn btn-secondary" type="button" onClick={() => { setShowNewCourse(false); setCourseToEdit(null); }}>إلغاء</button></div>
          </form>
        </div>
      )}

      {showNewGroup && (
        <div className="modal-overlay" onClick={() => setShowNewGroup(false)}>
          <form onSubmit={handleCreateGroup} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto fade-in text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3B56] pb-3">
              <h2 className="text-xl font-bold">إضافة مجموعة تدريبية</h2>
              <button type="button" onClick={() => setShowNewGroup(false)} aria-label="إغلاق"><X size={20} /></button>
            </div>
            <label className="block text-sm font-semibold">المشرف<select name="supervisorId" className="input mt-1" required defaultValue=""><option value="" disabled>اختر المشرف</option>{supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}</select></label>
            <fieldset><legend className="text-sm font-semibold mb-2">أيام الانعقاد</legend><div className="flex flex-wrap gap-2">{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => <label key={day} className="flex items-center gap-1.5 rounded-lg border border-[#2A3B56] px-2.5 py-2 text-sm"><input type="checkbox" name="weekdays" value={index} className="accent-teal-400" />{day}</label>)}</div></fieldset>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">موعد الحصة<input name="time" type="time" className="input mt-1" required defaultValue="16:00" /></label>
              <label className="block text-sm font-semibold">سعة المجموعة<input name="capacity" type="number" min="1" max="200" className="input mt-1" required defaultValue="10" /></label>
              <label className="block text-sm font-semibold">تاريخ البداية<input name="startDate" type="date" className="input mt-1" required defaultValue={groupDateDefaults.startDate} /></label>
              <label className="block text-sm font-semibold">تاريخ النهاية<input name="endDate" type="date" className="input mt-1" required defaultValue={groupDateDefaults.endDate} /></label>
            </div>
            <label className="block text-sm font-semibold">القاعة (اختياري)<input name="room" className="input mt-1" maxLength={80} /></label>
            <p className="text-xs text-[#94A3B8]">سيُنشئ النظام مواعيد الحصص حتى العدد المحدد في إعدادات الكورس.</p>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            <div className="flex gap-3 pt-2"><button className="btn btn-primary flex-1" type="submit" disabled={!supervisors.length}>حفظ المجموعة وإنشاء الحصص</button><button className="btn btn-secondary" type="button" onClick={() => setShowNewGroup(false)}>إلغاء</button></div>
            {!supervisors.length && <p role="alert" className="text-sm text-red-300">أضف مشرفًا من حسابات النظام أولًا.</p>}
          </form>
        </div>
      )}

      {groupToEdit && (
        <div className="modal-overlay" onClick={() => setGroupToEdit(null)}>
          <form onSubmit={handleUpdateGroup} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg fade-in text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <h2 className="text-xl font-bold">تعديل المجموعة</h2>
            <label className="block text-sm font-semibold">المشرف<select name="supervisorId" className="input mt-1" required defaultValue={groupToEdit.supervisorId}>{supervisors.map(supervisor => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}</select></label>
            <label className="block text-sm font-semibold">السعة<input name="capacity" type="number" min={Math.max(1, groupToEdit.enrolled || 0)} max="200" className="input mt-1" required defaultValue={groupToEdit.capacity} /></label>
            <label className="block text-sm font-semibold">القاعة<input name="room" className="input mt-1" maxLength={80} defaultValue={groupToEdit.room || ''} /></label>
            {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
            <div className="flex gap-3"><button className="btn btn-primary flex-1" type="submit">حفظ التعديلات</button><button className="btn btn-secondary" type="button" onClick={() => setGroupToEdit(null)}>إلغاء</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
