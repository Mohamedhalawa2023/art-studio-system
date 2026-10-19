'use client';
import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  User, Student, Course, Group, Session, Enrollment, Payment, Installment,
  Attendance, Progress, SupplyItem, SupplySale, PortfolioItem,
  mockUsers, mockStudents, mockCourses, mockGroups, mockSessions,
  mockEnrollments, mockInstallments, mockPayments, mockAttendance, mockProgress,
  mockSupplyItems, mockSupplySales, mockPortfolio
} from './mockData';
import { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import { StudentService, RegisterStudentDTO } from '@/lib/services/student.service';
import { FinanceService, RecordPaymentDTO } from '@/lib/services/finance.service';
import { PosService, CreateSaleDTO } from '@/lib/services/pos.service';
import { AttendanceService, BarcodeScanResult } from '@/lib/services/attendance.service';
import { BackupService } from '@/lib/services/backup.service';
import { logger } from '@/lib/logger/logger';

export type {
  User, Student, Course, Group, Session, Enrollment, Payment, Installment,
  Attendance, Progress, SupplyItem, SupplySale, PortfolioItem
};

export interface AcademySettings {
  name: string;
  phone: string;
  address: string;
  contractTerms: string;
}

interface MarsamContextType {
  currentUser: User | null;
  login: (role: 'admin' | 'supervisor' | 'guardian') => void;
  logout: () => void;
  
  // Theme state (Default: light)
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Reactive Data State
  users: User[];
  students: Student[];
  courses: Course[];
  groups: Group[];
  sessions: Session[];
  enrollments: Enrollment[];
  installments: Installment[];
  payments: Payment[];
  attendance: Attendance[];
  progress: Progress[];
  supplyItems: SupplyItem[];
  supplySales: SupplySale[];
  portfolio: PortfolioItem[];
  customDiplomas: Record<string, any>;
  settings: AcademySettings;
  
  // Domain Operations
  addStudentWithEnrollment: (params: RegisterStudentDTO) => { student: Student; enrollment?: Enrollment; payment?: Payment };
  addCoursePayment: (params: RecordPaymentDTO) => Payment;
  recordStudentAttendance: (params: { studentId: string; sessionId: string; status: 'present' | 'absent' | 'late'; lessonTopic?: string }) => Attendance;
  processBarcodeScan: (barcode: string, sessionId: string) => BarcodeScanResult;
  addSupplyItem: (item: Omit<SupplyItem, 'id'>) => SupplyItem;
  updateSupplyItem: (id: string, updates: Partial<Omit<SupplyItem, 'id'>>) => SupplyItem;
  deleteSupplyItem: (id: string) => void;
  updateSupplyStock: (id: string, deltaQty: number) => void;
  createSupplySale: (params: CreateSaleDTO) => SupplySale;
  updateStudentProgress: (params: { studentId: string; sessionId: string; level: string; rating: number; notes?: string }) => void;
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'uploadDate'>) => void;
  updatePortfolioStatus: (id: string, status: 'approved' | 'rejected') => void;
  saveStudentDiploma: (studentId: string, diplomaData: any) => void;
  updateSettings: (newSettings: Partial<AcademySettings>) => void;
  exportDatabase: () => Promise<void>;
  importDatabase: (jsonData: string) => boolean;
  resetDatabase: () => void;
}

const MarsamContext = createContext<MarsamContextType | null>(null);

const STORAGE_KEY = 'marsam_erp_db_v1';
const THEME_KEY = 'marsam_theme';

const initialSettings: AcademySettings = {
  name: 'مرسم الإبداع للفنون التشكيلية',
  phone: '01012345678',
  address: 'القاهرة — مصر الجديدة — شارع النزهة',
  contractTerms: `بنود التعاقد مع مرسم الإبداع:
١. يلتزم الطالب بمواعيد الحصص المحددة، وأي تأخير يتجاوز 15 دقيقة يحتسب تأخيراً.
٢. في حال الغياب بعذر مسبق، يتم التنسيق لحصة تعويضية حسب السعة المتاحة.
٣. سياسة الاسترداد: استرداد كامل قبل بدء أول حصة بـ 3 أيام، و50% بعد الحصة الأولى، ولا استرداد بعد ذلك.
٤. الرسوم تُدفع وفق جدول الأقساط المتفق عليه مع إدارة المرسم.
٥. المرسم مسؤول عن توفير بيئة تعليمية آمنة وأدوات تدريب مطابقة للمعايير الفنية.`
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers[0]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // 1. Reactive Presentation State
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [installments, setInstallments] = useState<Installment[]>(mockInstallments);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [attendance, setAttendance] = useState<Attendance[]>(mockAttendance);
  const [progress, setProgress] = useState<Progress[]>(mockProgress);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>(mockSupplyItems);
  const [supplySales, setSupplySales] = useState<SupplySale[]>(mockSupplySales);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(mockPortfolio);
  const [customDiplomas, setCustomDiplomas] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<AcademySettings>(initialSettings);

  const [isHydrated, setIsHydrated] = useState(false);

  // 2. Initialize Core Database Engine & Domain Services
  const dbEngine = useMemo(() => {
    const initialState: DatabaseState = {
      users: mockUsers,
      students: mockStudents,
      courses: mockCourses,
      groups: mockGroups,
      sessions: mockSessions,
      enrollments: mockEnrollments,
      installments: mockInstallments,
      payments: mockPayments,
      attendance: mockAttendance,
      progress: mockProgress,
      supplyItems: mockSupplyItems,
      supplySales: mockSupplySales,
      portfolio: mockPortfolio,
      customDiplomas: {},
      settings: initialSettings
    };
    return new DatabaseEngine(initialState);
  }, []);

  const studentService = useMemo(() => new StudentService(dbEngine), [dbEngine]);
  const financeService = useMemo(() => new FinanceService(dbEngine), [dbEngine]);
  const posService = useMemo(() => new PosService(dbEngine), [dbEngine]);
  const attendanceService = useMemo(() => new AttendanceService(dbEngine), [dbEngine]);

  /**
   * Unified Reactive State Sync callback from committed transactions
   */
  const syncFromEngine = useCallback((committedState: DatabaseState) => {
    setUsers([...committedState.users]);
    setStudents([...committedState.students]);
    setCourses([...committedState.courses]);
    setGroups([...committedState.groups]);
    setSessions([...committedState.sessions]);
    setEnrollments([...committedState.enrollments]);
    setInstallments([...committedState.installments]);
    setPayments([...committedState.payments]);
    setAttendance([...committedState.attendance]);
    setProgress([...committedState.progress]);
    setSupplyItems([...committedState.supplyItems]);
    setSupplySales([...committedState.supplySales]);
    setPortfolio([...committedState.portfolio]);
    setCustomDiplomas({ ...committedState.customDiplomas });
    setSettings({ ...committedState.settings });
  }, []);

  // 3. Hydrate state from local disk storage (/api/database) or fallback to localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    async function hydrateDatabase() {
      let loaded = false;
      try {
        const res = await fetch('/api/database');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            dbEngine.hydrate(json.data);
            syncFromEngine(json.data);
            loaded = true;
            logger.info('AuthProvider', 'Database hydrated successfully from disk storage.');
          }
        }
      } catch (err) {
        logger.warn('AuthProvider', 'Failed to reach /api/database on boot, checking localStorage fallback.');
      }

      if (!loaded) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            dbEngine.hydrate(parsed);
            syncFromEngine(parsed);
          }
        } catch (e) {
          logger.error('AuthProvider', 'Failed to parse database from localStorage', e);
        }
      }
      setIsHydrated(true);
    }

    hydrateDatabase();
  }, [dbEngine, syncFromEngine]);

  // 4. Background Persistence & Snapshot Sync
  useEffect(() => {
    if (!isHydrated) return;

    const currentState: DatabaseState = {
      users, students, courses, groups, sessions,
      enrollments, installments, payments, attendance,
      progress, supplyItems, supplySales, portfolio,
      customDiplomas, settings
    };

    // Keep database engine synchronized
    dbEngine.hydrate(currentState);

    // Browser localStorage mirror
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {
      logger.warn('AuthProvider', 'LocalStorage quota exceeded or restricted.');
    }

    // Debounced asynchronous server disk sync
    const timer = setTimeout(() => {
      fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState)
      }).catch(err => logger.warn('AuthProvider', 'Async background disk sync error: ' + String(err)));
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isHydrated, dbEngine, users, students, courses, groups, sessions,
    enrollments, installments, payments, attendance,
    progress, supplyItems, supplySales, portfolio, customDiplomas, settings
  ]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const login = (role: 'admin' | 'supervisor' | 'guardian') => {
    const user = users.find(u => u.role === role) || users[0];
    setCurrentUser(user);
  };

  const logout = () => setCurrentUser(null);

  // ================= DOMAIN ACTIONS =================

  /**
   * Action 1: Register Student with Enrollment (ACID Transaction)
   */
  const addStudentWithEnrollment = (params: RegisterStudentDTO) => {
    try {
      return studentService.registerStudentWithEnrollment(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 2: Add Course Payment (ACID Transaction)
   */
  const addCoursePayment = (params: RecordPaymentDTO) => {
    try {
      return financeService.addCoursePayment(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 3: Process Real-time Barcode Scanner (O(1) Indexed Lookup)
   */
  const processBarcodeScan = (barcode: string, sessionId: string) => {
    try {
      return attendanceService.processBarcodeScan(barcode, sessionId, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      return { success: false, message: userMessage };
    }
  };

  /**
   * Action 4: Record Student Attendance manually
   */
  const recordStudentAttendance = (params: {
    studentId: string;
    sessionId: string;
    status: 'present' | 'absent' | 'late';
    lessonTopic?: string;
  }): Attendance => {
    const existing = attendance.find(a => a.studentId === params.studentId && a.sessionId === params.sessionId);
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    let updatedRecord: Attendance;
    if (existing) {
      updatedRecord = {
        ...existing,
        status: params.status,
        checkIn: params.status === 'present' || params.status === 'late' ? existing.checkIn || nowTime : undefined
      };
      setAttendance(prev => prev.map(a => a.id === existing.id ? updatedRecord : a));
    } else {
      updatedRecord = {
        id: 'att_' + Date.now(),
        studentId: params.studentId,
        sessionId: params.sessionId,
        status: params.status,
        recordedBy: currentUser?.id || 'admin',
        checkIn: params.status === 'present' || params.status === 'late' ? nowTime : undefined
      };
      setAttendance(prev => [updatedRecord, ...prev]);
    }

    if (params.lessonTopic && params.status === 'present') {
      const progressRecord: Progress = {
        id: 'prog_' + Date.now(),
        studentId: params.studentId,
        sessionId: params.sessionId,
        level: params.lessonTopic,
        rating: 5,
        notes: `حضر وأنجز موضوع الدرس: ${params.lessonTopic}`,
        recordedBy: currentUser?.id || 'admin',
        date: new Date().toISOString().slice(0, 10)
      };
      setProgress(prev => [progressRecord, ...prev]);
    }

    return updatedRecord;
  };

  /**
   * Action 5: POS Store Sale Checkout (ACID Transaction)
   */
  const createSupplySale = (params: CreateSaleDTO) => {
    try {
      return posService.createSupplySale(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 6: Add Supply Item (ACID Transaction)
   */
  const addSupplyItem = (item: Omit<SupplyItem, 'id'>) => {
    try {
      return posService.addSupplyItem(item, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 6b: Update Existing Supply Item (ACID Transaction)
   */
  const updateSupplyItem = (id: string, updates: Partial<Omit<SupplyItem, 'id'>>) => {
    try {
      return posService.updateSupplyItem(id, updates, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 6c: Delete Supply Item (ACID Transaction)
   */
  const deleteSupplyItem = (id: string) => {
    try {
      return posService.deleteSupplyItem(id, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  /**
   * Action 7: Manual Stock Adjustment
   */
  const updateSupplyStock = (id: string, deltaQty: number) => {
    setSupplyItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, stockQty: Math.max(0, item.stockQty + deltaQty) };
      }
      return item;
    }));
  };

  /**
   * Action 8: Update Student Progress Evaluation
   */
  const updateStudentProgress = (params: {
    studentId: string;
    sessionId: string;
    level: string;
    rating: number;
    notes?: string;
  }) => {
    const newProgress: Progress = {
      id: 'pr_' + Date.now(),
      studentId: params.studentId,
      sessionId: params.sessionId,
      level: params.level,
      rating: params.rating,
      notes: params.notes || '',
      recordedBy: currentUser?.id || 'admin',
      date: new Date().toISOString().slice(0, 10)
    };
    setProgress(prev => [newProgress, ...prev]);
    setStudents(prev => prev.map(s => s.id === params.studentId ? { ...s, level: params.level } : s));
  };

  /**
   * Action 9: Portfolio operations
   */
  const addPortfolioItem = (item: Omit<PortfolioItem, 'id' | 'uploadDate'>) => {
    const newItem: PortfolioItem = {
      id: 'pf_' + Date.now(),
      uploadDate: new Date().toISOString().slice(0, 10),
      ...item
    };
    setPortfolio(prev => [newItem, ...prev]);
  };

  const updatePortfolioStatus = (id: string, status: 'approved' | 'rejected') => {
    setPortfolio(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  /**
   * Action 10: Diploma & Settings
   */
  const saveStudentDiploma = (studentId: string, diplomaData: any) => {
    setCustomDiplomas(prev => ({ ...prev, [studentId]: diplomaData }));
  };

  const updateSettings = (newSettings: Partial<AcademySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  /**
   * Action 11: Non-blocking Asynchronous Export
   */
  const exportDatabase = async () => {
    const state: DatabaseState = {
      users, students, courses, groups, sessions,
      enrollments, installments, payments, attendance,
      progress, supplyItems, supplySales, portfolio,
      customDiplomas, settings
    };
    await BackupService.exportDatabaseAsync(state);
  };

  /**
   * Action 12: Schema-Validated Database Import
   */
  const importDatabase = (jsonData: string): boolean => {
    const verification = BackupService.validateImportSchema(jsonData);
    if (!verification.valid || !verification.data) {
      alert(`خطأ في استيراد البيانات: ${verification.error}`);
      return false;
    }

    dbEngine.hydrate(verification.data);
    syncFromEngine(verification.data);
    alert('تم استيراد واستعادة قاعدة البيانات بنجاح وبأمان تام ✅');
    return true;
  };

  /**
   * Action 13: Reset database safely
   */
  const resetDatabase = () => {
    localStorage.removeItem(STORAGE_KEY);
    dbEngine.hydrate({
      users: mockUsers,
      students: mockStudents,
      courses: mockCourses,
      groups: mockGroups,
      sessions: mockSessions,
      enrollments: mockEnrollments,
      installments: mockInstallments,
      payments: mockPayments,
      attendance: mockAttendance,
      progress: mockProgress,
      supplyItems: mockSupplyItems,
      supplySales: mockSupplySales,
      portfolio: mockPortfolio,
      customDiplomas: {},
      settings: initialSettings
    });
    syncFromEngine(dbEngine.getState());
  };

  return (
    <MarsamContext.Provider value={{
      currentUser, login, logout,
      theme, toggleTheme,
      users, students, courses, groups, sessions,
      enrollments, installments, payments, attendance,
      progress, supplyItems, supplySales, portfolio, customDiplomas, settings,
      addStudentWithEnrollment, addCoursePayment,
      recordStudentAttendance, processBarcodeScan,
      addSupplyItem, updateSupplyItem, deleteSupplyItem, updateSupplyStock, createSupplySale,
      updateStudentProgress, addPortfolioItem, updatePortfolioStatus,
      saveStudentDiploma,
      updateSettings, exportDatabase, importDatabase, resetDatabase
    }}>
      {children}
    </MarsamContext.Provider>
  );
}

export function useMarsam() {
  const context = useContext(MarsamContext);
  if (!context) throw new Error('useMarsam must be used within an AuthProvider');
  return context;
}
