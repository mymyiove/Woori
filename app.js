// --- [A] DOM 요소 선택 (v8과 동일) ---
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

// --- [B] 데이터 파일 경로 설정 (v8과 동일) ---
const DATA_PATH = './data/';
const FILE_ALL_IN_ONE = 'woori_data.csv'; 

// --- [C] 이벤트 리스너 (v8과 동일) ---
document.addEventListener('DOMContentLoaded', () => {
    // 페이지 로드 시 로그인 상태 확인 (간편 로그인을 위해)
    if (localStorage.getItem('loggedInUser')) {
        // 이전에 로그인한 정보가 있으면 바로 대시보드 표시
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        const userRows = JSON.parse(localStorage.getItem('userCourseList'));
        const selectedIndex = localStorage.getItem('selectedCourseIndex') || 0;
        
        setupCourseSwitcher(userRows, selectedIndex);
        showDashboard(user);
    } else {
        // 로그인 정보 없으면 로그인 화면 표시
        showLogin();
    }
});

// 로그인 버튼 클릭
loginBtn.addEventListener('click', handleLogin);

// 로그아웃 버튼 클릭
logoutBtn.addEventListener('click', handleLogout);

// (NEW) 과정 선택 드롭다운 변경 시
courseSwitcher.addEventListener('change', async (event) => {
    const selectedIndex = event.target.value;
    const userRows = JSON.parse(localStorage.getItem('userCourseList'));
    const selectedCourseRow = userRows[selectedIndex];
    
    // (v9) 선택된 행(Row)으로 사용자 데이터 객체를 '즉시' 생성
    const selectedCourseUserData = buildFullUserData(selectedCourseRow);

    // (v9) 새 데이터를 로컬 스토리지에 저장
    localStorage.setItem('loggedInUser', JSON.stringify(selectedCourseUserData));
    localStorage.setItem('selectedCourseIndex', selectedIndex);
    
    // (v9) UI 갱신
    showDashboard(selectedCourseUserData);
});


// --- [D] 핵심 함수 ---

/**
 * (v8과 동일) CSV 파일 fetch 및 자동 파싱 (상위 3줄 자동 삭제)
 */
async function fetchCSV(fileName) {
    const response = await fetch(DATA_PATH + fileName);
    if (!response.ok) { throw new Error(`${fileName} 파일을 불러올 수 없습니다.`); }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // 3번째 줄(인덱스 3)부터가 헤더이므로, 그 줄부터 끝까지 사용
    const dataLines = lines.slice(3); 
    const cleanedCsvText = dataLines.join('\n');

    return new Promise((resolve, reject) => {
        Papa.parse(cleanedCsvText, { // 정리된 텍스트를 파싱
            header: true, // 이제 첫 줄(원본의 4번째 줄)이 헤더
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
 * (MODIFIED) v9: CSV 행(Row)에서 '시험점수', '이수여부'를 정확히 읽어옴
 */
function buildFullUserData(userRow) {
    const GOAL_TIME = 16.0;
    const GOAL_SCORE = 60; 

    // (NEW) v9: '시험점수' 칼럼을 읽음. 비어있으면(NaN) -1로 설정
    const examScore = parseInt(userRow['시험점수'] || -1);
    
    // (NEW) v9: '이수여부' 칼럼을 읽음. "이수"인지 아닌지 (true/false)
    const isCompleted = (userRow['이수여부'] === '이수');

    const fullUserData = {
        name: userRow['성명'],
        email: userRow['이메일'],
        department: userRow['소속'], // '소속' 칼럼
        course: userRow['과정명'], // H열
        totalLearningTime: parseFloat(userRow['전체학습시간'] || 0), // L열
        courseDetail: {
            recognizedTime: parseFloat(userRow['인정시간'] || 0), // R열
            examScore: examScore, // (v9) 실제 점수
            isCompleted: isCompleted, // (v9) 실제 이수 여부
            goalTime: GOAL_TIME,
            goalScore: GOAL_SCORE
        }
    };
    return fullUserData;
}

/**
 * 1. 로그인 처리 함수 (v8과 동일)
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
            row['성명'] === name && 
            row['이메일'] &&
            row['이메일'].toLowerCase() === email
        );

        if (userRows.length === 0) {
            showError('일치하는 사용자가 없습니다. (이름/이메일 확인)');
            showButtonLoader(false);
            return;
        }

        localStorage.setItem('userCourseList', JSON.stringify(userRows));
        
        const firstCourseRow = userRows[0];
        const firstCourseIndex = 0;
        const firstCourseUserData = buildFullUserData(firstCourseRow); // (v9 함수 호출)

        localStorage.setItem('loggedInUser', JSON.stringify(firstCourseUserData));
        localStorage.setItem('selectedCourseIndex', firstCourseIndex);
        
        setupCourseSwitcher(userRows, firstCourseIndex);
        showDashboard(firstCourseUserData); // (v9 함수 호출)
        
    } catch (error)
 {
        console.error(error);
        showError(`데이터 로드 오류: ${error.message}`);
    } finally {
        showButtonLoader(false);
    }
}

/**
 * 2. 과정 선택 드롭다운 설정 함수 (v8과 동일)
 */
function setupCourseSwitcher(userRows, selectedIndex = 0) {
    if (!userRows || userRows.length === 0) {
        courseSwitcherWrapper.style.display = 'none'; return;
    }
    if (userRows.length === 1) {
        courseSwitcherWrapper.style.display = 'flex';
        courseSwitcher.disabled = true;
        courseSwitcherWrapper.classList.add('disabled'); // v8 스타일 적용
        courseSwitcherWrapper.querySelector('.chevron-icon').style.display = 'none';
    } else {
        courseSwitcherWrapper.style.display = 'flex';
        courseSwitcher.disabled = false;
        courseSwitcherWrapper.classList.remove('disabled');
        courseSwitcherWrapper.querySelector('.chevron-icon').style.display = 'block';
    }
    courseSwitcher.innerHTML = '';
    userRows.forEach((row, index) => {
        const courseName = row['과정명']; 
        const option = document.createElement('option');
        option.value = index;
        option.textContent = courseName;
        courseSwitcher.appendChild(option);
    });
    courseSwitcher.value = selectedIndex;
}


/**
 * 4. 대시보드 UI 업데이트 함수 (v8과 동일)
 * (v9에서 buildFullUserData가 정확한 값을 주므로, 이 함수는 수정할 필요가 없음)
 */
function showDashboard(user) {
    const detail = user.courseDetail;
    const badge = document.getElementById('status-badge');
    
    // 알림 문구
    const userRows = JSON.parse(localStorage.getItem('userCourseList') || '[]');
    if (userRows.length > 0) {
        courseCountNotice.innerHTML = `<i data-feather="layers"></i> 총 ${userRows.length}개 과정 신청됨`;
        courseCountNotice.style.display = 'flex';
    } else {
        courseCountNotice.style.display = 'none';
    }
    const today = new Date(); // 데이터 기준일 (임시)
    dataDateNotice.innerHTML = `<i data-feather="clock"></i> ${today.getMonth()+1}/${today.getDate()} 기준`;

    // --- '개요' 카드 ---
    document.getElementById('overview-name').textContent = user.name;
    document.getElementById('overview-dept').textContent = user.department;
    document.getElementById('overview-course').textContent = user.course;
    document.getElementById('overview-goal-time').textContent = `${detail.goalTime.toFixed(1)} H`;
    document.getElementById('overview-my-time').textContent = `${detail.recognizedTime.toFixed(1)} H`;
    
    const statusCell = document.getElementById('overview-status');
    // (v9) 'isCompleted'는 이제 CSV의 '이수여부'를 정확히 반영
    if (detail.isCompleted) {
        statusCell.textContent = '이수 완료 🎉';
        statusCell.className = 'status-cell completed';
    } else {
        statusCell.textContent = '학습 중 🏃‍♀️';
        statusCell.className = 'status-cell in-progress';
    }
    const goalScoreRow = document.getElementById('overview-goal-score-row');
    const myScoreRow = document.getElementById('overview-my-score-row');
    
    // (v9) 'examScore'는 이제 CSV의 '시험점수'를 정확히 반영
    if (detail.examScore > -1) {
        document.getElementById('overview-goal-score').textContent = `${detail.goalScore} 점`;
        document.getElementById('overview-my-score').textContent = `${detail.examScore} 점`;
        goalScoreRow.classList.remove('hidden-row');
        myScoreRow.classList.remove('hidden-row');
    } else {
        goalScoreRow.classList.add('hidden-row');
        myScoreRow.classList.add('hidden-row');
    }

    // --- '프로그레스 바' 카드 ---
    document.getElementById('course-name').textContent = user.course; 
    if (detail.isCompleted) {
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
        const scorePercent = Math.min((detail.examScore / detail.goalScore) *
