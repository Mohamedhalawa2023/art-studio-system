'use client';
import { useCallback, useEffect, useState } from 'react';
import { useMarsam } from '@/lib/store';
import type { User } from '@/lib/mockData';
import {
  Settings, FileText, Palette,
  Download, Upload, CheckCircle, Save, HardDrive, RotateCcw, RefreshCw, UserPlus, Pencil, Trash2
} from 'lucide-react';

interface BackupFile {
  filename: string;
  modifiedAt: string;
  size: number;
}

export default function SettingsPage() {
  const {
    settings, users, currentUser, updateSettings, exportDatabase,
    importDatabase, addUser, updateUser, deleteUser
  } = useMarsam();

  const [studioName, setStudioName] = useState(settings.name);
  const [studioPhone, setStudioPhone] = useState(settings.phone);
  const [studioAddress, setStudioAddress] = useState(settings.address);
  const [contractTerms, setContractTerms] = useState(settings.contractTerms);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [backupLoading, setBackupLoading] = useState(true);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userError, setUserError] = useState('');
  const [userDraft, setUserDraft] = useState({ name: '', email: '', phone: '', role: 'supervisor' as User['role'] });

  const loadBackups = useCallback(async (preserveStatus = false): Promise<boolean> => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/backups', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'تعذر قراءة قائمة النسخ الاحتياطية.');
      const availableBackups: BackupFile[] = Array.isArray(result.backups) ? result.backups : [];
      setBackups(availableBackups);
      setSelectedBackup(current => availableBackups.some(backup => backup.filename === current)
        ? current
        : result.latestBackup?.filename || availableBackups[0]?.filename || '');
      if (!preserveStatus) setBackupStatus('');
      return availableBackups.length > 0;
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'تعذر قراءة قائمة النسخ الاحتياطية.');
      return false;
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    let retryTimer: number | undefined;
    let cancelled = false;
    void loadBackups().then(hasBackups => {
      if (!hasBackups) {
        retryTimer = window.setTimeout(() => {
          if (!cancelled) void loadBackups();
        }, 1500);
      }
    });
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [loadBackups]);

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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await importDatabase(content);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSelectedBackup = async () => {
    if (!selectedBackup || !window.confirm(`استعادة النسخة المحددة (${selectedBackup})؟ سيتم حفظ نسخة أمان من البيانات الحالية أولاً.`)) return;

    setBackupRestoring(true);
    setBackupStatus('');
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedBackup }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'تعذرت استعادة النسخة الاحتياطية.');
      }

      const restored = await importDatabase(JSON.stringify(result.data));
      if (restored) {
        setBackupStatus(result.safetyBackup
          ? `تمت الاستعادة. نسخة أمان الحالة السابقة: ${result.safetyBackup}`
          : 'تمت الاستعادة بنجاح. لم توجد قاعدة حالية سليمة لإنشاء نسخة أمان منها.');
        await loadBackups(true);
      }
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'تعذرت استعادة النسخة الاحتياطية.');
    } finally {
      setBackupRestoring(false);
    }
  };

  const saveUser = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingUserId) updateUser(editingUserId, userDraft);
      else addUser(userDraft);
      setEditingUserId(null);
      setUserDraft({ name: '', email: '', phone: '', role: 'supervisor' });
      setUserError('');
    } catch (error) { setUserError(error instanceof Error ? error.message : 'تعذر حفظ المستخدم.'); }
  };

  const beginUserEdit = (user: User) => {
    setEditingUserId(user.id);
    setUserDraft({ name: user.name, email: user.email, phone: user.phone, role: user.role });
    setUserError('');
  };

  const removeUser = (user: User) => {
    if (!window.confirm(`حذف المستخدم «${user.name}»؟`)) return;
    try { deleteUser(user.id); setUserError(''); }
    catch (error) { setUserError(error instanceof Error ? error.message : 'تعذر حذف المستخدم.'); }
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
              جميع بياناتك (الطلاب، الشهادات، العقود، الدفعات، المصروفات، مبيعات الأدوات، وتقييمات الحصص) مخزنة ومحمية محلياً في ملف <code className="bg-teal-500/10 border border-blue-100 px-1.5 py-0.5 rounded text-teal-300 font-mono">data/data_store.json</code> على جهازك، وتعمل 100% بدون إنترنت.
            </p>

            <div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700">النسخ التلقائي اليومية</span>
                <button type="button" onClick={() => void loadBackups()} disabled={backupLoading} className="text-teal-600 hover:text-teal-700 disabled:opacity-50" title="تحديث قائمة النسخ" aria-label="تحديث قائمة النسخ الاحتياطية">
                  <RefreshCw size={15} className={backupLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-slate-500 leading-relaxed">
                ينشئ النظام نسخة محلية تلقائيًا عند أول حفظ للبيانات كل يوم.
              </p>
              <p className="text-slate-600">
                آخر نسخة: <strong className="text-teal-700">{backupLoading ? 'جارٍ التحميل…' : backups[0] ? new Date(backups[0].modifiedAt).toLocaleString('ar-EG') : 'لا توجد نسخة محفوظة بعد'}</strong>
              </p>
              <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                <select className="input text-xs" value={selectedBackup} onChange={event => setSelectedBackup(event.target.value)} disabled={backupLoading || backups.length === 0}>
                  {backups.length === 0 && <option value="">لا توجد نسخ متاحة للاستعادة</option>}
                  {backups.map(backup => (
                    <option key={backup.filename} value={backup.filename}>
                      {new Date(backup.modifiedAt).toLocaleString('ar-EG')} — {backup.filename}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => void handleRestoreSelectedBackup()} disabled={!selectedBackup || backupLoading || backupRestoring} className="btn btn-secondary flex items-center justify-center gap-2 text-xs disabled:opacity-50">
                  <RotateCcw size={14} /> {backupRestoring ? 'جارٍ الاستعادة…' : 'استعادة النسخة المحددة'}
                </button>
              </div>
              {backupStatus && <p role="status" className="text-[11px] text-slate-600 break-words">{backupStatus}</p>}
            </div>

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

        <div className="glass p-5 rounded-2xl border border-slate-200 bg-white lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} className="text-teal-500" />إدارة ملفات المستخدمين والمشرفين</h3>
            <span className="text-xs text-slate-500">{users.length} مستخدم</span>
          </div>
          <form onSubmit={saveUser} className="grid md:grid-cols-5 gap-2 items-end">
            <label className="text-xs font-semibold text-slate-600">الاسم<input className="input mt-1" required minLength={3} value={userDraft.name} onChange={event => setUserDraft({ ...userDraft, name: event.target.value })} /></label>
            <label className="text-xs font-semibold text-slate-600">الهاتف<input className="input mt-1" required value={userDraft.phone} onChange={event => setUserDraft({ ...userDraft, phone: event.target.value })} /></label>
            <label className="text-xs font-semibold text-slate-600">البريد<input className="input mt-1" type="email" value={userDraft.email} onChange={event => setUserDraft({ ...userDraft, email: event.target.value })} /></label>
            <label className="text-xs font-semibold text-slate-600">الصلاحية<select className="input mt-1" value={userDraft.role} onChange={event => setUserDraft({ ...userDraft, role: event.target.value as User['role'] })}><option value="supervisor">مشرف</option><option value="guardian">ولي أمر</option>{userDraft.role === 'admin' && <option value="admin">مدير</option>}</select></label>
            <button className="btn btn-primary text-xs" type="submit">{editingUserId ? 'حفظ التعديل' : 'إضافة المستخدم'}</button>
          </form>
          {userError && <p role="alert" className="text-xs text-red-600">{userError}</p>}
          {editingUserId && <button type="button" className="text-xs text-slate-500 underline" onClick={() => { setEditingUserId(null); setUserDraft({ name: '', email: '', phone: '', role: 'supervisor' }); }}>إلغاء التعديل</button>}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">الاسم</th><th className="p-3">الهاتف</th><th className="p-3">البريد</th><th className="p-3">الدور</th><th className="p-3">الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{users.map(user => <tr key={user.id}><td className="p-3 font-semibold">{user.name}{currentUser?.id === user.id && <span className="mr-2 text-teal-600">(الحساب الحالي)</span>}</td><td className="p-3 font-mono">{user.phone}</td><td className="p-3">{user.email}</td><td className="p-3">{user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : 'ولي أمر'}</td><td className="p-3"><div className="flex gap-1"><button type="button" className="btn btn-secondary btn-sm text-slate-700 border-slate-300" onClick={() => beginUserEdit(user)} title="تعديل" aria-label={`تعديل المستخدم ${user.name}`}><Pencil size={13} /></button><button type="button" className="btn btn-secondary btn-sm text-red-700 border-slate-300" onClick={() => removeUser(user)} title="حذف" aria-label={`حذف المستخدم ${user.name}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
