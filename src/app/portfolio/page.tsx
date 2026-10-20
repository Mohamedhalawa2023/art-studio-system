'use client';
import { useState, useRef } from 'react';
import { useMarsam } from '@/lib/store';
import {
  Sparkles, CheckCircle, Clock, X, Upload, Palette,
  Eye, Filter, Plus, Trash2, ShieldCheck, Image as ImageIcon
} from 'lucide-react';

export default function PortfolioPage() {
  const {
    portfolio, users, currentUser,
    addPortfolioItem, updatePortfolioStatus
  } = useMarsam();

  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supervisors = users.filter(u => u.role === 'supervisor' || u.role === 'admin');
  const filteredItems = filter === 'all'
    ? portfolio
    : portfolio.filter(p => p.status === filter);

  // Handle local image upload via FileReader
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('يرجى إدخال عنوان اللوحة أو العمل الفني');
      return;
    }

    const imgToSave = previewImage || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80';
    const supId = newSupervisorId || supervisors[0]?.id || 'u2';

    addPortfolioItem({
      title: newTitle,
      description: newDescription,
      supervisorId: supId,
      imageUrl: imgToSave,
      status: 'pending'
    });

    // Reset & close
    setNewTitle('');
    setNewDescription('');
    setPreviewImage(null);
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Sparkles className="text-teal-400" size={26} />
            معرض الأعمال الفنية ولوحات المرسم
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            توثيق إبداعات المشرفين والطلاب واعتماد اللوحات للنشر بالكتالوج الرسمي للمرسم
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <Upload size={15} />
          <span>إضافة عمل فني جديد</span>
        </button>
      </div>

      {/* Supervisors Summary Row */}
      <div className="glass p-5 rounded-2xl border border-slate-200 bg-white">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Palette size={16} className="text-teal-400" />
          فنانو ومشرفو المرسم
        </h3>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {supervisors.map(sup => {
            const works = portfolio.filter(p => p.supervisorId === sup.id);
            const approved = works.filter(p => p.status === 'approved').length;
            const pending = works.filter(p => p.status === 'pending').length;

            return (
              <div
                key={sup.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                  {sup.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 truncate">{sup.name}</p>
                  <p className="text-[11px] text-slate-500">{sup.phone || 'مشرف معتمد'}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="badge badge-teal text-[10px]">{approved} معتمد</span>
                    {pending > 0 && (
                      <span className="badge badge-info text-[10px]">{pending} قيد الاعتماد</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 glass p-1 rounded-xl border border-slate-200 bg-white shadow-sm">
          {[
            { id: 'all', label: `جميع الأعمال (${portfolio.length})` },
            { id: 'approved', label: `المعتمدة (${portfolio.filter(p => p.status === 'approved').length})` },
            { id: 'pending', label: `في الانتظار (${portfolio.filter(p => p.status === 'pending').length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === f.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-teal-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          عرض {filteredItems.length} عمل فني
        </p>
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass p-12 rounded-2xl border border-slate-200 text-center space-y-3 bg-white">
          <ImageIcon size={44} className="mx-auto text-slate-400" />
          <p className="font-bold text-sm text-slate-800">لا توجد أعمال فنية في هذا القسم بعد</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-secondary text-xs"
          >
            رفع أول عمل فني
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const supervisor = users.find(u => u.id === item.supervisorId);

            return (
              <div
                key={item.id}
                className="glass rounded-2xl overflow-hidden border border-slate-200 flex flex-col group transition-all hover:shadow-lg hover:border-teal-500/40 bg-white"
              >
                {/* Artwork Image Container */}
                <div
                  className="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer"
                  onClick={() => setSelectedArtwork(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <Eye size={14} /> تكبير اللوحة
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`badge ${item.status === 'approved' ? 'badge-teal' : item.status === 'pending' ? 'badge-info' : 'badge-danger'}`}>
                      {item.status === 'approved' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {item.status === 'approved' ? 'معتمد' : item.status === 'pending' ? 'في الانتظار' : 'مرفوض'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-teal-300 font-semibold mt-0.5">
                      بإشراف: {supervisor?.name || 'فنان المرسم'}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Administrative Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    {item.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => updatePortfolioStatus(item.id, 'approved')}
                          className="btn btn-primary text-white text-[11px] font-bold py-1.5 flex-1 flex items-center justify-center gap-1 shadow-sm"
                        >
                          <CheckCircle size={13} /> اعتماد اللوحة
                        </button>
                        <button
                          onClick={() => updatePortfolioStatus(item.id, 'rejected')}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                          title="رفض"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between text-[11px] text-slate-500">
                        <span>تاريخ الإضافة: {item.uploadDate}</span>
                        {item.status === 'approved' && (
                          <span className="text-teal-300 font-bold flex items-center gap-1">
                            <ShieldCheck size={12} /> منشورة
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: UPLOAD ARTWORK ================= */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-teal-400" />
                إضافة عمل فني جديد إلى المعرض
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Image Uploader */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  صورة العمل الفني *:
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-teal-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-teal-500/10/20"
                >
                  {previewImage ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain shadow-md"
                      />
                      <p className="text-[11px] text-teal-400 font-bold">انقر لتغيير الصورة</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload size={32} className="mx-auto text-teal-400 mb-1" />
                      <p className="font-bold text-xs text-slate-800">اختر صورة العمل الفني من جهازك</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, JPEG (يتم حفظها في قاعدة البيانات المحلية)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  عنوان العمل الفني / اللوحة *:
                </label>
                <input
                  className="input text-xs"
                  placeholder="مثال: دراسة الضوء والظلال في الطبيعة الصامتة"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  المشرف أو الفنان المنفذ:
                </label>
                <select
                  className="input text-xs"
                  value={newSupervisorId}
                  onChange={e => setNewSupervisorId(e.target.value)}
                >
                  {supervisors.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name} ({sup.role === 'admin' ? 'المدير' : 'مشرف'})</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  وصف العمل والخامات المستخدمة:
                </label>
                <textarea
                  className="input text-xs h-20"
                  placeholder="مثال: ألوان زيتية على كانفاس مشدود 50x70، تطبيق تقنيات الشياروسكورو والتدرج اللوني..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-1 text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  حفظ العمل بالمعرض
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ARTWORK ZOOM VIEW ================= */}
      {selectedArtwork && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedArtwork(null)}
        >
          <div
            className="bg-white max-w-3xl w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xl text-slate-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative max-h-[70vh] bg-slate-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                className="max-h-[70vh] w-auto object-contain"
              />
              <button
                onClick={() => setSelectedArtwork(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-900"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex items-center justify-between bg-white border-t border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">{selectedArtwork.title}</h3>
                <p className="text-xs text-teal-300 font-semibold mt-0.5">{selectedArtwork.description}</p>
              </div>
              <button
                onClick={() => setSelectedArtwork(null)}
                className="btn btn-secondary text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
