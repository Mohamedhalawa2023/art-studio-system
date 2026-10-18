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
        <h1 className="text-2xl font-black gradient-text">جدول الحصص</h1>
        <p className="text-slate-400 text-sm mt-1">الأسبوع الحالي — أكتوبر 2026</p>
      </div>

      {/* Week View */}
      <div className="glass p-5">
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === new Date('2026-10-12').toDateString();
            const dateStr = date.toISOString().split('T')[0];
            const daySessions = mockSessions.filter(s => s.date === dateStr);
            return (
              <div key={i} className={`min-h-36 p-2 rounded-xl ${isToday ? 'ring-2 ring-violet-500' : ''}`}
                style={{ background: isToday ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)' }}>
                <div className="text-center mb-2">
                  <p className={`text-xs font-semibold ${isToday ? 'text-violet-400' : 'text-slate-500'}`}>{DAYS[date.getDay()]}</p>
                  <p className={`text-lg font-black ${isToday ? 'text-violet-300' : 'text-slate-300'}`}>{date.getDate()}</p>
                </div>
                <div className="space-y-1">
                  {daySessions.map(sess => {
                    const grp = mockGroups.find(g => g.id === sess.groupId);
                    const course = getCourse(grp?.courseId || '');
                    return (
                      <div key={sess.id} className="p-1.5 rounded-lg text-center"
                        style={{
                          background: sess.status === 'completed' ? 'rgba(16,185,129,0.15)' :
                            sess.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.2)',
                          border: `1px solid ${sess.status === 'completed' ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.3)'}`
                        }}>
                        <p className="text-xs font-bold truncate">{course?.name}</p>
                        <p className="text-xs text-slate-400">{sess.time}</p>
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
      <div className="glass p-5">
        <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-violet-400" />
          جميع الحصص المجدولة
        </h3>
        <div className="space-y-3">
          {mockSessions.map(sess => {
            const group = mockGroups.find(g => g.id === sess.groupId);
            const course = getCourse(group?.courseId || '');
            const supervisor = getUser(group?.supervisorId || '');
            return (
              <div key={sess.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-center w-12 shrink-0">
                  <p className="text-xs text-slate-500">{new Date(sess.date).toLocaleDateString('ar-EG', { month: 'short' })}</p>
                  <p className="text-xl font-black text-violet-400">{new Date(sess.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{course?.name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={11} /> {sess.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} /> {group?.room}</span>
                    <span>م/ {supervisor?.name}</span>
                  </div>
                </div>
                <span className={`badge ${
                  sess.status === 'completed' ? 'badge-success' :
                  sess.status === 'cancelled' ? 'badge-danger' :
                  sess.status === 'makeup' ? 'badge-info' : 'badge-purple'
                }`}>
                  {sess.status === 'completed' ? 'مكتملة' : sess.status === 'cancelled' ? 'ملغاة' : sess.status === 'makeup' ? 'تعويضية' : 'مجدولة'}
                </span>
                {sess.status === 'scheduled' && (
                  <div className="flex gap-1">
                    <button className="btn btn-danger btn-sm">إلغاء</button>
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
