'use client';
import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  User, Student, Course, Group, Session, Enrollment, Payment, Installment, OperatingExpense, Announcement,
  Attendance, Progress, SupplyItem, SupplySale, PortfolioItem,
  mockUsers, mockStudents, mockCourses, mockGroups, mockSessions,
  mockAnnouncements,
  mockEnrollments, mockInstallments, mockPayments, mockAttendance, mockProgress,
  mockSupplyItems, mockSupplySales, mockPortfolio
} from './mockData';
import { DatabaseEngine, DatabaseState, normalizeDatabaseState } from '@/lib/db/transactionManager';
import { StudentService, RegisterStudentDTO, UpdateStudentDTO } from '@/lib/services/student.service';
import { FinanceService, RecordExpenseDTO, RecordPaymentDTO, ReversePaymentDTO, UpdateExpenseDTO } from '@/lib/services/finance.service';
import { EnrollmentService, CreateEnrollmentDTO, UpdateEnrollmentDTO } from '@/lib/services/enrollment.service';
import { PosService, CreateSaleDTO, VoidSaleDTO } from '@/lib/services/pos.service';
import { AttendanceService, BarcodeScanResult } from '@/lib/services/attendance.service';
import { AnnouncementDTO, CatalogService, CreateCourseDTO, CreateGroupDTO, UpdateCourseDTO, UpdateGroupDTO } from '@/lib/services/catalog.service';
import { BackupService } from '@/lib/services/backup.service';
import { logger } from '@/lib/logger/logger';
import { formatLocalDate } from '@/lib/dates';

export type {
  User, Student, Course, Group, Session, Enrollment, Payment, Installment,
  Attendance, Progress, SupplyItem, SupplySale, PortfolioItem, OperatingExpense
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
  announcements: Announcement[];
  enrollments: Enrollment[];
  installments: Installment[];
  payments: Payment[];
  expenses: OperatingExpense[];
  attendance: Attendance[];
  progress: Progress[];
  supplyItems: SupplyItem[];
  supplySales: SupplySale[];
  portfolio: PortfolioItem[];
  customDiplomas: Record<string, unknown>;
  settings: AcademySettings;
  
  // Domain Operations
  addStudentWithEnrollment: (params: RegisterStudentDTO) => { student: Student; enrollment?: Enrollment; payment?: Payment };
  updateStudent: (id: string, params: UpdateStudentDTO) => Student;
  deleteStudent: (id: string) => void;
  createEnrollment: (params: CreateEnrollmentDTO) => { enrollment: Enrollment; payment?: Payment };
  updateEnrollment: (id: string, params: UpdateEnrollmentDTO) => Enrollment;
  deleteEnrollment: (id: string) => void;
  addCoursePayment: (params: RecordPaymentDTO) => Payment;
  reverseCoursePayment: (params: ReversePaymentDTO) => Payment;
  addOperatingExpense: (params: RecordExpenseDTO) => OperatingExpense;
  updateOperatingExpense: (params: UpdateExpenseDTO) => OperatingExpense;
  deleteOperatingExpense: (id: string, deletedBy?: string) => void;
  recordStudentAttendance: (params: { studentId: string; sessionId: string; status: 'present' | 'absent' | 'late'; lessonTopic?: string }) => Attendance;
  deleteAttendance: (id: string) => void;
  processBarcodeScan: (barcode: string, sessionId: string) => BarcodeScanResult;
  addSupplyItem: (item: Omit<SupplyItem, 'id'>) => SupplyItem;
  updateSupplyItem: (id: string, updates: Partial<Omit<SupplyItem, 'id'>>) => SupplyItem;
  deleteSupplyItem: (id: string) => void;
  updateSupplyStock: (id: string, deltaQty: number) => void;
  createSupplySale: (params: CreateSaleDTO) => SupplySale;
  voidSupplySale: (params: VoidSaleDTO) => SupplySale;
  createCourse: (params: CreateCourseDTO) => Course;
  updateCourse: (id: string, params: UpdateCourseDTO) => Course;
  deleteCourse: (id: string) => void;
  createGroup: (params: CreateGroupDTO) => Group;
  updateGroup: (id: string, params: UpdateGroupDTO) => Group;
  deleteGroup: (id: string) => void;
  createAnnouncement: (params: AnnouncementDTO) => Announcement;
  updateAnnouncement: (id: string, params: AnnouncementDTO) => Announcement;
  deleteAnnouncement: (id: string) => void;
  cancelSession: (id: string) => Session;
  createMakeupSession: (params: { groupId: string; date: string; time: string }) => Session;
  updateSession: (id: string, params: { date: string; time: string }) => Session;
  deleteSession: (id: string) => void;
  updateStudentProgress: (params: { studentId: string; sessionId: string; level: string; rating: number; notes?: string }) => void;
  deleteStudentProgress: (id: string) => void;
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'uploadDate'>) => void;
  updatePortfolioItem: (id: string, updates: Partial<Pick<PortfolioItem, 'title' | 'description' | 'supervisorId' | 'imageUrl'>>) => void;
  deletePortfolioItem: (id: string) => void;
  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (id: string, updates: Partial<Omit<User, 'id'>>) => User;
  deleteUser: (id: string) => void;
  updatePortfolioStatus: (id: string, status: 'approved' | 'rejected') => void;
  saveStudentDiploma: (studentId: string, diplomaData: unknown) => void;
  updateSettings: (newSettings: Partial<AcademySettings>) => void;
  exportDatabase: () => Promise<void>;
  importDatabase: (jsonData: string) => Promise<boolean>;
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
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [installments, setInstallments] = useState<Installment[]>(mockInstallments);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>(mockAttendance);
  const [progress, setProgress] = useState<Progress[]>(mockProgress);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>(mockSupplyItems);
  const [supplySales, setSupplySales] = useState<SupplySale[]>(mockSupplySales);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(mockPortfolio);
  const [customDiplomas, setCustomDiplomas] = useState<Record<string, unknown>>({});
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
      announcements: mockAnnouncements,
      enrollments: mockEnrollments,
      installments: mockInstallments,
      payments: mockPayments,
      expenses: [],
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
  const enrollmentService = useMemo(() => new EnrollmentService(dbEngine), [dbEngine]);
  const posService = useMemo(() => new PosService(dbEngine), [dbEngine]);
  const attendanceService = useMemo(() => new AttendanceService(dbEngine), [dbEngine]);
  const catalogService = useMemo(() => new CatalogService(dbEngine), [dbEngine]);

  /**
   * Unified Reactive State Sync callback from committed transactions
   */
  const syncFromEngine = useCallback((committedState: DatabaseState) => {
    setUsers([...committedState.users]);
    setStudents([...committedState.students]);
    setCourses([...committedState.courses]);
    setGroups([...committedState.groups]);
    setSessions([...committedState.sessions]);
    setAnnouncements([...committedState.announcements]);
    setEnrollments([...committedState.enrollments]);
    setInstallments([...committedState.installments]);
    setPayments([...committedState.payments]);
    setExpenses([...committedState.expenses]);
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
    // Hydrate the context value from browser storage after mount to avoid an SSR/client theme mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    async function hydrateDatabase() {
      let loaded = false;
      try {
        const res = await fetch('/api/database');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const normalized = normalizeDatabaseState(json.data);
            dbEngine.hydrate(normalized);
            syncFromEngine(normalized);
            loaded = true;
            logger.info('AuthProvider', 'Database hydrated successfully from disk storage.');
          }
        }
      } catch {
        logger.warn('AuthProvider', 'Failed to reach /api/database on boot, checking localStorage fallback.');
      }

      if (!loaded) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = normalizeDatabaseState(JSON.parse(saved));
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
      users, students, courses, groups, sessions, announcements,
      enrollments, installments, payments, expenses, attendance,
      progress, supplyItems, supplySales, portfolio,
      customDiplomas, settings
    };

    // Keep database engine synchronized
    dbEngine.hydrate(currentState);

    // Browser localStorage mirror
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch {
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
    enrollments, installments, payments, expenses, attendance,
    progress, supplyItems, supplySales, portfolio, announcements, customDiplomas, settings
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

  const updateStudent = (id: string, params: UpdateStudentDTO) => studentService.updateStudent(id, params, syncFromEngine);
  const deleteStudent = (id: string) => studentService.deleteStudent(id, syncFromEngine);

  const createEnrollment = (params: CreateEnrollmentDTO) => {
    try {
      return enrollmentService.createEnrollment(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  const updateEnrollment = (id: string, params: UpdateEnrollmentDTO) => enrollmentService.updateEnrollment(id, params, syncFromEngine);
  const deleteEnrollment = (id: string) => enrollmentService.deleteEnrollment(id, syncFromEngine);

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

  const reverseCoursePayment = (params: ReversePaymentDTO) => {
    try {
      return financeService.reverseCoursePayment(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  const addOperatingExpense = (params: RecordExpenseDTO) => {
    try {
      return financeService.addOperatingExpense(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  const updateOperatingExpense = (params: UpdateExpenseDTO) => {
    try {
      return financeService.updateOperatingExpense(params, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  const deleteOperatingExpense = (id: string, deletedBy?: string) => {
    try {
      financeService.deleteOperatingExpense(id, deletedBy, syncFromEngine);
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
      return attendanceService.processBarcodeScan(barcode, sessionId, syncFromEngine, currentUser?.id || 'u1');
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
        date: formatLocalDate(new Date())
      };
      setProgress(prev => {
        const existingProgress = prev.find(item => item.studentId === params.studentId && item.sessionId === params.sessionId);
        if (!existingProgress) return [progressRecord, ...prev];
        return prev.map(item => item.id === existingProgress.id
          ? { ...item, level: progressRecord.level, notes: progressRecord.notes, recordedBy: progressRecord.recordedBy, date: progressRecord.date }
          : item
        );
      });
    }

    return updatedRecord;
  };

  const deleteAttendance = (id: string) => {
    if (!attendance.some(item => item.id === id)) throw new Error('سجل الحضور المطلوب غير موجود.');
    setAttendance(prev => prev.filter(item => item.id !== id));
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

  const voidSupplySale = (params: VoidSaleDTO) => {
    try { return posService.voidSupplySale(params, syncFromEngine); }
    catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
  };

  const createCourse = (params: CreateCourseDTO) => catalogService.createCourse(params, syncFromEngine);
  const updateCourse = (id: string, params: UpdateCourseDTO) => catalogService.updateCourse(id, params, syncFromEngine);
  const deleteCourse = (id: string) => catalogService.deleteCourse(id, syncFromEngine);
  const createGroup = (params: CreateGroupDTO) => catalogService.createGroup(params, syncFromEngine);
  const updateGroup = (id: string, params: UpdateGroupDTO) => catalogService.updateGroup(id, params, syncFromEngine);
  const deleteGroup = (id: string) => catalogService.deleteGroup(id, syncFromEngine);
  const createAnnouncement = (params: AnnouncementDTO) => catalogService.createAnnouncement(params, syncFromEngine);
  const updateAnnouncement = (id: string, params: AnnouncementDTO) => catalogService.updateAnnouncement(id, params, syncFromEngine);
  const deleteAnnouncement = (id: string) => catalogService.deleteAnnouncement(id, syncFromEngine);
  const cancelSession = (id: string) => catalogService.cancelSession(id, syncFromEngine);
  const createMakeupSession = (params: { groupId: string; date: string; time: string }) => catalogService.createMakeupSession(params, syncFromEngine);
  const updateSession = (id: string, params: { date: string; time: string }) => catalogService.updateSession(id, params, syncFromEngine);
  const deleteSession = (id: string) => catalogService.deleteSession(id, syncFromEngine);

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
   * Action 7: Manual Stock Adjustment (ACID Transaction)
   */
  const updateSupplyStock = (id: string, deltaQty: number) => {
    try {
      return posService.updateSupplyStock(id, deltaQty, syncFromEngine);
    } catch (error) {
      const userMessage = logger.formatUserError(error);
      alert(userMessage);
      throw error;
    }
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
    const updatedProgress: Progress = {
      id: 'pr_' + Date.now(),
      studentId: params.studentId,
      sessionId: params.sessionId,
      level: params.level,
      rating: params.rating,
      notes: params.notes || '',
      recordedBy: currentUser?.id || 'admin',
      date: formatLocalDate(new Date())
    };
    setProgress(prev => {
      const existing = prev.find(item => item.studentId === params.studentId && item.sessionId === params.sessionId);
      if (!existing) return [updatedProgress, ...prev];
      return prev.map(item => item.id === existing.id ? { ...updatedProgress, id: existing.id } : item);
    });
    setStudents(prev => prev.map(s => s.id === params.studentId ? { ...s, level: params.level } : s));
  };

  const deleteStudentProgress = (id: string) => {
    const deleted = progress.find(item => item.id === id);
    if (!deleted) throw new Error('سجل التقييم المطلوب غير موجود.');
    const remaining = progress.filter(item => item.id !== id && item.studentId === deleted.studentId)
      .sort((left, right) => right.date.localeCompare(left.date));
    setProgress(prev => prev.filter(item => item.id !== id));
    if (students.some(item => item.id === deleted.studentId && item.level === deleted.level)) {
      setStudents(prev => prev.map(item => item.id === deleted.studentId
        ? { ...item, level: remaining[0]?.level || '' }
        : item));
    }
  };

  /**
   * Action 9: Portfolio operations
   */
  const addPortfolioItem = (item: Omit<PortfolioItem, 'id' | 'uploadDate'>) => {
    const newItem: PortfolioItem = {
      id: 'pf_' + Date.now(),
      uploadDate: formatLocalDate(new Date()),
      ...item
    };
    setPortfolio(prev => [newItem, ...prev]);
  };

  const updatePortfolioStatus = (id: string, status: 'approved' | 'rejected') => {
    setPortfolio(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const updatePortfolioItem = (id: string, updates: Partial<Pick<PortfolioItem, 'title' | 'description' | 'supervisorId' | 'imageUrl'>>) => {
    if (updates.title !== undefined && !updates.title.trim()) throw new Error('عنوان العمل الفني مطلوب.');
    setPortfolio(prev => prev.map(item => item.id === id ? {
      ...item,
      ...updates,
      ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    } : item));
  };

  const deletePortfolioItem = (id: string) => {
    if (!portfolio.some(item => item.id === id)) throw new Error('العمل الفني المطلوب غير موجود.');
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  const addUser = (input: Omit<User, 'id'>) => {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const email = input.email.trim();
    if (name.length < 3 || !phone) throw new Error('أدخل اسمًا كاملًا ورقم هاتف للمستخدم.');
    const user: User = { ...input, id: `u-${globalThis.crypto?.randomUUID?.() || Date.now()}`, name, phone, email: email || `${phone}@marsam.art` };
    return dbEngine.executeTransaction('ADD_USER', draft => {
      if (draft.users.some(item => item.phone === phone || item.email.toLocaleLowerCase() === user.email.toLocaleLowerCase())) {
        throw new Error('رقم الهاتف أو البريد مسجل بالفعل.');
      }
      draft.users.push(user);
      return user;
    }, syncFromEngine);
  };

  const updateUser = (id: string, updates: Partial<Omit<User, 'id'>>) => {
    const next = dbEngine.executeTransaction('UPDATE_USER', draft => {
      const existing = draft.users.find(user => user.id === id);
      if (!existing) throw new Error('المستخدم المطلوب غير موجود.');
      const nextPhone = (updates.phone ?? existing.phone).trim();
      const nextEmail = (updates.email ?? existing.email).trim();
      const updated = { ...existing, ...updates, name: (updates.name ?? existing.name).trim(), phone: nextPhone, email: nextEmail || `${nextPhone}@marsam.art` };
      if (updated.name.length < 3 || !updated.phone) throw new Error('أدخل اسمًا كاملًا ورقم هاتف للمستخدم.');
      if (draft.users.some(user => user.id !== id && (user.phone === updated.phone || user.email.toLocaleLowerCase() === updated.email.toLocaleLowerCase()))) {
        throw new Error('رقم الهاتف أو البريد مسجل بالفعل.');
      }
      if (existing.role === 'admin' && updated.role !== 'admin') throw new Error('لا يمكن تغيير دور حساب المدير.');
      if (updated.role !== existing.role) {
        if (draft.students.some(student => student.guardianId === id) && updated.role !== 'guardian') {
          throw new Error('ولي الأمر مرتبط بملفات طلاب؛ لا يمكن تغيير دوره قبل نقل هذه الملفات.');
        }
        if (draft.groups.some(group => group.supervisorId === id) && updated.role !== 'supervisor') {
          throw new Error('المستخدم مشرف لمجموعات قائمة؛ لا يمكن تغيير دوره قبل نقل المجموعات.');
        }
        if (draft.portfolio.some(item => item.supervisorId === id) && updated.role === 'guardian') {
          throw new Error('المستخدم مرتبط بأعمال فنية؛ لا يمكن تحويله إلى ولي أمر.');
        }
      }
      const index = draft.users.findIndex(user => user.id === id);
      draft.users[index] = updated;
      return updated;
    }, syncFromEngine);
    if (currentUser?.id === id) setCurrentUser(next);
    return next;
  };

  const deleteUser = (id: string) => {
    if (currentUser?.id === id) throw new Error('لا يمكن حذف الحساب المستخدم حاليًا.');
    dbEngine.executeTransaction('DELETE_USER', draft => {
      const user = draft.users.find(item => item.id === id);
      if (!user) throw new Error('المستخدم المطلوب غير موجود.');
      if (user.role === 'admin') throw new Error('لا يمكن حذف حساب المدير.');
      if (draft.students.some(student => student.guardianId === id)) throw new Error('لا يمكن حذف ولي أمر مرتبط بملفات طلاب.');
      if (draft.groups.some(group => group.supervisorId === id)) throw new Error('انقل المجموعات إلى مشرف آخر قبل حذف هذا الحساب.');
      if (draft.portfolio.some(item => item.supervisorId === id)) throw new Error('انقل الأعمال الفنية إلى مستخدم آخر قبل حذف هذا الحساب.');
      draft.users = draft.users.filter(item => item.id !== id);
    }, syncFromEngine);
  };

  /**
   * Action 10: Diploma & Settings
   */
  const saveStudentDiploma = (studentId: string, diplomaData: unknown) => {
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
      users, students, courses, groups, sessions, announcements,
      enrollments, installments, payments, expenses, attendance,
      progress, supplyItems, supplySales, portfolio,
      customDiplomas, settings
    };
    await BackupService.exportDatabaseAsync(state);
  };

  /**
   * Action 12: Schema-Validated Database Import
   */
  const importDatabase = async (jsonData: string): Promise<boolean> => {
    const verification = BackupService.validateImportSchema(jsonData);
    if (!verification.valid || !verification.data) {
      alert(`خطأ في استيراد البيانات: ${verification.error}`);
      return false;
    }

    const importedData = normalizeDatabaseState(verification.data);
    dbEngine.hydrate(importedData);
    syncFromEngine(importedData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData));
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedData),
      });
      if (!response.ok) {
        logger.warn('AuthProvider', `Imported database is active locally; server sync returned ${response.status}.`);
      }
    } catch (error) {
      logger.warn('AuthProvider', 'Imported database is active locally; server sync is unavailable.', { error: String(error) });
    }
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
      announcements: mockAnnouncements,
      enrollments: mockEnrollments,
      installments: mockInstallments,
      payments: mockPayments,
      expenses: [],
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
      users, students, courses, groups, sessions, announcements,
      enrollments, installments, payments, expenses, attendance,
      progress, supplyItems, supplySales, portfolio, customDiplomas, settings,
      addStudentWithEnrollment, updateStudent, deleteStudent, createEnrollment, updateEnrollment, deleteEnrollment, addCoursePayment, reverseCoursePayment, addOperatingExpense,
      updateOperatingExpense, deleteOperatingExpense,
      recordStudentAttendance, deleteAttendance, processBarcodeScan,
      addSupplyItem, updateSupplyItem, deleteSupplyItem, updateSupplyStock, createSupplySale, voidSupplySale,
      createCourse, updateCourse, deleteCourse, createGroup, updateGroup, deleteGroup, createAnnouncement, updateAnnouncement, deleteAnnouncement,
      cancelSession, createMakeupSession, updateSession, deleteSession,
      updateStudentProgress, deleteStudentProgress, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, updatePortfolioStatus,
      addUser, updateUser, deleteUser,
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
