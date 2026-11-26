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

// Existing shared database helpers are provided by storage.js and auth.js.
const byId = id => document.getElementById(id);
const registryKey = "cit2011.students.v1";

let registeredStudents = [];
let savedGrades = [];
let assignedSubjects = [];
let teacherSession = null;

function showMessage(id, message, type = "") {
    const element = byId(id);
    if (!element) return;
    element.textContent = message;
    element.className = "message" + (type ? " " + type : "");
}

function normalizeSemester(value) {
    return String(value || "").replace(/^Semester\s*/i, "").trim();
}

function validAcademicYear(value) {
    const match = /^(\d{4})-(\d{4})$/.exec(String(value).trim());
    return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

function canonicalStudent(student, source) {
    if (source === "registry") {
        return {
            studentId: String(student.id ?? "").trim(),
            fullName: String(student.name ?? "").trim(),
            classForm: student.classForm || "",
            academicYear: student.academicYear || "",
            semester: normalizeSemester(student.semester || "")
        };
    }
    return {
        studentId: String(student.studentId ?? student.id ?? "").trim(),
        fullName: String(student.fullName ?? student.name ?? "").trim(),
        classForm: student.classForm || student.grade || "",
        academicYear: student.academicYear || "",
        semester: normalizeSemester(student.semester || "")
    };
}

function loadRegisteredStudents() {
    const byStudentId = new Map();

    const sharedStudents = dbGet(DBkeys.STUDENTS, []);
    if (Array.isArray(sharedStudents)) {
        sharedStudents.forEach(student => {
            const normalized = canonicalStudent(student, "shared");
            if (normalized.studentId && normalized.fullName) {
                byStudentId.set(normalized.studentId, normalized);
            }
        });
    }

    const registryStudents = dbGet(registryKey, []);
    if (Array.isArray(registryStudents)) {
        registryStudents.forEach(student => {
            const normalized = canonicalStudent(student, "registry");
            if (normalized.studentId && normalized.fullName) {
                // The administrator registry is the more recently maintained record.
                byStudentId.set(normalized.studentId, normalized);
            }
        });
    }

    return [...byStudentId.values()].sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
    );
}

function subjectName(value) {
    if (typeof value === "string" || typeof value === "number") {
        return String(value).trim();
    }
    if (!value || typeof value !== "object") return "";
    return String(value.name ?? value.subjectName ?? value.title ??
        value.subject ?? value.label ?? "").trim();
}

function subjectId(value) {
    if (!value || typeof value !== "object") return "";
    return String(value.id ?? value.subjectId ?? value.code ?? "").trim();
}

function listValues(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
}

function valuesFromAssignmentRecord(record) {
    if (!record || typeof record !== "object") return [];
    return [
        ...listValues(record.assignedSubjects),
        ...listValues(record.subjects),
        ...listValues(record.subjectIds),
        ...listValues(record.assignedSubjectIds),
        ...listValues(record.subject),
        ...listValues(record.subjectName)
    ];
}

function recordMatchesTeacher(record, session) {
    if (!record || typeof record !== "object") return false;
    const email = String(session.id || "").toLowerCase();
    const identifiers = [
        record.email, record.teacherEmail, record.userEmail,
        record.teacherId, record.userId, record.id
    ].filter(value => value !== undefined && value !== null)
     .map(value => String(value).toLowerCase());

    return identifiers.includes(email);
}

function recordAssignsTeacher(record, session) {
    if (!record || typeof record !== "object") return false;
    const email = String(session.id || "").toLowerCase();
    const teacherValues = [
        ...listValues(record.teacherEmail),
        ...listValues(record.teacherEmails),
        ...listValues(record.teacherId),
        ...listValues(record.teacherIds),
        ...listValues(record.teacher),
        ...listValues(record.assignedTeacher),
        ...listValues(record.assignedTo)
    ].map(value => {
        if (value && typeof value === "object") {
            return String(value.email ?? value.id ?? value.teacherId ?? "").toLowerCase();
        }
        return String(value).toLowerCase();
    });
    return teacherValues.includes(email);
}

function loadAssignedSubjects() {
    const teachers = dbGet(DBkeys.TEACHERS, []);
    const users = dbGet(DBkeys.USERS, []);
    const subjectRecords = dbGet(DBkeys.SUBJECTS, []);

    const teacherRecord = Array.isArray(teachers)
        ? teachers.find(record => recordMatchesTeacher(record, teacherSession))
        : null;
    const userRecord = Array.isArray(users)
        ? users.find(record =>
            String(record.email || "").toLowerCase() === String(teacherSession.id || "").toLowerCase()
        )
        : null;

    const assignmentValues = [
        ...valuesFromAssignmentRecord(teacherRecord),
        ...valuesFromAssignmentRecord(userRecord)
    ];

    const catalog = Array.isArray(subjectRecords) ? subjectRecords : [];
    const assigned = new Map();

    // Subject records may store the teacher reference directly.
    catalog.forEach(record => {
        if (record && typeof record === "object" && recordAssignsTeacher(record, teacherSession)) {
            const name = subjectName(record);
            const id = subjectId(record);
            if (name) assigned.set(name.toLowerCase(), name);
            else if (id) assigned.set(id.toLowerCase(), id);
        }
    });

    // Teacher/user records may instead store a list of assigned subject names or IDs.
    assignmentValues.forEach(value => {
        const valueName = subjectName(value);
        const valueId = value && typeof value === "object" ? subjectId(value) : "";
        const token = (valueId || valueName || String(value || "")).trim().toLowerCase();
        if (!token) return;

        const match = catalog.find(item => {
            const name = subjectName(item).toLowerCase();
            const id = subjectId(item).toLowerCase();
            return token === name || token === id;
        });

        const finalName = match ? subjectName(match) : valueName || String(value).trim();
        if (finalName) assigned.set(finalName.toLowerCase(), finalName);
    });

    return [...assigned.values()].sort((a, b) => a.localeCompare(b));
}

function loadExistingGrades() {
    const fromDatabase = dbGet(DBkeys.GRADES, []);
    const records = Array.isArray(fromDatabase) ? fromDatabase.slice() : [];

    // Include older grade entries saved inside the administrator's student registry.
    registeredStudents.forEach(student => {
        const registryStudent = dbGet(registryKey, []).find(item =>
            String(item.id) === student.studentId
        );
        const oldGrades = registryStudent && Array.isArray(registryStudent.grades)
            ? registryStudent.grades : [];

        oldGrades.forEach(old => {
            const semester = normalizeSemester(old.semester || student.semester);
            const academicYear = old.academicYear || student.academicYear;
            const exists = records.some(record =>
                String(record.studentId ?? record.id) === student.studentId &&
                String(record.subject || "").toLowerCase() === String(old.subject || "").toLowerCase() &&
                normalizeSemester(record.semester) === semester &&
                String(record.academicYear || "") === String(academicYear || "")
            );
            if (!exists && old.subject) {
                const score = Number(old.score ?? old.average ?? old.grade);
                records.push({
                    studentId: student.studentId,
                    subject: old.subject,
                    semester,
                    academicYear,
                    coursework: Number.isFinite(Number(old.coursework)) ? Number(old.coursework) : score,
                    exam: Number.isFinite(Number(old.exam)) ? Number(old.exam) : score,
                    average: score,
                    grade: old.gradeLetter || letterGrade(score)
                });
            }
        });
    });

    return records;
}

function letterGrade(average) {
    if (average >= 80) return "A";
    if (average >= 70) return "B";
    if (average >= 60) return "C";
    if (average >= 50) return "D";
    return "F";
}

function calculateAverage(coursework, exam) {
    // Preserve the original instructor calculation.
    return (coursework + exam) / 2;
}

function selectedPeriod() {
    return {
        subject: byId("subjectSelect").value,
        semester: normalizeSemester(byId("semesterSelect").value),
        academicYear: byId("academicYear").value.trim()
    };
}

function periodGrades() {
    const period = selectedPeriod();
    if (!period.subject || !validAcademicYear(period.academicYear)) return [];
    return savedGrades.filter(record =>
        String(record.subject).toLowerCase() === period.subject.toLowerCase() &&
        normalizeSemester(record.semester) === period.semester &&
        String(record.academicYear) === period.academicYear
    );
}

function renderStudentEntryTable() {
    const body = byId("studentEntryTable");
    body.replaceChildren();

    const period = selectedPeriod();
    const filteredStudents = registeredStudents.filter(student =>
        student.semester === period.semester &&
        student.academicYear === period.academicYear
    );

    if (!filteredStudents.length) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = "No registered students found for the selected semester and academic year.";
        return;
    }

    filteredStudents.forEach(student => {
        const row = body.insertRow();
        row.insertCell().textContent = student.studentId;
        row.insertCell().textContent = student.fullName;

        const courseworkCell = row.insertCell();
        const courseworkInput = document.createElement("input");
        courseworkInput.type = "number";
        courseworkInput.min = "0";
        courseworkInput.max = "100";
        courseworkInput.step = "0.1";
        courseworkInput.className = "coursework-input";
        courseworkInput.dataset.studentId = student.studentId;
        courseworkInput.setAttribute("aria-label", "Coursework for " + student.fullName);
        courseworkCell.appendChild(courseworkInput);

        const examCell = row.insertCell();
        const examInput = document.createElement("input");
        examInput.type = "number";
        examInput.min = "0";
        examInput.max = "100";
        examInput.step = "0.1";
        examInput.className = "exam-input";
        examInput.dataset.studentId = student.studentId;
        examInput.setAttribute("aria-label", "Exam for " + student.fullName);
        examCell.appendChild(examInput);
    });
}

function populateSubjectSelect() {
    const select = byId("subjectSelect");
    select.replaceChildren(new Option("-- Select assigned subject --", ""));

    assignedSubjects.forEach(subject => {
        select.add(new Option(subject, subject));
    });

    const hasSubjects = assignedSubjects.length > 0;
    select.disabled = !hasSubjects;
    byId("saveGradesBtn").disabled = !hasSubjects;

    if (!hasSubjects) {
        showMessage("subjectMessage",
            "No assigned subjects were found for this teacher. Ask an administrator to assign subjects before entering grades.",
            "error");
    } else {
        showMessage("subjectMessage", "Only subjects assigned to your teacher account are available.", "success");
    }
}

function renderGradeRecords() {
    const body = byId("gradeTable");
    body.replaceChildren();
    const records = periodGrades();

    records.forEach(record => {
        const student = registeredStudents.find(item =>
            item.studentId === String(record.studentId ?? record.id)
        );
        const row = body.insertRow();
        [
            student ? student.fullName : (record.studentName || "Former Student"),
            String(record.studentId ?? record.id ?? ""),
            record.coursework,
            record.exam,
            Number(record.average).toFixed(2) + "%",
            record.grade,
            "Semester " + normalizeSemester(record.semester),
            record.academicYear
        ].forEach(value => {
            row.insertCell().textContent = value ?? "";
        });
    });

    if (!records.length) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = "No grade records found for this subject and academic period.";
    }
}

function updateMetrics() {
    const records = periodGrades();
    const total = records.length;
    const average = total
        ? records.reduce((sum, record) => sum + Number(record.average || 0), 0) / total
        : 0;
    const passed = records.filter(record => Number(record.average) >= 50).length;
    const passRate = total ? (passed / total) * 100 : 0;

    byId("totalStudents").textContent = total;
    byId("classAverage").textContent = average.toFixed(2) + "%";
    byId("passRate").textContent = passRate.toFixed(2) + "%";
}

function refreshDashboard() {
    renderGradeRecords();
    updateMetrics();
}

function saveBatchGrades(event) {
    event.preventDefault();

    const period = selectedPeriod();
    if (!period.subject || !assignedSubjects.some(subject =>
        subject.toLowerCase() === period.subject.toLowerCase()
    )) {
        showMessage("gradeMessage", "Select a subject assigned to your account.", "error");
        return;
    }
    if (!validAcademicYear(period.academicYear)) {
        showMessage("gradeMessage", "Enter a valid academic year, such as 2026-2027.", "error");
        return;
    }

    const courseworkInputs = [...document.querySelectorAll(".coursework-input")];
    const examInputs = [...document.querySelectorAll(".exam-input")];
    const examById = new Map(examInputs.map(input => [input.dataset.studentId, input]));
    const entries = [];

    for (const courseworkInput of courseworkInputs) {
        const examInput = examById.get(courseworkInput.dataset.studentId);
        const courseworkRaw = courseworkInput.value.trim();
        const examRaw = examInput ? examInput.value.trim() : "";

        if (!courseworkRaw && !examRaw) continue;
        if (!courseworkRaw || !examRaw) {
            showMessage("gradeMessage", "Enter both coursework and exam marks for each student, or leave both blank.", "error");
            return;
        }

        const coursework = Number(courseworkRaw);
        const exam = Number(examRaw);
        if (!Number.isFinite(coursework) || !Number.isFinite(exam) ||
            coursework < 0 || coursework > 100 || exam < 0 || exam > 100) {
            showMessage("gradeMessage", "All grades must be numbers between 0 and 100.", "error");
            return;
        }

        const student = registeredStudents.find(item =>
            item.studentId === courseworkInput.dataset.studentId
        );
        if (!student) {
            showMessage("gradeMessage", "A selected student is no longer registered. Refresh the page.", "error");
            return;
        }

        const average = calculateAverage(coursework, exam);
        entries.push({
            studentId: student.studentId,
            studentName: student.fullName,
            subject: period.subject,
            semester: period.semester,
            academicYear: period.academicYear,
            coursework,
            exam,
            average,
            grade: letterGrade(average)
        });
    }

    if (!entries.length) {
        showMessage("gradeMessage", "Enter marks for at least one student before saving.", "error");
        return;
    }

    // Replace a matching student/subject/semester/year record instead of creating a duplicate.
    const next = savedGrades.slice();
    entries.forEach(entry => {
        const existingIndex = next.findIndex(record =>
            String(record.studentId ?? record.id) === entry.studentId &&
            String(record.subject || "").toLowerCase() === entry.subject.toLowerCase() &&
            normalizeSemester(record.semester) === entry.semester &&
            String(record.academicYear || "") === entry.academicYear
        );
        if (existingIndex >= 0) next[existingIndex] = entry;
        else next.push(entry);
    });

    if (!dbSet(DBkeys.GRADES, next)) {
        showMessage("gradeMessage", "Unable to save grades. Check available browser storage.", "error");
        return;
    }

    savedGrades = next;
    courseworkInputs.forEach(input => { input.value = ""; });
    examInputs.forEach(input => { input.value = ""; });
    refreshDashboard();
    showMessage("gradeMessage", "Saved " + entries.length + " grade record(s). Existing matching records were updated.", "success");
}

function populateReportStudent() {
    const select = byId("reportStudent");
    select.replaceChildren(new Option("Choose a registered student", ""));
    registeredStudents.forEach(student => {
        select.add(new Option(student.fullName + " (" + student.studentId + ")", student.studentId));
    });
}

function generateReportCard() {
    const studentId = byId("reportStudent").value;
    const student = registeredStudents.find(item => item.studentId === studentId);
    if (!student) {
        showMessage("pageMessage", "Select a registered student first.", "error");
        return;
    }

    const period = selectedPeriod();
    if (!validAcademicYear(period.academicYear)) {
        showMessage("pageMessage", "Enter a valid academic year before generating the report card.", "error");
        return;
    }

    const records = savedGrades.filter(record =>
        String(record.studentId ?? record.id) === studentId &&
        normalizeSemester(record.semester) === period.semester &&
        String(record.academicYear) === period.academicYear
    );

    byId("reportName").textContent = student.fullName;
    byId("reportId").textContent = student.studentId;
    byId("reportClass").textContent = student.classForm || "Not assigned";
    byId("reportSemester").textContent = "Semester " + period.semester;
    byId("reportYear").textContent = period.academicYear;

    const body = byId("reportGrades");
    body.replaceChildren();

    records.forEach(record => {
        const row = body.insertRow();
        [
            record.subject,
            record.coursework,
            record.exam,
            Number(record.average).toFixed(2) + "%",
            record.grade
        ].forEach(value => row.insertCell().textContent = value ?? "");
    });

    if (!records.length) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = "No grades recorded for this student in the selected semester and academic year.";
        byId("reportSummary").textContent = "";
    } else {
        const average = records.reduce((sum, record) => sum + Number(record.average || 0), 0) / records.length;
        byId("reportSummary").textContent =
            "Overall average: " + average.toFixed(2) + "% across " + records.length + " subject(s).";
    }

    byId("reportCard").hidden = false;
    byId("printReport").disabled = false;
    showMessage("pageMessage", "Report card generated.", "success");
}

function initializeInstructor() {
    if (typeof DBkeys === "undefined" || typeof dbGet !== "function" || typeof dbSet !== "function") {
        showMessage("pageMessage", "The shared storage scripts could not be loaded. Check the script paths in instructor.html.", "error");
        return;
    }

    teacherSession = typeof getSession === "function" ? getSession() : null;
    if (!teacherSession || teacherSession.role !== "teacher") {
        showMessage("pageMessage", "A valid teacher session is required.", "error");
        return;
    }

    registeredStudents = loadRegisteredStudents();
    assignedSubjects = loadAssignedSubjects();
    savedGrades = loadExistingGrades();

    populateSubjectSelect();
    renderStudentEntryTable();
    populateReportStudent();
    refreshDashboard();

    byId("gradeForm").addEventListener("submit", saveBatchGrades);
    byId("subjectSelect").addEventListener("change", refreshDashboard);
    byId("semesterSelect").addEventListener("change", () => {
        renderStudentEntryTable();
        refreshDashboard();
    });
    byId("academicYear").addEventListener("input", () => {
        renderStudentEntryTable();
        refreshDashboard();
    });
    byId("generateReport").addEventListener("click", generateReportCard);
    byId("printReport").addEventListener("click", () => {
        if (!byId("reportCard").hidden) window.print();
    });

    // Suggest the academic year already recorded for the first registered student.
    const year = registeredStudents.find(student => validAcademicYear(student.academicYear));
    if (year) byId("academicYear").value = year.academicYear;
    renderStudentEntryTable();
    refreshDashboard();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeInstructor);
} else {
    initializeInstructor();
}