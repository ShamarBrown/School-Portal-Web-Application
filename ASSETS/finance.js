// Temporary student records for testing
let students = [
    { id: "ST001", name: "John Brown" },
    { id: "ST002", name: "David Smith" },
    { id: "ST003", name: "James Williams" }
];

// Load financial records from localStorage
let tuition = JSON.parse(localStorage.getItem("tuition")) || [];
let payments = JSON.parse(localStorage.getItem("payments")) || [];

// Save financial records
function saveData() {
    localStorage.setItem("tuition", JSON.stringify(tuition));
    localStorage.setItem("payments", JSON.stringify(payments));
}

// Format currency
function currency(amount) {
    return "JMD $" + amount.toFixed(2);
}

// Populate student dropdowns
function loadStudents() {
    students.forEach(student => {
        document.getElementById("tuitionStudent").add(
            new Option(student.name, student.id)
        );

        document.getElementById("paymentStudent").add(
            new Option(student.name, student.id)
        );
    });
}

// Calculate total payments for a student
function getAmountPaid(studentId, semester) {
    return payments
        .filter(p => p.studentId === studentId &&
                     p.semester === semester)
        .reduce((total, p) => total + p.amount, 0);
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

// Display form messages
function showMessage(id, message, success) {
    let element = document.getElementById(id);
    element.textContent = message;
    element.className = success ? "success" : "error";
}

// Assign tuition
document.getElementById("tuitionForm")
    .addEventListener("submit", function(event) {

    event.preventDefault();

    let studentId = document.getElementById("tuitionStudent").value;
    let semester = document.getElementById("tuitionSemester").value;
    let amount = Number(document.getElementById("tuitionAmount").value);

    let existing = tuition.find(t =>
        t.studentId === studentId && t.semester === semester
    );

    if (existing) {
        showMessage("tuitionMessage",
            "Tuition already assigned for this semester.", false);
        return;
    }

    tuition.push({ studentId, semester, amount });

    saveData();
    refreshDashboard();

    showMessage("tuitionMessage",
        "Tuition assigned successfully.", true);

    this.reset();
});

// Record payment
document.getElementById("paymentForm")
    .addEventListener("submit", function(event) {

    event.preventDefault();

    let studentId = document.getElementById("paymentStudent").value;
    let semester = document.getElementById("paymentSemester").value;
    let amount = Number(document.getElementById("paymentAmount").value);
    let date = document.getElementById("paymentDate").value;
    let method = document.getElementById("paymentMethod").value;

    let record = tuition.find(t =>
        t.studentId === studentId && t.semester === semester
    );

    if (!record) {
        showMessage("paymentMessage",
            "Assign tuition before recording payment.", false);
        return;
    }

    let balance = record.amount - getAmountPaid(studentId, semester);

    if (amount <= 0 || amount > balance) {
        showMessage("paymentMessage",
            "Invalid payment amount. Balance: " + currency(balance), false);
        return;
    }

    payments.push({
        id: "TXN" + Date.now(),
        studentId,
        semester,
        amount,
        date,
        method
    });

    saveData();
    refreshDashboard();

    showMessage("paymentMessage",
        "Payment recorded successfully.", true);

    this.reset();
});

// Display financial ledger
function displayLedger() {
    let body = document.getElementById("ledgerBody");
    let search = document.getElementById("studentSearch").value.toLowerCase();
    let semesterFilter = document.getElementById("semesterFilter").value;
    let statusFilter = document.getElementById("statusFilter").value;

    body.innerHTML = "";

    tuition.forEach(record => {
        let student = students.find(s => s.id === record.studentId);

        if (!student) return;

        let paid = getAmountPaid(record.studentId, record.semester);
        let balance = record.amount - paid;
        let status = getStatus(record.amount, paid);

        if (!student.name.toLowerCase().includes(search) &&
            !student.id.toLowerCase().includes(search)) return;

        if (semesterFilter !== "all" &&
            record.semester !== semesterFilter) return;

        if (statusFilter !== "all" &&
            status !== statusFilter) return;

        body.innerHTML += `
            <tr>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${record.semester}</td>
                <td>${currency(record.amount)}</td>
                <td>${currency(paid)}</td>
                <td>${currency(balance)}</td>
                <td class="status ${status.toLowerCase()}">
                    ${status}
                </td>
            </tr>
        `;
    });

    if (body.innerHTML === "") {
        body.innerHTML = `
            <tr>
                <td colspan="7">No financial records found.</td>
            </tr>
        `;
    }
}

// Display transaction history
function displayTransactions() {
    let body = document.getElementById("transactionBody");
    body.innerHTML = "";

    payments.forEach(payment => {
        body.innerHTML += `
            <tr>
                <td>${payment.id}</td>
                <td>${payment.studentId}</td>
                <td>${payment.semester}</td>
                <td>${payment.date}</td>
                <td>${payment.method}</td>
                <td>${currency(payment.amount)}</td>
            </tr>
        `;
    });

    if (payments.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6">No transactions recorded.</td>
            </tr>
        `;
    }
}

// Calculate financial summary
function displaySummary() {
    let totalTuition = tuition.reduce((sum, t) => sum + t.amount, 0);
    let totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    let fullyPaid = students.filter(student => {
        let records = tuition.filter(t => t.studentId === student.id);

        return records.length > 0 && records.every(t =>
            getAmountPaid(t.studentId, t.semester) >= t.amount
        );
    }).length;

    document.getElementById("totalTuition").textContent =
        currency(totalTuition);

    document.getElementById("totalCollected").textContent =
        currency(totalPaid);

    document.getElementById("totalOutstanding").textContent =
        currency(totalTuition - totalPaid);

    document.getElementById("paidStudents").textContent = fullyPaid;
}

// Refresh dashboard
function refreshDashboard() {
    displayLedger();
    displayTransactions();
    displaySummary();
}

// Search and filter events
document.getElementById("studentSearch")
    .addEventListener("input", displayLedger);

document.getElementById("semesterFilter")
    .addEventListener("change", displayLedger);

document.getElementById("statusFilter")
    .addEventListener("change", displayLedger);

// Print financial report
document.getElementById("printLedger")
    .addEventListener("click", function() {
        window.print();
    });

// Initialize dashboard
loadStudents();
refreshDashboard();