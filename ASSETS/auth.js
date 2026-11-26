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
//auth.js, login, session, lockout, role guard
const Session_Minutes = 30;
const Max_attempts = 3;
const lockout_seconds = 30;
const Expiry_check_seconds = 10; //How often the page rechecks the session

const Rolehomepages = {
  admin: "admin.html",
  teacher: "instructor.html",
  student: "reports.html"
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
async function login(fullName, email) {
  const wait = getLockoutremaining();
  if (wait > 0) {
    return { ok: false, message: `Too many failed attempts. Please wait ${wait} seconds.` };
  }

  const name = fullName.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  // Staff (admin / teacher)
  const staff = dbGet(DBkeys.USERS).find(u =>
    String(u.fullName).trim().toLowerCase() === name &&
    String(u.email).trim().toLowerCase() === mail
  );
  if (staff) {
    clearLockout();
    createSession(staff.email, staff.fullName, staff.role);
    return { ok: true, role: staff.role };
  }
  // Students
  const student = dbGet(DBkeys.STUDENTS).find(s =>
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
  if (!session) {
    window.location.replace("index.html");
    return false;
  }
  // Logged in but not allowed here: go to their own page, stay logged in
  if (!allowedRoles.includes(session.role)) {
    window.location.replace(Rolehomepages[session.role] || "index.html");
    return false;
  }
  return true;
}
// One call per protected page: guard/back-button fix/logout button
function guardPage(allowedRoles) {
  requireRole(allowedRoles);
  window.addEventListener("pageshow", () => requireRole(allowedRoles));
// A page left open can outlive its session so recheck every few seconds
  setInterval(() => requireRole(allowedRoles), Expiry_check_seconds * 1000);
  // It also checks when the user returns to the tab
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requireRole(allowedRoles);
  });

  // Add the logout button once the page has finished loading
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLogoutButton);
  } else {
    setupLogoutButton();
  }
}

// Uses the page's own #logoutBtn if it has one, otherwise adds a button to the header
function setupLogoutButton() {
  let logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) {
    logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.type = "button";
    logoutBtn.textContent = "Log out";
    (document.querySelector("header") || document.body).appendChild(logoutBtn);
  }
  logoutBtn.addEventListener("click", logout);
}
