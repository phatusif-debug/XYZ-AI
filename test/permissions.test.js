// Tests the authorization boundary directly (no Claude API call needed).
// This is the part of the assignment that actually has to be bulletproof:
// even if the LLM is tricked into requesting a disallowed tool, executeTool
// must refuse it. Run with: node --test test/permissions.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { executeTool } from "../src/ai/executeTool.js";
import { getUserById, attendance } from "../src/data/mockData.js";

const student = getUserById("STU001");
const parent = getUserById("PAR001");
const teacher = getUserById("TCH001");
const principal = getUserById("PRI001");

test("student can read their own attendance", () => {
  const result = executeTool("get_my_attendance", {}, student);
  assert.equal(result.error, undefined);
  assert.equal(result.name, "Rahul Sharma");
});

test("parent can read their child's attendance", () => {
  const result = executeTool("get_child_attendance", {}, parent);
  assert.equal(result.error, undefined);
  assert.equal(result.childName, "Rahul Sharma");
});

test("student CANNOT call mark_attendance (role-restricted tool)", () => {
  const result = executeTool("mark_attendance", { studentName: "Rahul", status: "absent" }, student);
  assert.match(result.error, /Not permitted/);
});

test("parent CANNOT call mark_attendance", () => {
  const result = executeTool("mark_attendance", { studentName: "Rahul", status: "absent" }, parent);
  assert.match(result.error, /Not permitted/);
});

test("parent CANNOT call get_school_attendance_summary (principal-only)", () => {
  const result = executeTool("get_school_attendance_summary", {}, parent);
  assert.match(result.error, /Not permitted/);
});

test("teacher can mark attendance for a student in their own class", () => {
  const before = attendance.STU002.length;
  const result = executeTool("mark_attendance", { studentName: "Ananya", status: "absent" }, teacher);
  assert.equal(result.ok, true);
  assert.equal(result.status, "absent");
  assert.ok(attendance.STU002.length >= before);
});

test("teacher CANNOT read school-wide analytics (principal-only)", () => {
  const result = executeTool("get_school_attendance_summary", {}, teacher);
  assert.match(result.error, /Not permitted/);
});

test("principal can read school-wide analytics", () => {
  const result = executeTool("get_school_attendance_summary", {}, principal);
  assert.equal(result.error, undefined);
  assert.ok(Array.isArray(result.summary));
});

test("principal CANNOT read a single child's attendance via get_child_attendance (parent-only)", () => {
  const result = executeTool("get_child_attendance", {}, principal);
  assert.match(result.error, /Not permitted/);
});

test("student and parent CAN request escalation", () => {
  const r1 = executeTool("request_escalation", { toRole: "teacher", reason: "test" }, student);
  assert.equal(r1.status, "submitted");
  const r2 = executeTool("request_escalation", { toRole: "management", reason: "test" }, parent);
  assert.equal(r2.status, "submitted");
});

test("teacher CANNOT request escalation (not in their tool set)", () => {
  const result = executeTool("request_escalation", { toRole: "management", reason: "test" }, teacher);
  assert.match(result.error, /Not permitted/);
});

test("unknown tool name is rejected safely", () => {
  const result = executeTool("delete_all_students", {}, principal);
  assert.match(result.error, /Not permitted|Unknown tool/);
});
