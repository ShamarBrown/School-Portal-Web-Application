// Shamar Brown, 2501074.
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
  const idInput = document.getElementById("ID");
 
  // The form has no ID-error or general-error element, so they are create here
  const idError = makeErrorElement("idError", idInput, "afterend");
  const formError = makeErrorElement("formError", form.querySelector("button"), "beforebegin");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();                  // stop the page reloading 

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const idNumber = idInput.value.trim();

    setText("nameError", "");
    setText("emailError", "");
    idError.textContent = "";
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
    if (!/^[A-Za-z0-9-]{4,15}$/.test(idNumber)) {
      idError.textContent = "ID must be 4-15 letters, numbers or hyphens.";
      valid = false;
    }
    if (!valid) return;

    const result = await login(fullName, email, idNumber);
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
// Creates a <small class="error"> 
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
