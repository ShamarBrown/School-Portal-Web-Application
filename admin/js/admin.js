// David Scott, 2507305. Group names and lab times pending.
"use strict";
const byId = id => document.getElementById(id);
// The registry and grade table share one browser storage record.
const storageKey = "cit2011.students.v1";
let students = [];
let editingId = null;
function notify(message) {
  byId("message").textContent = message;
}
function save(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    notify("Unable to save. Check browser storage permissions.");
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
      const cell = addRow(grades, [student.id, grade.subject, grade.score]).insertCell();
      action(cell, "Edit grade", () => {
        choices.value = student.id;
        byId("subject").value = grade.subject;
        byId("score").value = grade.score;
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
    const cell = addRow(rows, [student.id, student.name, student.semester]).insertCell();
    action(cell, "Edit", () => {
      editingId = student.id;
      byId("studentId").value = student.id;
      byId("studentId").readOnly = true;
      byId("fullName").value = student.name;
      byId("semester").value = student.semester;
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
  if (!rows.rows.length) addRow(rows, ["No students in this view."]).cells[0].colSpan = 4;
  if (!grades.rows.length) addRow(grades, ["No grades recorded."]).cells[0].colSpan = 4;
}
byId("cancel").onclick = clearForm;
byId("filter").onchange = render;
byId("registry").onsubmit = event => {
  event.preventDefault();
  const id = byId("studentId").value.trim().toUpperCase();
  const name = byId("fullName").value.trim();
  const semester = byId("semester").value;
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(id)) return notify("Use letters, numbers, hyphens or underscores for the student ID.");
  if (!name) return notify("Enter a student ID and full name.");
  if (!editingId && students.some(student => student.id === id)) return notify("That student ID already exists.");
  const next = editingId
    ? students.map(student => student.id === editingId ? { ...student, name, semester } : student)
    : [...students, { id, name, semester, grades: [] }];
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
  const next = setGrade(students, id, subject, score);
  if (save(next)) {
    byId("gradeForm").reset();
    notify("Grade saved.");
  }
};
try {
  const stored = localStorage.getItem(storageKey);
  students = stored === null ? [] : JSON.parse(stored);
  render();
} catch {
  document.querySelectorAll("input, select, button").forEach(control => control.disabled = true);
  notify("Unable to load student records. Check browser storage before editing.");
}

function setGrade(records, id, subject, score) {
  return records.map(student => {
    if (student.id !== id) return student;
    const grades = student.grades.filter(entry => entry.subject.toLowerCase() !== subject.toLowerCase());
    return { ...student, grades: [...grades, { subject, score }] };
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
