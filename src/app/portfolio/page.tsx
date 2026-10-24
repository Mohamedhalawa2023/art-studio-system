'use client';
import { useState, useRef } from 'react';
import { useMarsam } from '@/lib/store';
import {
  Sparkles, CheckCircle, Clock, X, Upload, Palette,
  Eye, Filter, Plus, Trash2, ShieldCheck, Image as ImageIcon, Pencil
} from 'lucide-react';

export default function PortfolioPage() {
  const {
    portfolio, users, currentUser,
    addPortfolioItem, updatePortfolioStatus, updatePortfolioItem, deletePortfolioItem
  } = useMarsam();

  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [editingArtwork, setEditingArtwork] = useState<(typeof portfolio)[number] | null>(null);

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

    const imgToSave = previewImage || editingArtwork?.imageUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80';
    const supId = newSupervisorId || supervisors[0]?.id || 'u2';

    if (editingArtwork) {
      updatePortfolioItem(editingArtwork.id, { title: newTitle, description: newDescription, supervisorId: supId, imageUrl: imgToSave });
    } else {
      addPortfolioItem({ title: newTitle, description: newDescription, supervisorId: supId, imageUrl: imgToSave, status: 'pending' });
    }

    // Reset & close
    setNewTitle('');
    setNewDescription('');
    setPreviewImage(null);
    setEditingArtwork(null);
    setShowUploadModal(false);
  };

  const beginArtworkEdit = (item: (typeof portfolio)[number]) => {
    setEditingArtwork(item);
    setNewTitle(item.title);
    setNewDescription(item.description || '');
    setNewSupervisorId(item.supervisorId);
    setPreviewImage(null);
    setShowUploadModal(true);
  };

  const removeArtwork = (item: (typeof portfolio)[number]) => {
    if (!window.confirm(`حذف العمل الفني «${item.title}» من المعرض؟`)) return;
    try { deletePortfolioItem(item.id); }
    catch (error) { alert(error instanceof Error ? error.message : 'تعذر حذف العمل الفني.'); }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <Sparkles className="text-[#2DD4BF]" size={26} />
            معرض الأعمال الفنية ولوحات المرسم
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            توثيق إبداعات المشرفين والطلاب واعتماد اللوحات للنشر بالكتالوج الرسمي للمرسم
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-teal-900/30 cursor-pointer"
        >
          <Upload size={16} />
          <span>إضافة عمل فني جديد</span>
        </button>
      </div>

      {/* Supervisors Summary Row */}
      <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#F8FAFC] mb-3.5 flex items-center gap-2">
          <Palette size={16} className="text-[#2DD4BF]" />
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
                className="p-3.5 rounded-xl border border-[#2A3B56] bg-[#111827] flex items-center gap-3 transition-colors hover:border-[#0D9488]/40"
              >
                <div className="w-11 h-11 rounded-full bg-[#0D9488] flex items-center justify-center text-[#F8FAFC] font-black text-sm shadow-sm shrink-0">
                  {sup.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-[#F8FAFC] truncate">{sup.name}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{sup.phone || 'مشرف معتمد'}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#115E59] text-[#2DD4BF]">
                      {approved} معتمد
                    </span>
                    {pending > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#78350F] text-[#D97706]">
                        {pending} قيد الاعتماد
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 p-1 rounded-xl bg-[#111827] border border-[#2A3B56]">
          {[
            { id: 'all', label: `جميع الأعمال (${portfolio.length})` },
            { id: 'approved', label: `المعتمدة (${portfolio.filter(p => p.status === 'approved').length})` },
            { id: 'pending', label: `في الانتظار (${portfolio.filter(p => p.status === 'pending').length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === f.id
                  ? 'bg-[#0D9488] text-[#F8FAFC] shadow-md shadow-teal-900/30'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#94A3B8]">
          عرض {filteredItems.length} عمل فني
        </p>
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-2xl border border-[#2A3B56] text-center space-y-3 bg-[#1B2537]">
          <ImageIcon size={44} className="mx-auto text-[#94A3B8]/60" />
          <p className="font-bold text-sm text-[#F8FAFC]">لا توجد أعمال فنية في هذا القسم بعد</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-[#111827] border border-[#334155] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-bold transition-all"
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
                className="rounded-2xl overflow-hidden border border-[#2A3B56] bg-[#1B2537] flex flex-col group transition-all hover:border-[#0D9488]/50 shadow-sm"
              >
                {/* Artwork Image Container */}
                <div
                  className="relative h-52 w-full overflow-hidden bg-[#111827] cursor-pointer"
                  onClick={() => setSelectedArtwork(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E1629]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[#F8FAFC] text-xs font-bold flex items-center gap-1">
                      <Eye size={14} /> تكبير اللوحة
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md ${
                        item.status === 'approved'
                          ? 'bg-[#115E59] text-[#2DD4BF]'
                          : item.status === 'pending'
                          ? 'bg-[#78350F] text-[#D97706]'
                          : 'bg-[#450A0A] text-[#FCA5A5]'
                      }`}
                    >
                      {item.status === 'approved' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {item.status === 'approved' ? 'معتمد' : item.status === 'pending' ? 'في الانتظار' : 'مرفوض'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#F8FAFC] leading-snug line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-[#2DD4BF] font-semibold mt-1">
                      بإشراف: {supervisor?.name || 'فنان المرسم'}
                    </p>
                    {item.description && (
                      <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Administrative Action Buttons */}
                  <div className="pt-2 border-t border-[#2A3B56] flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => beginArtworkEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="تعديل العمل الفني"
                    >
                      <Pencil size={12} />
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => removeArtwork(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8]/60 hover:text-red-400 hover:border-red-500/50 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="حذف العمل الفني"
                    >
                      <Trash2 size={12} />
                      حذف
                    </button>
                    {item.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => updatePortfolioStatus(item.id, 'approved')}
                          className="px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-[11px] font-bold flex-1 flex items-center justify-center gap-1 transition-colors shadow-md shadow-teal-900/30"
                        >
                          <CheckCircle size={12} /> اعتماد اللوحة
                        </button>
                        <button
                          onClick={() => updatePortfolioStatus(item.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-[#111827] border border-red-900/60 text-red-400 hover:bg-red-950/40 transition-colors"
                          title="رفض"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
                        <span>تاريخ الإضافة: {item.uploadDate}</span>
                        {item.status === 'approved' && (
                          <span className="text-[#2DD4BF] font-bold flex items-center gap-1">
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
        <div className="modal-overlay" onClick={() => { setShowUploadModal(false); setEditingArtwork(null); setPreviewImage(null); }}>
          <div
            className="bg-[#1B2537] p-6 rounded-2xl max-w-lg w-full border border-[#2A3B56] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#F8FAFC]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
                <Upload size={18} className="text-[#2DD4BF]" />
                {editingArtwork ? 'تعديل العمل الفني' : 'إضافة عمل فني جديد إلى المعرض'}
              </h3>
              <button
                onClick={() => { setShowUploadModal(false); setEditingArtwork(null); setPreviewImage(null); }}
                className="w-8 h-8 rounded-lg bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Image Uploader */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1.5">
                  صورة العمل الفني *:
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2A3B56] hover:border-[#0D9488] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#111827]"
                >
                  {previewImage || editingArtwork ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewImage || editingArtwork?.imageUrl || ''}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain shadow-md"
                      />
                      <p className="text-[11px] text-[#2DD4BF] font-bold">انقر لتغيير الصورة</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload size={32} className="mx-auto text-[#2DD4BF] mb-1" />
                      <p className="font-bold text-xs text-[#F8FAFC]">اختر صورة العمل الفني من جهازك</p>
                      <p className="text-[10px] text-[#94A3B8]">PNG, JPG, JPEG (يتم حفظها في قاعدة البيانات المحلية)</p>
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
                <label className="block text-[#94A3B8] font-bold mb-1">
                  عنوان العمل الفني / اللوحة *:
                </label>
                <input
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  placeholder="مثال: دراسة الضوء والظلال في الطبيعة الصامتة"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">
                  المشرف أو الفنان المنفذ:
                </label>
                <select
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  value={newSupervisorId}
                  onChange={e => setNewSupervisorId(e.target.value)}
                >
                  {supervisors.map(sup => (
                    <option key={sup.id} value={sup.id} className="bg-[#111827] text-[#F8FAFC]">
                      {sup.name} ({sup.role === 'admin' ? 'المدير' : 'مشرف'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">
                  وصف العمل والخامات المستخدمة:
                </label>
                <textarea
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488] h-20"
                  placeholder="مثال: ألوان زيتية على كانفاس مشدود 50x70، تطبيق تقنيات الشياروسكورو والتدرج اللوني..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors shadow-md shadow-teal-900/30"
                >
                  {editingArtwork ? 'حفظ التعديلات' : 'حفظ العمل بالمعرض'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setEditingArtwork(null); setPreviewImage(null); }}
                  className="px-5 py-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs transition-colors"
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
          className="modal-overlay"
          onClick={() => setSelectedArtwork(null)}
        >
          <div
            className="bg-[#1B2537] max-w-3xl w-full rounded-2xl overflow-hidden border border-[#2A3B56] shadow-2xl text-[#F8FAFC]"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative max-h-[70vh] bg-[#0E1629] flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedArtwork(null)}
                className="absolute top-4 left-4 w-9 h-9 rounded-full bg-[#111827]/80 border border-[#2A3B56] text-[#F8FAFC] hover:bg-[#111827] flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex items-center justify-between bg-[#1B2537] border-t border-[#2A3B56]">
              <div>
                <h3 className="font-black text-lg text-[#F8FAFC]">{selectedArtwork.title}</h3>
                <p className="text-xs text-[#2DD4BF] font-semibold mt-1">{selectedArtwork.description}</p>
              </div>
              <button
                onClick={() => setSelectedArtwork(null)}
                className="px-5 py-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs font-semibold transition-colors"
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
