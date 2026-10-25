import { Announcement, Course, Group, Session } from '@/lib/mockData';
import { DatabaseEngine } from '@/lib/db/transactionManager';
import { formatLocalDate } from '@/lib/dates';

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export interface CreateCourseDTO {
  name: string;
  description: string;
  price: number;
  sessionsCount: number;
  ageGroup: string;
  levels: string[];
}

export interface CreateGroupDTO {
  courseId: string;
  supervisorId: string;
  weekdays: number[];
  time: string;
  capacity: number;
  startDate: string;
  endDate: string;
  room?: string;
}

export type UpdateCourseDTO = CreateCourseDTO;
export type UpdateGroupDTO = Pick<CreateGroupDTO, 'supervisorId' | 'capacity' | 'room'>;

export type AnnouncementDTO = Omit<Announcement, 'id'>;

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} مطلوب.`);
  return normalized;
}

function parseCalendarDate(value: string, label: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${label} غير صالح.`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (formatLocalDate(date) !== value) throw new Error(`${label} غير صالح.`);
  return date;
}

function makeId(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
}

export class CatalogService {
  constructor(private readonly database: DatabaseEngine) {}

  createCourse(input: CreateCourseDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Course {
    const name = requireText(input.name, 'اسم الكورس');
    const description = requireText(input.description, 'وصف الكورس');
    const ageGroup = requireText(input.ageGroup, 'الفئة العمرية');
    if (!Number.isFinite(input.price) || input.price <= 0) throw new Error('سعر الكورس يجب أن يكون أكبر من صفر.');
    if (!Number.isInteger(input.sessionsCount) || input.sessionsCount < 1) throw new Error('عدد الحصص يجب أن يكون رقمًا صحيحًا أكبر من صفر.');
    const levels = input.levels.map(level => level.trim()).filter(Boolean);
    const course: Course = {
      id: makeId('course'), name, description, ageGroup, price: input.price,
      sessionsCount: input.sessionsCount, levels,
    };

    return this.database.executeTransaction('Create course', draft => {
      if (draft.courses.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        throw new Error('يوجد كورس بهذا الاسم بالفعل.');
      }
      draft.courses.push(course);
      return course;
    }, onCommit);
  }

  updateCourse(id: string, input: UpdateCourseDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Course {
    const name = requireText(input.name, 'اسم الكورس');
    const description = requireText(input.description, 'وصف الكورس');
    const ageGroup = requireText(input.ageGroup, 'الفئة العمرية');
    if (!Number.isFinite(input.price) || input.price <= 0) throw new Error('سعر الكورس يجب أن يكون أكبر من صفر.');
    if (!Number.isInteger(input.sessionsCount) || input.sessionsCount < 1) throw new Error('عدد الحصص يجب أن يكون رقمًا صحيحًا أكبر من صفر.');
    const levels = input.levels.map(level => level.trim()).filter(Boolean);

    return this.database.executeTransaction('Update course', draft => {
      const course = draft.courses.find(item => item.id === id);
      if (!course) throw new Error('الكورس المطلوب غير موجود.');
      if (draft.courses.some(item => item.id !== id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        throw new Error('يوجد كورس بهذا الاسم بالفعل.');
      }
      Object.assign(course, { name, description, ageGroup, price: input.price, sessionsCount: input.sessionsCount, levels });
      return course;
    }, onCommit);
  }

  deleteCourse(id: string, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): void {
    this.database.executeTransaction('Delete course', draft => {
      if (!draft.courses.some(item => item.id === id)) throw new Error('الكورس المطلوب غير موجود.');
      if (draft.groups.some(group => group.courseId === id)) throw new Error('لا يمكن حذف كورس له مجموعات. احذف أو انقل المجموعات المرتبطة أولًا.');
      draft.courses = draft.courses.filter(item => item.id !== id);
    }, onCommit);
  }

  createGroup(input: CreateGroupDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Group {
    const startDate = parseCalendarDate(input.startDate, 'تاريخ البداية');
    const endDate = parseCalendarDate(input.endDate, 'تاريخ النهاية');
    if (endDate < startDate) throw new Error('تاريخ النهاية يجب أن يأتي بعد تاريخ البداية.');
    if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new Error('سعة المجموعة يجب أن تكون رقمًا صحيحًا أكبر من صفر.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('وقت الحصة غير صالح.');
    const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
    if (!weekdays.length || weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error('اختر يومًا واحدًا على الأقل للمجموعة.');
    }

    return this.database.executeTransaction('Create group and sessions', draft => {
      const course = draft.courses.find(item => item.id === input.courseId);
      if (!course) throw new Error('الكورس المحدد غير موجود.');
      if (!draft.users.some(user => user.id === input.supervisorId && user.role === 'supervisor')) {
        throw new Error('اختر مشرفًا مسجلًا في النظام.');
      }

      const group: Group = {
        id: makeId('group'), courseId: course.id, supervisorId: input.supervisorId,
        schedule: `${weekdays.map(day => WEEKDAYS[day]).join(' و')} ${input.time}`,
        capacity: input.capacity, enrolled: 0, startDate: input.startDate, endDate: input.endDate,
      status: (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate > today) return 'upcoming' as const;
        if (endDate < today) return 'completed' as const;
        return 'active' as const;
      })(),
        ...(input.room?.trim() ? { room: input.room.trim() } : {}),
      };
      draft.groups.push(group);

      const date = new Date(startDate);
      let generated = 0;
      while (date <= endDate && generated < course.sessionsCount) {
        if (weekdays.includes(date.getDay())) {
          const session: Session = {
            id: makeId('session'), groupId: group.id, date: formatLocalDate(date),
            time: input.time, status: 'scheduled',
          };
          draft.sessions.push(session);
          generated += 1;
        }
        date.setDate(date.getDate() + 1);
      }
      if (generated < course.sessionsCount) {
        throw new Error(`نطاق التواريخ ينتج ${generated} حصة فقط، بينما الكورس يحتاج ${course.sessionsCount} حصة. وسّع النطاق أو عدّل أيام المجموعة.`);
      }
      return group;
    }, onCommit);
  }

  updateGroup(id: string, input: UpdateGroupDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Group {
    if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new Error('سعة المجموعة يجب أن تكون رقمًا صحيحًا أكبر من صفر.');
    return this.database.executeTransaction('Update group', draft => {
      const group = draft.groups.find(item => item.id === id);
      if (!group) throw new Error('المجموعة المطلوبة غير موجودة.');
      if (!draft.users.some(user => user.id === input.supervisorId && user.role === 'supervisor')) {
        throw new Error('اختر مشرفًا مسجلًا في النظام.');
      }
      if (input.capacity < (group.enrolled || 0)) throw new Error('سعة المجموعة لا يمكن أن تقل عن عدد الطلاب المسجلين.');
      group.supervisorId = input.supervisorId;
      group.capacity = input.capacity;
      group.room = input.room?.trim() || undefined;
      return group;
    }, onCommit);
  }

  deleteGroup(id: string, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): void {
    this.database.executeTransaction('Delete group', draft => {
      if (!draft.groups.some(item => item.id === id)) throw new Error('المجموعة المطلوبة غير موجودة.');
      if (draft.enrollments.some(item => item.groupId === id)) throw new Error('لا يمكن حذف مجموعة بها اشتراكات. انقل الطلاب أو احذف الاشتراكات غير المالية أولًا.');
      const sessionIds = new Set(draft.sessions.filter(item => item.groupId === id).map(item => item.id));
      if (draft.attendance.some(item => sessionIds.has(item.sessionId)) || draft.progress.some(item => sessionIds.has(item.sessionId))) {
        throw new Error('لا يمكن حذف مجموعة لها سجلات حضور أو تقييم محفوظة.');
      }
      draft.sessions = draft.sessions.filter(item => item.groupId !== id);
      draft.groups = draft.groups.filter(item => item.id !== id);
    }, onCommit);
  }

  createAnnouncement(input: AnnouncementDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Announcement {
    const announcement = this.validateAnnouncement({ ...input, id: makeId('announcement') });
    return this.database.executeTransaction('Create announcement', draft => {
      draft.announcements.unshift(announcement);
      return announcement;
    }, onCommit);
  }

  updateAnnouncement(id: string, input: AnnouncementDTO, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Announcement {
    const announcement = this.validateAnnouncement({ ...input, id });
    return this.database.executeTransaction('Update announcement', draft => {
      const index = draft.announcements.findIndex(item => item.id === id);
      if (index === -1) throw new Error('الإعلان المطلوب غير موجود.');
      draft.announcements[index] = announcement;
      return announcement;
    }, onCommit);
  }

  deleteAnnouncement(id: string, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): void {
    this.database.executeTransaction('Delete announcement', draft => {
      const index = draft.announcements.findIndex(item => item.id === id);
      if (index === -1) throw new Error('الإعلان المطلوب غير موجود.');
      draft.announcements.splice(index, 1);
    }, onCommit);
  }

  cancelSession(id: string, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Session {
    return this.database.executeTransaction('Cancel class session', draft => {
      const session = draft.sessions.find(item => item.id === id);
      if (!session) throw new Error('الحصة المطلوبة غير موجودة.');
      if (session.status !== 'scheduled' && session.status !== 'makeup') throw new Error('يمكن إلغاء الحصص المجدولة أو التعويضية فقط.');
      session.status = 'cancelled';
      return session;
    }, onCommit);
  }

  createMakeupSession(input: { groupId: string; date: string; time: string }, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Session {
    parseCalendarDate(input.date, 'تاريخ الحصة');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('وقت الحصة غير صالح.');
    return this.database.executeTransaction('Create makeup session', draft => {
      if (!draft.groups.some(group => group.id === input.groupId)) throw new Error('المجموعة المحددة غير موجودة.');
      const session: Session = { id: makeId('session'), groupId: input.groupId, date: input.date, time: input.time, status: 'makeup' };
      draft.sessions.push(session);
      return session;
    }, onCommit);
  }

  updateSession(id: string, input: { date: string; time: string }, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): Session {
    parseCalendarDate(input.date, 'تاريخ الحصة');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('وقت الحصة غير صالح.');
    return this.database.executeTransaction('Update class session', draft => {
      const session = draft.sessions.find(item => item.id === id);
      if (!session) throw new Error('الحصة المطلوبة غير موجودة.');
      if (session.status !== 'scheduled' && session.status !== 'makeup') throw new Error('يمكن تعديل الحصص المجدولة أو التعويضية فقط.');
      if (draft.attendance.some(item => item.sessionId === id) || draft.progress.some(item => item.sessionId === id)) {
        throw new Error('لا يمكن تغيير موعد حصة لها حضور أو تقييم محفوظ.');
      }
      session.date = input.date;
      session.time = input.time;
      return session;
    }, onCommit);
  }

  deleteSession(id: string, onCommit?: (state: ReturnType<DatabaseEngine['getState']>) => void): void {
    this.database.executeTransaction('Delete class session', draft => {
      const session = draft.sessions.find(item => item.id === id);
      if (!session) throw new Error('الحصة المطلوبة غير موجودة.');
      if (session.status !== 'scheduled' && session.status !== 'makeup') throw new Error('يمكن حذف الحصص المجدولة أو التعويضية فقط.');
      if (draft.attendance.some(item => item.sessionId === id) || draft.progress.some(item => item.sessionId === id)) {
        throw new Error('لا يمكن حذف حصة لها حضور أو تقييم محفوظ.');
      }
      draft.sessions = draft.sessions.filter(item => item.id !== id);
    }, onCommit);
  }

  private validateAnnouncement(input: Announcement): Announcement {
    const title = requireText(input.title, 'عنوان الإعلان');
    const content = requireText(input.content, 'محتوى الإعلان');
    if (input.type !== 'announcement' && input.type !== 'exhibition') throw new Error('نوع الإعلان غير صالح.');
    const start = parseCalendarDate(input.startDate, 'تاريخ البداية');
    const end = parseCalendarDate(input.endDate, 'تاريخ النهاية');
    if (end < start) throw new Error('تاريخ الانتهاء يجب أن يأتي بعد تاريخ البداية.');
    const link = input.link?.trim();
    if (link) {
      try {
        const url = new URL(link);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
      } catch {
        throw new Error('الرابط يجب أن يبدأ بـ http:// أو https:// ويكون صالحًا.');
      }
    }
    return { id: input.id, title, content, startDate: input.startDate, endDate: input.endDate, type: input.type, ...(link ? { link } : {}) };
  }
}
