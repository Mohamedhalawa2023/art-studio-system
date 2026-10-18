'use client';
import { useState } from 'react';
import { mockAnnouncements } from '@/lib/mockData';
import { Megaphone, Image, Plus, X, Calendar, ExternalLink } from 'lucide-react';

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<'announcements' | 'exhibitions'>('announcements');
  const [showNew, setShowNew] = useState(false);

  const filtered = mockAnnouncements.filter(a => tab === 'exhibitions' ? a.type === 'exhibition' : a.type === 'announcement');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">الإعلانات والمعارض</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة إعلانات المرسم والمعارض الفنية</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} />
          إعلان جديد
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`btn ${tab === 'announcements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('announcements')}
        >
          <Megaphone size={16} />
          الإعلانات
        </button>
        <button
          className={`btn ${tab === 'exhibitions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('exhibitions')}
        >
          <Image size={16} />
          المعارض
        </button>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ann => (
          <div key={ann.id} className="glass overflow-hidden">
            {/* Colorful top bar */}
            <div className="h-2 w-full" style={{
              background: ann.type === 'exhibition'
                ? 'linear-gradient(90deg, #7c3aed, #f59e0b)'
                : 'linear-gradient(90deg, #3b82f6, #10b981)'
            }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-lg leading-tight">{ann.title}</h3>
                <span className={`badge shrink-0 ${ann.type === 'exhibition' ? 'badge-purple' : 'badge-info'}`}>
                  {ann.type === 'exhibition' ? 'معرض' : 'إعلان'}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-6">{ann.content}</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                <Calendar size={12} />
                <span>{new Date(ann.startDate).toLocaleDateString('ar-EG')} — {new Date(ann.endDate).toLocaleDateString('ar-EG')}</span>
              </div>
              {ann.link && (
                <a href={ann.link} className="flex items-center gap-1 text-xs text-violet-400 mt-2 hover:text-violet-300">
                  <ExternalLink size={12} />
                  رابط التفاصيل
                </a>
              )}
              <div className="flex gap-2 mt-4">
                <button className="btn btn-secondary btn-sm flex-1">تعديل</button>
                <button className="btn btn-danger btn-sm">حذف</button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            <Megaphone size={48} className="mx-auto mb-3 text-slate-700" />
            <p>لا يوجد إعلانات حالياً</p>
          </div>
        )}
      </div>

      {/* New Announcement Modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="glass p-6 w-full max-w-lg fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">إعلان جديد</h3>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">النوع</label>
                <div className="flex gap-3">
                  {['announcement', 'exhibition'].map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type" value={t} defaultChecked={t === 'announcement'} className="accent-violet-500" />
                      <span className="text-sm">{t === 'announcement' ? 'إعلان' : 'معرض'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">العنوان</label>
                <input className="input" placeholder="عنوان الإعلان..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">المحتوى</label>
                <textarea className="input" rows={4} placeholder="تفاصيل الإعلان..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">تاريخ البداية</label>
                  <input type="date" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">تاريخ الانتهاء</label>
                  <input type="date" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">رابط (اختياري)</label>
                <input className="input" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn btn-primary flex-1" onClick={() => { alert('✅ تم نشر الإعلان!'); setShowNew(false); }}>نشر الإعلان</button>
                <button className="btn btn-secondary" onClick={() => setShowNew(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
