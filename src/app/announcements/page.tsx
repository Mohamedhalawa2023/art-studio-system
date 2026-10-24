'use client';

import { FormEvent, useState } from 'react';
import { useMarsam } from '@/lib/store';
import { Announcement } from '@/lib/mockData';
import { Megaphone, Image as ImageIcon, Plus, X, Calendar, ExternalLink } from 'lucide-react';

const localDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('ar-EG');

export default function AnnouncementsPage() {
  const { announcements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useMarsam();
  const [tab, setTab] = useState<'announcements' | 'exhibitions'>('announcements');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const filtered = announcements
    .filter(item => tab === 'exhibitions' ? item.type === 'exhibition' : item.type === 'announcement')
    .sort((left, right) => right.startDate.localeCompare(left.startDate));

  const openCreate = () => { setEditing(null); setError(''); setShowForm(true); };
  const openEdit = (item: Announcement) => { setEditing(item); setError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const saveAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      title: String(form.get('title') || ''),
      content: String(form.get('content') || ''),
      startDate: String(form.get('startDate') || ''),
      endDate: String(form.get('endDate') || ''),
      type: String(form.get('type') || 'announcement') as Announcement['type'],
      link: String(form.get('link') || ''),
    };
    try {
      if (editing) updateAnnouncement(editing.id, values);
      else createAnnouncement(values);
      setTab(values.type === 'exhibition' ? 'exhibitions' : 'announcements');
      closeForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ الإعلان.');
    }
  };

  const removeAnnouncement = (item: Announcement) => {
    if (!window.confirm(`هل تريد حذف «${item.title}»؟`)) return;
    try {
      deleteAnnouncement(item.id);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حذف الإعلان.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <Megaphone className="text-[#2DD4BF]" size={26} />
            الإعلانات والمعارض
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">إدارة إعلانات المرسم والمعارض الفنية</p>
        </div>
        <button
          className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-900/30"
          onClick={openCreate}
        >
          <Plus size={16} /> إعلان جديد
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            tab === 'announcements'
              ? 'bg-[#0D9488] text-[#F8FAFC] shadow-md shadow-teal-900/30'
              : 'bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488]'
          }`}
          onClick={() => setTab('announcements')}
        >
          <Megaphone size={15} /> الإعلانات
        </button>
        <button
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            tab === 'exhibitions'
              ? 'bg-[#0D9488] text-[#F8FAFC] shadow-md shadow-teal-900/30'
              : 'bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#0D9488]'
          }`}
          onClick={() => setTab('exhibitions')}
        >
          <ImageIcon size={15} /> المعارض
        </button>
      </div>

      {error && !showForm && (
        <div role="alert" className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Announcements Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filtered.map(item => (
          <article
            key={item.id}
            className="overflow-hidden bg-[#1B2537] border border-[#2A3B56] rounded-2xl shadow-sm hover:border-[#0D9488]/50 transition-all flex flex-col justify-between"
          >
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-lg leading-snug text-[#F8FAFC]">{item.title}</h3>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#111827] border border-[#2A3B56] text-[#94A3B8]">
                    {item.type === 'exhibition' ? 'معرض' : 'إعلان'}
                  </span>
                </div>
                <p className="text-[#94A3B8] text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mt-4 text-xs text-[#2DD4BF] font-mono">
                  <Calendar size={13} className="text-[#2DD4BF]" />
                  <span>{localDate(item.startDate)} — {localDate(item.endDate)}</span>
                </div>

                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#2DD4BF] hover:text-teal-300 font-semibold mt-2 transition-colors"
                  >
                    <ExternalLink size={12} /> رابط التفاصيل
                  </a>
                )}

                <div className="flex gap-2 mt-5 pt-3 border-t border-[#2A3B56]">
                  <button
                    className="flex-1 py-2 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] text-xs font-semibold transition-colors"
                    onClick={() => openEdit(item)}
                  >
                    تعديل
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8]/60 hover:text-red-400 hover:border-red-500/50 text-xs font-semibold transition-colors"
                    onClick={() => removeAnnouncement(item)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-14 text-[#94A3B8] bg-[#1B2537] border border-[#2A3B56] rounded-2xl">
            <Megaphone size={44} className="mx-auto mb-3 text-[#94A3B8]/50" />
            <p className="text-sm font-medium">لا توجد {tab === 'exhibitions' ? 'معارض' : 'إعلانات'} مسجلة</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <form
            onSubmit={saveAnnouncement}
            className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-[#F8FAFC] space-y-4"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-[#2A3B56]">
              <h2 className="text-lg font-bold text-[#F8FAFC]">{editing ? 'تعديل الإعلان' : 'إعلان جديد'}</h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-lg bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <fieldset>
              <legend className="block text-xs font-semibold text-[#94A3B8] mb-2">النوع</legend>
              <div className="flex gap-4">
                {(['announcement', 'exhibition'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      defaultChecked={editing ? editing.type === type : type === 'announcement'}
                      className="accent-[#0D9488] w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-[#F8FAFC]">{type === 'announcement' ? 'إعلان' : 'معرض'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-xs font-semibold text-[#94A3B8]">
              العنوان
              <input
                name="title"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                required
                maxLength={160}
                defaultValue={editing?.title || ''}
                placeholder="عنوان الإعلان"
              />
            </label>
            <label className="block text-xs font-semibold text-[#94A3B8]">
              المحتوى
              <textarea
                name="content"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                rows={4}
                required
                maxLength={5000}
                defaultValue={editing?.content || ''}
                placeholder="تفاصيل الإعلان"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-[#94A3B8]">
                تاريخ البداية
                <input
                  name="startDate"
                  type="date"
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  required
                  defaultValue={editing?.startDate || ''}
                />
              </label>
              <label className="block text-xs font-semibold text-[#94A3B8]">
                تاريخ الانتهاء
                <input
                  name="endDate"
                  type="date"
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  required
                  defaultValue={editing?.endDate || ''}
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-[#94A3B8]">
              رابط التفاصيل (اختياري)
              <input
                name="link"
                type="url"
                className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                maxLength={2000}
                defaultValue={editing?.link || ''}
                placeholder="https://..."
              />
            </label>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <div className="flex gap-2 pt-3 border-t border-[#2A3B56]">
              <button
                className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors shadow-md shadow-teal-900/30"
                type="submit"
              >
                {editing ? 'حفظ التعديلات' : 'نشر الإعلان'}
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] text-xs transition-colors"
                type="button"
                onClick={closeForm}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
