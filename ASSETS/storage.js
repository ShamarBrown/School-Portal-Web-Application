// Shamar Brown, 2501074, Jonique Walker 2409374, David Scott 2507305, Rojaughn Murdock 2505175, Damario 2507304
/* storage.js, storage helpers and first-run seeding */
const DBkeys = {
  USERS: "mc-users",       //admin + teacher accounts     
  STUDENTS: "mc-students",      
  TEACHERS: "mc-teachers",
  SUBJECTS: "mc-subjects",
  GRADES: "mc-grades",
  TRANSACTIONS: "mc-transactions",
  SESSION: "mc-session",   //clears when tab closes   
  LOCKOUT: "mc-lockout"         
};

// Default data used to seed the database
// Subject names match the subjects on the instructor dashboard
const DEFAULT_SUBJECTS = [
  { subjectId: "SUB001", name: "Programming" },
  { subjectId: "SUB002", name: "Mathematics" },
  { subjectId: "SUB003", name: "Computer Networks" }
];

// The sample teacher and the subjects they teach
const DEFAULT_TEACHERS = [
  { teacherId: "T001", fullName: "Sample Teacher", email: "teacher@munrocollege.edu.jm",
    subjects: ["Programming", "Mathematics", "Computer Networks"] }
];

// The sample student, with the same fields the admin registry uses
const SAMPLE_STUDENT = {
  studentId: "2026101", fullName: "John Doe", email: "john.doe@example.com", grade: "10",
  classForm: "Form 3A", semester: "Semester 1", academicYear: "2026-2027"
};

//returns a fallback instead of crashing on corrupt or empty data
function dbGet(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Error retrieving data from localStorage", key);
    return fallback;
  }
}
//return true if sucessful and false is storage is full
function dbSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Error setting data in localStorage", key);
    return false;
  }
}
// Seeds default data on first load only
async function initDatabase() {
  const users = dbGet(DBkeys.USERS);
  if (!Array.isArray(users) || users.length === 0) {
    dbSet(DBkeys.USERS, [
      { fullName: "System Admin", email: "admin@munrocollege.edu.jm", role: "admin" },
      { fullName: "Sample Teacher", email: "teacher@munrocollege.edu.jm", role: "teacher" }
    ]);
  }

  // Students: seed the sample student, or add any missing fields to an old copy
  const students = dbGet(DBkeys.STUDENTS);
  if (!Array.isArray(students) || students.length === 0) {
    dbSet(DBkeys.STUDENTS, [SAMPLE_STUDENT]);
  } else {
    const sample = students.find(s => String(s.studentId) === SAMPLE_STUDENT.studentId);
    if (sample) {
      let changed = false;
      ["classForm", "semester", "academicYear"].forEach(field => {
        if (!sample[field]) {
          sample[field] = SAMPLE_STUDENT[field];
          changed = true;
        }
      });
      if (changed) dbSet(DBkeys.STUDENTS, students);
    }
  }

  // Subjects: an empty list (new or from an older version) gets the defaults
  const subjects = dbGet(DBkeys.SUBJECTS);
  if (!Array.isArray(subjects) || subjects.length === 0) {
    dbSet(DBkeys.SUBJECTS, DEFAULT_SUBJECTS);
  }

  // Teachers: seed the sample teacher, or give an existing one their subjects
  const teachers = dbGet(DBkeys.TEACHERS);
  if (!Array.isArray(teachers) || teachers.length === 0) {
    dbSet(DBkeys.TEACHERS, DEFAULT_TEACHERS);
  } else {
    const sampleTeacher = teachers.find(t =>
      String(t.email).toLowerCase() === DEFAULT_TEACHERS[0].email);
    if (sampleTeacher && (!Array.isArray(sampleTeacher.subjects) || sampleTeacher.subjects.length === 0)) {
      sampleTeacher.subjects = DEFAULT_TEACHERS[0].subjects;
      dbSet(DBkeys.TEACHERS, teachers);
    }
  }

  // Empty lists so pages never read null
  [DBkeys.GRADES, DBkeys.TRANSACTIONS].forEach(key => {
    if (localStorage.getItem(key) === null) {
      dbSet(key, []);
    }
  });
}