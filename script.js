const scriptURL = 'https://script.google.com/macros/s/AKfycbz_l5aadRuY3YNkaXiWDEP4vHXA0aSbdTiVsegQHHlJqE9RSy864cm-vxRBkKoBoM9R/exec';

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



// Group Unique Mocks

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

        btn.innerText = index + 1;

        btn.onclick = () => jumpToQuestion(index);

        grid.appendChild(btn);

    });

    updateStatusCounters();

}



function startExam() {

    const inputName = document.getElementById('studentName').value.trim();

    const inputEmail = document.getElementById('studentEmail').value.trim();

    const selectedMock = document.getElementById('mockSelect').value;

   

    if(!inputName || !inputEmail || !selectedMock) {

        alert("Please complete all input profiles and pick a mock test!");

        return;

    }

   

    candidateName = inputName;

    candidateEmail = inputEmail;

   

    examQuestions = allFetchedQuestions.filter(q => q.subject === selectedMock);

   

    if(examQuestions.length === 0) {

        alert("No questions found mapped to this specific category!");

        return;

    }



    examQuestions.forEach((item, idx) => { item.n = idx + 1; });



    document.getElementById('displayStudentName').innerHTML = `Candidate: <strong>${candidateName}</strong>`;

    document.getElementById('candidateNameGrid').innerText = candidateName;

    document.getElementById('candidateEmailGrid').innerText = candidateEmail;

   

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

           

            let randomDelay = Math.floor(Math.random() * 4000);

            setTimeout(() => {

                autoSubmitExam();

            }, randomDelay);

            return;

        }

        let hrs = Math.floor(timeRemaining / 3600);

        let mins = Math.floor((timeRemaining % 3600) / 60);

        let secs = timeRemaining % 60;

        document.getElementById('examTimer').innerText =

            `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;

    }, 1000);

}



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



    let questionBodyHTML = "";

    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

    const regex = new RegExp(expression);

   

    if (item.q.match(regex)) {

        questionBodyHTML = `<img src="${item.q}" class="q-img-render" alt="Question Graphic Panel Error">`;

    } else {

        questionBodyHTML = `<p style="margin-left:5px; font-weight:bold; font-size:15px; color:#1e3a8a;">${item.q}</p>`;

    }



    let optionsHTML = `

        <div class="question-block">

            <div style="background: #ffebee; color: #c62828; padding: 6px 10px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; font-size: 12px; display:inline-block;">

                ⚠️ Correct: +1.0 | Negative Marking: -0.25 (1 mark deducted for every 4 wrong answers)

            </div>

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



// 👑 ULTRA UPGRADED RESPONSIVE SUBMISSION ENGINE WITH DYNAMIC 80% LIMIT

function sendDataToDatabase() {

    let correctCount = 0;

    let wrongCount = 0;

    let unattemptedCount = 0;



    examQuestions.forEach(item => {

        let candidateAnswer = studentResponses[`q${item.n}`];

        if (!candidateAnswer) {

            unattemptedCount++;

        } else if (candidateAnswer === item.a) {

            correctCount++;

        } else {

            wrongCount++;

        }

    });



    const totalQuestions = examQuestions.length;

   

    // 🔥 DYNAMIC 80% PERCENTAGE MATH ENGINE

    const passingRequired = Math.ceil(totalQuestions * 0.80);

    const isQualified = (correctCount >= passingRequired);



    const selectedMock = document.getElementById('mockSelect').value;

    const finalData = {

        studentName: candidateName,

        studentEmail: candidateEmail,

        passportPhoto: base64PhotoData ? base64PhotoData : "Not Provided",

        selectedMock: selectedMock,

        correctCount: correctCount,

        wrongCount: wrongCount,

        isQualified: isQualified

    };



    examQuestions.forEach(item => {

        finalData[`q${item.n}`] = studentResponses[`q${item.n}`] || "Not Answered";

    });



    const submitBtn = document.querySelector('#examForm button[type="submit"]');

    if(submitBtn) {

        submitBtn.disabled = true;

        submitBtn.innerText = "Securing Data...";

    }



    // 🚀 BYPASSES CORS LOGS FOR LOCAL TESTING & DIRECT DISPATCH TO BACKEND

    fetch(scriptURL, {

        method: 'POST',

        mode: 'no-cors',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(finalData)

    })

    .then(() => {

        // Formulating instant responsive design inside user workspace

        let negativePenalty = wrongCount * 0.25;

        let finalScore = correctCount - negativePenalty;

        if (finalScore < 0) finalScore = 0;



        document.getElementById('resName').innerText = candidateName;

        document.getElementById('resEmail').innerText = candidateEmail;

       

        // Mobile Friendly Clean Card Template Builder

        let analysisHtml = `

            <div style="font-family: 'Segoe UI',sans-serif; text-align: left; padding: 5px;">

                <div style="display: flex; justify-content: space-between; background: #e8f5e9; color: #2e7d32; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-weight: bold;">

                    <span>✔️ Correct Answers:</span> <span>${correctCount}</span>

                </div>

                <div style="display: flex; justify-content: space-between; background: #ffebee; color: #c62828; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-weight: bold;">

                    <span>❌ Wrong Answers:</span> <span>${wrongCount}</span>

                </div>

                <div style="display: flex; justify-content: space-between; background: #fff3e0; color: #e65100; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-weight: bold;">

                    <span>📉 Negative Penalty:</span> <span>-${negativePenalty} Marks</span>

                </div>

                <div style="display: flex; justify-content: space-between; background: #e8eaf6; color: #1a237e; padding: 14px 10px; margin-top: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; border: 1px solid #c5cae9;">

                    <span>🎯 Final Score:</span> <span>${finalScore} / ${totalQuestions}</span>

                </div>

        `;



        if (isQualified) {

            analysisHtml += `

                <div style="background: #e8f5e9; border-left: 5px solid #4caf50; color: #1b5e20; padding: 12px; margin-top: 15px; border-radius: 6px; font-size: 14px; line-height: 1.5;">

                    🌟 <b>Outstanding Performance!</b> Aapne 80% se zyada score kiya hai (${correctCount}/${totalQuestions} Correct). <br>

                    An official Merit Certificate has been auto-generated and sent to your email! 🚀

                </div>

            `;

        } else {

            analysisHtml += `

                <div style="background: #eceff1; border-left: 5px solid #607d8b; color: #37474f; padding: 12px; margin-top: 15px; border-radius: 6px; font-size: 14px; line-height: 1.5;">

                    👍 <b>Good Effort!</b> Certificate ke liye kam se kam 80% marks (${passingRequired} Sahi Jawab) chahiye the. Agli baar thodi aur mehnat karein!

                </div>

            `;

        }

       

        // 🏠 NEW FULL-WIDTH FAST HOME ACCELERATOR EXIT BUTTON

        analysisHtml += `

            <button onclick="closeResultAndGoHome()" style="width: 100%; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 12px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 20px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">

                Close & Return to Home 🏠

            </button>

        </div>`;

       

        document.getElementById('resScore').innerHTML = analysisHtml;

        document.getElementById('resultModal').classList.add('show');

    })

    .catch(error => {

        console.error('Data Push Error!', error);

        alert("Data Sync Warning. Checking secondary secure backup lanes.");

    });

}



// Exit Dashboard Trigger

function closeResultAndGoHome() {

    window.location.reload();

} 
