'use client';
import { useState } from 'react';
import { mockStudents, mockProgress, mockSessions, mockEnrollments, mockGroups, getCourse, getStudent } from '@/lib/mockData';
import { TrendingUp, Star, CheckCircle, ChevronDown } from 'lucide-react';

const levels = ['المستوى الأول - الخطوط', 'المستوى الثاني - الأشكال', 'المستوى الثالث - الظل والنور'];
const ratings = [1, 2, 3, 4, 5];

export default function ProgressPage() {
  const [selectedSession, setSelectedSession] = useState('ses3');
  const [ratings_map, setRatingsMap] = useState<Record<string, { level: string; rating: number; notes: string }>>({});
  const [viewMode, setViewMode] = useState<'record' | 'view'>('record');

  const session = mockSessions.find(s => s.id === selectedSession);
  const group = mockGroups.find(g => g.id === session?.groupId);
  const enrolledStudents = mockEnrollments.filter(e => e.groupId === group?.id).map(e => mockStudents.find(s => s.id === e.studentId)!).filter(Boolean);

  const setStudentProgress = (studentId: string, field: string, value: string | number) => {
    setRatingsMap(prev => {
      const current = prev[studentId] || { level: '', rating: 0, notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">متابعة مستوى الطلاب</h1>
          <p className="text-slate-400 text-sm mt-1">تقييم وتسجيل مستوى الطلاب بعد كل حصة</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${viewMode === 'record' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('record')}>
            تسجيل تقييم
          </button>
          <button className={`btn ${viewMode === 'view' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('view')}>
            سجل التقدم
          </button>
        </div>
      </div>

      {/* Record Mode */}
      {viewMode === 'record' && (
        <>
          {/* Session Select */}
          <div className="glass p-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">اختر الحصة لتسجيل التقييم</label>
            <select className="input" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
              {mockSessions.map(sess => {
                const grp = mockGroups.find(g => g.id === sess.groupId);
                const course = getCourse(grp?.courseId || '');
                return <option key={sess.id} value={sess.id}>{course?.name} — {sess.date} الساعة {sess.time}</option>;
              })}
            </select>
          </div>

          {/* Students Rating */}
          <div className="glass p-5">
            <h3 className="font-bold text-slate-200 mb-4">
              {getCourse(group?.courseId || '')?.name} — {session?.date}
            </h3>
            <div className="space-y-4">
              {enrolledStudents.map(student => {
                const current = ratings_map[student.id] || { level: '', rating: 0, notes: '' };
                return (
                  <div key={student.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{student.name}</p>
                        <span className="badge badge-purple text-xs">{student.level || 'لم يُحدد بعد'}</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      {/* Level Select */}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">المرحلة التي وصلها</label>
                        <select
                          className="input text-sm py-2"
                          value={current.level}
                          onChange={e => setStudentProgress(student.id, 'level', e.target.value)}
                        >
                          <option value="">اختر المرحلة...</option>
                          {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Star Rating */}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">التقدير</label>
                        <div className="flex gap-1 mt-1">
                          {ratings.map(r => (
                            <button
                              key={r}
                              onClick={() => setStudentProgress(student.id, 'rating', r)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                size={22}
                                className={r <= current.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">ملاحظة (اختياري)</label>
                        <input
                          className="input text-sm py-2"
                          placeholder="ملاحظة قصيرة..."
                          value={current.notes}
                          onChange={e => setStudentProgress(student.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => alert('✅ تم حفظ التقييم لجميع الطلاب!')}
              >
                <CheckCircle size={16} />
                حفظ التقييمات
              </button>
            </div>
          </div>
        </>
      )}

      {/* View Mode - Progress History */}
      {viewMode === 'view' && (
        <div className="space-y-4">
          {mockStudents.map(student => {
            const progresses = mockProgress.filter(p => p.studentId === student.id);
            if (progresses.length === 0) return null;
            return (
              <div key={student.id} className="glass p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{student.name}</p>
                    <span className="badge badge-purple text-xs">{student.level}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {progresses.map(prog => (
                    <div key={prog.id} className="flex items-start gap-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex gap-0.5 shrink-0">
                        {ratings.map(r => (
                          <Star key={r} size={14} className={r <= prog.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-violet-300">{prog.level}</p>
                        {prog.notes && <p className="text-xs text-slate-400 mt-0.5">{prog.notes}</p>}
                      </div>
                      <p className="text-xs text-slate-500 shrink-0">{new Date(prog.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
