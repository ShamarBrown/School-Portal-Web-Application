// Temporary student records
let students = [
    { id: "ST001", name: "John Brown", class: "10A" },
    { id: "ST002", name: "David Smith", class: "10B" },
    { id: "ST003", name: "James Williams", class: "11A" }
];

// Load records from localStorage
let grades = JSON.parse(localStorage.getItem("grades")) || [];
let tuition = JSON.parse(localStorage.getItem("tuition")) || [];
let payments = JSON.parse(localStorage.getItem("payments")) || [];

let selectedStudent = null;

// Format currency
function currency(amount) {
    return "JMD $" + amount.toFixed(2);
}

// Populate class filter
function loadClasses() {
    let classes = [...new Set(students.map(s => s.class))];

    classes.forEach(className => {
        document.getElementById("classFilter").add(
            new Option(className, className)
        );
    });
}

// Search and display students
function displayStudents() {
    let search = document.getElementById("studentSearch")
        .value.toLowerCase();

    let classFilter = document.getElementById("classFilter").value;
    let body = document.getElementById("studentBody");

    body.innerHTML = "";

    students.forEach(student => {

        let matchesSearch =
            student.name.toLowerCase().includes(search) ||
            student.id.toLowerCase().includes(search);

        let matchesClass =
            classFilter === "all" || student.class === classFilter;

        if (matchesSearch && matchesClass) {
            let row = body.insertRow();

            row.insertCell().textContent = student.id;
            row.insertCell().textContent = student.name;
            row.insertCell().textContent = student.class;

            let button = document.createElement("button");
            button.textContent = "View Profile";

            button.addEventListener("click", function() {
                viewProfile(student.id);
            });

            row.insertCell().appendChild(button);
        }
    });

    if (body.rows.length === 0) {
        body.innerHTML =
            '<tr><td colspan="4">No students found.</td></tr>';
    }
}

// Display student profile
function viewProfile(studentId) {
    selectedStudent = students.find(s => s.id === studentId);

    if (!selectedStudent) return;

    document.getElementById("profileId").textContent =
        selectedStudent.id;

    document.getElementById("profileName").textContent =
        selectedStudent.name;

    document.getElementById("profileClass").textContent =
        selectedStudent.class;

    document.getElementById("studentProfile").hidden = false;
    document.getElementById("academicRecords").hidden = false;
    document.getElementById("financialRecords").hidden = false;

    displayAcademicRecords();
    displayFinancialRecords();
}

// Display academic records
function displayAcademicRecords() {
    let body = document.getElementById("academicBody");
    let semester = document.getElementById("semesterFilter").value;

    body.innerHTML = "";

    let records = grades.filter(g =>
        g.studentId === selectedStudent.id &&
        (semester === "all" || String(g.semester) === semester)
    );

    records.forEach(record => {
        let row = body.insertRow();

        row.insertCell().textContent = record.subject;
        row.insertCell().textContent = record.semester;
        row.insertCell().textContent = record.grade;
    });

    if (records.length === 0) {
        body.innerHTML =
            '<tr><td colspan="3">No academic records found.</td></tr>';
    }
}

// Determine payment status
function getStatus(amount, paid) {
    if (paid >= amount) {
        return "Paid";
    } else if (paid > 0) {
        return "Pending";
    } else {
        return "Outstanding";
    }
}

// Display financial records
function displayFinancialRecords() {
    let body = document.getElementById("financialBody");
    let semester = document.getElementById("semesterFilter").value;

    body.innerHTML = "";

    let records = tuition.filter(t =>
        t.studentId === selectedStudent.id &&
        (semester === "all" || String(t.semester) === semester)
    );

    records.forEach(record => {

        let paid = payments.filter(p =>
            p.studentId === record.studentId &&
            p.semester === record.semester
        ).reduce((sum, p) => sum + p.amount, 0);

        let balance = record.amount - paid;
        let status = getStatus(record.amount, paid);

        let row = body.insertRow();

        row.insertCell().textContent = record.semester;
        row.insertCell().textContent = currency(record.amount);
        row.insertCell().textContent = currency(paid);
        row.insertCell().textContent = currency(balance);

        let statusCell = row.insertCell();

        statusCell.textContent = status;
        statusCell.className = "status " + status.toLowerCase();
    });

    if (records.length === 0) {
        body.innerHTML =
            '<tr><td colspan="5">No financial records found.</td></tr>';
    }
}

// Search and filter events
document.getElementById("studentSearch")
    .addEventListener("input", displayStudents);

document.getElementById("classFilter")
    .addEventListener("change", displayStudents);

document.getElementById("semesterFilter")
    .addEventListener("change", function() {

        if (selectedStudent) {
            displayAcademicRecords();
            displayFinancialRecords();
        }
    });

// Print student report
document.getElementById("printReport")
    .addEventListener("click", function() {

        if (!selectedStudent) {
            alert("Please select a student first.");
            return;
        }

        window.print();
    });

// Initialize page
loadClasses();
displayStudents();