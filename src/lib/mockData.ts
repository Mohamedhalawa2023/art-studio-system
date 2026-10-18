// Mock data for مرسم Management System

export type Role = 'admin' | 'supervisor' | 'guardian';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  birthDate: string;
  guardianId: string;
  qrToken: string;
  healthNotes?: string;
  publishConsent: boolean;
  level?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  price: number;
  sessionsCount: number;
  ageGroup: string;
  levels: string[];
  syllabus?: string[];
}

export interface Group {
  id: string;
  courseId: string;
  supervisorId: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'upcoming';
  room?: string;
}

export interface Session {
  id: string;
  groupId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'makeup' | 'completed';
}

export interface Enrollment {
  id: string;
  studentId: string;
  groupId: string;
  enrollDate: string;
  contractSigned: boolean;
  contractVersion: string;
  paymentStatus: 'unpaid' | 'partial' | 'completed' | 'overdue';
  totalPaid: number;
  totalAmount: number;
}

export interface Payment {
  id: string;
  enrollmentId: string;
  amount: number;
  method: 'cash' | 'transfer' | 'instapay' | 'vodafone' | 'card';
  receiptNumber: string;
  date: string;
  recordedBy: string;
  status: 'valid' | 'cancelled';
  notes?: string;
}

export interface Installment {
  id: string;
  enrollmentId: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  sessionId: string;
  checkIn?: string;
  checkOut?: string;
  recordedBy: string;
  status: 'present' | 'absent' | 'late';
}

export interface Progress {
  id: string;
  studentId: string;
  sessionId: string;
  level: string;
  rating: number;
  notes?: string;
  recordedBy: string;
  date: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image?: string;
  startDate: string;
  endDate: string;
  link?: string;
  type: 'announcement' | 'exhibition';
}


export interface SupplyItem {
  id: string;
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stockQty: number;
  minStock: number;
}

export interface SupplySaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  costPrice: number;
}

export interface SupplySale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerType: 'student' | 'walkin';
  customerName: string;
  customerId?: string;
  items: SupplySaleItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentMethod: 'cash' | 'transfer' | 'instapay' | 'vodafone' | 'card';
  notes?: string;
}

export interface PortfolioItem {
  id: string;
  supervisorId: string;
  title: string;
  description?: string;
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadDate: string;
}

// ========== MOCK DATA ==========

export const mockUsers: User[] = [
  { id: 'u1', name: 'أحمد محمد السيد', email: 'ahmed@marsam.com', phone: '01012345678', role: 'admin' },
  { id: 'u2', name: 'سارة علي', email: 'sara@marsam.com', phone: '01098765432', role: 'supervisor' },
  { id: 'u3', name: 'محمود حسن', email: 'mahmoud@marsam.com', phone: '01112233445', role: 'supervisor' },
  { id: 'u4', name: 'فاطمة خالد', email: 'fatma@marsam.com', phone: '01555667788', role: 'guardian' },
  { id: 'u5', name: 'عمر إبراهيم', email: 'omar@marsam.com', phone: '01099887766', role: 'guardian' },
  { id: 'u6', name: 'نور محمد', email: 'nour@marsam.com', phone: '01234567890', role: 'guardian' },
];

export const mockStudents: Student[] = [
  { id: 's1', name: 'يوسف خالد', birthDate: '2015-03-15', guardianId: 'u4', qrToken: 'QR_TOKEN_YOUSSEF_2024', publishConsent: true, level: 'المستوى الثاني' },
  { id: 's2', name: 'ليلى خالد', birthDate: '2017-07-22', guardianId: 'u4', qrToken: 'QR_TOKEN_LAYLA_2024', publishConsent: false, level: 'المستوى الأول' },
  { id: 's3', name: 'كريم عمر', birthDate: '2014-11-05', guardianId: 'u5', qrToken: 'QR_TOKEN_KARIM_2024', publishConsent: true, level: 'المستوى الثالث' },
  { id: 's4', name: 'مريم نور', birthDate: '2016-01-30', guardianId: 'u6', qrToken: 'QR_TOKEN_MARIAM_2024', publishConsent: true, level: 'المستوى الأول' },
  { id: 's5', name: 'آدم عمر', birthDate: '2013-09-18', guardianId: 'u5', qrToken: 'QR_TOKEN_ADAM_2024', publishConsent: true, level: 'المستوى الثاني' },
];

export const mockCourses: Course[] = [
  {
    id: 'c1',
    name: 'أساسيات الرسم',
    description: 'كورس شامل لتعلم أساسيات الرسم من الصفر مع التركيز على الخطوط والأشكال',
    price: 1200,
    sessionsCount: 16,
    ageGroup: '6-12 سنة',
    levels: ['المستوى الأول - الخطوط', 'المستوى الثاني - الأشكال', 'المستوى الثالث - الظل والنور'],
  },
  {
    id: 'c2',
    name: 'الألوان المائية',
    description: 'تعلم فن الألوان المائية وتقنياتها المختلفة من المزج والتدرج',
    price: 1500,
    sessionsCount: 20,
    ageGroup: '8-15 سنة',
    levels: ['مبتدئ', 'متوسط', 'متقدم'],
  },
  {
    id: 'c3',
    name: 'الخط العربي',
    description: 'دراسة الخط العربي بأساليبه المختلفة: النسخ، الثلث، الديواني',
    price: 1000,
    sessionsCount: 12,
    ageGroup: '10+ سنة',
    levels: ['خط النسخ', 'خط الثلث', 'خط الديواني'],
  },
  {
    id: 'c4',
    name: 'الرسم الرقمي',
    description: 'مقدمة في الرسم الرقمي باستخدام التابلت وبرامج التصميم',
    price: 1800,
    sessionsCount: 24,
    ageGroup: '12+ سنة',
    levels: ['أدوات التابلت', 'التلوين الرقمي', 'مشاريع متكاملة'],
  },
];

export const mockGroups: Group[] = [
  { id: 'g1', courseId: 'c1', supervisorId: 'u2', schedule: 'السبت والاثنين 4-6 مساءً', capacity: 12, enrolled: 10, startDate: '2026-09-01', endDate: '2026-12-01', status: 'active', room: 'القاعة الأولى' },
  { id: 'g2', courseId: 'c1', supervisorId: 'u3', schedule: 'الأحد والثلاثاء 5-7 مساءً', capacity: 10, enrolled: 7, startDate: '2026-09-05', endDate: '2026-12-05', status: 'active', room: 'القاعة الثانية' },
  { id: 'g3', courseId: 'c2', supervisorId: 'u2', schedule: 'الجمعة 10 ص - 1 م', capacity: 8, enrolled: 8, startDate: '2026-09-06', endDate: '2026-12-20', status: 'active', room: 'القاعة الأولى' },
  { id: 'g4', courseId: 'c3', supervisorId: 'u3', schedule: 'الأربعاء 4-6 مساءً', capacity: 10, enrolled: 5, startDate: '2026-10-01', endDate: '2027-01-01', status: 'upcoming', room: 'القاعة الثانية' },
];

export const mockSessions: Session[] = [
  { id: 'ses1', groupId: 'g1', date: '2026-10-12', time: '16:00', status: 'scheduled' },
  { id: 'ses2', groupId: 'g1', date: '2026-10-14', time: '16:00', status: 'scheduled' },
  { id: 'ses3', groupId: 'g1', date: '2026-10-07', time: '16:00', status: 'completed' },
  { id: 'ses4', groupId: 'g2', date: '2026-10-12', time: '17:00', status: 'scheduled' },
  { id: 'ses5', groupId: 'g3', date: '2026-10-10', time: '10:00', status: 'completed' },
];

export const mockEnrollments: Enrollment[] = [
  { id: 'e1', studentId: 's1', groupId: 'g1', enrollDate: '2026-09-01', contractSigned: true, contractVersion: 'v2', paymentStatus: 'partial', totalPaid: 800, totalAmount: 1200 },
  { id: 'e2', studentId: 's2', groupId: 'g2', enrollDate: '2026-09-05', contractSigned: true, contractVersion: 'v2', paymentStatus: 'completed', totalPaid: 1200, totalAmount: 1200 },
  { id: 'e3', studentId: 's3', groupId: 'g1', enrollDate: '2026-09-01', contractSigned: true, contractVersion: 'v2', paymentStatus: 'overdue', totalPaid: 400, totalAmount: 1200 },
  { id: 'e4', studentId: 's4', groupId: 'g3', enrollDate: '2026-09-06', contractSigned: true, contractVersion: 'v2', paymentStatus: 'unpaid', totalPaid: 0, totalAmount: 1500 },
  { id: 'e5', studentId: 's5', groupId: 'g1', enrollDate: '2026-09-01', contractSigned: true, contractVersion: 'v2', paymentStatus: 'completed', totalPaid: 1200, totalAmount: 1200 },
];

export const mockInstallments: Installment[] = [
  { id: 'i1', enrollmentId: 'e1', amount: 400, dueDate: '2026-09-01', status: 'paid', paidDate: '2026-09-01' },
  { id: 'i2', enrollmentId: 'e1', amount: 400, dueDate: '2026-10-01', status: 'paid', paidDate: '2026-10-03' },
  { id: 'i3', enrollmentId: 'e1', amount: 400, dueDate: '2026-11-01', status: 'pending' },
  { id: 'i4', enrollmentId: 'e2', amount: 600, dueDate: '2026-09-05', status: 'paid', paidDate: '2026-09-05' },
  { id: 'i5', enrollmentId: 'e2', amount: 600, dueDate: '2026-10-05', status: 'paid', paidDate: '2026-10-04' },
  { id: 'i6', enrollmentId: 'e3', amount: 400, dueDate: '2026-09-01', status: 'paid', paidDate: '2026-09-02' },
  { id: 'i7', enrollmentId: 'e3', amount: 400, dueDate: '2026-10-01', status: 'overdue' },
  { id: 'i8', enrollmentId: 'e3', amount: 400, dueDate: '2026-11-01', status: 'overdue' },
];

export const mockPayments: Payment[] = [
  { id: 'p1', enrollmentId: 'e1', amount: 800, method: 'cash', receiptNumber: 'RCP-0001', date: '2026-09-01', recordedBy: 'u1', status: 'valid' },
  { id: 'p2', enrollmentId: 'e2', amount: 1200, method: 'instapay', receiptNumber: 'RCP-0002', date: '2026-09-05', recordedBy: 'u1', status: 'valid', notes: 'دفع كامل مقدمًا' },
  { id: 'p3', enrollmentId: 'e3', amount: 400, method: 'vodafone', receiptNumber: 'RCP-0003', date: '2026-09-02', recordedBy: 'u1', status: 'valid' },
  { id: 'p4', enrollmentId: 'e5', amount: 1200, method: 'transfer', receiptNumber: 'RCP-0004', date: '2026-09-01', recordedBy: 'u1', status: 'valid' },
];

export const mockAttendance: Attendance[] = [
  { id: 'a1', studentId: 's1', sessionId: 'ses3', checkIn: '16:05', checkOut: '17:55', recordedBy: 'u2', status: 'present' },
  { id: 'a2', studentId: 's3', sessionId: 'ses3', checkIn: '16:15', recordedBy: 'u2', status: 'late' },
  { id: 'a3', studentId: 's5', sessionId: 'ses3', recordedBy: 'u2', status: 'absent' },
  { id: 'a4', studentId: 's4', sessionId: 'ses5', checkIn: '10:02', checkOut: '12:55', recordedBy: 'u2', status: 'present' },
];

export const mockProgress: Progress[] = [
  { id: 'pr1', studentId: 's1', sessionId: 'ses3', level: 'المستوى الثاني - الأشكال', rating: 4, notes: 'تقدم ممتاز في رسم الأشكال الهندسية', recordedBy: 'u2', date: '2026-10-07' },
  { id: 'pr2', studentId: 's3', sessionId: 'ses3', level: 'المستوى الثالث - الظل والنور', rating: 5, notes: 'إتقان رائع لتقنيات الظل', recordedBy: 'u2', date: '2026-10-07' },
  { id: 'pr3', studentId: 's4', sessionId: 'ses5', level: 'مبتدئ', rating: 3, notes: 'يحتاج مزيدًا من التدريب على المزج', recordedBy: 'u2', date: '2026-10-10' },
];

export const mockAnnouncements: Announcement[] = [
  { id: 'an1', title: 'معرض نهاية العام 2026', content: 'يسعدنا دعوتكم لحضور معرض نهاية العام الذي سيضم أعمال طلابنا المميزين. الدخول مجاني للجميع!', startDate: '2026-10-01', endDate: '2026-12-31', type: 'exhibition' },
  { id: 'an2', title: 'تسجيل دورة الخط العربي', content: 'فُتح التسجيل في دورة الخط العربي الجديدة. الأماكن محدودة، سارع بالتسجيل!', startDate: '2026-10-05', endDate: '2026-10-25', type: 'announcement' },
  { id: 'an3', title: 'إجازة عيد الأضحى', content: 'يُعلَن بإجازة المرسم خلال أيام عيد الأضحى المبارك. عيد مبارك على الجميع 🎉', startDate: '2026-10-10', endDate: '2026-10-20', type: 'announcement' },
];

export const mockPortfolio: PortfolioItem[] = [
  { id: 'pf1', supervisorId: 'u2', title: 'لوحة الغروب', imageUrl: 'https://picsum.photos/seed/art1/400/300', status: 'approved', uploadDate: '2026-09-15', description: 'ألوان مائية على ورق قطن' },
  { id: 'pf2', supervisorId: 'u2', title: 'بورتريه تشكيلي', imageUrl: 'https://picsum.photos/seed/art2/400/300', status: 'approved', uploadDate: '2026-08-20', description: 'أكريلك على كانفاس' },
  { id: 'pf3', supervisorId: 'u3', title: 'خط الثلث', imageUrl: 'https://picsum.photos/seed/art3/400/300', status: 'approved', uploadDate: '2026-07-10', description: 'حبر على ورق مقوى' },
  { id: 'pf4', supervisorId: 'u3', title: 'لوحة تجريدية', imageUrl: 'https://picsum.photos/seed/art4/400/300', status: 'pending', uploadDate: '2026-10-11', description: 'زيت على كانفاس' },
];

// Helper lookups
export const getCourse = (id: string) => mockCourses.find(c => c.id === id);
export const getGroup = (id: string) => mockGroups.find(g => g.id === id);
export const getUser = (id: string) => mockUsers.find(u => u.id === id);
export const getStudent = (id: string) => mockStudents.find(s => s.id === id);
export const getEnrollmentsForStudent = (studentId: string) => mockEnrollments.filter(e => e.studentId === studentId);
export const getAttendanceForSession = (sessionId: string) => mockAttendance.filter(a => a.sessionId === sessionId);
export const getProgressForStudent = (studentId: string) => mockProgress.filter(p => p.studentId === studentId);
export const getInstallmentsForEnrollment = (enrollmentId: string) => mockInstallments.filter(i => i.enrollmentId === enrollmentId);


export const mockSupplyItems: SupplyItem[] = [
  { id: 'sup1', name: 'ألوان أكريليك ماركة كوتيك (12 لون)', barcode: '6221001', category: 'ألوان', costPrice: 180, sellPrice: 250, stockQty: 24, minStock: 5 },
  { id: 'sup2', name: 'طقم فرش رسم فنانين (10 فرش)', barcode: '6221002', category: 'فرش وأدوات', costPrice: 90, sellPrice: 140, stockQty: 18, minStock: 4 },
  { id: 'sup3', name: 'اسكتش كانسون 300 جرام A3', barcode: '6221003', category: 'ورق وسكتشات', costPrice: 110, sellPrice: 160, stockQty: 30, minStock: 6 },
  { id: 'sup4', name: 'باليتة ألوان خشبية مريحة', barcode: '6221004', category: 'فرش وأدوات', costPrice: 45, sellPrice: 80, stockQty: 15, minStock: 3 },
  { id: 'sup5', name: 'طقم أقلام فحم درجات مع ممسحة', barcode: '6221005', category: 'أقلام وفحم', costPrice: 60, sellPrice: 95, stockQty: 20, minStock: 5 },
  { id: 'sup6', name: 'كانفاس قماش مشدود 40x50 سم', barcode: '6221006', category: 'كانفاس ومجسمات', costPrice: 70, sellPrice: 115, stockQty: 12, minStock: 4 },
  { id: 'sup7', name: 'ألوان زيتية فنانين (طقم 18 لون)', barcode: '6221007', category: 'ألوان', costPrice: 320, sellPrice: 440, stockQty: 7, minStock: 3 },
  { id: 'sup8', name: 'طين أسواني طبيعي ناعم (3 كجم)', barcode: '6221008', category: 'نحت وصلصال', costPrice: 40, sellPrice: 70, stockQty: 14, minStock: 4 },
  { id: 'sup9', name: 'استاند رسم خشبي مكتبي', barcode: '6221009', category: 'فرش وأدوات', costPrice: 150, sellPrice: 220, stockQty: 4, minStock: 2 },
];

export const mockSupplySales: SupplySale[] = [
  {
    id: 'sale1',
    invoiceNumber: 'SHP-2026-0001',
    date: '2026-10-10 14:30',
    customerType: 'student',
    customerName: 'يوسف خالد',
    customerId: 's1',
    items: [
      { productId: 'sup1', productName: 'ألوان أكريليك ماركة كوتيك (12 لون)', quantity: 1, unitPrice: 250, total: 250, costPrice: 180 },
      { productId: 'sup3', productName: 'اسكتش كانسون 300 جرام A3', quantity: 1, unitPrice: 160, total: 160, costPrice: 110 }
    ],
    totalAmount: 410,
    totalCost: 290,
    profit: 120,
    paymentMethod: 'cash',
    notes: 'طالب مسجل بكورس الرسم'
  },
  {
    id: 'sale2',
    invoiceNumber: 'SHP-2026-0002',
    date: '2026-10-12 17:15',
    customerType: 'walkin',
    customerName: 'عميل زائر (أحمد شريف)',
    items: [
      { productId: 'sup6', productName: 'كانفاس قماش مشدود 40x50 سم', quantity: 2, unitPrice: 115, total: 230, costPrice: 70 },
      { productId: 'sup2', productName: 'طقم فرش رسم فنانين (10 فرش)', quantity: 1, unitPrice: 140, total: 140, costPrice: 90 }
    ],
    totalAmount: 370,
    totalCost: 230,
    profit: 140,
    paymentMethod: 'instapay'
  }
];
