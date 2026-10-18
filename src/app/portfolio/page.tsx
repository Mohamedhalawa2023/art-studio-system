'use client';
import { useState } from 'react';
import { mockPortfolio, mockUsers } from '@/lib/mockData';
import { Image, CheckCircle, Clock, X, Plus, Upload } from 'lucide-react';

export default function PortfolioPage() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [showUpload, setShowUpload] = useState(false);

  const supervisors = mockUsers.filter(u => u.role === 'supervisor');
  const items = filter === 'all' ? mockPortfolio : mockPortfolio.filter(p => p.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">معرض أعمال المشرفين</h1>
          <p className="text-slate-400 text-sm mt-1">أعمال فنية للمشرفين — تحتاج اعتماد الأدمن قبل النشر</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <Upload size={16} />
          رفع عمل
        </button>
      </div>

      {/* Supervisors */}
      <div className="glass p-5">
        <h3 className="font-bold text-slate-200 mb-4">المشرفون</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {supervisors.map(sup => {
            const works = mockPortfolio.filter(p => p.supervisorId === sup.id);
            const approved = works.filter(p => p.status === 'approved').length;
            return (
              <div key={sup.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shrink-0">
                  {sup.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{sup.name}</p>
                  <p className="text-sm text-slate-400">{sup.phone}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-success">{approved} عمل معتمد</span>
                    {works.filter(p => p.status === 'pending').length > 0 && (
                      <span className="badge badge-warning">{works.filter(p => p.status === 'pending').length} في الانتظار</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'approved', label: 'معتمدة' },
          { id: 'pending', label: 'في الانتظار' },
        ].map(f => (
          <button
            key={f.id}
            className={`btn ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.id as any)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(item => {
          const supervisor = mockUsers.find(u => u.id === item.supervisorId);
          return (
            <div key={item.id} className="glass overflow-hidden group">
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 right-2">
                  <span className={`badge ${item.status === 'approved' ? 'badge-success' : item.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                    {item.status === 'approved' ? <CheckCircle size={10} /> : <Clock size={10} />}
                    {item.status === 'approved' ? 'معتمد' : item.status === 'pending' ? 'في الانتظار' : 'مرفوض'}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{supervisor?.name}</p>
                {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                {item.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-success btn-sm flex-1" onClick={() => alert('✅ تم اعتماد العمل!')}>
                      <CheckCircle size={12} /> اعتماد
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => alert('❌ تم رفض العمل!')}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="glass p-6 w-full max-w-md fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">رفع عمل فني</h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-violet-500/40 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/70 transition-colors"
                style={{ background: 'rgba(124,58,237,0.05)' }}>
                <Upload size={32} className="mx-auto text-violet-400 mb-2" />
                <p className="text-sm text-slate-400">اسحب الصورة هنا أو انقر للاختيار</p>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG — حتى 5MB (يُضغط تلقائياً)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">عنوان العمل</label>
                <input className="input" placeholder="اسم اللوحة أو العمل..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1">الوصف (اختياري)</label>
                <input className="input" placeholder="الخامة والأسلوب المستخدم..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn btn-primary flex-1" onClick={() => { alert('✅ تم رفع العمل، في انتظار اعتماد الأدمن!'); setShowUpload(false); }}>
                  <Upload size={16} />
                  رفع وإرسال للاعتماد
                </button>
                <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
