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
    return <div className="space-y-6"><h1 className="text-2xl font-black gradient-text flex items-center gap-2"><Calendar className="text-teal-400" size={26} />جدول الحصص الأسبوعي</h1><p className="text-slate-500 text-sm">جارٍ تحميل التقويم…</p></div>;
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
    try { deleteSession(sessionId); setError(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر حذف الحصة.'); }
  };

  const handleCreateMakeupSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      createMakeupSession({ groupId: newGroupId || groups[0]?.id || '', date: newSessionDate || formatLocalDate(today), time: newSessionTime });
      setShowNewSession(false);
      setMakeupError('');
      setError('');
      setWeekOffset(0);
    } catch (caught) { setMakeupError(caught instanceof Error ? caught.message : 'تعذر إضافة الحصة.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Calendar className="text-teal-400" size={26} /> جدول الحصص الأسبوعي
          </h1>
          <p className="text-slate-500 text-sm mt-1">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => { setMakeupError(''); setShowNewSession(true); }} disabled={groups.length === 0}><Plus size={14} />حصة تعويضية</button>
          <button className="btn btn-secondary btn-sm text-slate-700 border-slate-300" onClick={() => setWeekOffset(value => value - 1)} aria-label="الأسبوع السابق"><ChevronRight size={16} /> السابق</button>
          <button className="btn btn-secondary btn-sm text-slate-700 border-slate-300" onClick={() => setWeekOffset(0)}>هذا الأسبوع</button>
          <button className="btn btn-secondary btn-sm text-slate-700 border-slate-300" onClick={() => setWeekOffset(value => value + 1)}>التالي <ChevronLeft size={16} /></button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="glass p-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[770px]">
          {weekDates.map(date => {
            const isToday = formatLocalDate(date) === formatLocalDate(today);
            const dateKey = formatLocalDate(date);
            const daySessions = weekSessions.filter(session => session.date === dateKey);
            return (
              <section key={dateKey} className={`min-h-40 p-2.5 rounded-xl border transition-all ${isToday ? 'border-teal-500/60 bg-teal-50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="text-center mb-2">
                  <p className={`text-xs font-bold ${isToday ? 'text-teal-700' : 'text-slate-500'}`}>{DAYS[date.getDay()]}</p>
                  <p className={`text-lg font-black ${isToday ? 'text-teal-700' : 'text-slate-800'}`}>{date.getDate()}</p>
                </div>
                <div className="space-y-1.5">
                  {daySessions.map(session => {
                    const { course } = getSessionInfo(session);
                    return (
                      <div key={session.id} className={`p-1.5 rounded-lg text-center border text-xs ${session.status === 'completed' ? 'bg-teal-50 border-teal-200 text-teal-800' : session.status === 'cancelled' ? 'bg-red-50 border-red-200 text-red-700 line-through' : 'bg-white border-teal-500/20 text-teal-800 shadow-sm'}`}>
                        <p className="font-bold truncate">{course?.name || 'كورس غير متاح'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{session.time}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <section className="glass p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar size={18} className="text-teal-500" />حصص هذا الأسبوع ({weekSessions.length})</h2>
        {weekSessions.length ? (
          <div className="space-y-3">
            {weekSessions.map(session => {
              const { group, course, supervisor } = getSessionInfo(session);
              const date = calendarDate(session.date);
              return (
                <article key={session.id} className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-teal-500/20 transition-all">
                  <div className="text-center w-14 shrink-0">
                    <p className="text-xs text-slate-500">{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                    <p className="text-xl font-black text-teal-700 font-mono">{date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-slate-900">{course?.name || 'كورس غير متاح'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono"><Clock size={11} className="text-teal-500" />{session.time}</span>
                      {group?.room && <span className="flex items-center gap-1"><MapPin size={11} className="text-teal-500" />{group.room}</span>}
                      {supervisor && <span>إشراف: {supervisor.name}</span>}
                    </div>
                  </div>
                  <span className={`badge ${session.status === 'completed' ? 'badge-teal' : session.status === 'cancelled' ? 'badge-danger' : session.status === 'makeup' ? 'badge-info' : 'badge-teal'}`}>
                    {session.status === 'completed' ? 'مكتملة' : session.status === 'cancelled' ? 'ملغاة' : session.status === 'makeup' ? 'تعويضية' : 'مجدولة'}
                  </span>
                  {(session.status === 'scheduled' || session.status === 'makeup') && <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary btn-sm text-slate-700 border-slate-300" onClick={() => handleEditSession(session)}><Pencil size={13} />تعديل</button>
                    <button className="btn btn-secondary text-amber-800 border-slate-300 btn-sm" onClick={() => handleCancel(session.id, course?.name)}>إلغاء</button>
                    <button className="btn btn-secondary text-red-700 border-slate-300 btn-sm" onClick={() => handleDeleteSession(session.id)}><Trash2 size={13} />حذف</button>
                  </div>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400"><Calendar size={40} className="mx-auto mb-3 text-slate-300" /><p>لا توجد حصص مسجلة لهذا الأسبوع.</p></div>
        )}
      </section>

      {showNewSession && (
        <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
          <form onSubmit={handleCreateMakeupSession} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="makeup-session-title" onKeyDown={event => { if (event.key === 'Escape') setShowNewSession(false); }}>
            <div className="flex items-center justify-between"><h2 id="makeup-session-title" className="text-lg font-bold">إضافة حصة تعويضية</h2><button type="button" className="btn btn-secondary btn-sm text-[#CBD5E1] border-[#2A3B56]" onClick={() => setShowNewSession(false)} aria-label="إغلاق نافذة إضافة الحصة"><X size={18} /></button></div>
            <label className="block text-sm font-semibold">المجموعة<select autoFocus className="input mt-1" required value={newGroupId || groups[0]?.id || ''} onChange={event => setNewGroupId(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{courses.find(course => course.id === group.courseId)?.name || 'كورس'} — {group.schedule}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">التاريخ<input className="input mt-1" type="date" required value={newSessionDate || formatLocalDate(today)} onChange={event => setNewSessionDate(event.target.value)} /></label><label className="block text-sm font-semibold">الوقت<input className="input mt-1" type="time" required value={newSessionTime} onChange={event => setNewSessionTime(event.target.value)} /></label></div>
            <p className="text-xs text-[#94A3B8]">ستظهر الحصة ضمن الجدول وتُسجل كحصة تعويضية.</p>
            {makeupError && <p role="alert" className="text-sm text-red-300">{makeupError}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2"><button className="btn btn-primary flex-1" type="submit">إضافة الحصة</button><button className="btn btn-secondary text-[#CBD5E1] border-[#2A3B56]" type="button" onClick={() => setShowNewSession(false)}>إلغاء</button></div>
          </form>
        </div>
      )}

      {sessionToEdit && (
        <div className="modal-overlay" onClick={() => setSessionToEdit(null)}>
          <form
            onSubmit={handleUpdateSession}
            className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            onKeyDown={event => { if (event.key === 'Escape') setSessionToEdit(null); }}
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-session-title" className="text-lg font-bold">تعديل موعد الحصة</h2>
              <button type="button" onClick={() => setSessionToEdit(null)} aria-label="إغلاق نافذة تعديل الحصة" className="btn btn-secondary btn-sm text-[#CBD5E1] border-[#2A3B56]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">التاريخ<input autoFocus className="input mt-1" type="date" required value={editingDate} onChange={event => setEditingDate(event.target.value)} /></label>
              <label className="block text-sm font-semibold">الوقت<input className="input mt-1" type="time" required value={editingTime} onChange={event => setEditingTime(event.target.value)} /></label>
            </div>
            {editError && <p role="alert" className="text-sm text-red-300">{editError}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button className="btn btn-primary flex-1" type="submit">حفظ التعديلات</button>
              <button className="btn btn-secondary text-[#CBD5E1] border-[#2A3B56]" type="button" onClick={() => setSessionToEdit(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
