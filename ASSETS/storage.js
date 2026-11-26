// Shamar Brown, 2501074.
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

  const students = dbGet(DBkeys.STUDENTS);
  if (!Array.isArray(students) || students.length === 0) {
    dbSet(DBkeys.STUDENTS, [
      { studentId: "2026101", fullName: "John Doe",
        email: "john.doe@example.com", grade: "10" }
    ]);
  }
  // Empty arrays so pages never read null
  [DBkeys.TEACHERS, DBkeys.SUBJECTS, DBkeys.GRADES, DBkeys.TRANSACTIONS].forEach(key => {
    if (localStorage.getItem(key) === null) {
      dbSet(key, []);
    }
  });
}
