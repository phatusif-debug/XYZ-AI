// In-memory mock "School ERP" data store.
// This stands in for the real Student/Parent/Staff/Management portals'
// databases. XYZ AI is only ever allowed to touch this through the
// service functions below (never directly) — that's what lets us
// enforce role-based permissions at the application layer.

export const users = [
  { userId: "STU001", name: "Rahul Sharma", role: "student", classId: "C7A" },
  { userId: "STU002", name: "Ananya Rao", role: "student", classId: "C7A" },
  { userId: "PAR001", name: "Sunita Sharma", role: "parent", childUserId: "STU001" },
  { userId: "TCH001", name: "Mrs. Fatima Khan", role: "teacher", classId: "C7A" },
  { userId: "PRI001", name: "Mr. David Owusu", role: "principal" },
];

export const classes = [
  { classId: "C7A", name: "Grade 7A", teacherUserId: "TCH001" },
];

// attendance[userId] = array of { date, status }
export const attendance = {
  STU001: [
    { date: "2026-08-11", status: "present" },
    { date: "2026-08-12", status: "present" },
    { date: "2026-08-13", status: "absent" },
    { date: "2026-08-14", status: "present" },
    { date: "2026-08-15", status: "present" },
  ],
  STU002: [
    { date: "2026-08-11", status: "present" },
    { date: "2026-08-12", status: "present" },
    { date: "2026-08-13", status: "present" },
    { date: "2026-08-14", status: "present" },
    { date: "2026-08-15", status: "present" },
  ],
};

export const escalations = []; // { id, fromUserId, forUserId, toRole, toUserId, reason, status, createdAt }

export function getUserById(userId) {
  return users.find((u) => u.userId === userId) || null;
}

export function computeAttendancePct(userId) {
  const records = attendance[userId] || [];
  if (records.length === 0) return null;
  const present = records.filter((r) => r.status === "present").length;
  return Math.round((present / records.length) * 1000) / 10; // one decimal
}

export function getClassAttendanceSummary(classId) {
  const students = users.filter((u) => u.role === "student" && u.classId === classId);
  const rows = students.map((s) => ({
    userId: s.userId,
    name: s.name,
    pct: computeAttendancePct(s.userId),
  }));
  const overall =
    rows.length === 0
      ? null
      : Math.round((rows.reduce((sum, r) => sum + (r.pct || 0), 0) / rows.length) * 10) / 10;
  return { classId, students: rows, overallPct: overall };
}

export function getSchoolWideAttendanceSummary() {
  return classes.map((c) => getClassAttendanceSummary(c.classId));
}

export function markAttendance(studentUserId, date, status, markedByUserId) {
  if (!attendance[studentUserId]) attendance[studentUserId] = [];
  const existing = attendance[studentUserId].find((r) => r.date === date);
  if (existing) {
    existing.status = status;
  } else {
    attendance[studentUserId].push({ date, status });
  }
  return { studentUserId, date, status, markedByUserId };
}

export function findStudentByName(name) {
  const lower = name.toLowerCase();
  return users.find((u) => u.role === "student" && u.name.toLowerCase().includes(lower)) || null;
}

export function createEscalation({ fromUserId, forUserId, toRole, reason }) {
  let toUserId = null;
  if (toRole === "teacher") {
    const student = getUserById(forUserId);
    const cls = student ? classes.find((c) => c.classId === student.classId) : null;
    toUserId = cls ? cls.teacherUserId : null;
  } else if (toRole === "management") {
    const principal = users.find((u) => u.role === "principal");
    toUserId = principal ? principal.userId : null;
  }
  const record = {
    id: `ESC-${Date.now()}`,
    fromUserId,
    forUserId,
    toRole,
    toUserId,
    reason,
    status: toUserId ? "submitted" : "failed_no_recipient",
    createdAt: new Date().toISOString(),
  };
  escalations.push(record);
  return record;
}
