'use client';
import { useState } from 'react';
import { mockCourses, mockGroups, mockUsers, getCourse, getUser } from '@/lib/mockData';
import { BookOpen, Users, Clock, Plus, ChevronDown, ChevronUp, Star, Calendar } from 'lucide-react';

export default function CoursesPage() {
  const [expanded, setExpanded] = useState<string | null>('c1');
  const [showNewGroup, setShowNewGroup] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">الكورسات والمجموعات</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة جميع الكورسات ومجموعاتها</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} />
          كورس جديد
        </button>
      </div>

      <div className="space-y-4">
        {mockCourses.map(course => {
          const groups = mockGroups.filter(g => g.courseId === course.id);
          const isOpen = expanded === course.id;
          return (
            <div key={course.id} className="glass overflow-hidden">
              {/* Course Header */}
              <button
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(isOpen ? null : course.id)}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-2xl shrink-0">
                  🎨
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg">{course.name}</h3>
                    <span className="badge badge-purple">{course.ageGroup}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{course.description}</p>
                </div>
                <div className="text-left shrink-0 ml-4">
                  <p className="text-2xl font-black text-violet-400">{course.price.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">جنيه · {course.sessionsCount} حصة</p>
                </div>
                <div className="text-slate-400">
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Levels */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Levels row */}
                  <div className="flex flex-wrap gap-2 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="w-full text-xs font-semibold text-slate-400 mb-1">مراحل الكورس:</p>
                    {course.levels.map((level, i) => (
                      <span key={i} className="flex items-center gap-1 badge badge-info">
                        <Star size={10} />
                        {level}
                      </span>
                    ))}
                  </div>

                  {/* Groups */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                      <Users size={16} className="text-violet-400" />
                      المجموعات ({groups.length})
                    </h4>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowNewGroup(true)}>
                      <Plus size={14} />
                      مجموعة جديدة
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">لا توجد مجموعات بعد</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {groups.map(group => {
                        const supervisor = getUser(group.supervisorId);
                        const pct = Math.round((group.enrolled / group.capacity) * 100);
                        return (
                          <div key={group.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-sm">م/ {supervisor?.name}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                  <Clock size={12} />
                                  {group.schedule}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                  <Calendar size={12} />
                                  {new Date(group.startDate).toLocaleDateString('ar-EG')} — {new Date(group.endDate).toLocaleDateString('ar-EG')}
                                </div>
                              </div>
                              <span className={`badge ${group.status === 'active' ? 'badge-success' : group.status === 'upcoming' ? 'badge-warning' : 'badge-gray'}`}>
                                {group.status === 'active' ? 'نشطة' : group.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                              <span>الأماكن المتاحة</span>
                              <span className={pct >= 100 ? 'text-red-400' : 'text-green-400'}>
                                {group.enrolled}/{group.capacity}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            {group.room && (
                              <p className="text-xs text-slate-500 mt-2">📍 {group.room}</p>
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
