/* auth.js, login, session, lockout, role guard */
const Session_Minutes = 30;
const Max_attempts = 3;
const lockout_seconds = 30;

const Rolehomepages = {
  admin: "admin-dashboard.html",
  teacher: "teacher-dashboard.html",
  student: "student-dashboard.html"
};
//lockout code
function getLockoutremaining() {
  const lockout = dbGet(DBkeys.LOCKOUT, { attempts: 0, expires: 0 });
  const remaining = Math.ceil((lockout.expires - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

function recordFailedAttempt() {
  const lockout = dbGet(DBkeys.LOCKOUT, { attempts: 0, expires: 0 });
  lockout.attempts += 1;
  if (lockout.attempts >= Max_attempts) {
    lockout.expires = Date.now() + lockout_seconds * 1000;
    lockout.attempts = 0;
  }
  dbSet(DBkeys.LOCKOUT, lockout);
}

function clearLockout() {
  localStorage.removeItem(DBkeys.LOCKOUT);
}
//session code
function createSession(id, fullName, role) {
  sessionStorage.setItem(DBkeys.SESSION, JSON.stringify({
    id: id,
    fullName: fullName,
    role: role,
    expires: Date.now() + Session_Minutes * 60 * 1000
  }));
}
// Returns the session if missing/expired/corrupt it returns null
function getSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(DBkeys.SESSION));
    if (session && Date.now() < session.expires) return session;
  } catch (error) {
    console.warn("Session data unreadable.");
  }
  return null;
}
// Login, role is found from the matching record
// Returns ok: true it returns the role but if ok: false it returns message
async function login(fullName, email, idNumber) {
  const wait = getLockoutremaining();
  if (wait > 0) {
    return { ok: false, message: `Too many failed attempts. Please wait ${wait} seconds.` };
  }

  const name = fullName.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  const id = idNumber.trim();
  // Staff (admin / teacher): the ID is compared as a hash
  const idHash = await hashText(id);
  const staff = dbGet(DBkeys.USERS).find(u =>
    String(u.fullName).trim().toLowerCase() === name &&
    String(u.email).trim().toLowerCase() === mail &&
    u.idHash === idHash
  );
  if (staff) {
    clearLockout();
    createSession(id, staff.fullName, staff.role);
    return { ok: true, role: staff.role };
  }
  // Students
  const student = dbGet(DBkeys.STUDENTS).find(s =>
    String(s.studentId).trim() === id &&
    String(s.email).trim().toLowerCase() === mail &&
    String(s.fullName).trim().toLowerCase() === name
  );
  if (student) {
    clearLockout();
    createSession(String(student.studentId), student.fullName, "student");
    return { ok: true, role: "student" };
  }

  recordFailedAttempt();
  return { ok: false, message: "Those details don't match any account." };
}
//Logout and route guard
function logout() {
  sessionStorage.removeItem(DBkeys.SESSION);
  window.location.replace("index.html");
}

function requireRole(allowedRoles) {
  const session = getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    sessionStorage.removeItem(DBkeys.SESSION);
    window.location.replace("index.html");
    return false;
  }
  return true;
}
// One call per protected page: guard/back-button fix/logout button
function guardPage(allowedRoles) {
  requireRole(allowedRoles);
  window.addEventListener("pageshow", () => requireRole(allowedRoles));

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
}
