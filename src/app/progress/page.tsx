'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { TrendingUp, Star, CheckCircle, Award, Calendar, Search, Trash2 } from 'lucide-react';

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
    students, progress, sessions, groups, courses, enrollments,
    updateStudentProgress, deleteStudentProgress
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

  // Only assess students enrolled in the group that owns the selected session.
  const currentStudents = activeGroup
    ? students.filter(student => enrollments.some(enrollment => enrollment.studentId === student.id && enrollment.groupId === activeGroup.id))
    : [];

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
    if (currentStudents.length === 0) return;
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

  const handleDeleteProgress = (id: string) => {
    if (!window.confirm('حذف سجل التقييم الدراسي؟')) return;
    try { deleteStudentProgress(id); }
    catch (error) { alert(error instanceof Error ? error.message : 'تعذر حذف التقييم.'); }
  };

  // History filtering
  const filteredStudentsWithProgress = students.filter(st => {
    const matchesSearch = st.name.includes(historySearch) || st.qrToken.includes(historySearch);
    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488]/20 border border-[#0D9488]/40 flex items-center justify-center text-[#2DD4BF]">
              <Award size={22} />
            </div>
            متابعة وتقييم مستوى الطلاب
          </h1>
          <p className="text-[#94A3B8] text-xs mt-1">
            تقييم المهارات الفنية بعد كل ورشة وحفظ سجل التطور الأكاديمي
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'record'
                ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/30 border border-[#0D9488]'
                : 'bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2537]'
            }`}
            onClick={() => setViewMode('record')}
          >
            <TrendingUp size={15} />
            تسجيل تقييم حصة
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'history'
                ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/30 border border-[#0D9488]'
                : 'bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2537]'
            }`}
            onClick={() => setViewMode('history')}
          >
            <Calendar size={15} />
            سجل التطور الأكاديمي
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-[#0D9488]/15 border border-[#0D9488]/40 text-[#2DD4BF] flex items-center gap-3 text-xs font-bold shadow-lg animate-in fade-in">
          <CheckCircle size={18} className="shrink-0 text-[#2DD4BF]" />
          <span>تم حفظ التقييمات بنجاح في قاعدة البيانات المحلية ومزامنتها على القرص الصلب.</span>
        </div>
      )}

      {/* ================= MODE 1: RECORD SESSION EVALUATIONS ================= */}
      {viewMode === 'record' && (
        <div className="space-y-5">
          {/* Session Selector */}
          <div className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl shadow-xl">
            <div className="grid md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                  اختر الحصة والورشة التدريبية:
                </label>
                <select
                  className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#F8FAFC] focus:outline-none focus:border-[#0D9488] transition-colors shadow-inner"
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                >
                  {sessions.map(sess => {
                    const grp = groups.find(g => g.id === sess.groupId);
                    const crs = courses.find(c => c.id === grp?.courseId);
                    return (
                      <option key={sess.id} value={sess.id} className="bg-[#111827] text-[#F8FAFC]">
                        {crs?.name || 'ورشة فنية'} — تاريخ {sess.date} ({sess.time})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111827] border border-[#2A3B56] shadow-inner">
                <p className="text-[11px] text-[#94A3B8] font-medium">الكورس المحدد:</p>
                <p className="font-bold text-xs text-[#F8FAFC] mt-0.5">{activeCourse?.name || 'الفنون التشكيلية'}</p>
                <p className="text-[11px] text-[#2DD4BF] font-bold mt-0.5">عدد الطلاب: {currentStudents.length} طلاب</p>
              </div>
            </div>
          </div>

          {/* Students Evaluation Form */}
          <div className="bg-[#1B2537] border border-[#2A3B56] p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#2A3B56]">
              <div>
                <h3 className="font-bold text-sm text-[#F8FAFC]">تقييم مهارات الطلاب في هذه الحصة</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">حدد مستوى الإتقان، التقدير بالنجوم، وملاحظة الموجه الفني</p>
              </div>
              <button
                onClick={handleSaveAll}
                disabled={currentStudents.length === 0}
                className="bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#111827] disabled:text-[#64748B] disabled:border-[#2A3B56] disabled:border text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-[#0D9488]/20 transition-all disabled:shadow-none disabled:cursor-not-allowed"
              >
                <CheckCircle size={15} />
                حفظ التقييمات للجميع
              </button>
            </div>

            <div className="space-y-3.5">
              {currentStudents.length === 0 && (
                <p className="rounded-xl border border-[#2A3B56] bg-[#111827] p-6 text-center text-xs text-[#94A3B8]">
                  لا يوجد طلاب مسجلون في مجموعة هذه الحصة.
                </p>
              )}
              {currentStudents.map(student => {
                const current = ratingsMap[student.id] || {
                  level: student.level || levels[0],
                  rating: 4,
                  notes: ''
                };

                return (
                  <div
                    key={student.id}
                    className="p-4.5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488]/50 transition-all space-y-3.5 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0D9488] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border border-[#2DD4BF]/30">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#F8FAFC]">{student.name}</p>
                          <span className="text-[10px] text-[#94A3B8] font-mono">{student.qrToken}</span>
                        </div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-[#94A3B8] font-bold">التقدير:</span>
                        <div className="flex gap-1">
                          {ratings.map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setStudentRatingField(student.id, 'rating', r)}
                              className="cursor-pointer transition-transform hover:scale-125 p-0.5"
                            >
                              <Star
                                size={19}
                                className={r <= current.rating ? 'text-[#D97706] fill-[#D97706] drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]' : 'text-[#334155]'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3.5 pt-1">
                      {/* Level */}
                      <div>
                        <label className="text-[11px] font-bold text-[#94A3B8] mb-1.5 block">
                          المستوى المنجز:
                        </label>
                        <select
                          className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#0D9488] transition-colors"
                          value={current.level}
                          onChange={e => setStudentRatingField(student.id, 'level', e.target.value)}
                        >
                          {levels.map(l => (
                            <option key={l} value={l} className="bg-[#111827] text-[#F8FAFC]">{l}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[11px] font-bold text-[#94A3B8] mb-1.5 block">
                          ملحوظات وتوجيهات الموجه الفني:
                        </label>
                        <input
                          className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488] transition-colors"
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

            <div className="pt-3 flex justify-end">
              <button
                onClick={handleSaveAll}
                disabled={currentStudents.length === 0}
                className="bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#111827] disabled:text-[#64748B] disabled:border-[#2A3B56] disabled:border text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-[#0D9488]/20 transition-all disabled:shadow-none disabled:cursor-not-allowed"
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
          <div className="bg-[#1B2537] border border-[#2A3B56] p-3 rounded-xl shadow-md">
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={17} />
              <input
                className="w-full bg-[#111827] border border-[#2A3B56] rounded-xl pr-10 pl-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] transition-colors"
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
                <div key={student.id} className="bg-[#1B2537] border border-[#2A3B56] p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#2A3B56]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#0D9488] flex items-center justify-center text-white font-black text-base shadow-md border border-[#2DD4BF]/30">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#F8FAFC]">{student.name}</h4>
                        <p className="text-xs text-[#94A3B8]">كود الطالب: {student.qrToken} • {student.level}</p>
                      </div>
                    </div>

                    <span className="bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] text-xs px-2.5 py-0.5 rounded-lg font-bold">
                      {studentEvals.length} تقييمات مسجلة
                    </span>
                  </div>

                  {studentEvals.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] text-center py-4">
                      لا توجد تقييمات مسجلة لهذا الطالب بعد. يمكنك تسجيل تقييم جديد من تبويب &quot;تسجيل تقييم حصة&quot;.
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {studentEvals.map(evalItem => (
                        <div
                          key={evalItem.id}
                          className="p-3.5 rounded-xl border border-[#2A3B56] bg-[#111827] space-y-2 shadow-inner"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2DD4BF]">
                              {evalItem.level}
                            </span>
                            <div className="flex gap-0.5">
                              {ratings.map(r => (
                                <Star
                                  key={r}
                                  size={13}
                                  className={r <= evalItem.rating ? 'text-[#D97706] fill-[#D97706]' : 'text-[#334155]'}
                                />
                              ))}
                            </div>
                          </div>

                          {evalItem.notes && (
                            <p className="text-xs text-[#94A3B8] leading-relaxed">
                              {evalItem.notes}
                            </p>
                          )}

                          <div className="text-[10px] text-[#64748B] pt-2 border-t border-[#2A3B56] flex justify-between items-center">
                            <span>تاريخ التقييم: <strong className="font-mono text-[#94A3B8]">{evalItem.date}</strong></span>
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1 transition-colors"
                              onClick={() => handleDeleteProgress(evalItem.id)}
                            >
                              <Trash2 size={12} />
                              حذف التقييم
                            </button>
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
