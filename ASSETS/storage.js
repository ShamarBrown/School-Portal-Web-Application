const DBkeys = {
  USERS: "mc-users",            
  STUDENTS: "mc-students",      
  TEACHERS: "mc-teachers",
  SUBJECTS: "mc-subjects",
  GRADES: "mc-grades",
  TRANSACTIONS: "mc-transactions",
  SESSION: "mc-session",        
  LOCKOUT: "mc-lockout"         
};

function dbGet(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn("Error retrieving data from localStorage", key);
    return fallback;
  }
}

function dbSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Error setting data in localStorage", key);
    return false;
  }
}

async function hashText(text) {
  if (window.crypto && window.crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  
  let hash = 5381;
  for (const char of text) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return "f" + hash.toString(16);
}

async function initDatabase() {
  const users = dbGet(DBkeys.USERS);
  if (!Array.isArray(users) || users.length === 0) {
    dbSet(DBkeys.USERS, [
      { fullName: "System Admin", email: "admin@munrocollege.edu.jm",
        role: "admin", idHash: await hashText("ADMIN001") },
      { fullName: "Sample Teacher", email: "teacher@munrocollege.edu.jm",
        role: "teacher", idHash: await hashText("TCH001") }
    ]);
  }

  const students = dbGet(DBkeys.STUDENTS);
  if (!Array.isArray(students) || students.length === 0) {
    dbSet(DBkeys.STUDENTS, [
      { studentId: "2026101", fullName: "John Doe",
        email: "john.doe@example.com", grade: "10" }
    ]);
  }

  [DBkeys.TEACHERS, DBkeys.SUBJECTS, DBkeys.GRADES, DBkeys.TRANSACTIONS].forEach(key => {
    if (localStorage.getItem(key) === null) {
      dbSet(key, []);
    }
  });
}
