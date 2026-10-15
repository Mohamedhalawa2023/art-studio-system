const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data_store.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initial Seed Data for the Art Studio (2 Branches)
const INITIAL_DATA = {
  branches: [
    {
      id: 'branch-1',
      name: 'فرع المعادي (المقر الرئيسي)',
      city: 'القاهرة',
      address: 'شارع 9، ميدان محطة المعادي، مبنى الفنون، الدور الثاني',
      phone: '01012345678',
      email: 'maadi@atelier-art.com',
      manager: 'الفنان حسام النجار (المؤسس)',
      rooms: 3,
      maxCapacity: 40,
      active: true,
      color: 'indigo'
    },
    {
      id: 'branch-2',
      name: 'فرع الشيخ زايد',
      city: 'الجيزة',
      address: 'الحي الدبلوماسي، بجوار مول أركان، فيلا الفنون 14',
      phone: '01098765432',
      email: 'zayed@atelier-art.com',
      manager: 'م/ نورا الألفي (مدير الفرع)',
      rooms: 2,
      maxCapacity: 30,
      active: true,
      color: 'amber'
    }
  ],
  courses: [
    {
      id: 'course-1',
      title: 'دورة الرسم الزيتي الاحترافية (Oil Painting Mastery)',
      category: 'رسم زيتي',
      level: 'متوسط إلى متقدم',
      duration: '8 أسابيع (16 حصة)',
      totalHours: 40,
      price: 3200,
      branches: ['branch-1', 'branch-2'],
      instructor: 'الفنان حسام النجار',
      description: 'تعلم تقنيات مزج الألوان الزيتية الكلاسيكية، بناء طبقات الإمباستو (Impasto)، والضوء والظل في اللوحات الواقعية والمناظر الطبيعية.',
      image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop',
      includesMaterials: true,
      featured: true
    },
    {
      id: 'course-2',
      title: 'أساسيات البورتريه وتشريح الوجه بالفحم والرصاص',
      category: 'بورتريه وفحم',
      level: 'مبتدئ إلى متوسط',
      duration: '6 أسابيع (12 حصة)',
      totalHours: 30,
      price: 2400,
      branches: ['branch-1', 'branch-2'],
      instructor: 'أ/ كريم طارق',
      description: 'دراسة النسب الذهبية لملامح الوجه البشري، تشريح الجمجمة والعضلات، وتقنيات التظليل بالفحم النباتي والإسفنج للحصول على واقعية مذهلة.',
      image: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=600&auto=format&fit=crop',
      includesMaterials: true,
      featured: true
    },
    {
      id: 'course-3',
      title: 'سحر الألوان المائية والمناظر الحية (Watercolor Flow)',
      category: 'ألوان مائية',
      level: 'جميع المستويات',
      duration: '4 أسابيع (8 حصص)',
      totalHours: 20,
      price: 1800,
      branches: ['branch-1'],
      instructor: 'أ/ نادين خيري',
      description: 'استكشاف التحكم في انسياب الماء والصبغات الشفافة، تقنية الرطب على رطب (Wet-on-wet)، والتقاط شفافية الضوء في المناظر الطبيعية والمعمارية.',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop',
      includesMaterials: false,
      featured: false
    },
    {
      id: 'course-4',
      title: 'أكاديمية المبدعين الصغار (رسم وإبداع للأطفال)',
      category: 'أطفال ويافعين',
      level: 'أطفال (من 7 إلى 14 سنة)',
      duration: '6 أسابيع (12 حصة)',
      totalHours: 24,
      price: 1600,
      branches: ['branch-1', 'branch-2'],
      instructor: 'أ/ نورا الألفي',
      description: 'منهج ممتع وتأسيسي لاكتشاف مواهب الأطفال، تعليم تناسق الألوان، الرسم بألوان الباستيل والأكريليك، وتنمية التفكير الإبداعي والثقة بالنفس.',
      image: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=600&auto=format&fit=crop',
      includesMaterials: true,
      featured: true
    },
    {
      id: 'course-5',
      title: 'الرسم الرقمي وتصميم الشخصيات (Digital Art & Concept)',
      category: 'رسم رقمي',
      level: 'متوسط إلى متقدم',
      duration: '6 أسابيع (12 حصة)',
      totalHours: 30,
      price: 2800,
      branches: ['branch-2'],
      instructor: 'م/ طارق سليم',
      description: 'التدريب على أجهزة التابلت وبرامج Photoshop وProcreate، بناء الفرش الرقمية، رسم الشخصيات الكرتونية وتوزيع الإضاءة الرقمية الاحترافية.',
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&auto=format&fit=crop',
      includesMaterials: false,
      featured: false
    }
  ],
  schedules: [
    {
      id: 'sch-1',
      courseId: 'course-1',
      branchId: 'branch-1',
      groupName: 'مجموعة النخبة - سبت وثلاثاء (مسائي)',
      days: 'السبت والثلاثاء',
      time: '05:00 م - 07:30 م',
      room: 'قاعة اللوحات الكبرى (أ)',
      instructor: 'الفنان حسام النجار',
      maxSeats: 10,
      startDate: '2026-10-18',
      status: 'نشط'
    },
    {
      id: 'sch-2',
      courseId: 'course-1',
      branchId: 'branch-2',
      groupName: 'مجموعة زايد الزيتية - أحد وأربعاء',
      days: 'الأحد والأربعاء',
      time: '06:00 م - 08:30 م',
      room: 'استوديو النور (قاعة 1)',
      instructor: 'الفنان حسام النجار',
      maxSeats: 10,
      startDate: '2026-10-19',
      status: 'نشط'
    },
    {
      id: 'sch-3',
      courseId: 'course-2',
      branchId: 'branch-1',
      groupName: 'مجموعة البورتريه - جمعة وسبت',
      days: 'الجمعة والسبت',
      time: '02:00 م - 04:30 م',
      room: 'قاعة البورتريه والضوء (ب)',
      instructor: 'أ/ كريم طارق',
      maxSeats: 12,
      startDate: '2026-10-23',
      status: 'نشط'
    },
    {
      id: 'sch-4',
      courseId: 'course-3',
      branchId: 'branch-1',
      groupName: 'مجموعة الألوان المائية - إثنين وخميس',
      days: 'الإثنين والخميس',
      time: '04:00 م - 06:30 م',
      room: 'قاعة الألوان المائية (ج)',
      instructor: 'أ/ نادين خيري',
      maxSeats: 8,
      startDate: '2026-10-26',
      status: 'نشط'
    },
    {
      id: 'sch-5',
      courseId: 'course-4',
      branchId: 'branch-2',
      groupName: 'ورشة الفنانين الصغار - صباح الجمعة',
      days: 'الجمعة أسبوعياً',
      time: '10:00 ص - 01:30 م',
      room: 'قاعة الإبداع للأطفال',
      instructor: 'أ/ نورا الألفي',
      maxSeats: 12,
      startDate: '2026-10-24',
      status: 'نشط'
    },
    {
      id: 'sch-6',
      courseId: 'course-5',
      branchId: 'branch-2',
      groupName: 'مجموعة الرسم الرقمي - سبت وثلاثاء',
      days: 'السبت والثلاثاء',
      time: '06:00 م - 08:30 م',
      room: 'معمل الجرافيك والتابلت',
      instructor: 'م/ طارق سليم',
      maxSeats: 8,
      startDate: '2026-10-27',
      status: 'نشط'
    }
  ],
  students: [
    {
      id: 'std-1',
      name: 'أحمد محمود رضوان',
      phone: '01122334455',
      email: 'ahmed.radwan@example.com',
      age: 26,
      branchId: 'branch-1',
      notes: 'شغوف بالرسم الزيتي وله تجارب سابقة في المناظر الطبيعية',
      registeredAt: '2026-10-01'
    },
    {
      id: 'std-2',
      name: 'سارة خالد الديب',
      phone: '01055667788',
      email: 'sara.eldeeb@example.com',
      age: 21,
      branchId: 'branch-1',
      notes: 'طالبة في فنون جميلة ترغب بالتركيز على التظليل بالفحم',
      registeredAt: '2026-10-03'
    },
    {
      id: 'std-3',
      name: 'ياسين عمر الجوهري',
      phone: '01233445566',
      email: 'omar.parent@example.com',
      age: 10,
      branchId: 'branch-2',
      notes: 'موهوب بالرسم، مسجل برعاية والده د/ عمر الجوهري',
      registeredAt: '2026-10-05'
    },
    {
      id: 'std-4',
      name: 'مريم عادل الشافعي',
      phone: '01099887766',
      email: 'mariam.adel@example.com',
      age: 24,
      branchId: 'branch-2',
      notes: 'مهتمة بالرسم الرقمي والمؤثرات البصرية وتصميم الشخصيات',
      registeredAt: '2026-10-06'
    },
    {
      id: 'std-5',
      name: 'عمر شريف الدسوقي',
      phone: '01011229988',
      email: 'omar.sherif@example.com',
      age: 29,
      branchId: 'branch-1',
      notes: 'يحب تجربة الألوان المائية والمناظر الريفية',
      registeredAt: '2026-10-08'
    }
  ],
  enrollments: [
    {
      id: 'enr-1',
      receiptNumber: 'REC-2026-001',
      studentId: 'std-1',
      courseId: 'course-1',
      scheduleId: 'sch-1',
      branchId: 'branch-1',
      totalFee: 3200,
      paidAmount: 3200,
      remainingAmount: 0,
      paymentMethod: 'انستاباي (InstaPay)',
      paymentStatus: 'مدفوع بالكامل',
      status: 'مؤكد',
      enrollmentDate: '2026-10-02',
      notes: 'تم استلام حقيبة الألوان الزيتية والكانفاس'
    },
    {
      id: 'enr-2',
      receiptNumber: 'REC-2026-002',
      studentId: 'std-2',
      courseId: 'course-2',
      scheduleId: 'sch-3',
      branchId: 'branch-1',
      totalFee: 2400,
      paidAmount: 1500,
      remainingAmount: 900,
      paymentMethod: 'نقدي (كاش)',
      paymentStatus: 'مدفوع جزء',
      status: 'مؤكد',
      enrollmentDate: '2026-10-04',
      notes: 'المتبقي 900 ج يُسدد في الحصة الثانية'
    },
    {
      id: 'enr-3',
      receiptNumber: 'REC-2026-003',
      studentId: 'std-3',
      courseId: 'course-4',
      scheduleId: 'sch-5',
      branchId: 'branch-2',
      totalFee: 1600,
      paidAmount: 1600,
      remainingAmount: 0,
      paymentMethod: 'فودافون كاش',
      paymentStatus: 'مدفوع بالكامل',
      status: 'مؤكد',
      enrollmentDate: '2026-10-06',
      notes: 'تم تسليم أدوات كورس الأطفال'
    },
    {
      id: 'enr-4',
      receiptNumber: 'REC-2026-004',
      studentId: 'std-4',
      courseId: 'course-5',
      scheduleId: 'sch-6',
      branchId: 'branch-2',
      totalFee: 2800,
      paidAmount: 1000,
      remainingAmount: 1800,
      paymentMethod: 'انستاباي (InstaPay)',
      paymentStatus: 'مدفوع جزء',
      status: 'مؤكد',
      enrollmentDate: '2026-10-07',
      notes: 'المتبقي 1800 ج'
    },
    {
      id: 'enr-5',
      receiptNumber: 'REC-2026-005',
      studentId: 'std-5',
      courseId: 'course-3',
      scheduleId: 'sch-4',
      branchId: 'branch-1',
      totalFee: 1800,
      paidAmount: 1800,
      remainingAmount: 0,
      paymentMethod: 'فيزا / بطاقة بنكية',
      paymentStatus: 'مدفوع بالكامل',
      status: 'مؤكد',
      enrollmentDate: '2026-10-08',
      notes: 'تم الدفع بالكامل'
    }
  ],
  attendance: [
    {
      id: 'att-1',
      scheduleId: 'sch-1',
      branchId: 'branch-1',
      sessionDate: '2026-10-10',
      sessionTopic: 'مقدمة في نظرية الألوان وإعداد أرضية الكانفاس',
      records: [
        { studentId: 'std-1', status: 'حاضر', time: '05:05 م', note: 'تفاعل ممتاز' }
      ]
    },
    {
      id: 'att-2',
      scheduleId: 'sch-3',
      branchId: 'branch-1',
      sessionDate: '2026-10-10',
      sessionTopic: 'توزيع خطوط الوجه وتحديد أبعاد العينين والأنف',
      records: [
        { studentId: 'std-2', status: 'حاضر', time: '02:00 م', note: 'التزام دقيق' }
      ]
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      branchId: 'branch-1',
      title: 'شراء كراتين ألوان زيتية وبالتات خشبية',
      amount: 1450,
      category: 'خامات ومواد للطلاب',
      date: '2026-10-03',
      recordedBy: 'أ/ سامح الشريف',
      notes: 'شراء بالجملة من مكتبة الفنانين بالمعادي'
    },
    {
      id: 'exp-2',
      branchId: 'branch-2',
      title: 'صيانة وتحديث إضاءة استوديو الرسم (كشافات ليد دافئة)',
      amount: 850,
      category: 'صيانة وتجهيزات',
      date: '2026-10-05',
      recordedBy: 'م/ نورا الألفي',
      notes: 'لضبط الإضاءة الموجهة للبورتريه'
    },
    {
      id: 'exp-3',
      branchId: 'branch-1',
      title: 'ضيافة ومشروبات لرواد ورش نهاية الأسبوع',
      amount: 320,
      category: 'ضيافة واستقبال',
      date: '2026-10-07',
      recordedBy: 'أ/ سامح الشريف',
      notes: 'شاي وقهوة ومياه معدنية'
    }
  ],
  art_gallery: [
    {
      id: 'art-1',
      title: 'همسات النيل وقت الغسق',
      medium: 'ألوان زيتية على قماش كانفاس إيطالي',
      dimensions: '100 × 80 سم',
      year: 2026,
      price: 12500,
      status: 'متاحة للبيع',
      branchId: 'branch-1',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=700&auto=format&fit=crop',
      description: 'لوحة انطباعية تصور تدرج ألوان شمس الغروب الدافئة مع مراكب الصيد النيلية وانعكاسات الأمواج الهادئة.'
    },
    {
      id: 'art-2',
      title: 'بورتريه شيخ الصاغة (روح المعز)',
      medium: 'فحم نباتي مضغوط ورصاص على ورق كانسون',
      dimensions: '70 × 50 سم',
      year: 2025,
      price: 6800,
      status: 'مباعة',
      branchId: 'branch-1',
      image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=700&auto=format&fit=crop',
      description: 'دراسة تعبيرية تركز على تجاعيد الزمن ونظرة الأمل في عيني حرفي مصري عتيق في شارع المعز.'
    },
    {
      id: 'art-3',
      title: 'رقصة النخيل في واحة سيوة',
      medium: 'ألوان مائية وسكين رسم على ورق قطني 300 جم',
      dimensions: '60 × 40 سم',
      year: 2026,
      price: 4900,
      status: 'متاحة للبيع',
      branchId: 'branch-2',
      image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=700&auto=format&fit=crop',
      description: 'مزيج حيوي بين ضربات الرياح وسكون الطبيعة الصحراوية بألوان رملية وفيروزية جذابة.'
    },
    {
      id: 'art-4',
      title: 'تناغم الصوفية والمولوية',
      medium: 'مكسد ميديا (أكريليك وزيت وورق ذهب)',
      dimensions: '120 × 90 سم',
      year: 2026,
      price: 15000,
      status: 'متاحة للبيع',
      branchId: 'branch-2',
      image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=700&auto=format&fit=crop',
      description: 'حركة دائرية مستوحاة من رقصة التنورة التراثية مع لمسات من ورق الذهب الخالص.'
    }
  ]
};

class Database {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
        this.save();
      }
    } catch (err) {
      console.error('Error reading database file, using initial data:', err);
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(this.data, null, 2), 'utf8');
    return backupFile;
  }

  // Generic helpers
  getAll(collection) {
    return this.data[collection] || [];
  }

  getById(collection, id) {
    const list = this.getAll(collection);
    return list.find(item => item.id === id) || null;
  }

  create(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    const newItem = {
      id: `${collection.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...item
    };
    this.data[collection].push(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    const list = this.getAll(collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    this.save();
    return list[index];
  }

  delete(collection, id) {
    const list = this.getAll(collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.save();
    return true;
  }

  getSettings() {
    if (!this.data.settings) {
      this.data.settings = {
        academyName: "أكاديمية ومرسم الفنون التشكيلية",
        academySubtitle: "نظام إدارة الكورسات والورش والمعارض الفنية",
        ownerName: "الفنان التشكيلي",
        currency: "ج.م",
        primaryPhone: "01012345678",
        primaryEmail: "contact@art-academy.com",
        aboutText: "منصة فنية وتعليمية متخصصة لتقديم أرقى الورش التشكيلية والمعارض الفنية للطلاب والهواة والمحترفين.",
        address: "المقر الرئيسي",
        badgeText: "خدمة سحابية SaaS"
      };
      this.save();
    }
    return this.data.settings;
  }

  updateSettings(updates) {
    const current = this.getSettings();
    this.data.settings = { ...current, ...updates };
    this.save();
    return this.data.settings;
  }

  // Custom queries & analytics
  getStats(branchId = null) {
    const branches = this.getAll('branches');
    const courses = this.getAll('courses');
    const schedules = this.getAll('schedules');
    const students = this.getAll('students');
    const enrollments = this.getAll('enrollments');
    const expenses = this.getAll('expenses');
    const gallery = this.getAll('art_gallery');

    const filterByBranch = (list) => {
      if (!branchId || branchId === 'all') return list;
      return list.filter(item => {
        if (item.branchId) return item.branchId === branchId;
        if (item.branches && Array.isArray(item.branches)) return item.branches.includes(branchId);
        return true;
      });
    };

    const branchEnrollments = filterByBranch(enrollments);
    const branchExpenses = filterByBranch(expenses);
    const branchStudents = branchId && branchId !== 'all' 
      ? students.filter(s => s.branchId === branchId)
      : students;
    const branchSchedules = filterByBranch(schedules);

    const totalIncome = branchEnrollments.reduce((sum, e) => sum + (Number(e.paidAmount) || 0), 0);
    const totalPending = branchEnrollments.reduce((sum, e) => sum + (Number(e.remainingAmount) || 0), 0);
    const totalExpenses = branchExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Calculate seat capacities
    let totalMaxSeats = 0;
    let totalBookedSeats = 0;
    branchSchedules.forEach(sch => {
      const booked = branchEnrollments.filter(e => e.scheduleId === sch.id && e.status !== 'ملغي').length;
      totalMaxSeats += (sch.maxSeats || 10);
      totalBookedSeats += booked;
    });

    const occupancyRate = totalMaxSeats > 0 ? Math.round((totalBookedSeats / totalMaxSeats) * 100) : 0;

    return {
      branchesCount: branches.length,
      activeCoursesCount: courses.length,
      schedulesCount: branchSchedules.length,
      totalStudentsCount: branchStudents.length,
      totalEnrollmentsCount: branchEnrollments.length,
      totalIncome,
      totalPending,
      totalExpenses,
      netProfit,
      totalMaxSeats,
      totalBookedSeats,
      occupancyRate,
      galleryItemsCount: filterByBranch(gallery).length
    };
  }

  // Student schedule lookup
  getStudentEnrollments(phoneOrEmail) {
    const cleanQuery = phoneOrEmail.trim().toLowerCase();
    const students = this.getAll('students');
    const student = students.find(s => 
      (s.phone && s.phone.includes(cleanQuery)) || 
      (s.email && s.email.toLowerCase().includes(cleanQuery))
    );

    if (!student) return null;

    const enrollments = this.getAll('enrollments').filter(e => e.studentId === student.id);
    const courses = this.getAll('courses');
    const schedules = this.getAll('schedules');
    const branches = this.getAll('branches');

    const details = enrollments.map(enr => {
      const course = courses.find(c => c.id === enr.courseId) || {};
      const schedule = schedules.find(s => s.id === enr.scheduleId) || {};
      const branch = branches.find(b => b.id === enr.branchId) || {};
      return {
        ...enr,
        courseTitle: course.title,
        courseCategory: course.category,
        branchName: branch.name,
        branchAddress: branch.address,
        branchPhone: branch.phone,
        days: schedule.days,
        time: schedule.time,
        room: schedule.room,
        instructor: schedule.instructor || course.instructor
      };
    });

    return {
      student,
      enrollments: details
    };
  }
}

const db = new Database();
module.exports = db;
