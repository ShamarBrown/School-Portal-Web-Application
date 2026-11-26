
// Damario Foster - 2507304
// Add remaining group members and lab day/time

if (requireRole(["admin", "teacher", "student"])) {
    initializeReports();
}

function initializeReports() {

    const byId = id => document.getElementById(id);
    let session = getSession();

    // Load students from shared database
    let students = dbGet(DBkeys.STUDENTS).map(s => ({
        id: String(s.studentId),
        name: s.fullName,
        class: s.classForm || s.grade || "Unassigned",
        academicYear: s.academicYear || "",
        semester: s.semester || "",
        grades: s.grades || []
    }));

    // Include students from administrator registry
    dbGet("cit2011.students.v1").forEach(s => {
        students = students.filter(student => student.id !== String(s.id));
        students.push({
            id: String(s.id),
            name: s.name,
            class: s.classForm || "Unassigned",
            academicYear: s.academicYear || "",
            semester: s.semester || "",
            grades: s.grades || []
        });
    });

    // Students can only view their own records
    if (session.role === "student") {
        students = students.filter(s => s.id === String(session.id));
    }

    // Role-based navigation
    byId("adminLink").hidden = session.role !== "admin";
    byId("financeLink").hidden = session.role !== "admin";
    byId("teacherLink").hidden = session.role !== "teacher";

    let tuition = dbGet("mc-tuition");
    let payments = dbGet(DBkeys.TRANSACTIONS);
    let selectedStudent = null;

    // Standardize semester values
    function normalizeSemester(semester) {
        return String(semester || "").replace("Semester ", "");
    }

    // Load academic records
    let grades = dbGet(DBkeys.GRADES).map(g => ({
        studentId: String(g.studentId ?? g.id),
        subject: g.subject,
        semester: normalizeSemester(g.semester),
        academicYear: g.academicYear || "",
        grade: g.score ?? g.average ?? g.grade
    }));

    // Include administrator grades without duplicates
    students.forEach(student => {
        student.grades.forEach(g => {
            let semester = normalizeSemester(g.semester || student.semester);
            let academicYear = g.academicYear || student.academicYear;

            let existing = grades.some(record =>
                record.studentId === student.id &&
                record.subject.toLowerCase() === g.subject.toLowerCase() &&
                record.semester === semester &&
                record.academicYear === academicYear);

            if (!existing) {
                grades.push({
                    studentId: student.id,
                    subject: g.subject,
                    semester,
                    academicYear,
                    grade: g.score ?? g.grade
                });
            }
        });
    });

    // Currency calculations
    function cents(amount) {
        return Math.round(amount * 100);
    }

    function currency(amount) {
        return "JMD $" + Number(amount).toFixed(2);
    }

    function getStatus(amount, paid) {
        if (cents(paid) >= cents(amount)) return "Paid";
        if (paid > 0) return "Pending";
        return "Outstanding";
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

    // Populate class filter
    let classes = [...new Set(students.map(s => String(s.class)))];

    classes.sort().forEach(className => {
        byId("classFilter").add(new Option(className, className));
    });

    // Search and display students
    function displayStudents() {
        let body = byId("studentBody");
        let search = byId("studentSearch").value.trim().toLowerCase();
        let classFilter = byId("classFilter").value;

        body.innerHTML = "";

        students.forEach(student => {
            let matchesSearch = student.name.toLowerCase().includes(search) ||
                student.id.toLowerCase().includes(search);

            let matchesClass = classFilter === "all" ||
                String(student.class) === classFilter;

            if (matchesSearch && matchesClass) {
                let row = addRow(body, [
                    student.id, student.name, student.class
                ]);

                let button = document.createElement("button");
                button.type = "button";
                button.textContent = "View Profile";
                button.addEventListener("click", () => viewProfile(student.id));

                row.insertCell().appendChild(button);
            }
        });

        if (!body.rows.length) {
            emptyRow(body, "No students found.", 4);
        }
    }

    // Display selected student profile
    function viewProfile(studentId) {
        selectedStudent = students.find(s => s.id === studentId);
        if (!selectedStudent) return;

        byId("profileId").textContent = selectedStudent.id;
        byId("profileName").textContent = selectedStudent.name;
        byId("profileClass").textContent = selectedStudent.class;
        byId("profileYear").textContent =
            selectedStudent.academicYear || "Not assigned";

        byId("studentProfile").hidden = false;
        byId("academicRecords").hidden = false;
        byId("financialRecords").hidden = false;

        refreshReport();
    }

    // Match selected student and report filters
    function matchesReport(record) {
        let semester = byId("semesterFilter").value;
        let year = byId("yearFilter").value.trim();

        return String(record.studentId) === selectedStudent.id &&
            (semester === "all" ||
                normalizeSemester(record.semester) === semester) &&
            (!year || record.academicYear === year);
    }

    // Display academic records
    function displayAcademicRecords() {
        let body = byId("academicBody");
        body.innerHTML = "";

        grades.filter(matchesReport).forEach(g => {
            addRow(body, [
                g.subject,
                g.academicYear || "Not assigned",
                g.semester ? "Semester " + g.semester : "Not assigned",
                typeof g.grade === "number" ? g.grade + "%" : g.grade
            ]);
        });

        if (!body.rows.length) {
            emptyRow(body, "No academic records found.", 4);
        }
    }

    // Display financial records
    function displayFinancialRecords() {
        let body = byId("financialBody");
        body.innerHTML = "";

        tuition.filter(matchesReport).forEach(record => {

            let paid = payments.filter(p =>
                String(p.studentId) === String(record.studentId) &&
                normalizeSemester(p.semester) === normalizeSemester(record.semester) &&
                p.academicYear === record.academicYear
            ).reduce((sum, p) => sum + cents(p.amount), 0) / 100;

            let balance = (cents(record.amount) - cents(paid)) / 100;
            let status = getStatus(record.amount, paid);

            let row = addRow(body, [
                record.academicYear,
                "Semester " + normalizeSemester(record.semester),
                currency(record.amount),
                currency(paid),
                currency(balance),
                status
            ]);

            row.cells[5].className = "status " + status.toLowerCase();
        });

        if (!body.rows.length) {
            emptyRow(body, "No financial records found.", 6);
        }
    }

    // Refresh selected student's report
    function refreshReport() {
        if (selectedStudent) {
            displayAcademicRecords();
            displayFinancialRecords();
        }
    }

    // Search and filter events
    byId("studentSearch").addEventListener("input", displayStudents);
    byId("classFilter").addEventListener("change", displayStudents);
    byId("semesterFilter").addEventListener("change", refreshReport);
    byId("yearFilter").addEventListener("input", refreshReport);

    // Print selected student report
    byId("printReport").addEventListener("click", function() {
        if (!selectedStudent) {
            alert("Please select a student first.");
            return;
        }

        window.print();
    });

    displayStudents();

    // Automatically display student's own profile
    if (session.role === "student" && students.length === 1) {
        viewProfile(students[0].id);
    }
}
