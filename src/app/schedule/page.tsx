'use client';
import { mockGroups, mockSessions, getCourse, getUser } from '@/lib/mockData';
import { Calendar, Clock, MapPin } from 'lucide-react';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const weekDates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date('2026-10-11');
  d.setDate(d.getDate() + i);
  return d;
});

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
          <Calendar className="text-blue-600" size={26} />
          جدول الحصص الأسبوعي
        </h1>
        <p className="text-slate-500 text-sm mt-1">الأسبوع الحالي — أكتوبر 2026</p>
      </div>

      {/* Week View */}
      <div className="glass p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === new Date('2026-10-12').toDateString();
            const dateStr = date.toISOString().split('T')[0];
            const daySessions = mockSessions.filter(s => s.date === dateStr);
            return (
              <div
                key={i}
                className={`min-h-36 p-2.5 rounded-xl border transition-all ${
                  isToday
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="text-center mb-2">
                  <p className={`text-xs font-bold ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>{DAYS[date.getDay()]}</p>
                  <p className={`text-lg font-black ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{date.getDate()}</p>
                </div>
                <div className="space-y-1.5">
                  {daySessions.map(sess => {
                    const grp = mockGroups.find(g => g.id === sess.groupId);
                    const course = getCourse(grp?.courseId || '');
                    return (
                      <div
                        key={sess.id}
                        className={`p-1.5 rounded-lg text-center border text-xs ${
                          sess.status === 'completed'
                            ? 'bg-blue-100 border-blue-200 text-blue-800'
                            : sess.status === 'cancelled'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-white border-blue-200 text-blue-700 shadow-2xs'
                        }`}
                      >
                        <p className="font-bold truncate">{course?.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{sess.time}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions List */}
      <div className="glass p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          جميع الحصص المجدولة
        </h3>
        <div className="space-y-3">
          {mockSessions.map(sess => {
            const group = mockGroups.find(g => g.id === sess.groupId);
            const course = getCourse(group?.courseId || '');
            const supervisor = getUser(group?.supervisorId || '');
            return (
              <div
                key={sess.id}
                className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-blue-200 transition-all"
              >
                <div className="text-center w-12 shrink-0">
                  <p className="text-xs text-slate-400">{new Date(sess.date).toLocaleDateString('ar-EG', { month: 'short' })}</p>
                  <p className="text-xl font-black text-blue-700 font-mono">{new Date(sess.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-900">{course?.name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1 font-mono"><Clock size={11} className="text-blue-600" /> {sess.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-blue-600" /> {group?.room}</span>
                    <span>م/ {supervisor?.name}</span>
                  </div>
                </div>
                <span className={`badge ${
                  sess.status === 'completed' ? 'badge-blue' :
                  sess.status === 'cancelled' ? 'badge-danger' :
                  sess.status === 'makeup' ? 'badge-info' : 'badge-blue'
                }`}>
                  {sess.status === 'completed' ? 'مكتملة' : sess.status === 'cancelled' ? 'ملغاة' : sess.status === 'makeup' ? 'تعويضية' : 'مجدولة'}
                </span>
                {sess.status === 'scheduled' && (
                  <div className="flex gap-1">
                    <button className="btn btn-secondary text-red-500 hover:text-red-700 btn-sm">إلغاء</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
