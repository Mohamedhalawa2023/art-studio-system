'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import {
  Settings, Bell, Lock, FileText, Database, Palette,
  Download, Upload, RefreshCw, CheckCircle, Save, HardDrive
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
          alert('✅ تم استعادة قاعدة البيانات بنجاح ومزامنتها مع القرص الصلب!');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Settings size={26} className="text-teal-400" />
            إعدادات النظام والنسخ الاحتياطي
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            إدارة بيانات المرسم، بنود وثائق التعاقد، ومزامنة الملفات وقاعدة البيانات المحلية
          </p>
        </div>
        {saveSuccess && (
          <span className="badge badge-teal text-xs py-1.5 px-3 flex items-center gap-1 shadow-sm">
            <CheckCircle size={14} /> تم حفظ الإعدادات بنجاح
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Studio Info */}
        <div className="glass p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Palette size={18} className="text-teal-400" />
            بيانات المرسم (تظهر على الشهادات، الفواتير، والعقود)
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المرسم / الأكاديمية:</label>
              <input
                className="input text-xs"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الهاتف الرسمي (واتساب):</label>
              <input
                className="input text-xs font-mono"
                value={studioPhone}
                onChange={e => setStudioPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">العنوان بالتفصيل:</label>
              <input
                className="input text-xs"
                value={studioAddress}
                onChange={e => setStudioAddress(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveStudioInfo}
              className="btn btn-primary btn-sm flex items-center gap-1.5 mt-2 cursor-pointer shadow-md shadow-blue-600/20"
            >
              <Save size={14} /> حفظ بيانات المرسم
            </button>
          </div>
        </div>

        {/* Database & Backup (Crucial Desktop feature) */}
        <div className="glass p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <HardDrive size={18} className="text-teal-400" />
            النسخ الاحتياطي ومزامنة القرص الصلب
          </h3>
          <div className="space-y-3 text-xs text-slate-800">
            <p className="leading-relaxed text-slate-500">
              جميع بياناتك (الطلاب، الشهادات، العقود، الدفعات، مبيعات الأدوات، وتقييمات الحصص) مخزنة ومحمية محلياً في ملف <code className="bg-teal-500/10 border border-blue-100 px-1.5 py-0.5 rounded text-teal-300 font-mono">data/data_store.json</code> على جهازك، وتعمل 100% بدون إنترنت.
            </p>

            <div className="pt-2 space-y-2.5">
              <button
                onClick={exportDatabase}
                className="w-full btn btn-primary flex items-center justify-center gap-2 py-2.5 text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Download size={16} />
                تصدير نسخة احتياطية فورية (Download JSON Backup)
              </button>

              <label className="w-full btn btn-secondary flex items-center justify-center gap-2 py-2.5 text-xs cursor-pointer border border-slate-200 hover:border-teal-500/30">
                <Upload size={16} className="text-teal-400" />
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
        <div className="glass p-5 rounded-2xl border border-slate-200 bg-white lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-teal-400" />
              محرر بنود وثيقة التعاقد الرسمية
            </h3>
            <span className="badge badge-teal text-xs font-mono">الإصدار v2.0 المعتمد</span>
          </div>

          <p className="text-xs text-slate-500">
            هذه البنود تُدرج تلقائياً في وثائق تعاقد جميع الطلاب الجدد وتظهر عند طباعة العقد:
          </p>

          <textarea
            className="input w-full text-xs font-sans leading-relaxed"
            rows={7}
            value={contractTerms}
            onChange={e => setContractTerms(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-[#94A3B8]">
              أي تعديل هنا سينعكس فوراً على كل العقود التي سيتم طباعتها لاحقاً.
            </p>
            <button
              onClick={handleSaveStudioInfo}
              className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
            >
              <Save size={14} /> حفظ بنود التعاقد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
