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
/* login.js, connects login form (id="Form") to auth.js */
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("Form");
  if (!form) return;            // not the login page

  await initDatabase();            // seed defaults first

  // Already logged in you skip the form
  const existing = getSession();
  if (existing && Rolehomepages[existing.role]) {
    window.location.replace(Rolehomepages[existing.role]);
    return;
  }

  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");

  // The form has no general-error element, so it is created here
  const formError = makeErrorElement("formError", form.querySelector("button"), "beforebegin");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();                  // stop the page reloading

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();

    setText("nameError", "");
    setText("emailError", "");
    formError.textContent = "";

    let valid = true;
    if (fullName.length < 3) {
      setText("nameError", "Enter your full name.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setText("emailError", "Enter a valid email address.");
      valid = false;
    }
    if (!valid) return;

    const result = await login(fullName, email);
    if (!result.ok) {
      formError.textContent = result.message;
      return;
    }
    window.location.replace(Rolehomepages[result.role]);
  });
});

function setText(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}
// Creates a small class="error"
// position is "beforebegin" or "afterend"
function makeErrorElement(id, anchor, position) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("small");
    el.id = id;
    el.className = "error";
    anchor.insertAdjacentElement(position, el);
  }
  return el;
}
