'use client';

import { useEffect, useState } from 'react';
import { useMarsam } from '@/lib/store';
import { formatLocalDate } from '@/lib/dates';
import { Calendar, Clock, MapPin, ChevronRight, ChevronLeft, Pencil, Trash2, Plus, X } from 'lucide-react';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const calendarDate = (value: string) => new Date(`${value}T00:00:00`);

export default function SchedulePage() {
  const { sessions, groups, courses, users, cancelSession, createMakeupSession, updateSession, deleteSession } = useMarsam();
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState('');
  const [today, setToday] = useState<Date | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('16:00');
  const [makeupError, setMakeupError] = useState('');
  const [sessionToEdit, setSessionToEdit] = useState<(typeof sessions)[number] | null>(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    // The current date is intentionally read after hydration; Next 16 rejects it during prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(new Date());
  }, []);

  if (!today) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
          <Calendar className="text-[#2DD4BF]" size={26} />
          جدول الحصص الأسبوعي
        </h1>
        <p className="text-[#94A3B8] text-sm">جارٍ تحميل التقويم…</p>
      </div>
    );
  }

  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const weekDateKeys = new Set(weekDates.map(formatLocalDate));
  const weekSessions = sessions
    .filter(session => weekDateKeys.has(session.date))
    .sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  const weekLabel = `${weekDates[0].toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })} — ${weekDates[6].toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const getSessionInfo = (session: typeof sessions[number]) => {
    const group = groups.find(item => item.id === session.groupId);
    return {
      group,
      course: courses.find(item => item.id === group?.courseId),
      supervisor: users.find(item => item.id === group?.supervisorId),
    };
  };

  const handleCancel = (sessionId: string, courseName?: string) => {
    if (!window.confirm(`هل تريد إلغاء حصة «${courseName || 'الكورس'}»؟`)) return;
    try {
      cancelSession(sessionId);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إلغاء الحصة.');
    }
  };

  const handleEditSession = (session: typeof sessions[number]) => {
    setSessionToEdit(session);
    setEditingDate(session.date);
    setEditingTime(session.time);
    setEditError('');
  };

  const handleUpdateSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionToEdit) return;
    try {
      updateSession(sessionToEdit.id, { date: editingDate, time: editingTime });
      setSessionToEdit(null);
      setEditError('');
      setError('');
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : 'تعذر تعديل الحصة.');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm('حذف موعد الحصة المجدول؟')) return;
    try {
      deleteSession(sessionId);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حذف الحصة.');
    }
  };

  const handleCreateMakeupSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      createMakeupSession({
        groupId: newGroupId || groups[0]?.id || '',
        date: newSessionDate || formatLocalDate(today),
        time: newSessionTime,
      });
      setShowNewSession(false);
      setMakeupError('');
      setError('');
      setWeekOffset(0);
    } catch (caught) {
      setMakeupError(caught instanceof Error ? caught.message : 'تعذر إضافة الحصة.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <Calendar className="text-[#2DD4BF]" size={26} /> جدول الحصص الأسبوعي
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => { setMakeupError(''); setShowNewSession(true); }}
            disabled={groups.length === 0}
          >
            <Plus size={15} />
            حصة تعويضية
          </button>
          <button
            className="px-3.5 py-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-semibold flex items-center gap-1 transition-all"
            onClick={() => setWeekOffset(value => value - 1)}
            aria-label="الأسبوع السابق"
          >
            <ChevronRight size={15} />
            السابق
          </button>
          <button
            className="px-3.5 py-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-semibold transition-all"
            onClick={() => setWeekOffset(0)}
          >
            هذا الأسبوع
          </button>
          <button
            className="px-3.5 py-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-semibold flex items-center gap-1 transition-all"
            onClick={() => setWeekOffset(value => value + 1)}
          >
            التالي
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Week Calendar Grid Card */}
      <div className="p-5 bg-[#1B2537] border border-[#2A3B56] rounded-2xl shadow-sm overflow-x-auto">
        <div className="grid grid-cols-7 gap-2.5 min-w-[770px]">
          {weekDates.map(date => {
            const isToday = formatLocalDate(date) === formatLocalDate(today);
            const dateKey = formatLocalDate(date);
            const daySessions = weekSessions.filter(session => session.date === dateKey);

            return (
              <section
                key={dateKey}
                className={`min-h-40 p-3 rounded-xl border transition-all ${
                  isToday
                    ? 'border-[#2DD4BF] bg-[#1B2537] ring-1 ring-[#2DD4BF]/50 shadow-lg shadow-teal-950/40'
                    : 'border-[#2A3B56] bg-[#111827]'
                }`}
              >
                <div className="text-center mb-2.5">
                  <p className={`text-xs font-bold ${isToday ? 'text-[#2DD4BF]' : 'text-[#94A3B8]'}`}>
                    {DAYS[date.getDay()]}
                  </p>
                  <p className={`text-xl font-black mt-0.5 ${isToday ? 'text-[#2DD4BF]' : 'text-[#94A3B8]'}`}>
                    {date.getDate()}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {daySessions.map(session => {
                    const { course } = getSessionInfo(session);
                    return (
                      <div
                        key={session.id}
                        className={`p-2 rounded-lg text-center border text-xs transition-colors ${
                          session.status === 'completed'
                            ? 'bg-[#115E59]/30 border-[#0D9488]/40 text-[#2DD4BF]'
                            : session.status === 'cancelled'
                            ? 'bg-red-950/40 border-red-900/60 text-red-400 line-through'
                            : 'bg-[#1B2537] border-[#2A3B56] text-[#2DD4BF] hover:border-[#0D9488]'
                        }`}
                      >
                        <p className="font-bold truncate text-[#F8FAFC]">{course?.name || 'كورس غير متاح'}</p>
                        <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{session.time}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Week Sessions List Card */}
      <section className="p-5 bg-[#1B2537] border border-[#2A3B56] rounded-2xl shadow-sm">
        <h2 className="font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-[#2DD4BF]" />
          حصص هذا الأسبوع ({weekSessions.length})
        </h2>
        {weekSessions.length ? (
          <div className="space-y-3">
            {weekSessions.map(session => {
              const { group, course, supervisor } = getSessionInfo(session);
              const date = calendarDate(session.date);
              return (
                <article
                  key={session.id}
                  className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-[#111827] border border-[#2A3B56] hover:border-[#0D9488]/60 transition-all"
                >
                  <div className="text-center w-14 shrink-0">
                    <p className="text-xs text-[#94A3B8]">{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                    <p className="text-lg font-black text-[#2DD4BF] font-mono">{date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-[#F8FAFC]">{course?.name || 'كورس غير متاح'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8] mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={12} className="text-[#2DD4BF]" />
                        {session.time}
                      </span>
                      {group?.room && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-[#2DD4BF]" />
                          {group.room}
                        </span>
                      )}
                      {supervisor && <span>إشراف: {supervisor.name}</span>}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                      session.status === 'completed'
                        ? 'bg-[#115E59] text-[#2DD4BF]'
                        : session.status === 'cancelled'
                        ? 'bg-[#450A0A] text-[#FCA5A5]'
                        : session.status === 'makeup'
                        ? 'bg-[#1E293B] border border-[#2A3B56] text-[#2DD4BF]'
                        : 'bg-[#115E59]/40 border border-[#0D9488]/40 text-[#2DD4BF]'
                    }`}
                  >
                    {session.status === 'completed'
                      ? 'مكتملة'
                      : session.status === 'cancelled'
                      ? 'ملغاة'
                      : session.status === 'makeup'
                      ? 'تعويضية'
                      : 'مجدولة'}
                  </span>
                  {(session.status === 'scheduled' || session.status === 'makeup') && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-semibold flex items-center gap-1 transition-colors"
                        onClick={() => handleEditSession(session)}
                      >
                        <Pencil size={12} />
                        تعديل
                      </button>
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-amber-400 hover:text-amber-300 hover:border-amber-500/50 text-xs font-semibold transition-colors"
                        onClick={() => handleCancel(session.id, course?.name)}
                      >
                        إلغاء
                      </button>
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-red-400 hover:text-red-300 hover:border-red-500/50 text-xs font-semibold flex items-center gap-1 transition-colors"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 size={12} />
                        حذف
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-[#94A3B8]">
            <Calendar size={44} className="mx-auto mb-3 text-[#94A3B8]/60" />
            <p className="text-sm font-medium">لا توجد حصص مسجلة لهذا الأسبوع.</p>
          </div>
        )}
      </section>

      {/* New Makeup Session Modal */}
      {showNewSession && (
        <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
          <form
            onSubmit={handleCreateMakeupSession}
            className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="makeup-session-title"
            onKeyDown={event => {
              if (event.key === 'Escape') setShowNewSession(false);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 id="makeup-session-title" className="text-lg font-bold text-[#F8FAFC]">
                إضافة حصة تعويضية
              </h2>
              <button
                type="button"
                className="w-8 h-8 rounded-lg bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center transition-colors"
                onClick={() => setShowNewSession(false)}
                aria-label="إغلاق نافذة إضافة الحصة"
              >
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-semibold text-[#94A3B8]">
              المجموعة
              <select
                autoFocus
                className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                required
                value={newGroupId || groups[0]?.id || ''}
                onChange={event => setNewGroupId(event.target.value)}
              >
                {groups.map(group => (
                  <option key={group.id} value={group.id} className="bg-[#111827] text-[#F8FAFC]">
                    {courses.find(course => course.id === group.courseId)?.name || 'كورس'} — {group.schedule}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-[#94A3B8]">
                التاريخ
                <input
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  type="date"
                  required
                  value={newSessionDate || formatLocalDate(today)}
                  onChange={event => setNewSessionDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-[#94A3B8]">
                الوقت
                <input
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  type="time"
                  required
                  value={newSessionTime}
                  onChange={event => setNewSessionTime(event.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-[#94A3B8]">ستظهر الحصة ضمن الجدول وتُسجل كحصة تعويضية.</p>
            {makeupError && <p role="alert" className="text-sm text-red-300">{makeupError}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors shadow-md shadow-teal-900/30"
                type="submit"
              >
                إضافة الحصة
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs transition-colors"
                type="button"
                onClick={() => setShowNewSession(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Session Modal */}
      {sessionToEdit && (
        <div className="modal-overlay" onClick={() => setSessionToEdit(null)}>
          <form
            onSubmit={handleUpdateSession}
            className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            onKeyDown={event => {
              if (event.key === 'Escape') setSessionToEdit(null);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-session-title" className="text-lg font-bold text-[#F8FAFC]">
                تعديل موعد الحصة
              </h2>
              <button
                type="button"
                onClick={() => setSessionToEdit(null)}
                aria-label="إغلاق نافذة تعديل الحصة"
                className="w-8 h-8 rounded-lg bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-[#94A3B8]">
                التاريخ
                <input
                  autoFocus
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  type="date"
                  required
                  value={editingDate}
                  onChange={event => setEditingDate(event.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-[#94A3B8]">
                الوقت
                <input
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  type="time"
                  required
                  value={editingTime}
                  onChange={event => setEditingTime(event.target.value)}
                />
              </label>
            </div>
            {editError && <p role="alert" className="text-sm text-red-300">{editError}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors shadow-md shadow-teal-900/30"
                type="submit"
              >
                حفظ التعديلات
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs transition-colors"
                type="button"
                onClick={() => setSessionToEdit(null)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
