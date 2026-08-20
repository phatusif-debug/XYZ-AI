import {
  computeAttendancePct,
  attendance,
  getUserById,
  getClassAttendanceSummary,
  getSchoolWideAttendanceSummary,
  markAttendance,
  findStudentByName,
  createEscalation,
} from "../data/mockData.js";
import { isToolAllowedForRole } from "./tools.js";

// authUser = the REAL, server-verified user (from the JWT), never the LLM's
// belief about who it's talking to.
export function executeTool(toolName, input, authUser) {
  if (!isToolAllowedForRole(toolName, authUser.role)) {
    return { error: `Not permitted: role '${authUser.role}' cannot use '${toolName}'.` };
  }

  switch (toolName) {
    case "get_my_attendance": {
      const pct = computeAttendancePct(authUser.userId);
      return { name: authUser.name, attendancePct: pct, recent: attendance[authUser.userId] || [] };
    }

    case "get_child_attendance": {
      const child = getUserById(authUser.childUserId);
      if (!child) return { error: "No linked child found for this parent account." };
      const pct = computeAttendancePct(child.userId);
      return { childName: child.name, attendancePct: pct, recent: attendance[child.userId] || [] };
    }

    case "mark_attendance": {
      const student = findStudentByName(input.studentName);
      if (!student) return { error: `No student found matching '${input.studentName}'.` };
      if (student.classId !== authUser.classId) {
        return { error: `${student.name} is not in your class.` };
      }
      const date = input.date || new Date().toISOString().slice(0, 10);
      const result = markAttendance(student.userId, date, input.status, authUser.userId);
      return { ok: true, ...result, studentName: student.name };
    }

    case "get_school_attendance_summary": {
      return { summary: getSchoolWideAttendanceSummary() };
    }

    case "request_escalation": {
      const forUserId = authUser.role === "parent" ? authUser.childUserId : authUser.userId;
      const record = createEscalation({
        fromUserId: authUser.userId,
        forUserId,
        toRole: input.toRole,
        reason: input.reason,
      });
      return record;
    }

    default:
      return { error: `Unknown tool '${toolName}'.` };
  }
}

// Alias to keep the class-attendance helper reachable if you extend tools later.
export { getClassAttendanceSummary };
