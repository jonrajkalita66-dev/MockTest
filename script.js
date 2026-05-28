const scriptURL = 'https://script.google.com/macros/s/AKfycbzf-ineRtiNtdLE7HOEaSGoJ6livxUIXAMwNLTlu35UoYKT5ASlk3jVB_blH3FiAQPn/exec'; 
let allFetchedQuestions = []; 
let examQuestions = []; // Filtered according to selected mock test
let currentIdx = 0;
let studentResponses = {};
let candidateName = "";
let candidateEmail = "";
let base64PhotoData = ""; // Photo container string

let timerInterval;
const totalTimeInSeconds = 2 * 60 * 60; 
let timeRemaining = totalTimeInSeconds;

// Fetch Data & dynamic initialization of Test Categories
window.addEventListener('DOMContentLoaded', () => {
    fetch(scriptURL, { method: 'GET', redirect: 'follow' })
    .then(response => {
        if (!response.ok) throw new Error('Network response failure');
        return response.json();
    })
    .then(data => {
        if(data.error) {
            alert("Google Sheet Error: " + data.error);
        } else {
            allFetchedQuestions = data;
            populateMockDropdown(data);
        }
    })
    .catch(error => {
        console.error("Fetch Error:", error);
        alert("Server connection failed. Please ensure Web App URL matches precisely.");
    });

    // Reader attachment for Photo Upload
    document.getElementById('studentPhoto').addEventListener('change', handlePhotoUpload);
});

// Photo processing engine to Base64 Format
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        base64PhotoData = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Group Unique Mocks (Point 2: Image 2 Integration)
function populateMockDropdown(data) {
    const selectElement = document.getElementById('mockSelect');
    selectElement.innerHTML = '<option value="">-- Choose Target Paper --</option>';
    
    // Find unique subjects / mock titles
    const uniqueMocks = [...new Set(data.map(item => item.subject))].filter(Boolean);
    
    uniqueMocks.forEach(mockName => {
        const opt = document.createElement('option');
        opt.value = mockName;
        opt.innerText = mockName;
        selectElement.appendChild(opt);
    });
}

function initPalette() {
    const grid = document.getElementById('questionGrid');
    if(!grid) return;
    grid.innerHTML = "";
    examQuestions.forEach((item, index) => {
        const btn = document.createElement('div');
        btn.className = 'grid-btn not-visited';
        btn.id = `grid-btn-${index}`;
        btn.innerText = index + 1; // Correct sequential sequence numbering
        btn.onclick = () => jumpToQuestion(index);
        grid.appendChild(btn);
    });
    updateStatusCounters();
}

function startExam() {
    const inputName = document.getElementById('studentName').value.trim();
    const inputEmail = document.getElementById('studentEmail').value.trim();
    const selectedMock = document.getElementById('mockSelect').value;
    
    // Name, Email aur Mock Test compulsory hain
    if(!inputName || !inputEmail || !selectedMock) { 
        alert("Please complete all input profiles and pick a mock test!"); 
        return; 
    }
    
    // NOTE: Passport photo validation condition yahan se hata di gayi hai taaki yeh optional rahe.
    
    candidateName = inputName;
    candidateEmail = inputEmail;
    
    // Filter out target mock queries directly
    examQuestions = allFetchedQuestions.filter(q => q.subject === selectedMock);
    
    if(examQuestions.length === 0) {
        alert("No questions found mapped to this specific category!");
        return;
    }

    // Assign sequence numbers cleanly dynamically
    examQuestions.forEach((item, idx) => { item.n = idx + 1; });

    // Synchronize UI layouts
    document.getElementById('displayStudentName').innerHTML = `Candidate: <strong>${candidateName}</strong>`;
    document.getElementById('candidateNameGrid').innerText = candidateName;
    document.getElementById('candidateEmailGrid').innerText = candidateEmail;
    
    // Agar photo upload ki gayi hai tabhi avatar image source badle, warna default HTML icon rahega
    if(base64PhotoData) {
        document.getElementById('candidateAvatar').src = base64PhotoData;
    }
    
    document.getElementById('regBox').style.display = "none";
    document.getElementById('subjectTabsContainer').style.display = "block"; 
    document.getElementById('timerContainer').style.display = "inline-block";
    document.getElementById('examForm').style.display = "flex";
    
    initPalette();
    showQuestion(0);
    startTimer();
}

function startTimer() {
    timeRemaining = totalTimeInSeconds;
    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            document.getElementById('examTimer').innerText = "00:00:00";
            alert("Time's Up! Auto Submitting Exam.");
            autoSubmitExam(); 
            return;
        }
        let hrs = Math.floor(timeRemaining / 3600);
        let mins = Math.floor((timeRemaining % 3600) / 60);
        let secs = timeRemaining % 60;
        document.getElementById('examTimer').innerText = 
            `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }, 1000);
}

// Question Rendering Engine (Point 7 Handler: Image & Text Identification)
function showQuestion(index) {
    currentIdx = index;
    const item = examQuestions[index];
    
    const subjectElement = document.getElementById('currentSubjectDisplay');
    if(subjectElement && item.subject) subjectElement.innerText = item.subject;
    
    const displayArea = document.getElementById('activeQuestionCard');
    
    document.querySelectorAll('.grid-btn').forEach(btn => btn.classList.remove('active'));
    const activeGridBtn = document.getElementById(`grid-btn-${index}`);
    if(activeGridBtn) {
        activeGridBtn.classList.add('active');
        if(activeGridBtn.classList.contains('not-visited')) {
            activeGridBtn.classList.remove('not-visited');
            activeGridBtn.classList.add('unanswered');
        }
    }

    let savedAnswer = studentResponses[`q${item.n}`] || "";

    // Identify if the Question statement is an online image link or text structure
    let questionBodyHTML = "";
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const regex = new RegExp(expression);
    
    if (item.q.match(regex)) {
        // Render Image Element cleanly if link structure is found
        questionBodyHTML = `<img src="${item.q}" class="q-img-render" alt="Question Graphic Panel Error">`;
    } else {
        // Plain text rendering execution
        questionBodyHTML = `<p style="margin-left:5px; font-weight:bold; font-size:15px; color:#1e3a8a;">${item.q}</p>`;
    }

    let optionsHTML = `
        <div class="question-block">
            <div class="q-header">Question No. ${item.n}</div>
            ${questionBodyHTML}
            <div style="margin-top:12px;">
    `;
    
    item.o.forEach(opt => {
        if(opt && opt.toString().trim() !== "") {
            let checked = (opt === savedAnswer) ? "checked" : "";
            optionsHTML += `
                <label class="option-item">
                    <input type="radio" name="sscRadioOpt" value="${opt}" ${checked}> ${opt}
                </label>
            `;
        }
    });
    
    optionsHTML += `</div></div>`;
    displayArea.innerHTML = optionsHTML;
    updateStatusCounters();
}

function saveAndNext() {
    const selectedOpt = document.querySelector('input[name="sscRadioOpt"]:checked');
    const currentQuestion = examQuestions[currentIdx];
    const gridBtn = document.getElementById(`grid-btn-${currentIdx}`);

    if(selectedOpt) {
        studentResponses[`q${currentQuestion.n}`] = selectedOpt.value;
        if(gridBtn) {
            gridBtn.classList.remove('unanswered', 'not-visited');
            gridBtn.classList.add('answered');
        }
    } else {
        if(gridBtn && !gridBtn.classList.contains('answered')) {
            gridBtn.classList.remove('not-visited');
            gridBtn.classList.add('unanswered');
        }
    }

    if(currentIdx < examQuestions.length - 1) {
        showQuestion(currentIdx + 1);
    } else {
        alert("You have reached the final item. Click Submit to save scorecard results.");
    }
    updateStatusCounters();
}

function clearResponse() {
    const selectedOpt = document.querySelector('input[name="sscRadioOpt"]:checked');
    if(selectedOpt) selectedOpt.checked = false;
    const currentQuestion = examQuestions[currentIdx];
    delete studentResponses[`q${currentQuestion.n}`];
    const gridBtn = document.getElementById(`grid-btn-${currentIdx}`);
    if(gridBtn) {
        gridBtn.classList.remove('answered', 'not-visited');
        gridBtn.classList.add('unanswered');
    }
    updateStatusCounters();
}

function jumpToQuestion(index) {
    const selectedOpt = document.querySelector('input[name="sscRadioOpt"]:checked');
    const currentQuestion = examQuestions[currentIdx];
    const currentGridBtn = document.getElementById(`grid-btn-${currentIdx}`);

    if (selectedOpt) {
        studentResponses[`q${currentQuestion.n}`] = selectedOpt.value;
        if (currentGridBtn) {
            currentGridBtn.classList.remove('unanswered', 'not-visited');
            currentGridBtn.classList.add('answered');
        }
    }
    showQuestion(index);
}

function updateStatusCounters() {
    let answeredCount = 0;
    let unansweredCount = 0;
    examQuestions.forEach((_, index) => {
        const btn = document.getElementById(`grid-btn-${index}`);
        if(btn) {
            if(btn.classList.contains('answered')) answeredCount++;
            if(btn.classList.contains('unanswered')) unansweredCount++;
        }
    });
    const ansLabel = document.querySelector('.status-item .answered');
    const unansLabel = document.querySelector('.status-item .unanswered');
    if(ansLabel) ansLabel.innerText = answeredCount;
    if(unansLabel) unansLabel.innerText = unansweredCount;
}

document.getElementById('examForm').addEventListener('submit', e => {
    e.preventDefault();
    const selectedOptOnSubmit = document.querySelector('input[name="sscRadioOpt"]:checked');
    if (selectedOptOnSubmit && examQuestions[currentIdx]) {
        studentResponses[`q${examQuestions[currentIdx].n}`] = selectedOptOnSubmit.value;
    }
    if(!confirm("Are you confident you want to submit the examination portfolio?")) return;
    clearInterval(timerInterval); 
    sendDataToDatabase(); 
});

function autoSubmitExam() {
    const selectedOptOnAuto = document.querySelector('input[name="sscRadioOpt"]:checked');
    if (selectedOptOnAuto && examQuestions[currentIdx]) {
        studentResponses[`q${examQuestions[currentIdx].n}`] = selectedOptOnAuto.value;
    }
    sendDataToDatabase();
}

function sendDataToDatabase() {
    let score = 0;
    const totalQuestions = examQuestions.length;

    examQuestions.forEach(item => {
        if (studentResponses[`q${item.n}`] === item.a) score++;
    });

    document.getElementById('resName').innerText = candidateName;
    document.getElementById('resEmail').innerText = candidateEmail;
    document.getElementById('resScore').innerText = `${score} / ${totalQuestions}`;
    document.getElementById('resultModal').classList.add('show');

    // High Fidelity payload tracking object mapping
    const selectedMock = document.getElementById('mockSelect').value;
    const finalData = {
        studentName: candidateName,
        studentEmail: candidateEmail,
        // Agar photo upload nahi ki gayi, toh "Not Provided" text database mein send hoga
        passportPhoto: base64PhotoData ? base64PhotoData : "Not Provided", 
        selectedMock: selectedMock,
        totalScore: `${score}/${totalQuestions}`
    };

    examQuestions.forEach(item => {
        finalData[`q${item.n}`] = studentResponses[`q${item.n}`] || "Not Answered";
    });

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
    })
    .catch(error => console.error('Data Push Error!', error));
}

