'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User, Student, Course, Group, Session, Enrollment, Payment, Installment,
  Attendance, Progress, SupplyItem, SupplySale,
  mockUsers, mockStudents, mockCourses, mockGroups, mockSessions,
  mockEnrollments, mockInstallments, mockPayments, mockAttendance, mockProgress,
  mockSupplyItems, mockSupplySales
} from './mockData';

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
  
  // Data State
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
  settings: AcademySettings;
  
  // Actions
  addStudentWithEnrollment: (params: {
    name: string;
    birthDate: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail?: string;
    groupId?: string;
    totalAmount?: number;
    initialPayment?: number;
    paymentMethod?: Payment['method'];
    level?: string;
    healthNotes?: string;
    publishConsent?: boolean;
  }) => { student: Student; enrollment?: Enrollment; payment?: Payment };

  addCoursePayment: (params: {
    enrollmentId: string;
    amount: number;
    method: Payment['method'];
    notes?: string;
  }) => Payment;

  recordStudentAttendance: (params: {
    studentId: string;
    sessionId: string;
    status: 'present' | 'absent' | 'late';
    lessonTopic?: string;
  }) => Attendance;

  processBarcodeScan: (barcode: string, sessionId: string) => {
    success: boolean;
    student?: Student;
    attendance?: Attendance;
    enrollment?: Enrollment;
    isOverdue?: boolean;
    remainingBalance?: number;
    message: string;
  };

  addSupplyItem: (item: Omit<SupplyItem, 'id'>) => SupplyItem;
  updateSupplyStock: (id: string, deltaQty: number) => void;
  
  createSupplySale: (params: {
    customerType: 'student' | 'walkin';
    customerName: string;
    customerId?: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: Payment['method'];
    notes?: string;
  }) => SupplySale;

  updateSettings: (newSettings: Partial<AcademySettings>) => void;
  exportDatabase: () => void;
  importDatabase: (jsonData: string) => boolean;
  resetDatabase: () => void;
}

const MarsamContext = createContext<MarsamContextType | null>(null);

const STORAGE_KEY = 'marsam_erp_db_v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers[0]);
  
  // Core Data
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
  const [settings, setSettings] = useState<AcademySettings>({
    name: 'مرسم الإبداع للفنون التشكيلية',
    phone: '01012345678',
    address: 'القاهرة — مصر الجديدة — شارع النزهة',
    contractTerms: `بنود التعاقد مع مرسم الإبداع:
١. يلتزم الطالب بمواعيد الحصص المحددة، وأي تأخير يتجاوز 15 دقيقة يحتسب تأخيراً.
٢. في حال الغياب بعذر مسبق، يتم التنسيق لحصة تعويضية حسب السعة المتاحة.
٣. سياسة الاسترداد: استرداد كامل قبل بدء أول حصة بـ 3 أيام، و50% بعد الحصة الأولى، ولا استرداد بعد ذلك.
٤. الرسوم تُدفع وفق جدول الأقساط المتفق عليه مع إدارة المرسم.
٥. المرسم مسؤول عن توفير بيئة تعليمية آمنة وأدوات تدريب مطابقة للمعايير الفنية.`
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.courses) setCourses(parsed.courses);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.enrollments) setEnrollments(parsed.enrollments);
        if (parsed.installments) setInstallments(parsed.installments);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.progress) setProgress(parsed.progress);
        if (parsed.supplyItems) setSupplyItems(parsed.supplyItems);
        if (parsed.supplySales) setSupplySales(parsed.supplySales);
        if (parsed.settings) setSettings(parsed.settings);
      }
    } catch (e) {
      console.error('Failed to load marsam database from localStorage', e);
    }
    setIsHydrated(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const data = {
        users, students, courses, groups, sessions,
        enrollments, installments, payments, attendance,
        progress, supplyItems, supplySales, settings
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save marsam database', e);
    }
  }, [
    isHydrated, users, students, courses, groups, sessions,
    enrollments, installments, payments, attendance,
    progress, supplyItems, supplySales, settings
  ]);

  const login = (role: 'admin' | 'supervisor' | 'guardian') => {
    const user = users.find(u => u.role === role) || users[0];
    setCurrentUser(user);
  };

  const logout = () => setCurrentUser(null);

  // ACTION: Add Student with immediate enrollment & contract
  const addStudentWithEnrollment = (params: {
    name: string;
    birthDate: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail?: string;
    groupId?: string;
    totalAmount?: number;
    initialPayment?: number;
    paymentMethod?: Payment['method'];
    level?: string;
    healthNotes?: string;
    publishConsent?: boolean;
  }) => {
    // 1. Guardian
    let guardian = users.find(u => u.phone === params.guardianPhone);
    if (!guardian) {
      guardian = {
        id: 'u_' + Date.now(),
        name: params.guardianName,
        phone: params.guardianPhone,
        email: params.guardianEmail || `guardian_${Date.now()}@marsam.com`,
        role: 'guardian'
      };
      setUsers(prev => [...prev, guardian!]);
    }

    // 2. Student
    const studentSeq = students.length + 1;
    const barcodeCode = `STU-2026-${String(studentSeq).padStart(4, '0')}`;
    const newStudent: Student = {
      id: 's_' + Date.now(),
      name: params.name,
      birthDate: params.birthDate,
      guardianId: guardian.id,
      qrToken: barcodeCode,
      healthNotes: params.healthNotes,
      publishConsent: params.publishConsent ?? true,
      level: params.level || 'مبتدئ'
    };

    setStudents(prev => [newStudent, ...prev]);

    let newEnrollment: Enrollment | undefined;
    let newPayment: Payment | undefined;

    // 3. Enrollment if group selected
    if (params.groupId) {
      const totalAmount = params.totalAmount || 1200;
      const initialPaid = params.initialPayment || 0;
      const remaining = totalAmount - initialPaid;
      const paymentStatus = remaining <= 0 ? 'completed' : (initialPaid > 0 ? 'partial' : 'unpaid');

      newEnrollment = {
        id: 'e_' + Date.now(),
        studentId: newStudent.id,
        groupId: params.groupId,
        enrollDate: new Date().toISOString().split('T')[0],
        contractSigned: true,
        contractVersion: 'v2.0',
        paymentStatus,
        totalPaid: initialPaid,
        totalAmount
      };

      setEnrollments(prev => [newEnrollment!, ...prev]);

      // Installments
      if (remaining > 0) {
        const inst1: Installment = {
          id: 'inst_' + Date.now() + '_1',
          enrollmentId: newEnrollment.id,
          amount: Math.round(remaining / 2),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'pending'
        };
        const inst2: Installment = {
          id: 'inst_' + Date.now() + '_2',
          enrollmentId: newEnrollment.id,
          amount: remaining - Math.round(remaining / 2),
          dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          status: 'pending'
        };
        setInstallments(prev => [...prev, inst1, inst2]);
      }

      // Initial Payment
      if (initialPaid > 0) {
        const receiptNumber = `CRS-2026-${String(payments.length + 1).padStart(4, '0')}`;
        newPayment = {
          id: 'pay_' + Date.now(),
          enrollmentId: newEnrollment.id,
          amount: initialPaid,
          method: params.paymentMethod || 'cash',
          receiptNumber,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          recordedBy: currentUser?.id || 'admin',
          status: 'valid',
          notes: 'دفعة تسجيل أولى عند التعاقد'
        };
        setPayments(prev => [newPayment!, ...prev]);
      }
    }

    return { student: newStudent, enrollment: newEnrollment, payment: newPayment };
  };

  // ACTION: Add Course Payment with receipt CRS-2026-XXXX
  const addCoursePayment = (params: {
    enrollmentId: string;
    amount: number;
    method: Payment['method'];
    notes?: string;
  }) => {
    const receiptNumber = `CRS-2026-${String(payments.length + 1).padStart(4, '0')}`;
    const newPayment: Payment = {
      id: 'pay_' + Date.now(),
      enrollmentId: params.enrollmentId,
      amount: params.amount,
      method: params.method,
      receiptNumber,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      recordedBy: currentUser?.id || 'admin',
      status: 'valid',
      notes: params.notes || 'سداد رسوم دراسية'
    };

    setPayments(prev => [newPayment, ...prev]);

    // Update enrollment totalPaid & status
    setEnrollments(prev => prev.map(e => {
      if (e.id === params.enrollmentId) {
        const newTotal = e.totalPaid + params.amount;
        const newStatus = newTotal >= e.totalAmount ? 'completed' : 'partial';
        return { ...e, totalPaid: newTotal, paymentStatus: newStatus };
      }
      return e;
    }));

    return newPayment;
  };

  // ACTION: Record Attendance
  const recordStudentAttendance = (params: {
    studentId: string;
    sessionId: string;
    status: 'present' | 'absent' | 'late';
    lessonTopic?: string;
  }) => {
    const timeNow = new Date().toTimeString().slice(0, 5);
    const existingIndex = attendance.findIndex(
      a => a.sessionId === params.sessionId && a.studentId === params.studentId
    );

    let updatedRec: Attendance;
    if (existingIndex >= 0) {
      updatedRec = { ...attendance[existingIndex], status: params.status };
      setAttendance(prev => {
        const copy = [...prev];
        copy[existingIndex] = updatedRec;
        return copy;
      });
    } else {
      updatedRec = {
        id: 'att_' + Date.now(),
        studentId: params.studentId,
        sessionId: params.sessionId,
        checkIn: timeNow,
        recordedBy: currentUser?.id || 'supervisor',
        status: params.status
      };
      setAttendance(prev => [updatedRec, ...prev]);
    }

    if (params.lessonTopic && params.status === 'present') {
      const newProgress: Progress = {
        id: 'prog_' + Date.now(),
        studentId: params.studentId,
        sessionId: params.sessionId,
        level: params.lessonTopic,
        rating: 5,
        notes: `حضر وأنجز درس: ${params.lessonTopic}`,
        recordedBy: currentUser?.id || 'supervisor',
        date: new Date().toISOString().split('T')[0]
      };
      setProgress(prev => [newProgress, ...prev]);
    }

    return updatedRec;
  };

  // ACTION: Barcode Scanner Attendance (USB Scanner or Webcam)
  const processBarcodeScan = (barcode: string, sessionId: string) => {
    const clean = barcode.trim().toUpperCase();
    const student = students.find(s => s.qrToken.toUpperCase() === clean || s.id.toUpperCase() === clean);

    if (!student) {
      return { success: false, message: 'كود الطالب غير موجود بالنظام' };
    }

    // Check enrollment & overdue
    const enrollment = enrollments.find(e => e.studentId === student.id);
    const remainingBalance = enrollment ? Math.max(0, enrollment.totalAmount - enrollment.totalPaid) : 0;
    const isOverdue = enrollment?.paymentStatus === 'overdue' || (remainingBalance > 0 && enrollment?.paymentStatus === 'unpaid');

    const att = recordStudentAttendance({
      studentId: student.id,
      sessionId,
      status: 'present'
    });

    return {
      success: true,
      student,
      attendance: att,
      enrollment,
      isOverdue,
      remainingBalance,
      message: `تم تسجيل حضور: ${student.name}`
    };
  };

  // ACTION: Supplies Management
  const addSupplyItem = (item: Omit<SupplyItem, 'id'>) => {
    const newItem: SupplyItem = {
      ...item,
      id: 'sup_' + Date.now(),
      barcode: item.barcode || `TOOL-${Math.floor(100000 + Math.random() * 900000)}`
    };
    setSupplyItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateSupplyStock = (id: string, deltaQty: number) => {
    setSupplyItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, stockQty: Math.max(0, item.stockQty + deltaQty) };
      }
      return item;
    }));
  };

  // ACTION: Create Supply Sale with receipt SHP-2026-XXXX & financial separation
  const createSupplySale = (params: {
    customerType: 'student' | 'walkin';
    customerName: string;
    customerId?: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: Payment['method'];
    notes?: string;
  }) => {
    const saleItems = params.items.map(cartItem => {
      const product = supplyItems.find(p => p.id === cartItem.productId);
      const unitPrice = product?.sellPrice || 0;
      const costPrice = product?.costPrice || 0;
      return {
        productId: cartItem.productId,
        productName: product?.name || 'أداة فنية',
        quantity: cartItem.quantity,
        unitPrice,
        costPrice,
        total: unitPrice * cartItem.quantity
      };
    });

    const totalAmount = saleItems.reduce((acc, it) => acc + it.total, 0);
    const totalCost = saleItems.reduce((acc, it) => acc + (it.costPrice * it.quantity), 0);
    const profit = totalAmount - totalCost;

    const invoiceNumber = `SHP-2026-${String(supplySales.length + 1).padStart(4, '0')}`;

    const newSale: SupplySale = {
      id: 'sale_' + Date.now(),
      invoiceNumber,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      customerType: params.customerType,
      customerName: params.customerName,
      customerId: params.customerId,
      items: saleItems,
      totalAmount,
      totalCost,
      profit,
      paymentMethod: params.paymentMethod,
      notes: params.notes
    };

    // Deduct stock
    setSupplyItems(prev => prev.map(p => {
      const sold = params.items.find(i => i.productId === p.id);
      if (sold) {
        return { ...p, stockQty: Math.max(0, p.stockQty - sold.quantity) };
      }
      return p;
    }));

    setSupplySales(prev => [newSale, ...prev]);
    return newSale;
  };

  const updateSettings = (newSettings: Partial<AcademySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const exportDatabase = () => {
    const data = {
      users, students, courses, groups, sessions,
      enrollments, installments, payments, attendance,
      progress, supplyItems, supplySales, settings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marsam_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.students && parsed.courses) {
        if (parsed.users) setUsers(parsed.users);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.courses) setCourses(parsed.courses);
        if (parsed.groups) setGroups(parsed.groups);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.enrollments) setEnrollments(parsed.enrollments);
        if (parsed.installments) setInstallments(parsed.installments);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.progress) setProgress(parsed.progress);
        if (parsed.supplyItems) setSupplyItems(parsed.supplyItems);
        if (parsed.supplySales) setSupplySales(parsed.supplySales);
        if (parsed.settings) setSettings(parsed.settings);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetDatabase = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <MarsamContext.Provider value={{
      currentUser, login, logout,
      users, students, courses, groups, sessions,
      enrollments, installments, payments, attendance,
      progress, supplyItems, supplySales, settings,
      addStudentWithEnrollment, addCoursePayment,
      recordStudentAttendance, processBarcodeScan,
      addSupplyItem, updateSupplyStock, createSupplySale,
      updateSettings, exportDatabase, importDatabase, resetDatabase
    }}>
      {children}
    </MarsamContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(MarsamContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useMarsam() {
  const ctx = useContext(MarsamContext);
  if (!ctx) throw new Error('useMarsam must be used within AuthProvider');
  return ctx;
}
