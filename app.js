// --- [A] DOM 요소 선택 (v13과 동일) ---
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const loginError = document.getElementById('login-error');
const loginBtnText = document.getElementById('login-btn-text');
const loginLoader = document.getElementById('login-loader');
const courseSwitcherWrapper = document.getElementById('course-switcher-wrapper');
const courseSwitcher = document.getElementById('course-switcher');
const courseCountNotice = document.getElementById('course-count-notice');
const dataDateNotice = document.getElementById('data-date-notice');
const timeProgressBar = document.getElementById('time-progress-bar');
const examProgressBar = document.getElementById('exam-progress-bar');
const examMetric = document.getElementById('exam-metric');

// --- [B] 데이터 파일 경로 설정 (v13과 동일) ---
const DATA_PATH = './data/';
const FILE_ALL_IN_ONE = 'woori_data.csv'; 

// --- [C] 이벤트 리스너 (v13과 동일) ---
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    if (localStorage.getItem('loggedInUser')) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        const userRows = JSON.parse(localStorage.getItem('userCourseList'));
        const selectedIndex = localStorage.getItem('selectedCourseIndex') || 0;
        
        setupCourseSwitcher(userRows, selectedIndex);
        showDashboard(user);
    } else {
        showLogin();
    }
});
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
courseSwitcher.addEventListener('change', async (event) => {
    const selectedIndex = event.target.value;
    const userRows = JSON.parse(localStorage.getItem('userCourseList'));
    const selectedCourseRow = userRows[selectedIndex];
    
    const selectedCourseUserData = buildFullUserData(selectedCourseRow);
    localStorage.setItem('loggedInUser', JSON.stringify(selectedCourseUserData));
    localStorage.setItem('selectedCourseIndex', selectedIndex);
    
    showDashboard(selectedCourseUserData);
});


// --- [D] 핵심 함수 ---

/**
 * (v13) CSV 파일 fetch (상위 3줄 자동 삭제 'slice(3)' 포함)
 */
async function fetchCSV(fileName) {
    const response = await fetch(DATA_PATH + fileName);
    if (!response.ok) { throw new Error(`${fileName} 파일을 불러올 수 없습니다.`); }
    
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const dataLines = lines.slice(3); // 4번째 줄(인덱스 3)부터 헤더로 사용
    const cleanedCsvText = dataLines.join('\n');

    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error("PapaParse 라이브러리가 로드되지 않았습니다."));
            return;
        }

        Papa.parse(cleanedCsvText, { 
            header: true, 
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    reject(new Error("CSV 파싱 오류: " + results.errors[0].message));
                } else {
                    resolve(results.data);
                }
            },
            error: (err) => {
                reject(new Error("CSV 파싱 중 심각한 오류: " + err.message));
            }
        });
    });
}

/**
 * (MODIFIED) v14: '이수여부' 칼럼이 "충족"인지 확인
 */
function buildFullUserData(userRow) {
    const GOAL_TIME = 16.0;
    const GOAL_SCORE = 60; 

    const examScore = parseInt(userRow['시험점수'] || -1);

    // [!!!] (v14) '이수여부' 값이 "충족"인지 확인
    const isCompleted = (userRow['이수여부'] && userRow['이수여부'].trim() === '충족');

    // (v11) V열('과정명.1')을 읽는 것이 정답
    const courseName = userRow['과정명.1'] || userRow['과정명'] || '과정명 없음';

    const fullUserData = {
        name: userRow['성명'],
        email: userRow['이메일'],
        department: userRow['소속'],
        course: courseName,
        totalLearningTime: parseFloat(userRow['전체학습시간'] || 0),
        courseDetail: {
            recognizedTime: parseFloat(userRow['인정시간'] || 0),
            examScore: examScore,
            isCompleted: isCompleted, // [수정됨]
            goalTime: GOAL_TIME,
            goalScore: GOAL_SCORE
        }
    };
    return fullUserData;
}

/**
 * 1. 로그인 처리 함수 (v13과 동일)
 */
async function handleLogin() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    
    if (!name || !email) { showError('이름과 이메일을 모두 입력하세요.'); return; }
    
    showButtonLoader(true);
    loginError.style.display = 'none';

    try {
        const mainListData = await fetchCSV(FILE_ALL_IN_ONE);
        
        const userRows = mainListData.filter(row => 
            row['성명'] && row['성명'].trim() === name && 
            row['이메일'] && row['이메일'].trim().toLowerCase() === email
        );

        if (userRows.length === 0) {
            showError('일치하는 사용자가 없습니다. (이름/이메일 확인)');
            showButtonLoader(false);
            return;
        }

        localStorage.setItem('userCourseList', JSON.stringify(userRows));
        
        const firstCourseRow = userRows[0];
        const firstCourseIndex = 0;
        const firstCourseUserData = buildFullUserData(firstCourseRow); // (v14 함수 호출)

        localStorage.setItem('loggedInUser', JSON.stringify(firstCourseUserData));
        localStorage.setItem('selectedCourseIndex', firstCourseIndex);
        
        setupCourseSwitcher(userRows, firstCourseIndex);
        showDashboard(firstCourseUserData);
        
    } catch (error) {
        console.error(error);
        showError(`데이터 로드 오류: ${error.message}`);
    } finally {
        showButtonLoader(false);
    }
}

/**
 * 2. 과정 선택 드롭다운 설정 함수 (v13과 동일)
 */
function setupCourseSwitcher(userRows, selectedIndex = 0) {
    if (!userRows || userRows.length === 0) {
        courseSwitcherWrapper.style.display = 'none'; return;
    }
    if (userRows.length === 1) {
        courseSwitcherWrapper.style.display = 'flex';
        courseSwitcher.disabled = true;
        courseSwitcherWrapper.classList.add('disabled');
        courseSwitcherWrapper.querySelector('.chevron-icon').style.display = 'none';
    } else {
        courseSwitcherWrapper.style.display = 'flex';
        courseSwitcher.disabled = false;
        courseSwitcherWrapper.classList.remove('disabled');
        courseSwitcherWrapper.querySelector('.chevron-icon').style.display = 'block';
    }
    courseSwitcher.innerHTML = '';
    userRows.forEach((row, index) => {
        // (v11) V열('과정명.1')을 읽는 것이 정답
        const courseName = row['과정명.1'] || row['과정명'] || '과정명 없음';
        const option = document.createElement('option');
        option.value = index;
        option.textContent = courseName;
        courseSwitcher.appendChild(option);
    });
    courseSwitcher.value = selectedIndex;
}


/**
 * 4. 대시보드 UI 업데이트 함수 (v13과 동일)
 * (buildFullUserData가 정확한 값을 주므로, 이 함수는 수정할 필요가 없음)
 */
function showDashboard(user) {
    const detail = user.courseDetail;
    const badge = document.getElementById('status-badge');
    
    const userRows = JSON.parse(localStorage.getItem('userCourseList') || '[]');
    if (userRows.length > 0) {
        courseCountNotice.innerHTML = `<i data-feather="layers"></i> 총 ${userRows.length}개 과정 신청됨`;
        courseCountNotice.style.display = 'flex';
    } else {
        courseCountNotice.style.display = 'none';
    }
    const today = new Date();
    dataDateNotice.innerHTML = `<i data-feather="clock"></i> ${today.getMonth()+1}/${today.getDate()} 기준`;

    document.getElementById('overview-name').textContent = user.name;
    document.getElementById('overview-dept').textContent = user.department;
    document.getElementById('overview-course').textContent = user.course; 
    document.getElementById('overview-goal-time').textContent = `${detail.goalTime.toFixed(1)} H`;
    document.getElementById('overview-my-time').textContent = `${detail.recognizedTime.toFixed(1)} H`;
    
    const statusCell = document.getElementById('overview-status');
    if (detail.isCompleted) { // (v14) 이 값이 이제 "충족"을 기준으로 정확해짐
        statusCell.textContent = '이수 완료 🎉';
        statusCell.className = 'status-cell completed';
    } else {
        statusCell.textContent = '학습 중 🏃‍♀️';
        statusCell.className = 'status-cell in-progress';
    }
    const goalScoreRow = document.getElementById('overview-goal-score-row');
    const myScoreRow = document.getElementById('overview-my-score-row');
    if (detail.examScore > -1) {
        document.getElementById('overview-goal-score').textContent = `${detail.goalScore} 점`;
        document.getElementById('overview-my-score').textContent = `${detail.examScore} 점`;
        goalScoreRow.classList.remove('hidden-row');
        myScoreRow.classList.remove('hidden-row');
    } else {
        goalScoreRow.classList.add('hidden-row');
        myScoreRow.classList.add('hidden-row');
    }

    document.getElementById('course-name').textContent = user.course;
    if (detail.isCompleted) { // (v14) 이 값이 이제 "충족"을 기준으로 정확해짐
        badge.textContent = '이수 완료! 🎉';
        badge.className = 'status-badge completed';
    } else {
        badge.textContent = '학습 중 🏃‍♀️';
        badge.className = 'status-badge in-progress';
    }
    const totalTime = user.totalLearningTime.toFixed(1);
    const courseRecognizedTime = detail.recognizedTime.toFixed(1);
    let unrecognizedTime = (user.totalLearningTime - detail.recognizedTime).toFixed(1);
    unrecognizedTime = unrecognizedTime < 0 ? 0 : unrecognizedTime;

    document.getElementById('total-time').textContent = `${totalTime} H`;
    document.getElementById('recognized-time-detail').textContent = `${courseRecognizedTime} H`;
    document.getElementById('unrecognized-time').textContent = `${unrecognizedTime} H`;

    const timePercent = Math.min((detail.recognizedTime / detail.goalTime) * 100, 100);
    document.getElementById('recognized-time').textContent = `${courseRecognizedTime} / ${detail.goalTime.toFixed(1)} H`;
    
    if (detail.examScore > -1) {
        examMetric.style.display = 'block';
        const scorePercent = Math.min((detail.examScore / detail.goalScore) * 100, 100);
        document.getElementById('exam-score').textContent = `${detail.examScore} / ${detail.goalScore} 점`;
        examProgressBar.style.width = '0%';
        setTimeout(() => { examProgressBar.style.width = `${scorePercent}%`; }, 100);
    } else {
        examMetric.style.display = 'none';
    }

    timeProgressBar.style.width = '0%';
    setTimeout(() => { timeProgressBar.style.width = `${timePercent}%`; }, 100);

    loginContainer.classList.remove('active');
    dashboardContainer.classList.add('active');
    
    feather.replace(); 
}

/**
 * 5. 로그아웃 처리 (v13과 동일)
 */
function handleLogout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userCourseList');
    localStorage.removeItem('selectedCourseIndex');
    showLogin();
}

// --- [E] UI 헬퍼 함수 (v13과 동일) ---
function showLogin() {
    loginContainer.classList.add('active');
    dashboardContainer.classList.remove('active');
    nameInput.value = '';
    emailInput.value = '';
    loginError.style.display = 'none';
    feather.replace();
}
function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    loginError.classList.remove('shake');
    void loginError.offsetWidth;
    loginError.classList.add('shake');
}
function showButtonLoader(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}
