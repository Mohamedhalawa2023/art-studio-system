'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { TrendingUp, Star, CheckCircle, Award, Calendar, Search, Filter, Sparkles, BookOpen } from 'lucide-react';

const levels = [
  'المستوى الأول — أسس الخطوط والنسب',
  'المستوى الثاني — التكوين والأشكال الهندسية',
  'المستوى الثالث — دراسة الضوء والظل (Chiaroscuro)',
  'المستوى الرابع — نظرية وتناغم الألوان',
  'المستوى الخامس — الملامس والخامات الفنية',
  'المستوى المتقدم — اللوحة الكاملة والبورتريه'
];
const ratings = [1, 2, 3, 4, 5];

export default function ProgressPage() {
  const {
    students, progress, sessions, groups, courses,
    updateStudentProgress
  } = useMarsam();

  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || 'ses1');
  const [ratingsMap, setRatingsMap] = useState<Record<string, { level: string; rating: number; notes: string }>>({});
  const [viewMode, setViewMode] = useState<'record' | 'history'>('record');
  const [historySearch, setHistorySearch] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active session details
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const activeGroup = groups.find(g => g.id === activeSession?.groupId);
  const activeCourse = courses.find(c => c.id === activeGroup?.courseId);

  // Students in this session (or fallback to all students if no explicit group enrollment)
  const currentStudents = students;

  const setStudentRatingField = (studentId: string, field: 'level' | 'rating' | 'notes', value: string | number) => {
    setRatingsMap(prev => {
      const current = prev[studentId] || { level: levels[0], rating: 4, notes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleSaveAll = () => {
    const studentIds = Object.keys(ratingsMap);
    if (studentIds.length === 0) {
      // Save defaults for active session
      currentStudents.forEach(st => {
        updateStudentProgress({
          studentId: st.id,
          sessionId: selectedSessionId,
          level: st.level || levels[0],
          rating: 4,
          notes: 'مستوى متميز وحضور فعال بالحصة.'
        });
      });
    } else {
      studentIds.forEach(id => {
        const item = ratingsMap[id];
        updateStudentProgress({
          studentId: id,
          sessionId: selectedSessionId,
          level: item.level || levels[0],
          rating: item.rating || 4,
          notes: item.notes || ''
        });
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // History filtering
  const filteredStudentsWithProgress = students.filter(st => {
    const matchesSearch = st.name.includes(historySearch) || st.qrToken.includes(historySearch);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Award className="text-blue-600" size={26} />
            متابعة وتقييم مستوى الطلاب
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            تقييم المهارات الفنية بعد كل ورشة وحفظ سجل التطور الأكاديمي
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={`btn text-xs font-bold ${viewMode === 'record' ? 'btn-primary shadow-sm shadow-blue-600/20' : 'btn-secondary'}`}
            onClick={() => setViewMode('record')}
          >
            <TrendingUp size={15} />
            تسجيل تقييم حصة
          </button>
          <button
            className={`btn text-xs font-bold ${viewMode === 'history' ? 'btn-primary shadow-sm shadow-blue-600/20' : 'btn-secondary'}`}
            onClick={() => setViewMode('history')}
          >
            <Calendar size={15} />
            سجل التطور الأكاديمي
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-3 text-sm font-bold animate-in fade-in">
          <CheckCircle size={20} className="shrink-0 text-blue-600" />
          <span>تم حفظ التقييمات بنجاح في قاعدة البيانات المحلية ومزامنتها على القرص الصلب.</span>
        </div>
      )}

      {/* ================= MODE 1: RECORD SESSION EVALUATIONS ================= */}
      {viewMode === 'record' && (
        <div className="space-y-5">
          {/* Session Selector */}
          <div className="glass p-5 rounded-2xl border border-slate-200 bg-white">
            <div className="grid md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  اختر الحصة والورشة التدريبية:
                </label>
                <select
                  className="input text-xs font-semibold"
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                >
                  {sessions.map(sess => {
                    const grp = groups.find(g => g.id === sess.groupId);
                    const crs = courses.find(c => c.id === grp?.courseId);
                    return (
                      <option key={sess.id} value={sess.id}>
                        {crs?.name || 'ورشة فنية'} — تاريخ {sess.date} ({sess.time})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] text-slate-500 font-medium">الكورس المحدد:</p>
                <p className="font-bold text-xs text-slate-900 mt-0.5">{activeCourse?.name || 'الفنون التشكيلية'}</p>
                <p className="text-[10px] text-blue-700 font-semibold mt-0.5">عدد الطلاب: {currentStudents.length} طلاب</p>
              </div>
            </div>
          </div>

          {/* Students Evaluation Form */}
          <div className="glass p-6 rounded-2xl border border-slate-200 space-y-4 bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">تقييم مهارات الطلاب في هذه الحصة</h3>
                <p className="text-xs text-slate-500">حدد مستوى الإتقان، التقدير بالنجوم، وملاحظة الموجه الفني</p>
              </div>
              <button
                onClick={handleSaveAll}
                className="btn btn-primary text-xs font-bold shadow-md shadow-blue-600/20"
              >
                <CheckCircle size={15} />
                حفظ التقييمات للجميع
              </button>
            </div>

            <div className="space-y-3">
              {currentStudents.map(student => {
                const current = ratingsMap[student.id] || {
                  level: student.level || levels[0],
                  rating: 4,
                  notes: ''
                };

                return (
                  <div
                    key={student.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-blue-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{student.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{student.qrToken}</span>
                        </div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-semibold">التقدير:</span>
                        <div className="flex gap-1">
                          {ratings.map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setStudentRatingField(student.id, 'rating', r)}
                              className="cursor-pointer transition-transform hover:scale-110 p-0.5"
                            >
                              <Star
                                size={19}
                                className={r <= current.rating ? 'text-blue-600 fill-blue-600' : 'text-slate-200'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 pt-1">
                      {/* Level */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          المستوى المنجز:
                        </label>
                        <select
                          className="input text-xs"
                          value={current.level}
                          onChange={e => setStudentRatingField(student.id, 'level', e.target.value)}
                        >
                          {levels.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          ملاحظات وتوجيهات الموجه الفني:
                        </label>
                        <input
                          className="input text-xs"
                          placeholder="مثال: تحسن ملحوظ في دقة الظلال ومزج الألوان الزيتية..."
                          value={current.notes}
                          onChange={e => setStudentRatingField(student.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveAll}
                className="btn btn-primary text-xs font-bold shadow-md shadow-blue-600/20"
              >
                <CheckCircle size={15} />
                حفظ التقييمات للجميع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODE 2: PROGRESS HISTORY ================= */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="glass p-3 rounded-xl border border-slate-200 bg-white">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                className="input pr-10 text-xs"
                placeholder="بحث باسم الطالب لعرض سجل تقييماته السابقة..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredStudentsWithProgress.map(student => {
              const studentEvals = progress.filter(p => p.studentId === student.id);

              return (
                <div key={student.id} className="glass p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{student.name}</h4>
                        <p className="text-xs text-slate-500">كود الطالب: {student.qrToken} • {student.level}</p>
                      </div>
                    </div>

                    <span className="badge badge-blue text-xs">
                      {studentEvals.length} تقييمات مسجلة
                    </span>
                  </div>

                  {studentEvals.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">
                      لا توجد تقييمات مسجلة لهذا الطالب بعد. يمكنك تسجيل تقييم جديد من تبويب &quot;تسجيل تقييم حصة&quot;.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {studentEvals.map(evalItem => (
                        <div
                          key={evalItem.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-700">
                              {evalItem.level}
                            </span>
                            <div className="flex gap-0.5">
                              {ratings.map(r => (
                                <Star
                                  key={r}
                                  size={13}
                                  className={r <= evalItem.rating ? 'text-blue-600 fill-blue-600' : 'text-slate-200'}
                                />
                              ))}
                            </div>
                          </div>

                          {evalItem.notes && (
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {evalItem.notes}
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex justify-between">
                            <span>تاريخ التقييم:</span>
                            <span className="font-mono">{evalItem.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
