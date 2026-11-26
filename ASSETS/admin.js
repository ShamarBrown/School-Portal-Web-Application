/*
    CIT2011 - Web Programming
    Munro College Student Portal

    Group Members:
    Jonique Walker - 2409374
    Shamar Brown - 2501074
    David Scott - 2507305
    Rojaughn Murdock - 2505175
    Damario Foster - 2507304

    Lab Day: Thursday
    Lab Time: 1:00 PM - 2:50 PM
*/
"use strict";
const byId = id => document.getElementById(id);
// The registry and grade table share one browser storage record.
const storageKey = "cit2011.students.v1";
let students = [];
let editingId = null;
function notify(message) {
  byId("message").textContent = message;
}
function gradeKey(grade) {
  return JSON.stringify([
    String(grade.studentId),
    grade.subject.trim().toLowerCase(),
    String(grade.semester ?? "").replace(/^Semester\s*/i, ""),
    grade.academicYear ?? ""
  ]);
}

function splitRecords(records) {
  const profiles = [];
  const grades = [];

  for (const { id, name, grades: studentGrades = [], ...profile } of records) {
    profiles.push({
      ...profile,
      studentId: id,
      fullName: name,
      email: profile.email ?? "",
      classForm: profile.classForm ?? profile.grade ?? "",
      semester: profile.semester ?? "",
      academicYear: profile.academicYear ?? ""
    });

    for (const grade of studentGrades) {
      grades.push({
        ...grade,
        studentId: id,
        studentName: name,
        semester: String(grade.semester ?? profile.semester ?? "")
          .replace(/^Semester\s*/i, ""),
        academicYear: grade.academicYear ?? profile.academicYear ?? "",
        average: grade.score ?? grade.average
      });
    }
  }

  return { profiles, grades };
}

function save(next) {
  const { profiles, grades } = splitRecords(next);
  const previousProfiles = dbGet(DBkeys.STUDENTS);
  const knownIds = new Set(students.map(student => String(student.id)));

  // Keep shared grades for students outside the admin list.
  const otherGrades = dbGet(DBkeys.GRADES).filter(
    grade => !knownIds.has(String(grade.studentId))
  );

  if (!dbSet(DBkeys.STUDENTS, profiles)) {
    notify("Could not save student records.");
    return false;
  }

  if (!dbSet(DBkeys.GRADES, [...otherGrades, ...grades])) {
    const restored = dbSet(DBkeys.STUDENTS, previousProfiles);
    notify(restored
      ? "Could not save grades. The student change was undone."
      : "Could not save grades or restore student records. Reload before editing.");
    return false;
  }

  students = next;
  render();
  return true;
}
function clearForm() {
  editingId = null;
  byId("registry").reset();
  byId("studentId").readOnly = false;
  byId("formTitle").textContent = "Register a student";
  byId("cancel").hidden = true;
}
function addRow(body, values) {
  const row = body.insertRow();
  for (const value of values) row.insertCell().textContent = value;
  return row;
}
function action(cell, label, callback) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = callback;
  cell.append(button);
}
function render() {
  const rows = byId("rows");
  const grades = byId("grades");
  const choices = byId("gradeStudent");
  const selected = choices.value;
  rows.replaceChildren();
  grades.replaceChildren();
  choices.replaceChildren(new Option("Choose a student", ""));
  for (const student of students) {
    choices.add(new Option(student.name + " (" + student.id + ")", student.id));
    for (const grade of student.grades) {
      const cell = addRow(grades, [
        student.id,
        grade.subject,
        grade.score,
        grade.semester || "—",
        grade.academicYear || "—"
      ]).insertCell();
      action(cell, "Edit grade", () => {
        choices.value = student.id;
        byId("subject").value = grade.subject;
        byId("score").value = grade.score;
        byId("gradeSemester").value = String(grade.semester ?? "").replace(/^Semester\s+/i, "");
byId("gradeAcademicYear").value = grade.academicYear ?? "";
        byId("score").focus();
      });
      action(cell, "Delete grade", () => {
        if (!confirm("Delete the " + grade.subject + " grade for " + student.name + "?")) return;
        const next = students.map(item => item.id === student.id
          ? { ...item, grades: item.grades.filter(entry => entry !== grade) } : item);
        if (save(next)) notify("Grade deleted.");
      });
    }
    if (byId("filter").value && student.semester !== byId("filter").value) continue;
    const search = byId("studentSearch").value.trim().toLowerCase();
const classFilter = byId("classFilter").value.trim().toLowerCase();
const yearFilter = byId("yearFilter").value.trim();

const nameAndId = `${student.name} ${student.id}`.toLowerCase();
if (search && !nameAndId.includes(search)) continue;
if (classFilter && (student.classForm ?? "").toLowerCase() !== classFilter) continue;
if (yearFilter && student.academicYear !== yearFilter) continue;
    const cell = addRow(rows, [student.id, student.name, student.semester, student.classForm || "—", student.academicYear || "—"]).insertCell();
    action(cell, "Edit", () => {
      editingId = student.id;
      byId("studentId").value = student.id;
      byId("studentId").readOnly = true;
      byId("fullName").value = student.name;
      byId("studentEmail").value = student.email ?? "";
       byId("semester").value = student.semester;
      byId("classForm").value = student.classForm ?? "";
      byId("academicYear").value = student.academicYear ?? "";
      byId("formTitle").textContent = "Edit student";
      byId("cancel").hidden = false;
      byId("fullName").focus();
    });
    action(cell, "Delete", () => {
      if (!confirm("Delete " + student.name + " and their grades?")) return;
      if (save(students.filter(item => item.id !== student.id))) {
        if (editingId === student.id) clearForm();
        notify("Student deleted.");
      }
    });
  }
  if (students.some(student => student.id === selected)) choices.value = selected;
  if (!rows.rows.length) addRow(rows, ["No students in this view."]).cells[0].colSpan = 6;
  if (!grades.rows.length) addRow(grades, ["No grades recorded."]).cells[0].colSpan = 6;
}
byId("cancel").onclick = clearForm;
byId("filter").onchange = render;
byId("studentSearch").oninput = render;
byId("classFilter").oninput = render;
byId("yearFilter").oninput = render;
byId("registry").onsubmit = event => {
  event.preventDefault();
  const id = byId("studentId").value.trim().toUpperCase();
  const name = byId("fullName").value.trim();
  const email = byId("studentEmail").value.trim().toLowerCase();
if (students.some(student =>
  student.id !== editingId && (student.email ?? "").toLowerCase() === email
)) {
  return notify("That email is already registered.");
}
  const semester = byId("semester").value;
  const classForm = byId("classForm").value.trim();
const academicYear = byId("academicYear").value.trim();

if (!classForm) return notify("Enter the class or form.");

const years = /^(\d{4})-(\d{4})$/.exec(academicYear);
if (!years || Number(years[2]) !== Number(years[1]) + 1) {
  return notify("Enter two consecutive years, such as 2026-2027.");
}
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(id)) return notify("Use letters, numbers, hyphens or underscores for the student ID.");
  if (!name) return notify("Enter a student ID and full name.");
  if (!editingId && students.some(student => student.id === id)) return notify("That student ID already exists.");
const next = editingId
    ? students.map(student => student.id === editingId
      ? { ...student, name, email, semester, classForm, academicYear }
      : student)
    : [...students, { id, name, email, semester, classForm, academicYear, grades: [] }];
  if (save(next)) {
    clearForm();
    notify("Student saved.");
  }
};
byId("gradeForm").onsubmit = event => {
  event.preventDefault();
  const id = byId("gradeStudent").value;
  const subject = byId("subject").value.trim();
  const score = byId("score").valueAsNumber;
  if (!subject) return notify("Enter a subject.");
 const semester = byId("gradeSemester").value;
  const academicYear = byId("gradeAcademicYear").value.trim();
  const years = /^(\d{4})-(\d{4})$/.exec(academicYear);

  if (!years || Number(years[2]) !== Number(years[1]) + 1) {
    return notify("Enter two consecutive years, such as 2026-2027.");
  }

  const next = setGrade(students, id, subject, score, semester, academicYear);
  if (save(next)) {
    byId("gradeForm").reset();
    notify("Grade saved.");
  }
};
try {
   let profiles = dbGet(DBkeys.STUDENTS);
  let grades = dbGet(DBkeys.GRADES);
  const legacyData = localStorage.getItem(storageKey);

  if (legacyData !== null) {
    const legacy = splitRecords(JSON.parse(legacyData));

    const profilesById = new Map(
      profiles.map(profile => [String(profile.studentId), profile])
    );
    for (const profile of legacy.profiles) {
      const id = String(profile.studentId);
      profilesById.set(id, { ...profile, ...profilesById.get(id) });
    }

    const gradesByKey = new Map(grades.map(grade => [gradeKey(grade), grade]));
    for (const grade of legacy.grades) {
      const key = gradeKey(grade);
      if (!gradesByKey.has(key)) gradesByKey.set(key, grade);
    }

    profiles = [...profilesById.values()];
    grades = [...gradesByKey.values()];

    if (!dbSet(`${storageKey}.backup`, JSON.parse(legacyData))
        || !dbSet(DBkeys.STUDENTS, profiles)
        || !dbSet(DBkeys.GRADES, grades)) {
      throw new Error("The shared records could not be saved.");
    }

    // Retire the old key only after the backup and both writes succeed.
    localStorage.removeItem(storageKey);
  }

  students = profiles.map(({ studentId, fullName, ...profile }) => ({
    ...profile,
    id: String(studentId),
    name: fullName,
    semester: /^[12]$/.test(String(profile.semester))
      ? `Semester ${profile.semester}` : profile.semester ?? "",
    grades: grades
      .filter(grade => String(grade.studentId) === String(studentId))
      .map(grade => ({ ...grade, score: grade.score ?? grade.average }))
  }));

  render();
} catch {
  document.querySelectorAll("input, select, button").forEach(control => control.disabled = true);
  notify("Unable to load student records. Check browser storage before editing.");
}

function setGrade(records, id, subject, score, semester, academicYear) {
  return records.map(student => {
    if (student.id !== id) return student;

    const term = String(semester ?? student.semester ?? "")
      .replace(/^Semester\s+/i, "");
    const year = academicYear ?? student.academicYear ?? "";

    const grades = student.grades.filter(entry => {
      const entryTerm = String(entry.semester ?? student.semester ?? "")
        .replace(/^Semester\s+/i, "");
      const entryYear = entry.academicYear ?? student.academicYear ?? "";

      return !(entry.subject.toLowerCase() === subject.toLowerCase()
        && entryTerm === term && entryYear === year);
    });

    return {
      ...student,
      grades: [...grades, { subject, score, semester: term, academicYear: year }]
    };
  });
}

byId("upload").onsubmit = async event => {
  event.preventDefault();
  const file = byId("csv").files[0];
  if (!file) return;
  try {
    const lines = (await file.text()).trim().split(/\r?\n/);
    if (lines.shift().trim().toLowerCase() !== "studentid,subject,score" || !lines.length)
      return notify("Include the studentId,subject,score header and at least one grade.");
    let next = students;
    for (const [index, line] of lines.entries()) {
      const fields = line.split(",").map(field => field.trim());
      const [rawId, subject, value] = fields;
      const id = rawId.toUpperCase();
      const score = Number(value);
      if (fields.length !== 3 || !students.some(student => student.id === id) ||
          !subject || subject.length > 60 || !/^\d+(?:\.\d)?$/.test(value) || score > 100)
        return notify("Check row " + (index + 2) + ". No grades were imported.");
      next = setGrade(next, id, subject, score);
    }
    if (save(next)) {
      byId("upload").reset();
      notify("Imported " + lines.length + " grade records.");
    }
  } catch {
    notify("Unable to read the grades file.");
  }
};
