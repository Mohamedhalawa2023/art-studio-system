'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { BookOpen, Users, Clock, Plus, ChevronDown, ChevronUp, Star, Calendar } from 'lucide-react';

export default function CoursesPage() {
  const { courses, groups, users } = useMarsam();
  const [expanded, setExpanded] = useState<string | null>(courses[0]?.id || 'c1');
  const [showNewGroup, setShowNewGroup] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <BookOpen className="text-blue-600" size={26} />
            الكورسات والورش الفنية
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            إدارة مناهج الرسم، الورش المتخصصة، والمجموعات التدريبية بالمرسم
          </p>
        </div>
        <button
          onClick={() => alert('لإضافة كورس جديد، استخدم لوحة الإعدادات أو أضف بيانات الكورس مباشرة')}
          className="btn btn-primary text-xs font-bold"
        >
          <Plus size={15} />
          إضافة كورس جديد
        </button>
      </div>

      <div className="space-y-4">
        {courses.map(course => {
          const courseGroups = groups.filter(g => g.courseId === course.id);
          const isOpen = expanded === course.id;

          return (
            <div key={course.id} className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white">
              {/* Course Header */}
              <button
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : course.id)}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl shrink-0 shadow-md shadow-blue-600/20">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900">{course.name}</h3>
                    <span className="badge badge-blue text-xs">{course.ageGroup}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 line-clamp-1">{course.description}</p>
                </div>
                <div className="text-left shrink-0 ml-2">
                  <p className="text-xl font-black text-blue-700">{course.price?.toLocaleString()} ج</p>
                  <p className="text-[11px] text-slate-400">{course.sessionsCount} حصص</p>
                </div>
                <div className="text-slate-400 shrink-0">
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Levels & Syllabus */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                  {/* Levels row */}
                  {course.levels && course.levels.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-blue-50/40 border border-blue-100">
                      <p className="w-full text-xs font-bold text-slate-600 mb-1">المستويات والمحاور المعتمدة:</p>
                      {course.levels.map((level, i) => (
                        <span key={i} className="flex items-center gap-1 badge badge-blue text-xs">
                          <Star size={11} className="text-blue-600" />
                          {level}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Groups */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Users size={15} className="text-blue-600" />
                      المجموعات المفتوحة ({courseGroups.length})
                    </h4>
                  </div>

                  {courseGroups.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-4">لا توجد مجموعات مسجلة لهذا الكورس حالياً</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {courseGroups.map(group => {
                        const supervisor = users.find(u => u.id === group.supervisorId);
                        const enrolled = group.enrolled || 0;
                        const capacity = group.capacity || 10;
                        const pct = Math.round((enrolled / capacity) * 100);

                        return (
                          <div key={group.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
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
                              <span className={`badge ${group.status === 'active' ? 'badge-blue' : group.status === 'upcoming' ? 'badge-info' : 'badge-gray'}`}>
                                {group.status === 'active' ? 'نشطة' : group.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>المقاعد المشغولة:</span>
                              <span className={`font-bold ${pct >= 100 ? 'text-red-500' : 'text-blue-700'}`}>
                                {enrolled}/{capacity} طالب ({pct}%)
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
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
    </div>
  );
}
