'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import {
  Settings, Bell, Lock, FileText, Database, Palette,
  Download, Upload, RefreshCw, CheckCircle, Save
} from 'lucide-react';

export default function SettingsPage() {
  const {
    settings, updateSettings, exportDatabase,
    importDatabase, resetDatabase
  } = useMarsam();

  const [studioName, setStudioName] = useState(settings.name);
  const [studioPhone, setStudioPhone] = useState(settings.phone);
  const [studioAddress, setStudioAddress] = useState(settings.address);
  const [contractTerms, setContractTerms] = useState(settings.contractTerms);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveStudioInfo = () => {
    updateSettings({
      name: studioName,
      phone: studioPhone,
      address: studioAddress,
      contractTerms
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabase(content);
        if (success) {
          alert('✅ تم استعادة قاعدة البيانات بنجاح!');
          window.location.reload();
        } else {
          alert('❌ فشل استعادة الملف. تأكد من صحة ملف النسخة الاحتياطية.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Settings size={26} className="text-amber-400" />
            إعدادات النظام والنسخ الاحتياطي
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إدارة بيانات المرسم، بنود وثائق التعاقد، والنسخ الاحتياطي لقاعدة البيانات
          </p>
        </div>
        {saveSuccess && (
          <span className="badge badge-success text-xs py-1.5 px-3 flex items-center gap-1 shadow-lg">
            <CheckCircle size={14} /> تم حفظ الإعدادات بنجاح
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Studio Info */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/10">
            <Palette size={18} className="text-amber-400" />
            بيانات المرسم (تظهر على الفواتير والعقود)
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">اسم المرسم / الأكاديمية:</label>
              <input
                className="input text-xs"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">رقم الهاتف الرسمي (واتساب):</label>
              <input
                className="input text-xs font-mono"
                value={studioPhone}
                onChange={e => setStudioPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">العنوان بالتفصيل:</label>
              <input
                className="input text-xs"
                value={studioAddress}
                onChange={e => setStudioAddress(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveStudioInfo}
              className="btn btn-primary btn-sm flex items-center gap-1.5 mt-2"
            >
              <Save size={14} /> حفظ بيانات المرسم
            </button>
          </div>
        </div>

        {/* Database & Backup (Crucial Desktop feature) */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-white/10">
            <Database size={18} className="text-emerald-400" />
            النسخ الاحتياطي المحلي لقاعدة البيانات
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <p className="leading-relaxed">
              جميع بياناتك (الطلاب، العقود، الدفعات، وفواتير الأدوات) محفوظة محلياً على جهازك. يُنصح بتحميل نسخة احتياطية دورية وحفظها على فلاشة خارجية.
            </p>

            <div className="pt-2 space-y-2">
              <button
                onClick={exportDatabase}
                className="w-full btn btn-primary flex items-center justify-center gap-2 py-2.5 text-xs shadow-md shadow-violet-600/20"
              >
                <Download size={16} />
                تصدير نسخة احتياطية فورية (Download JSON Backup)
              </button>

              <label className="w-full btn btn-secondary flex items-center justify-center gap-2 py-2.5 text-xs cursor-pointer">
                <Upload size={16} />
                استعادة قاعدة البيانات من ملف نسخة احتياطية
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Contract Clauses Editor */}
        <div className="glass p-5 rounded-2xl lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-violet-400" />
              محرر بنود وثيقة التعاقد الرسمية
            </h3>
            <span className="badge badge-purple text-xs font-mono">الإصدار v2.0 المعتمد</span>
          </div>

          <p className="text-xs text-slate-400">
            هذه البنود تُدرج تلقائياً في وثائق تعاقد جميع الطلاب الجدد وتظهر عند طباعة العقد:
          </p>

          <textarea
            className="input w-full text-xs font-sans leading-relaxed"
            rows={7}
            value={contractTerms}
            onChange={e => setContractTerms(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              أي تعديل هنا سينعكس فوراً على كل العقود التي سيتم طباعتها لاحقاً.
            </p>
            <button
              onClick={handleSaveStudioInfo}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <Save size={14} /> حفظ بنود التعاقد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
