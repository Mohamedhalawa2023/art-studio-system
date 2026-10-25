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

      const restored = await importDatabase(JSON.stringify(result.data), true);
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <Settings size={26} className="text-[#2DD4BF]" />
            إعدادات النظام والنسخ الاحتياطي
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            إدارة بيانات المرسم، بنود وثائق التعاقد، ومزامنة الملفات وقاعدة البيانات المحلية
          </p>
        </div>
        {saveSuccess && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#115E59] text-[#2DD4BF] flex items-center gap-1.5 shadow-md shadow-teal-950/30">
            <CheckCircle size={14} /> تم حفظ الإعدادات بنجاح
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Studio Info Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2 pb-2.5 border-b border-[#2A3B56]">
            <Palette size={18} className="text-[#2DD4BF]" />
            بيانات المرسم (تظهر على الشهادات، الفواتير، والعقود)
          </h3>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[#94A3B8] font-bold mb-1.5">اسم المرسم / الأكاديمية:</label>
              <input
                className="w-full p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] font-bold mb-1.5">رقم الهاتف الرسمي (واتساب):</label>
              <input
                className="w-full p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#0D9488]"
                value={studioPhone}
                onChange={e => setStudioPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] font-bold mb-1.5">العنوان بالتفصيل:</label>
              <input
                className="w-full p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                value={studioAddress}
                onChange={e => setStudioAddress(e.target.value)}
              />
            </div>
            <div className="pt-1">
              <button
                onClick={handleSaveStudioInfo}
                className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-teal-900/30 cursor-pointer"
              >
                <Save size={15} /> حفظ بيانات المرسم
              </button>
            </div>
          </div>
        </div>

        {/* Database & Backup Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2 pb-2.5 border-b border-[#2A3B56]">
            <HardDrive size={18} className="text-[#2DD4BF]" />
            النسخ الاحتياطي ومزامنة القرص الصلب
          </h3>
          <div className="space-y-3.5 text-xs text-[#F8FAFC]">
            <p className="leading-relaxed text-[#94A3B8]">
              جميع بياناتك (الطلاب، الشهادات، العقود، الدفعات، المصروفات، مبيعات الأدوات، وتقييمات الحصص) مخزنة ومحمية محلياً في ملف <code className="bg-[#111827] border border-[#2A3B56] px-2 py-0.5 rounded text-[#2DD4BF] font-mono">data/data_store.json</code> على جهازك، وتعمل 100% بدون إنترنت.
            </p>

            <div className="p-3.5 rounded-xl border border-[#2A3B56] bg-[#111827] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#F8FAFC]">النسخ التلقائي اليومية</span>
                <button
                  type="button"
                  onClick={() => void loadBackups()}
                  disabled={backupLoading}
                  className="text-[#2DD4BF] hover:text-teal-300 disabled:opacity-50 transition-colors"
                  title="تحديث قائمة النسخ"
                  aria-label="تحديث قائمة النسخ الاحتياطية"
                >
                  <RefreshCw size={15} className={backupLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                ينشئ النظام نسخة محلية تلقائيًا عند أول حفظ للبيانات كل يوم.
              </p>
              <p className="text-[#94A3B8]">
                آخر نسخة: <strong className="text-[#2DD4BF]">{backupLoading ? 'جارٍ التحميل…' : backups[0] ? new Date(backups[0].modifiedAt).toLocaleString('ar-EG') : 'لا توجد نسخة محفوظة بعد'}</strong>
              </p>
              <div className="grid sm:grid-cols-[1fr_auto] gap-2 pt-1">
                <select
                  className="w-full p-2.5 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  value={selectedBackup}
                  onChange={event => setSelectedBackup(event.target.value)}
                  disabled={backupLoading || backups.length === 0}
                >
                  {backups.length === 0 && <option value="" className="bg-[#111827] text-[#94A3B8]">لا توجد نسخ متاحة للاستعادة</option>}
                  {backups.map(backup => (
                    <option key={backup.filename} value={backup.filename} className="bg-[#111827] text-[#F8FAFC]">
                      {backup.filename} — {new Date(backup.modifiedAt).toLocaleTimeString('ar-EG')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleRestoreSelectedBackup()}
                  disabled={!selectedBackup || backupLoading || backupRestoring}
                  className="px-3.5 py-2.5 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  <RotateCcw size={14} /> {backupRestoring ? 'جارٍ الاستعادة…' : 'استعادة النسخة المحددة'}
                </button>
              </div>
              {backupStatus && <p role="status" className="text-[11px] text-[#2DD4BF] break-words pt-1">{backupStatus}</p>}
            </div>

            <div className="pt-1 space-y-2.5">
              <button
                onClick={exportDatabase}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold flex items-center justify-center gap-2 text-xs shadow-md shadow-teal-900/30 transition-all cursor-pointer"
              >
                <Download size={16} />
                تصدير نسخة احتياطية فورية (Download JSON Backup)
              </button>

              <label className="w-full py-2.5 px-4 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] font-bold flex items-center justify-center gap-2 text-xs cursor-pointer transition-colors">
                <Upload size={16} className="text-[#94A3B8]" />
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

        {/* Contract Clauses Editor Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3B56]">
            <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2">
              <FileText size={18} className="text-[#2DD4BF]" />
              محرر بنود وثيقة التعاقد الرسمية
            </h3>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#115E59] text-[#2DD4BF] font-mono">
              الإصدار v2.0 (المعتمد)
            </span>
          </div>

          <p className="text-xs text-[#94A3B8]">
            هذه البنود تُدرج تلقائياً في وثائق تعاقد جميع الطلاب الجدد وتظهر عند طباعة العقد:
          </p>

          <textarea
            className="w-full p-3.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs font-sans leading-relaxed focus:outline-none focus:border-[#0D9488]"
            rows={7}
            value={contractTerms}
            onChange={e => setContractTerms(e.target.value)}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-[#94A3B8]">
              أي تعديل هنا سينعكس فوراً على كل العقود التي سيتم طباعتها لاحقاً.
            </p>
            <button
              onClick={handleSaveStudioInfo}
              className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-900/30 cursor-pointer self-start sm:self-auto"
            >
              <Save size={15} /> حفظ بنود التعاقد
            </button>
          </div>
        </div>

        {/* Users Management Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2A3B56] pb-2.5">
            <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2">
              <UserPlus size={18} className="text-[#2DD4BF]" />
              إدارة ملفات المستخدمين والمشرفين
            </h3>
            <span className="text-xs text-[#94A3B8]">{users.length} مستخدم</span>
          </div>

          <form onSubmit={saveUser} className="grid md:grid-cols-5 gap-3 items-end">
            <label className="text-xs font-semibold text-[#94A3B8]">
              الاسم
              <input
                className="w-full mt-1 p-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                required
                minLength={3}
                value={userDraft.name}
                onChange={event => setUserDraft({ ...userDraft, name: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-[#94A3B8]">
              الهاتف
              <input
                className="w-full mt-1 p-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs font-mono focus:outline-none focus:border-[#0D9488]"
                required
                value={userDraft.phone}
                onChange={event => setUserDraft({ ...userDraft, phone: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-[#94A3B8]">
              البريد
              <input
                className="w-full mt-1 p-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                type="email"
                value={userDraft.email}
                onChange={event => setUserDraft({ ...userDraft, email: event.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-[#94A3B8]">
              الصلاحية
              <select
                className="w-full mt-1 p-2 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                value={userDraft.role}
                onChange={event => setUserDraft({ ...userDraft, role: event.target.value as User['role'] })}
              >
                <option value="supervisor" className="bg-[#111827] text-[#F8FAFC]">مشرف</option>
                <option value="guardian" className="bg-[#111827] text-[#F8FAFC]">ولي أمر</option>
                {userDraft.role === 'admin' && <option value="admin" className="bg-[#111827] text-[#F8FAFC]">مدير</option>}
              </select>
            </label>
            <button
              className="py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors shadow-md shadow-teal-900/30"
              type="submit"
            >
              {editingUserId ? 'حفظ التعديل' : 'إضافة المستخدم'}
            </button>
          </form>

          {userError && <p role="alert" className="text-xs text-red-400">{userError}</p>}
          {editingUserId && (
            <button
              type="button"
              className="text-xs text-[#2DD4BF] hover:underline"
              onClick={() => { setEditingUserId(null); setUserDraft({ name: '', email: '', phone: '', role: 'supervisor' }); }}
            >
              إلغاء التعديل
            </button>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#2A3B56]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#111827]/70 text-[#94A3B8] border-b border-[#2A3B56]">
                <tr>
                  <th className="p-3">الاسم</th>
                  <th className="p-3">الهاتف</th>
                  <th className="p-3">البريد</th>
                  <th className="p-3">الدور</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3B56]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-[#111827]/40 transition-colors">
                    <td className="p-3 font-semibold text-[#F8FAFC]">
                      {user.name}
                      {currentUser?.id === user.id && <span className="mr-2 text-[#2DD4BF]">(الحساب الحالي)</span>}
                    </td>
                    <td className="p-3 font-mono text-[#94A3B8]">{user.phone}</td>
                    <td className="p-3 text-[#94A3B8]">{user.email}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-[#111827] border border-[#2A3B56] text-[#CBD5E1]">
                        {user.role === 'admin' ? 'مدير' : user.role === 'supervisor' ? 'مشرف' : 'ولي أمر'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] flex items-center justify-center transition-colors"
                          onClick={() => beginUserEdit(user)}
                          title="تعديل"
                          aria-label={`تعديل المستخدم ${user.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-[#111827] border border-[#334155] text-red-400 hover:text-red-300 hover:border-red-500/50 flex items-center justify-center transition-colors"
                          onClick={() => removeUser(user)}
                          title="حذف"
                          aria-label={`حذف المستخدم ${user.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
