//Rojaughn Murdock 2505175


let students = [];

const gradeForm = document.getElementById("gradeForm");
const subjectSelect = document.getElementById("subjectSelect");
const gradeTable = document.getElementById("gradeTable");

// Event 1: Submit student grades
gradeForm.addEventListener("submit", function(event) {

    event.preventDefault();

    let subject = subjectSelect.value;
    let name = document.getElementById("studentName").value;
    let id = document.getElementById("studentId").value;

    let coursework = Number(document.getElementById("coursework").value);
    let exam = Number(document.getElementById("exam").value);

    if (subject === "") {
        alert("Please select a subject.");
        return;
    }

    if (
        coursework < 0 || coursework > 100 ||
        exam < 0 || exam > 100
    ) {
        alert("Grades must be between 0 and 100.");
        return;
    }

    // calculate student average
    let average = (coursework + exam) / 2;

    // Determine student grade
    let grade;
    if (average >= 80) {
        grade = "A";
    } else if (average >= 70) {
        grade = "B";
    } else if (average >= 60) {
        grade = "C";
    } else if (average >= 50) {
        grade = "D";
    } else {
        grade = "F";
    }

    // Createsa student object
    let student = {
        name: name,
        id: id,
        subject: subject,
        coursework: coursework,
        exam: exam,
        average: average,
        grade: grade
    };

    students.push(student);

    displayStudents();

    gradeForm.reset();
});

// Event 2: Display students when subject change
subjectSelect.addEventListener("change", displayStudents);


// Function 1: Displays student records
function displayStudents() {

    gradeTable.innerHTML = "";

    let selectedSubject = subjectSelect.value;

    let filteredStudents = students.filter(function(student) {
        return student.subject === selectedSubject;
    });

    filteredStudents.forEach(function(student) {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.id}</td>
            <td>${student.coursework}</td>
            <td>${student.exam}</td>
            <td>${student.average.toFixed(2)}%</td>
            <td>${student.grade}</td>
        `;

        gradeTable.appendChild(row);

    });

    updateMetrics(filteredStudents);
}







// Function 2: Calculate academic metrics
function updateMetrics(filteredStudents) {

    let total = filteredStudents.length;

    let average = 0;

    if (total > 0) {

        let sum = 0;

        filteredStudents.forEach(function(student) {
            sum += student.average;
        });

        average = sum / total;

    }

    document.getElementById("totalStudents").textContent = total;

    document.getElementById("classAverage").textContent =
        average.toFixed(2) + "%";
}
