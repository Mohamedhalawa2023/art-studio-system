const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= API ENDPOINTS ================= //

// 1. Analytics & Overview
app.get('/api/stats', (req, res) => {
  try {
    const branchId = req.query.branchId || null;
    const stats = db.getStats(branchId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Branches
app.get('/api/branches', (req, res) => {
  res.json({ success: true, data: db.getAll('branches') });
});

app.post('/api/branches', (req, res) => {
  const branch = db.create('branches', req.body);
  res.status(201).json({ success: true, data: branch });
});

app.put('/api/branches/:id', (req, res) => {
  const updated = db.update('branches', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Branch not found' });
  res.json({ success: true, data: updated });
});

app.delete('/api/branches/:id', (req, res) => {
  const deleted = db.delete('branches', req.params.id);
  res.json({ success: deleted });
});

// SaaS & Academy Settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: db.getSettings() });
});

app.put('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, data: updated });
});

// 3. Courses
app.get('/api/courses', (req, res) => {
  const branchId = req.query.branchId;
  let courses = db.getAll('courses');
  if (branchId && branchId !== 'all') {
    courses = courses.filter(c => c.branches && c.branches.includes(branchId));
  }
  res.json({ success: true, data: courses });
});

app.post('/api/courses', (req, res) => {
  const course = db.create('courses', req.body);
  res.status(201).json({ success: true, data: course });
});

app.put('/api/courses/:id', (req, res) => {
  const updated = db.update('courses', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Course not found' });
  res.json({ success: true, data: updated });
});

app.delete('/api/courses/:id', (req, res) => {
  const deleted = db.delete('courses', req.params.id);
  res.json({ success: deleted });
});

// 4. Schedules & Seat Management
app.get('/api/schedules', (req, res) => {
  const branchId = req.query.branchId;
  let schedules = db.getAll('schedules');
  const enrollments = db.getAll('enrollments');
  const courses = db.getAll('courses');
  const branches = db.getAll('branches');

  if (branchId && branchId !== 'all') {
    schedules = schedules.filter(s => s.branchId === branchId);
  }

  // Enrich with course details and booked count
  const enriched = schedules.map(sch => {
    const course = courses.find(c => c.id === sch.courseId) || {};
    const branch = branches.find(b => b.id === sch.branchId) || {};
    const bookedSeats = enrollments.filter(e => e.scheduleId === sch.id && e.status !== 'ملغي').length;
    const maxSeats = sch.maxSeats || 10;
    const remainingSeats = Math.max(0, maxSeats - bookedSeats);
    const occupancyPercent = Math.min(100, Math.round((bookedSeats / maxSeats) * 100));

    return {
      ...sch,
      courseTitle: course.title,
      courseCategory: course.category,
      coursePrice: course.price,
      branchName: branch.name,
      bookedSeats,
      remainingSeats,
      occupancyPercent
    };
  });

  res.json({ success: true, data: enriched });
});

app.post('/api/schedules', (req, res) => {
  const schedule = db.create('schedules', req.body);
  res.status(201).json({ success: true, data: schedule });
});

app.put('/api/schedules/:id', (req, res) => {
  const updated = db.update('schedules', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Schedule not found' });
  res.json({ success: true, data: updated });
});

app.delete('/api/schedules/:id', (req, res) => {
  const deleted = db.delete('schedules', req.params.id);
  res.json({ success: deleted });
});

// 5. Students
app.get('/api/students', (req, res) => {
  const branchId = req.query.branchId;
  let students = db.getAll('students');
  const branches = db.getAll('branches');
  const enrollments = db.getAll('enrollments');

  if (branchId && branchId !== 'all') {
    students = students.filter(s => s.branchId === branchId);
  }

  const enriched = students.map(s => {
    const branch = branches.find(b => b.id === s.branchId) || {};
    const studentEnrollments = enrollments.filter(e => e.studentId === s.id);
    return {
      ...s,
      branchName: branch.name,
      enrollmentsCount: studentEnrollments.length
    };
  });

  res.json({ success: true, data: enriched });
});

app.post('/api/students', (req, res) => {
  const student = db.create('students', {
    ...req.body,
    registeredAt: req.body.registeredAt || new Date().toISOString().slice(0, 10)
  });
  res.status(201).json({ success: true, data: student });
});

app.put('/api/students/:id', (req, res) => {
  const updated = db.update('students', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Student not found' });
  res.json({ success: true, data: updated });
});

app.delete('/api/students/:id', (req, res) => {
  const deleted = db.delete('students', req.params.id);
  res.json({ success: deleted });
});

// 6. Enrollments (Registrations & Fees)
app.get('/api/enrollments', (req, res) => {
  const branchId = req.query.branchId;
  let enrollments = db.getAll('enrollments');
  const students = db.getAll('students');
  const courses = db.getAll('courses');
  const schedules = db.getAll('schedules');
  const branches = db.getAll('branches');

  if (branchId && branchId !== 'all') {
    enrollments = enrollments.filter(e => e.branchId === branchId);
  }

  const enriched = enrollments.map(enr => {
    const student = students.find(s => s.id === enr.studentId) || {};
    const course = courses.find(c => c.id === enr.courseId) || {};
    const schedule = schedules.find(s => s.id === enr.scheduleId) || {};
    const branch = branches.find(b => b.id === enr.branchId) || {};

    return {
      ...enr,
      studentName: student.name,
      studentPhone: student.phone,
      studentEmail: student.email,
      courseTitle: course.title,
      courseCategory: course.category,
      branchName: branch.name,
      groupName: schedule.groupName || `${schedule.days || ''} (${schedule.time || ''})`,
      scheduleDays: schedule.days,
      scheduleTime: schedule.time,
      scheduleRoom: schedule.room
    };
  });

  res.json({ success: true, data: enriched });
});

app.post('/api/enrollments', (req, res) => {
  const { studentId, courseId, scheduleId, branchId, totalFee, paidAmount, paymentMethod, notes } = req.body;
  const paid = Number(paidAmount) || 0;
  const total = Number(totalFee) || 0;
  const remaining = Math.max(0, total - paid);

  let paymentStatus = 'غير مدفوع';
  if (paid >= total && total > 0) paymentStatus = 'مدفوع بالكامل';
  else if (paid > 0) paymentStatus = 'مدفوع جزء';

  const receiptNumber = `REC-${new Date().getFullYear()}-${String(db.getAll('enrollments').length + 1).padStart(3, '0')}`;

  const newEnrollment = db.create('enrollments', {
    receiptNumber,
    studentId,
    courseId,
    scheduleId,
    branchId,
    totalFee: total,
    paidAmount: paid,
    remainingAmount: remaining,
    paymentMethod: paymentMethod || 'نقدي (كاش)',
    paymentStatus,
    status: 'مؤكد',
    enrollmentDate: new Date().toISOString().slice(0, 10),
    notes: notes || ''
  });

  res.status(201).json({ success: true, data: newEnrollment });
});

app.put('/api/enrollments/:id', (req, res) => {
  const current = db.getById('enrollments', req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Enrollment not found' });

  const total = req.body.totalFee !== undefined ? Number(req.body.totalFee) : current.totalFee;
  const paid = req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : current.paidAmount;
  const remaining = Math.max(0, total - paid);

  let paymentStatus = current.paymentStatus;
  if (paid >= total && total > 0) paymentStatus = 'مدفوع بالكامل';
  else if (paid > 0) paymentStatus = 'مدفوع جزء';
  else paymentStatus = 'غير مدفوع';

  const updated = db.update('enrollments', req.params.id, {
    ...req.body,
    totalFee: total,
    paidAmount: paid,
    remainingAmount: remaining,
    paymentStatus
  });

  res.json({ success: true, data: updated });
});

app.delete('/api/enrollments/:id', (req, res) => {
  const deleted = db.delete('enrollments', req.params.id);
  res.json({ success: deleted });
});

// 7. Attendance
app.get('/api/attendance', (req, res) => {
  const { scheduleId, branchId } = req.query;
  let list = db.getAll('attendance');
  if (scheduleId) list = list.filter(a => a.scheduleId === scheduleId);
  if (branchId && branchId !== 'all') list = list.filter(a => a.branchId === branchId);
  res.json({ success: true, data: list });
});

app.post('/api/attendance', (req, res) => {
  const record = db.create('attendance', req.body);
  res.status(201).json({ success: true, data: record });
});

// 7.1 Instant QR Code Attendance Scan Endpoint
app.post('/api/attendance/scan-qr', async (req, res) => {
  try {
    const { qrData, scheduleId, sessionDate } = req.body;
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'بيانات كود QR مفقودة' });
    }

    let raw = String(qrData).trim();
    let studentId = raw;
    if (raw.startsWith('ATELIER-STUDENT:')) {
      studentId = raw.replace('ATELIER-STUDENT:', '').trim();
    } else if (raw.startsWith('STD:')) {
      studentId = raw.replace('STD:', '').trim();
    } else if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        studentId = parsed.studentId || parsed.id || raw;
      } catch (e) {}
    }

    // Find student
    const students = db.getAll('students');
    let student = students.find(s => s.id === studentId || s.phone === studentId);
    if (!student) {
      student = students.find(s => s.phone && s.phone.replace(/\D/g, '') === studentId.replace(/\D/g, ''));
    }

    if (!student) {
      return res.status(404).json({ success: false, message: `لم يتم العثور على طالب مسجل بالكود: ${studentId}` });
    }

    // Find enrolled schedules
    const enrollments = db.getAll('enrollments').filter(e => e.studentId === student.id && e.status !== 'ملغي');
    const schedules = db.getAll('schedules');
    const courses = db.getAll('courses');
    const branches = db.getAll('branches');

    let targetScheduleId = scheduleId;
    let targetEnrollment = null;

    if (targetScheduleId) {
      targetEnrollment = enrollments.find(e => e.scheduleId === targetScheduleId) || enrollments[0];
    } else {
      if (enrollments.length > 0) {
        targetEnrollment = enrollments[0];
        targetScheduleId = targetEnrollment.scheduleId;
      }
    }

    if (!targetScheduleId && schedules.length > 0) {
      const branchSch = schedules.find(s => s.branchId === (student.branchId || 'branch-1'));
      targetScheduleId = branchSch ? branchSch.id : schedules[0].id;
    }

    const schedule = schedules.find(s => s.id === targetScheduleId) || {};
    const course = courses.find(c => c.id === (schedule.courseId || targetEnrollment?.courseId)) || {};
    const branch = branches.find(b => b.id === (schedule.branchId || student.branchId)) || {};

    const todayDate = sessionDate || new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Find or create attendance session record
    let allAttendance = db.getAll('attendance');
    let sessionAttendance = allAttendance.find(a => 
      (targetScheduleId ? a.scheduleId === targetScheduleId : true) && a.sessionDate === todayDate
    );

    if (!sessionAttendance && targetScheduleId) {
      sessionAttendance = db.create('attendance', {
        scheduleId: targetScheduleId,
        branchId: schedule.branchId || branch.id || 'branch-1',
        sessionDate: todayDate,
        sessionTopic: 'تسجيل دخول واستقبال فوري (Smart Gate)',
        records: []
      });
    }

    let isAlreadyPresent = false;
    let existingScannedTime = nowTime;

    if (sessionAttendance) {
      if (!Array.isArray(sessionAttendance.records)) sessionAttendance.records = [];
      const existingRec = sessionAttendance.records.find(r => r.studentId === student.id);
      if (existingRec) {
        if (existingRec.status === 'حاضر') {
          isAlreadyPresent = true;
          existingScannedTime = existingRec.scannedAt || existingRec.time || nowTime;
        }
        existingRec.status = 'حاضر';
        existingRec.scannedAt = existingRec.scannedAt || nowTime;
        existingRec.note = existingRec.note ? `${existingRec.note} (تأكيد دخول ${nowTime})` : `مسح كود QR في ${nowTime}`;
      } else {
        sessionAttendance.records.push({
          studentId: student.id,
          status: 'حاضر',
          scannedAt: nowTime,
          note: `مسح كود QR في ${nowTime}`
        });
      }
      db.update('attendance', sessionAttendance.id, { records: sessionAttendance.records });
    }

    // Calculate attended sessions count
    let attendedCount = 0;
    allAttendance.forEach(att => {
      if (Array.isArray(att.records)) {
        if (att.records.some(r => r.studentId === student.id && r.status === 'حاضر')) {
          attendedCount++;
        }
      }
    });

    const welcomeMsg = isAlreadyPresent 
      ? `أهلاً بك مجدداً يا ${student.name}! تم تأكيد حضورك مسبقاً اليوم (${existingScannedTime}).`
      : `مرحباً بك في المرسم، ${student.name}! تم تسجيل دخولك بنجاح.`;

    const remaining = targetEnrollment ? (targetEnrollment.remainingAmount || 0) : 0;
    const paymentStatusText = remaining === 0 ? 'مدفوع بالكامل ✅' : `متبقي قسط: ${remaining} ج.م ⚠️`;

    return res.json({
      success: true,
      message: welcomeMsg,
      alreadyScanned: isAlreadyPresent,
      data: {
        student: {
          id: student.id,
          name: student.name,
          phone: student.phone,
          age: student.age || null
        },
        course: {
          id: course.id || '',
          title: course.title || 'دورة فنية تشكيلية',
          category: course.category || 'فنون تشكيلية'
        },
        schedule: {
          id: schedule.id || '',
          groupName: schedule.groupName || `${schedule.days || ''} (${schedule.time || ''})`,
          room: schedule.room || 'القاعة الرئيسية',
          days: schedule.days || '',
          time: schedule.time || '',
          instructor: schedule.instructor || course.instructor || 'الفنان المسؤول'
        },
        branch: {
          id: branch.id || '',
          name: branch.name || 'المقر الرئيسي'
        },
        payment: {
          totalFee: targetEnrollment ? targetEnrollment.totalFee : (course.price || 0),
          paidAmount: targetEnrollment ? targetEnrollment.paidAmount : 0,
          remainingAmount: remaining,
          status: paymentStatusText
        },
        stats: {
          attendedCount: isAlreadyPresent ? attendedCount : (attendedCount + 1),
          totalSessions: course.durationWeeks ? (course.durationWeeks * 2) : 8
        },
        time: nowTime,
        date: todayDate,
        status: 'حاضر'
      }
    });
  } catch (err) {
    console.error('Scan QR attendance error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الحضور' });
  }
});

// 7.1.1 Today's Live Entries Log
app.get('/api/attendance/today-log', (req, res) => {
  try {
    const todayDate = req.query.date || new Date().toISOString().slice(0, 10);
    const allAttendance = db.getAll('attendance');
    const students = db.getAll('students');
    const courses = db.getAll('courses');
    const schedules = db.getAll('schedules');
    const branches = db.getAll('branches');

    const todaySessions = allAttendance.filter(a => a.sessionDate === todayDate);
    const entries = [];

    todaySessions.forEach(session => {
      const schedule = schedules.find(s => s.id === session.scheduleId) || {};
      const course = courses.find(c => c.id === schedule.courseId) || {};
      const branch = branches.find(b => b.id === (session.branchId || schedule.branchId)) || {};

      if (Array.isArray(session.records)) {
        session.records.forEach(rec => {
          if (rec.status === 'حاضر') {
            const student = students.find(s => s.id === rec.studentId) || { name: 'طالب غير محدد', phone: '' };
            entries.push({
              studentId: student.id,
              studentName: student.name,
              studentPhone: student.phone,
              courseTitle: course.title || 'ورشة فنية',
              groupName: schedule.groupName || `${schedule.days || ''} (${schedule.time || ''})`,
              room: schedule.room || 'القاعة الرئيسية',
              branchName: branch.name || 'المقر الرئيسي',
              time: rec.scannedAt || rec.time || 'اليوم',
              note: rec.note || ''
            });
          }
        });
      }
    });

    entries.reverse();

    res.json({
      success: true,
      todayDate,
      count: entries.length,
      entries
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7.2 QR Code Generator (Data URL)
app.get('/api/qr/:data', async (req, res) => {
  try {
    const text = decodeURIComponent(req.params.data);
    const dataUrl = await QRCode.toDataURL(text, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    res.json({ success: true, dataUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7.3 Student ID Card Data Endpoint
app.get('/api/students/:id/card', async (req, res) => {
  try {
    const student = db.getById('students', req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = db.getAll('enrollments').filter(e => e.studentId === student.id && e.status !== 'ملغي');
    const latestEnrollment = enrollments[enrollments.length - 1] || {};
    const branches = db.getAll('branches');
    const courses = db.getAll('courses');
    const schedules = db.getAll('schedules');
    const settings = db.getSettings();

    const branch = branches.find(b => b.id === (latestEnrollment.branchId || student.branchId)) || {};
    const course = courses.find(c => c.id === latestEnrollment.courseId) || {};
    const schedule = schedules.find(s => s.id === latestEnrollment.scheduleId) || {};

    const qrText = `ATELIER-STUDENT:${student.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      card: {
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone,
        studentEmail: student.email,
        studentAge: student.age,
        registeredAt: student.registeredAt,
        receiptNumber: latestEnrollment.receiptNumber || 'ART-REC-001',
        branchName: branch.name || 'المقر الرئيسي',
        branchAddress: branch.address || '',
        branchPhone: branch.phone || '',
        courseTitle: course.title || 'دورة فنية تشكيلية',
        courseCategory: course.category || 'فنون تشكيلية',
        groupName: schedule.groupName || `${schedule.days || ''} (${schedule.time || ''})`,
        days: schedule.days || 'مواعيد منتظمة',
        time: schedule.time || '',
        room: schedule.room || 'قاعة الرسم',
        instructor: schedule.instructor || course.instructor || 'الفنان المسؤول',
        academyName: settings.academyName || 'أكاديمية الفنون التشكيلية',
        academySubtitle: settings.academySubtitle || 'المرسم الأكاديمي المعتمد',
        qrText,
        qrDataUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7.4 Smart Artistic Growth & Master Certificate Endpoint
app.get('/api/students/:id/evaluation', async (req, res) => {
  try {
    const student = db.getById('students', req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = db.getAll('enrollments').filter(e => e.studentId === student.id && e.status !== 'ملغي');
    const latestEnrollment = enrollments[enrollments.length - 1] || {};
    const branches = db.getAll('branches');
    const courses = db.getAll('courses');
    const schedules = db.getAll('schedules');
    const settings = db.getSettings();
    const allAttendance = db.getAll('attendance');

    const branch = branches.find(b => b.id === (latestEnrollment.branchId || student.branchId)) || {};
    const course = courses.find(c => c.id === latestEnrollment.courseId) || {};
    const schedule = schedules.find(s => s.id === latestEnrollment.scheduleId) || {};

    // Calculate attendance statistics
    let sessionsAttended = 0;
    allAttendance.forEach(att => {
      if (Array.isArray(att.records)) {
        if (att.records.some(r => r.studentId === student.id && r.status === 'حاضر')) {
          sessionsAttended++;
        }
      }
    });

    const totalCourseSessions = course.durationWeeks ? (course.durationWeeks * 2) : 8;
    const attendanceRatio = Math.min(1, Math.max(0.6, sessionsAttended / (totalCourseSessions || 8)));

    // Deterministic pseudo-random generation based on student ID to keep scores stable
    const hash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
      return Math.abs(h);
    };
    const seed = hash(student.id + (course.id || 'course'));
    const offset = (seed % 7) - 3; // -3 to +3

    // 4 Core Master Skills
    const brushSkill = Math.min(98, Math.max(84, Math.round(92 + offset + (attendanceRatio * 4))));
    const compSkill = Math.min(97, Math.max(82, Math.round(89 - offset + (attendanceRatio * 3))));
    const lightingSkill = Math.min(99, Math.max(85, Math.round(94 + (seed % 4) + (attendanceRatio * 3))));
    const colorSkill = Math.min(98, Math.max(83, Math.round(90 + (seed % 5) + (attendanceRatio * 4))));
    const overallScore = Math.round((brushSkill + compSkill + lightingSkill + colorSkill) / 4);

    let gradeLevel = 'مرتبة الشرف الفنية (Master Grade A+)';
    let gradeBadge = 'فنان متميز • Master Class';
    if (overallScore < 88) {
      gradeLevel = 'مرتبة التميز الفني (Grade A)';
      gradeBadge = 'فنان متقدم • Advanced Level';
    }

    // Academic Critique Generator based on Course Category
    const category = (course.category || '').toLowerCase();
    const title = (course.title || '').toLowerCase();
    let critiqueText = '';
    let recommendations = '';
    let nextSuggestedCourse = '';

    if (category.includes('زيتي') || title.includes('زيت')) {
      critiqueText = `أظهر الطالب ${student.name} نضجاً تشكيلياً ملموساً في التعامل مع ألوان الزيت وقماش الكانفاس، حيث برز تمكنه من تأسيس الأرضيات وتوزيع الكتل اللونية بجرأة وثقة. كما عكست لوحاته وعياً متقدماً بتدرجات التظليل ونعومة الدمج وقاعدة الدهن فوق الهزيل، مما منح تكويناته بعداً درامياً وتناغماً بصرياً فائق الجاذبية.`;
      recommendations = `يُنصح بمواصلة التدريب على دراسات الضوء المباشر والمنعكس (Reflected Light)، والتجريب في تقنيات التعتيم اللوني الشفاف (Glazing) وضربات السكين البارزة (Impasto) لإثراء ملمس السطح التصويري.`;
      nextSuggestedCourse = 'ورشة الماستر كلاس في اللوحات التشكيلية الكبرى وتقنيات الملمس والتعتيم بالسكين';
    } else if (category.includes('فحم') || category.includes('بورتريه') || title.includes('بورتريه')) {
      critiqueText = `تميز أداء الطالب ${student.name} بالدقة التشريحية وضبط نسب الوجه الإنساني، مع إتقان لافت في توزيع مستويات التظليل بالفحم والمدعكة لإنشاء تدرجات ضوئية غنية. أظهرت أعماله قدرة تعبيرية عميقة في رسم النظرات والعمق العاطفي وتحديد خطوط الفصل الحادة والناعمة.`;
      recommendations = `التركيز في المرحلة القادمة على دراسات البورتريه المائل (Three-Quarter View) مع مصادر إضاءة متعددة لتعميق الإحساس بالكتلة والفراغ، والانتقال لتظليل الملامح التعبيرية الحرة.`;
      nextSuggestedCourse = 'دورة البورتريه الحي والدراسات التشريحية المتقدمة بالفحم والباستيل';
    } else if (category.includes('أطفال') || title.includes('صغار')) {
      critiqueText = `يمتلك الفنان الصغير ${student.name} حساسية بصرية فطرية وشغفاً إبداعياً رائعاً، وقد أظهر شجاعة مبهرة في اختيار درجات الألوان وتوزيع عناصر القصة التشكيلية داخل اللوحة بحرية وخيال واسع يعكس شخصية فنية واعدة ومميزة.`;
      recommendations = `تشجيع الطفل على الاستمرار في الرسم التعبيري وتجربة خامات مختلفة مثل ألوان الباستيل والأكريليك، مع تدريبه على الحفاظ على مساحات النور واستقلالية الخط التعبيري.`;
      nextSuggestedCourse = 'المستوى الثاني لأكاديمية الرسامين الصغار - إطلاق الخيال والتجريب اللوني';
    } else if (category.includes('مائي') || title.includes('مائي')) {
      critiqueText = `قدم الطالب ${student.name} تحكماً متميزاً في سيولة ألوان الجواش والألوان المائية وإدارة مساحات البلل (Wet-on-Wet)، مع الحفاظ على شفافية اللون ونقاء المساحات البيضاء، مما أضفى على أعماله إشراقاً وروحاً انطباعية منعشة.`;
      recommendations = `استكشاف تقنيات الرسم السريع للطبيعة المفتوحة (Plein Air) والتحكم في كثافة تدرجات الفرشاة العريضة مع المحافظة على عفوية التدفق اللوني.`;
      nextSuggestedCourse = 'ماستر كلاس المناظر الطبيعية الانطباعية وتقنيات الألوان المائية الشفافة';
    } else {
      critiqueText = `قدم الطالب ${student.name} أداءً فنياً متوازناً وتطوراً ملحوظاً خلال ورشات المرسم، حيث عكست أعماله حساً تكوينياً متزناً وتفاعلاً إيجابياً مع إرشادات المدرب وتطبيقات التظليل والتناغم اللوني.`;
      recommendations = `مواصلة العمل على بناء مشروع فني شخصي يعبر عن أسلوبه الخاص مع تكثيف الممارسة المستمرة للرسم السريع (Sketching).`;
      nextSuggestedCourse = 'برنامج التدريب الحر والمشاريع التشكيلية المتقدمة بالمرسم';
    }

    const certNumber = `ART-CERT-${new Date().getFullYear()}-${student.id.toUpperCase()}`;
    const certDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    // Certificate QR code Data URL
    const qrData = `ATELIER-CERTIFICATE:${student.id}:${certNumber}:${overallScore}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    // Check for saved custom certificate overrides
    const custom = student.customCertificate || {};
    const finalBrush = custom.skills?.brushwork?.score !== undefined ? Number(custom.skills.brushwork.score) : brushSkill;
    const finalComp = custom.skills?.composition?.score !== undefined ? Number(custom.skills.composition.score) : compSkill;
    const finalLight = custom.skills?.chiaroscuro?.score !== undefined ? Number(custom.skills.chiaroscuro.score) : lightingSkill;
    const finalColor = custom.skills?.colorHarmony?.score !== undefined ? Number(custom.skills.colorHarmony.score) : colorSkill;
    const finalScore = custom.overallScore !== undefined ? Number(custom.overallScore) : Math.round((finalBrush + finalComp + finalLight + finalColor) / 4);

    res.json({
      success: true,
      data: {
        certificateNumber: custom.certificateNumber || certNumber,
        issuanceDate: custom.issuanceDate || certDate,
        student: {
          id: student.id,
          name: custom.studentName || student.name,
          phone: student.phone,
          age: student.age || null
        },
        course: {
          id: course.id || '',
          title: custom.courseTitle || course.title || 'دورة الفنون التشكيلية',
          category: course.category || 'فنون تشكيلية'
        },
        branch: {
          id: branch.id || '',
          name: custom.branchName || branch.name || 'المقر الرئيسي',
          city: branch.city || 'المرسم'
        },
        schedule: {
          groupName: schedule.groupName || `${schedule.days || ''} (${schedule.time || ''})`,
          instructor: custom.instructorName || schedule.instructor || course.instructor || 'الفنان المسؤول'
        },
        academy: {
          name: custom.academyName || settings.academyName || 'أكاديمية الفنون التشكيلية',
          subtitle: custom.academySubtitle || settings.academySubtitle || 'المرسم الأكاديمي المعتمد',
          phone: settings.primaryPhone || branch.phone || ''
        },
        directorName: custom.directorName || 'المدير الأكاديمي للمرسم',
        stats: {
          sessionsAttended,
          totalCourseSessions,
          attendanceRate: Math.round(attendanceRatio * 100)
        },
        skills: {
          brushwork: { label: 'التحكم التقني والضربات (Brushwork Technique)', score: finalBrush },
          composition: { label: 'التكوين والنسب البصرية (Composition & Balance)', score: finalComp },
          chiaroscuro: { label: 'إدراك النور والظلال (Chiaroscuro & Values)', score: finalLight },
          colorHarmony: { label: 'تناغم وانسجام الألوان (Color Harmony)', score: finalColor }
        },
        overallScore: finalScore,
        gradeLevel: custom.gradeLevel || gradeLevel,
        gradeBadge: custom.gradeBadge || gradeBadge,
        critiqueText: custom.critiqueText || critiqueText,
        recommendations: custom.recommendations || recommendations,
        nextSuggestedCourse: custom.nextSuggestedCourse || nextSuggestedCourse,
        theme: custom.theme || 'gold',
        showSkills: custom.showSkills !== undefined ? custom.showSkills : true,
        showQr: custom.showQr !== undefined ? custom.showQr : true,
        showSeal: custom.showSeal !== undefined ? custom.showSeal : true,
        isCustomized: !!student.customCertificate,
        qrDataUrl
      }
    });
  } catch (err) {
    console.error('Art evaluation error:', err);
    res.status(500).json({ success: false, message: 'فشل استخراج التقييم الفني للطالب' });
  }
});

// Save custom certificate modifications for a student
app.post('/api/students/:id/evaluation', (req, res) => {
  try {
    const student = db.getById('students', req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    const customCertificate = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    db.update('students', student.id, { customCertificate });
    res.json({ success: true, message: 'تم حفظ تعديلات الشهادة بنجاح', data: customCertificate });
  } catch (err) {
    console.error('Save certificate error:', err);
    res.status(500).json({ success: false, message: 'فشل حفظ تعديلات الشهادة' });
  }
});

// Reset certificate back to original auto-calculated evaluation
app.post('/api/students/:id/evaluation/reset', (req, res) => {
  try {
    const student = db.getById('students', req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    db.update('students', student.id, { customCertificate: null });
    res.json({ success: true, message: 'تم استعادة التقييم التلقائي بنجاح' });
  } catch (err) {
    console.error('Reset certificate error:', err);
    res.status(500).json({ success: false, message: 'فشل استعادة التقييم التلقائي' });
  }
});

// 8. Finances & Expenses
app.get('/api/expenses', (req, res) => {
  const branchId = req.query.branchId;
  let expenses = db.getAll('expenses');
  const branches = db.getAll('branches');

  if (branchId && branchId !== 'all') {
    expenses = expenses.filter(e => e.branchId === branchId);
  }

  const enriched = expenses.map(exp => {
    const branch = branches.find(b => b.id === exp.branchId) || {};
    return {
      ...exp,
      branchName: branch.name
    };
  });

  res.json({ success: true, data: enriched });
});

app.post('/api/expenses', (req, res) => {
  const expense = db.create('expenses', {
    ...req.body,
    amount: Number(req.body.amount) || 0,
    date: req.body.date || new Date().toISOString().slice(0, 10)
  });
  res.status(201).json({ success: true, data: expense });
});

app.delete('/api/expenses/:id', (req, res) => {
  const deleted = db.delete('expenses', req.params.id);
  res.json({ success: deleted });
});

// 9. Art Gallery
app.get('/api/gallery', (req, res) => {
  const branchId = req.query.branchId;
  let gallery = db.getAll('art_gallery');
  const branches = db.getAll('branches');

  if (branchId && branchId !== 'all') {
    gallery = gallery.filter(g => g.branchId === branchId);
  }

  const enriched = gallery.map(item => {
    const branch = branches.find(b => b.id === item.branchId) || {};
    return {
      ...item,
      branchName: branch.name
    };
  });

  res.json({ success: true, data: enriched });
});

app.post('/api/gallery', (req, res) => {
  const item = db.create('art_gallery', {
    ...req.body,
    price: Number(req.body.price) || 0
  });
  res.status(201).json({ success: true, data: item });
});

app.put('/api/gallery/:id', (req, res) => {
  const updated = db.update('art_gallery', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Art piece not found' });
  res.json({ success: true, data: updated });
});

app.delete('/api/gallery/:id', (req, res) => {
  const deleted = db.delete('art_gallery', req.params.id);
  res.json({ success: deleted });
});

// 10. Public Portal: Student Online Booking
app.post('/api/public/book', (req, res) => {
  try {
    const { name, phone, email, age, courseId, scheduleId, branchId, notes } = req.body;

    if (!name || !phone || !courseId || !scheduleId || !branchId) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال جميع البيانات المطلوبة للحجز' });
    }

    // Check or create student
    let student = db.getAll('students').find(s => s.phone === phone);
    if (!student) {
      student = db.create('students', {
        name,
        phone,
        email: email || '',
        age: age ? Number(age) : null,
        branchId,
        notes: notes ? `حجز أونلاين: ${notes}` : 'تم التسجيل عبر بوابة الحجز الأونلاين',
        registeredAt: new Date().toISOString().slice(0, 10)
      });
    }

    const course = db.getById('courses', courseId);
    const coursePrice = course ? course.price : 0;
    const receiptNumber = `WEB-${new Date().getFullYear()}-${String(db.getAll('enrollments').length + 1).padStart(3, '0')}`;

    const enrollment = db.create('enrollments', {
      receiptNumber,
      studentId: student.id,
      courseId,
      scheduleId,
      branchId,
      totalFee: coursePrice,
      paidAmount: 0,
      remainingAmount: coursePrice,
      paymentMethod: 'سداد عند الحضور للفرع',
      paymentStatus: 'حجز أونلاين جديد (بانتظار التأكيد)',
      status: 'معلق',
      enrollmentDate: new Date().toISOString().slice(0, 10),
      notes: notes || 'طلب حجز إلكتروني من موقع الطلاب'
    });

    res.status(201).json({
      success: true,
      message: 'تم استلام طلب الحجز بنجاح! سيتواصل معك فريق الأكاديمية لتأكيد المقعد.',
      data: {
        receiptNumber,
        studentName: student.name,
        courseTitle: course ? course.title : '',
        totalFee: coursePrice
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. Public Portal: Lookup Student Schedule
app.get('/api/public/lookup', (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني' });
  }
  const result = db.getStudentEnrollments(query);
  if (!result) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على اشتراكات مسجلة بهذا الرقم' });
  }
  res.json({ success: true, data: result });
});

// 12. Backup & Export
app.get('/api/system/backup', (req, res) => {
  try {
    const backupPath = db.backup();
    res.json({ success: true, message: 'تم أخذ نسخة احتياطية بنجاح', backupPath });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/system/export-data', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="art_studio_backup.json"');
  res.send(JSON.stringify(db.data, null, 2));
});

// Default catch-all to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎨 Atelier Art Studio Management System is running!`);
  console.log(`📍 Web & Desktop Interface: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
