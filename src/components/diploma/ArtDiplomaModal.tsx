'use client';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Award, X, Printer, Palette, Sparkles, Feather,
  CheckCircle, Sliders, Edit3, ShieldCheck, Undo2
} from 'lucide-react';
import type { Student } from '@/lib/store';

export interface ArtDiplomaData {
  certificateNumber: string;
  issueDate: string;
  academyName: string;
  academySubtitle: string;
  studentName: string;
  courseTitle: string;
  branchName: string;
  gradeLevel: string;
  theme: 'gold' | 'emerald' | 'sapphire' | 'burgundy';
  showSkills: boolean;
  showSeal: boolean;
  showQr: boolean;
  critiqueText: string;
  instructorName: string;
  directorName: string;
  skills: {
    brushwork: number;
    composition: number;
    chiaroscuro: number;
    colorHarmony: number;
  };
}

interface ArtDiplomaModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  courseTitle?: string;
  branchName?: string;
}

export default function ArtDiplomaModal({
  isOpen,
  onClose,
  student,
  courseTitle = 'دورة الرسم الزيتي الاحترافية',
  branchName = 'المقر الرئيسي'
}: ArtDiplomaModalProps) {
  const [theme, setTheme] = useState<'gold' | 'emerald' | 'sapphire' | 'burgundy'>('sapphire');
  const [showEditor, setShowEditor] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const [diploma, setDiploma] = useState<ArtDiplomaData>({
    certificateNumber: 'ART-CERT-2026-001',
    issueDate: '18 أكتوبر 2026',
    academyName: 'أكاديمية ومرسم الفنون التشكيلية',
    academySubtitle: 'المرسم الأكاديمي للدراسات الحرة والفنون الجميلة',
    studentName: student?.name || 'اسم الطالب',
    courseTitle: courseTitle,
    branchName: branchName,
    gradeLevel: 'مرتبة الشرف الفنية (Master Grade A+)',
    theme: 'sapphire',
    showSkills: true,
    showSeal: true,
    showQr: true,
    critiqueText: `أظهر الفنان نضجاً تشكيلياً ملموساً في التعامل مع الخامة والسطح التصويري، حيث برز تمكنه من تأسيس الأرضيات وتوزيع الكتل اللونية بجرأة وثقة، وتطبيق قواعد التظليل والدمج وبناء طبقات اللون بدقة واقتدار وحس جمالي رفيع.`,
    instructorName: 'الفنان أستاذ الورشة',
    directorName: 'المدير الأكاديمي للمرسم',
    skills: {
      brushwork: 95,
      composition: 92,
      chiaroscuro: 96,
      colorHarmony: 91
    }
  });

  // Sync with selected student
  useEffect(() => {
    if (student) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      const certNo = `ART-CERT-${now.getFullYear()}-${student.id.toUpperCase()}`;
      setDiploma(prev => ({
        ...prev,
        certificateNumber: certNo,
        issueDate: formattedDate,
        studentName: student.name,
        courseTitle: courseTitle,
        branchName: branchName
      }));

      // Generate verification QR
      const qrPayload = `ATELIER-CERT:${student.id}:${certNo}:MASTER-A+`;
      QRCode.toDataURL(qrPayload, { width: 160, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR error', err));
    }
  }, [student, courseTitle, branchName]);

  if (!isOpen || !student) return null;

  // Print isolation trigger
  const handlePrint = () => {
    window.print();
  };

  const applyCritiquePreset = (type: string) => {
    const sName = diploma.studentName;
    const presets: Record<string, string> = {
      oil: `أظهر الفنان ${sName} نضجاً تشكيلياً ملموساً في التعامل مع ألوان الزيت وقماش الكانفاس، حيث برز تمكنه من تأسيس الأرضيات وتوزيع الكتل اللونية بجرأة وثقة، وتطبيق قواعد التظليل والدمج وبناء طبقات اللون (Fat over Lean) باقتدار وحس لوني رفيع.`,
      portrait: `تميز أداء الفنان ${sName} بالدقة التشريحية وضبط نسب الوجه الإنساني، مع إتقان لافت في توزيع مستويات التظليل بالفحم والمدعكة لإنشاء تدرجات ضوئية غنية وعمق تعبيري فريد في النظرات والملامح.`,
      water: `قدم الفنان ${sName} تحكماً متميزاً في سيولة وانسياب الألوان المائية والشفافية وإدارة مساحات البلل (Wet-on-Wet)، مع الحفاظ على نقاء درجات الضوء والمساحات البيضاء المشرقة بروح انطباعية خلابة.`,
      kids: `يمتلك الفنان المبدع ${sName} حساسية بصرية فطرية وشغفاً إبداعياً رائعاً، وقد أظهر شجاعة مبهرة في مزج الألوان وتوزيع عناصر القصة التشكيلية بخيال واسع وشخصية فنية واعدة ومميزة.`,
      general: `اجتاز الفنان ${sName} متطلبات البرنامج التدريبي بجدارة واستحقاق فني متقدم، مقدماً أعمالاً متميزة تعكس التزامه بتوجيهات المرسم وتطوره التقني وحسه الجمالي المتوازن والمبدع.`
    };
    if (presets[type]) {
      setDiploma(prev => ({ ...prev, critiqueText: presets[type] }));
    }
  };

  // Theme styling definitions
  const themeStyles = {
    gold: {
      border: 'border-[#b45309]',
      frameBg: 'bg-[#fffdfa]',
      accentText: 'text-[#b45309]',
      accentBg: 'bg-[#fef3c7]/60',
      accentBorder: 'border-[#b45309]/30',
      barFill: 'bg-gradient-to-l from-[#d97706] to-[#b45309]',
      sealTail: 'bg-gradient-to-b from-[#b45309] to-[#78350f]'
    },
    emerald: {
      border: 'border-[#065f46]',
      frameBg: 'bg-[#f0fdf4]',
      accentText: 'text-[#065f46]',
      accentBg: 'bg-[#d1fae5]/60',
      accentBorder: 'border-[#065f46]/30',
      barFill: 'bg-gradient-to-l from-[#10b981] to-[#065f46]',
      sealTail: 'bg-gradient-to-b from-[#065f46] to-[#064e3b]'
    },
    sapphire: {
      border: 'border-[#1e3a8a]',
      frameBg: 'bg-[#f8fafc]',
      accentText: 'text-[#1e3a8a]',
      accentBg: 'bg-[#dbeafe]/60',
      accentBorder: 'border-[#1e3a8a]/30',
      barFill: 'bg-gradient-to-l from-[#3b82f6] to-[#1e3a8a]',
      sealTail: 'bg-gradient-to-b from-[#1e3a8a] to-[#172554]'
    },
    burgundy: {
      border: 'border-[#881337]',
      frameBg: 'bg-[#fff1f2]',
      accentText: 'text-[#881337]',
      accentBg: 'bg-[#ffe4e6]/60',
      accentBorder: 'border-[#881337]/30',
      barFill: 'bg-gradient-to-l from-[#f43f5e] to-[#881337]',
      sealTail: 'bg-gradient-to-b from-[#881337] to-[#4c0519]'
    }
  };

  const st = themeStyles[theme];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 space-y-4 text-right shadow-2xl relative border border-slate-200 my-auto text-slate-900">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">شهادة التميز ودبلومة التخرج الفني الملكية</h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  Masterclass Diploma (A4)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">قابلة للتعديل الفوري والطباعة بجودة 300DPI</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Theme Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setTheme('gold')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  theme === 'gold' ? 'bg-white shadow-xs text-amber-900 border border-amber-200' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>👑</span>
                <span className="hidden sm:inline">ذهبي</span>
              </button>
              <button
                onClick={() => setTheme('emerald')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  theme === 'emerald' ? 'bg-white shadow-xs text-emerald-900 border border-emerald-200' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>🌿</span>
                <span className="hidden sm:inline">زمردي</span>
              </button>
              <button
                onClick={() => setTheme('sapphire')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  theme === 'sapphire' ? 'bg-white shadow-xs text-indigo-900 border border-indigo-200' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>💎</span>
                <span className="hidden sm:inline">نيلي</span>
              </button>
              <button
                onClick={() => setTheme('burgundy')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  theme === 'burgundy' ? 'bg-white shadow-xs text-rose-900 border border-rose-200' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span>🍷</span>
                <span className="hidden sm:inline">بوردو</span>
              </button>
            </div>

            {/* Toggle Editor Drawer */}
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showEditor
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <Edit3 size={14} />
              <span>لوحة التعديل ✏️</span>
            </button>

            {/* Print A4 */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={14} />
              <span>طباعة A4</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Editor Drawer (Hidden on print) */}
        {showEditor && (
          <div className="no-print bg-blue-50/40 border border-blue-200 rounded-2xl p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
              <span className="font-bold text-slate-900">تعديل نصوص ودرجات الشهادة في أي وقت:</span>
              <span className="text-[10px] text-blue-700 font-bold">التعديلات تنعكس فوراً</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Col 1: Names & Course */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-blue-900 block mb-1">البيانات الأساسية</span>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">اسم الطالب:</label>
                  <input
                    type="text"
                    value={diploma.studentName}
                    onChange={e => setDiploma({ ...diploma, studentName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">اسم الدورة:</label>
                  <input
                    type="text"
                    value={diploma.courseTitle}
                    onChange={e => setDiploma({ ...diploma, courseTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">التقدير:</label>
                  <input
                    type="text"
                    value={diploma.gradeLevel}
                    onChange={e => setDiploma({ ...diploma, gradeLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Col 2: Critique */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-blue-900 block mb-1">النقد والثناء الفني</span>
                <textarea
                  rows={4}
                  value={diploma.critiqueText}
                  onChange={e => setDiploma({ ...diploma, critiqueText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] leading-relaxed"
                />
                <div className="flex gap-1 flex-wrap">
                  <button type="button" onClick={() => applyCritiquePreset('oil')} className="text-[9px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-bold">زيتي</button>
                  <button type="button" onClick={() => applyCritiquePreset('portrait')} className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">بورتريه</button>
                  <button type="button" onClick={() => applyCritiquePreset('water')} className="text-[9px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">مائي</button>
                  <button type="button" onClick={() => applyCritiquePreset('kids')} className="text-[9px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">أطفال</button>
                  <button type="button" onClick={() => applyCritiquePreset('general')} className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">عام</button>
                </div>
              </div>

              {/* Col 3: Skills Sliders */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-blue-900">مؤشرات المهارات</span>
                  <label className="flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diploma.showSkills}
                      onChange={e => setDiploma({ ...diploma, showSkills: e.target.checked })}
                      className="rounded"
                    />
                    <span>إظهار</span>
                  </label>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>الفرشاة:</span>
                    <span className="font-mono">{diploma.skills.brushwork}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={diploma.skills.brushwork}
                    onChange={e => setDiploma({ ...diploma, skills: { ...diploma.skills, brushwork: Number(e.target.value) } })}
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>النسب والتكوين:</span>
                    <span className="font-mono">{diploma.skills.composition}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={diploma.skills.composition}
                    onChange={e => setDiploma({ ...diploma, skills: { ...diploma.skills, composition: Number(e.target.value) } })}
                    className="w-full accent-amber-600"
                  />
                </div>
              </div>

              {/* Col 4: Endorsement */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-amber-800 block mb-1">الاعتماد والتوقيعات</span>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">أستاذ الورشة:</label>
                  <input
                    type="text"
                    value={diploma.instructorName}
                    onChange={e => setDiploma({ ...diploma, instructorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-0.5">المدير الأكاديمي:</label>
                  <input
                    type="text"
                    value={diploma.directorName}
                    onChange={e => setDiploma({ ...diploma, directorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diploma.showSeal}
                      onChange={e => setDiploma({ ...diploma, showSeal: e.target.checked })}
                      className="rounded"
                    />
                    <span>الختم الذهبي</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diploma.showQr}
                      onChange={e => setDiploma({ ...diploma, showQr: e.target.checked })}
                      className="rounded"
                    />
                    <span>كود QR</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PRINTABLE MASTER DIPLOMA FRAME (ISOLATED IN A4 ON PRINT)     */}
        {/* ============================================================ */}
        <div
          id="printDiplomaArea"
          className={`relative p-8 sm:p-12 rounded-3xl text-center space-y-5 select-none border-[12px] border-double ${st.border} ${st.frameBg} shadow-inner min-h-[640px]`}
          style={{
            backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 60%, rgba(254,249,235,0.7) 100%)'
          }}
        >
          {/* Vector Baroque Corner Ornaments */}
          <div className="absolute top-3 left-3 w-12 h-12 text-amber-700 pointer-events-none opacity-80">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M6,6 L94,6 M6,6 L6,94 M14,14 L82,14 M14,14 L14,82 M22,22 Q50,10 80,22 Q90,50 80,80 Q50,92 22,80 Q10,50 22,22 Z" strokeWidth="2.5" />
              <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
            </svg>
          </div>
          <div className="absolute top-3 right-3 w-12 h-12 text-amber-700 pointer-events-none opacity-80 transform -scale-x-100">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M6,6 L94,6 M6,6 L6,94 M14,14 L82,14 M14,14 L14,82 M22,22 Q50,10 80,22 Q90,50 80,80 Q50,92 22,80 Q10,50 22,22 Z" strokeWidth="2.5" />
              <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
            </svg>
          </div>
          <div className="absolute bottom-3 left-3 w-12 h-12 text-amber-700 pointer-events-none opacity-80 transform -scale-y-100">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M6,6 L94,6 M6,6 L6,94 M14,14 L82,14 M14,14 L14,82 M22,22 Q50,10 80,22 Q90,50 80,80 Q50,92 22,80 Q10,50 22,22 Z" strokeWidth="2.5" />
              <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
            </svg>
          </div>
          <div className="absolute bottom-3 right-3 w-12 h-12 text-amber-700 pointer-events-none opacity-80 transform -scale-100">
            <svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M6,6 L94,6 M6,6 L6,94 M14,14 L82,14 M14,14 L14,82 M22,22 Q50,10 80,22 Q90,50 80,80 Q50,92 22,80 Q10,50 22,22 Z" strokeWidth="2.5" />
              <circle cx="8" cy="8" r="3.5" fill="currentColor"/>
            </svg>
          </div>

          {/* Top Header */}
          <div className={`flex items-center justify-between border-b-2 ${st.accentBorder} pb-3`}>
            <div className="text-right">
              <span className={`text-[9px] font-mono ${st.accentText} font-bold tracking-wider block`}>
                {diploma.certificateNumber}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">التاريخ: {diploma.issueDate}</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-wide">
                {diploma.academyName}
              </h2>
              <p className={`text-xs ${st.accentText} font-bold`}>{diploma.academySubtitle}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-white border ${st.accentBorder} flex items-center justify-center ${st.accentText} shadow-xs`}>
              <Palette className="w-6 h-6" />
            </div>
          </div>

          {/* Title Banner */}
          <div className="space-y-1">
            <div className={`flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold ${st.accentText} font-serif`}>
              <span>❖</span>
              <span className="tracking-widest uppercase">Certificate of Fine Arts Excellence & Mastery</span>
              <span>❖</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 font-serif tracking-wide py-0.5">
              شهــادة تميــز ودبلــوم فنــي تشكيلــي
            </h1>
            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              يشهد مرسم واستوديو الفنون التشكيلية بأن الفنان / الطالب قد اجتاز بنجاح واقتدار فني متقدم متطلبات ورشة:
            </p>
          </div>

          {/* Student Name & Course Banner */}
          <div className={`py-3 px-4 ${st.accentBg} rounded-2xl border ${st.accentBorder} relative`}>
            <div className={`text-2xl sm:text-4xl font-black ${st.accentText} font-serif`}>
              {diploma.studentName}
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-slate-700 flex-wrap">
              <span className="text-slate-900 font-bold text-sm">{diploma.courseTitle}</span>
              <span>•</span>
              <span>{diploma.branchName}</span>
              <span>•</span>
              <span className={`px-3 py-0.5 rounded-full bg-white text-slate-900 border ${st.accentBorder} font-bold shadow-2xs`}>
                {diploma.gradeLevel}
              </span>
            </div>
          </div>

          {/* 4 Core Skills Radar Meters */}
          {diploma.showSkills && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
              <div className={`bg-white/95 p-2.5 rounded-2xl border ${st.accentBorder} shadow-2xs`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>التحكم في الفرشاة</span>
                  <span className={`font-mono ${st.accentText} font-black`}>{diploma.skills.brushwork}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${st.barFill} rounded-full`} style={{ width: `${diploma.skills.brushwork}%` }} />
                </div>
              </div>
              <div className={`bg-white/95 p-2.5 rounded-2xl border ${st.accentBorder} shadow-2xs`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>التكوين والنسب</span>
                  <span className={`font-mono ${st.accentText} font-black`}>{diploma.skills.composition}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${st.barFill} rounded-full`} style={{ width: `${diploma.skills.composition}%` }} />
                </div>
              </div>
              <div className={`bg-white/95 p-2.5 rounded-2xl border ${st.accentBorder} shadow-2xs`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>إدراك النور والظلال</span>
                  <span className={`font-mono ${st.accentText} font-black`}>{diploma.skills.chiaroscuro}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${st.barFill} rounded-full`} style={{ width: `${diploma.skills.chiaroscuro}%` }} />
                </div>
              </div>
              <div className={`bg-white/95 p-2.5 rounded-2xl border ${st.accentBorder} shadow-2xs`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>تناغم الألوان</span>
                  <span className={`font-mono ${st.accentText} font-black`}>{diploma.skills.colorHarmony}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${st.barFill} rounded-full`} style={{ width: `${diploma.skills.colorHarmony}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Master Academic Critique Box */}
          <div className={`bg-white/95 p-3.5 rounded-2xl border ${st.accentBorder} text-right space-y-1 shadow-2xs`}>
            <div className={`flex items-center justify-between font-bold text-xs ${st.accentText} border-b ${st.accentBorder} pb-1`}>
              <span className="flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" />
                <span>رأي وتقييم أستاذ المرسم والناقد الفني:</span>
              </span>
              <span className="text-[9px] text-slate-400">اعتماد رسمي</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-serif">
              {diploma.critiqueText}
            </p>
          </div>

          {/* Certificate Footer: Signatures, Seal & QR */}
          <div className={`pt-3 border-t-2 ${st.accentBorder} flex items-end justify-between gap-3`}>
            {/* Signature 1: Lead Artist */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-600 block">الفنان وأستاذ الورشة</span>
              <div className="h-7 border-b border-dashed border-slate-400 w-28 mx-auto flex items-end justify-center">
                <span className="text-[10px] font-serif text-slate-400 italic">Signature</span>
              </div>
              <span className="font-black text-xs text-slate-900 block">{diploma.instructorName}</span>
            </div>

            {/* Center: Gold Embossed Seal */}
            {diploma.showSeal && (
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-amber-950 font-black text-center p-1 border-2 border-white shadow-md bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200">
                  <ShieldCheck className="w-5 h-5 text-amber-950 mb-0.5" />
                  <span className="text-[7px] leading-tight font-black uppercase">معتمد رسمياً</span>
                </div>
                {/* Hanging Ribbon Tails */}
                <div className="flex justify-center gap-1 -mt-1.5 z-10">
                  <div className={`w-3 h-5 ${st.sealTail} transform rotate-6 clip-ribbon`} />
                  <div className={`w-3 h-5 ${st.sealTail} transform -rotate-6 clip-ribbon`} />
                </div>
                <span className={`text-[8px] font-bold ${st.accentText} mt-1`}>الختم الأكاديمي للمرسم</span>
              </div>
            )}

            {/* Verification QR Box & Signature 2: Director */}
            <div className="flex items-center gap-3">
              {diploma.showQr && qrDataUrl && (
                <div className={`w-16 h-16 bg-white p-1 rounded-xl border ${st.accentBorder} shadow-2xs flex flex-col items-center justify-center`}>
                  <img src={qrDataUrl} alt="QR Verification" className="w-11 h-11 object-contain" />
                  <span className="text-[6px] text-slate-500 font-bold mt-0.5">تحقق الكتروني</span>
                </div>
              )}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-600 block">اعتماد إدارة المرسم</span>
                <div className="h-7 border-b border-dashed border-slate-400 w-28 mx-auto flex items-end justify-center">
                  <span className="text-[10px] font-serif text-slate-400 italic">Approved</span>
                </div>
                <span className="font-black text-xs text-slate-900 block">{diploma.directorName}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
