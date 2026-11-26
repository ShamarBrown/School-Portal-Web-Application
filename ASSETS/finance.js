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
if (requireRole(["admin"])) {
    initializeFinance();
}

function initializeFinance() {

    // Load students from both existing databases
    let students = dbGet(DBkeys.STUDENTS).map(s => ({
        id: String(s.studentId),
        name: s.fullName,
        academicYear: s.academicYear || ""
    }));

    dbGet("cit2011.students.v1").forEach(s => {
        students = students.filter(student => student.id !== String(s.id));
        students.push({
            id: String(s.id),
            name: s.name,
            academicYear: s.academicYear
        });
    });

    let tuition = dbGet("mc-tuition");
    let payments = dbGet(DBkeys.TRANSACTIONS);

    const byId = id => document.getElementById(id);

    // Currency and academic year validation
    function cents(amount) {
        return Math.round(amount * 100);
    }

    function currency(amount) {
        return "JMD $" + Number(amount).toFixed(2);
    }

    function validYear(year) {
        let years = year.split("-");
        return /^\d{4}-\d{4}$/.test(year) &&
            Number(years[1]) === Number(years[0]) + 1;
    }

    // Match records by student, semester and year
    function samePeriod(record, studentId, semester, year) {
        return record.studentId === studentId &&
            record.semester === semester &&
            record.academicYear === year;
    }

    // Calculate total payments
    function getAmountPaid(studentId, semester, year) {
        return payments.filter(p =>
            samePeriod(p, studentId, semester, year)
        ).reduce((sum, p) => sum + cents(p.amount), 0) / 100;
    }

    function getStatus(amount, paid) {
        if (cents(paid) >= cents(amount)) return "Paid";
        if (paid > 0) return "Pending";
        return "Outstanding";
    }

    function showMessage(id, message, success) {
        byId(id).textContent = message;
        byId(id).className = success ? "success" : "error";
    }

    // Safely create table rows
    function addRow(body, values) {
        let row = body.insertRow();
        values.forEach(value => {
            row.insertCell().textContent = value;
        });
        return row;
    }

    function emptyRow(body, message, columns) {
        let cell = body.insertRow().insertCell();
        cell.colSpan = columns;
        cell.textContent = message;
    }

    // Populate student dropdowns
    students.forEach(student => {
        let label = student.name + " (" + student.id + ")";
        byId("tuitionStudent").add(new Option(label, student.id));
        byId("paymentStudent").add(new Option(label, student.id));
    });

    // Automatically fill academic year
    function fillYear(studentInput, yearInput) {
        let student = students.find(s => s.id === byId(studentInput).value);
        byId(yearInput).value = student ? student.academicYear : "";
    }

    byId("tuitionStudent").addEventListener("change", () =>
        fillYear("tuitionStudent", "tuitionYear"));

    byId("paymentStudent").addEventListener("change", () =>
        fillYear("paymentStudent", "paymentYear"));

    // Assign tuition
    byId("tuitionForm").addEventListener("submit", function(event) {
        event.preventDefault();

        let studentId = byId("tuitionStudent").value;
        let semester = byId("tuitionSemester").value;
        let academicYear = byId("tuitionYear").value.trim();
        let amount = Number(byId("tuitionAmount").value);
        let student = students.find(s => s.id === studentId);

        if (!student || !validYear(academicYear) ||
            !["1", "2"].includes(semester) ||
            !Number.isFinite(amount) || amount < 1) {
            showMessage("tuitionMessage", "Invalid tuition information.", false);
            return;
        }

        if (tuition.some(t => samePeriod(t, studentId, semester, academicYear))) {
            showMessage("tuitionMessage", "Tuition already assigned.", false);
            return;
        }

        tuition.push({
            studentId,
            studentName: student.name,
            semester,
            academicYear,
            amount: cents(amount) / 100
        });

        if (!dbSet("mc-tuition", tuition)) {
            tuition.pop();
            showMessage("tuitionMessage", "Unable to save tuition.", false);
            return;
        }

        refreshDashboard();
        showMessage("tuitionMessage", "Tuition assigned successfully.", true);
        this.reset();
    });

    // Record payment
    byId("paymentForm").addEventListener("submit", function(event) {
        event.preventDefault();

        let studentId = byId("paymentStudent").value;
        let semester = byId("paymentSemester").value;
        let academicYear = byId("paymentYear").value.trim();
        let amount = Number(byId("paymentAmount").value);
        let date = byId("paymentDate").value;
        let method = byId("paymentMethod").value;

        let record = tuition.find(t =>
            samePeriod(t, studentId, semester, academicYear));

        if (!record) {
            showMessage("paymentMessage", "Assign tuition first.", false);
            return;
        }

        let paid = getAmountPaid(studentId, semester, academicYear);
        let balance = (cents(record.amount) - cents(paid)) / 100;

        if (!Number.isFinite(amount) || cents(amount) <= 0 ||
            cents(amount) > cents(balance) || !date ||
            !["Cash", "Card", "Bank Transfer"].includes(method)) {
            showMessage("paymentMessage",
                "Invalid payment. Balance: " + currency(balance), false);
            return;
        }

        payments.push({
            id: "TXN" + Date.now(),
            studentId, semester, academicYear,
            amount: cents(amount) / 100, date, method
        });

        if (!dbSet(DBkeys.TRANSACTIONS, payments)) {
            payments.pop();
            showMessage("paymentMessage", "Unable to save payment.", false);
            return;
        }

        refreshDashboard();
        showMessage("paymentMessage", "Payment recorded successfully.", true);
        this.reset();
    });

    // Display and filter financial ledger
    function displayLedger() {
        let body = byId("ledgerBody");
        let search = byId("studentSearch").value.trim().toLowerCase();
        let semester = byId("semesterFilter").value;
        let year = byId("yearFilter").value.trim();
        let statusFilter = byId("statusFilter").value;

        body.innerHTML = "";

        tuition.forEach(record => {
            let student = students.find(s => s.id === record.studentId);
            let name = student ? student.name : record.studentName || "Former Student";

            let paid = getAmountPaid(
                record.studentId, record.semester, record.academicYear);

            let balance = (cents(record.amount) - cents(paid)) / 100;
            let status = getStatus(record.amount, paid);

            if (!name.toLowerCase().includes(search) &&
                !record.studentId.toLowerCase().includes(search)) return;

            if (semester !== "all" && record.semester !== semester) return;
            if (year && record.academicYear !== year) return;
            if (statusFilter !== "all" && status !== statusFilter) return;

            let row = addRow(body, [
                record.studentId, name, record.academicYear,
                "Semester " + record.semester,
                currency(record.amount), currency(paid),
                currency(balance), status
            ]);

            row.cells[7].className = "status " + status.toLowerCase();
        });

        if (!body.rows.length) {
            emptyRow(body, "No financial records found.", 8);
        }
    }

    // Display transaction history
    function displayTransactions() {
        let body = byId("transactionBody");
        body.innerHTML = "";

        payments.forEach(p => {
            addRow(body, [
                p.id, p.studentId, p.academicYear,
                "Semester " + p.semester,
                p.date, p.method, currency(p.amount)
            ]);
        });

        if (!payments.length) {
            emptyRow(body, "No transactions recorded.", 7);
        }
    }

    // Calculate financial summary
    function displaySummary() {
        let totalTuition = tuition.reduce((sum, t) =>
            sum + cents(t.amount), 0) / 100;

        let totalPaid = payments.reduce((sum, p) =>
            sum + cents(p.amount), 0) / 100;

        let fullyPaid = students.filter(student => {
            let records = tuition.filter(t => t.studentId === student.id);

            return records.length > 0 && records.every(t =>
                getStatus(t.amount, getAmountPaid(
                    t.studentId, t.semester, t.academicYear)) === "Paid");
        }).length;

        byId("totalTuition").textContent = currency(totalTuition);
        byId("totalCollected").textContent = currency(totalPaid);
        byId("totalOutstanding").textContent =
            currency((cents(totalTuition) - cents(totalPaid)) / 100);

        byId("paidStudents").textContent = fullyPaid;
    }

    function refreshDashboard() {
        displayLedger();
        displayTransactions();
        displaySummary();
    }

    // Search, filter and print events
    byId("studentSearch").addEventListener("input", displayLedger);
    byId("yearFilter").addEventListener("input", displayLedger);
    byId("semesterFilter").addEventListener("change", displayLedger);
    byId("statusFilter").addEventListener("change", displayLedger);
    byId("printLedger").addEventListener("click", () => window.print());

    refreshDashboard();
}
