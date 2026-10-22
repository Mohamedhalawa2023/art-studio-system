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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Megaphone className="text-teal-400" size={26} />
            الإعلانات والمعارض
          </h1>
          <p className="text-slate-500 text-sm mt-1">إدارة إعلانات المرسم والمعارض الفنية</p>
        </div>
        <button className="btn btn-primary shadow-md shadow-blue-600/20" onClick={openCreate}>
          <Plus size={16} /> إعلان جديد
        </button>
      </div>

      <div className="flex gap-2">
        <button className={`btn ${tab === 'announcements' ? 'btn-primary shadow-sm shadow-blue-600/20' : 'btn-secondary'}`} onClick={() => setTab('announcements')}>
          <Megaphone size={16} /> الإعلانات
        </button>
        <button className={`btn ${tab === 'exhibitions' ? 'btn-primary shadow-sm shadow-blue-600/20' : 'btn-secondary'}`} onClick={() => setTab('exhibitions')}>
          <ImageIcon size={16} /> المعارض
        </button>
      </div>

      {error && !showForm && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <article key={item.id} className="glass overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-teal-500/30 transition-all">
            <div className="h-1.5 w-full bg-teal-600" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-lg leading-tight text-slate-900">{item.title}</h3>
                <span className={`badge shrink-0 ${item.type === 'exhibition' ? 'badge-teal' : 'badge-info'}`}>
                  {item.type === 'exhibition' ? 'معرض' : 'إعلان'}
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-6 whitespace-pre-wrap">{item.content}</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                <Calendar size={12} className="text-teal-400" />
                <span>{localDate(item.startDate)} — {localDate(item.endDate)}</span>
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-teal-600 mt-2 hover:text-blue-800 font-semibold">
                  <ExternalLink size={12} /> رابط التفاصيل
                </a>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(item)}>تعديل</button>
                <button className="btn btn-danger btn-sm" onClick={() => removeAnnouncement(item)}>حذف</button>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Megaphone size={48} className="mx-auto mb-3 text-slate-300" />
            <p>لا توجد {tab === 'exhibitions' ? 'معارض' : 'إعلانات'} مسجلة</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <form onSubmit={saveAnnouncement} className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in text-[#F8FAFC] space-y-4" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-[#2A3B56]">
              <h2 className="text-xl font-bold">{editing ? 'تعديل الإعلان' : 'إعلان جديد'}</h2>
              <button type="button" onClick={closeForm} aria-label="إغلاق" className="text-[#94A3B8] hover:text-white"><X size={20} /></button>
            </div>
            <fieldset>
              <legend className="block text-sm font-semibold text-[#CBD5E1] mb-1">النوع</legend>
              <div className="flex gap-4">
                {(['announcement', 'exhibition'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="type" value={type} defaultChecked={editing ? editing.type === type : type === 'announcement'} className="accent-teal-400" />
                    <span className="text-sm font-medium text-[#F8FAFC]">{type === 'announcement' ? 'إعلان' : 'معرض'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-semibold text-[#CBD5E1]">العنوان<input name="title" className="input mt-1" required maxLength={160} defaultValue={editing?.title || ''} placeholder="عنوان الإعلان" /></label>
            <label className="block text-sm font-semibold text-[#CBD5E1]">المحتوى<textarea name="content" className="input mt-1" rows={4} required maxLength={5000} defaultValue={editing?.content || ''} placeholder="تفاصيل الإعلان" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-[#CBD5E1]">تاريخ البداية<input name="startDate" type="date" className="input mt-1" required defaultValue={editing?.startDate || ''} /></label>
              <label className="block text-sm font-semibold text-[#CBD5E1]">تاريخ الانتهاء<input name="endDate" type="date" className="input mt-1" required defaultValue={editing?.endDate || ''} /></label>
            </div>
            <label className="block text-sm font-semibold text-[#CBD5E1]">رابط التفاصيل (اختياري)<input name="link" type="url" className="input mt-1" maxLength={2000} defaultValue={editing?.link || ''} placeholder="https://..." /></label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-3 pt-3 border-t border-[#2A3B56]">
              <button className="btn btn-primary flex-1 shadow-md shadow-teal-600/20" type="submit">{editing ? 'حفظ التعديلات' : 'نشر الإعلان'}</button>
              <button className="btn btn-secondary" type="button" onClick={closeForm}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
