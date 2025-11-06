// [!!!] (v20)
// "Cannot set properties of null" 오류를 막기 위해
// 모든 코드를 DOMContentLoaded 이벤트 리스너로 감쌉니다.
document.addEventListener('DOMContentLoaded', () => {

    // --- [A] DOM 요소 선택 ---
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

    // --- [B] 데이터 파일 경로 설정 ---
    const DATA_PATH = './data/';
    const FILE_ALL_IN_ONE = 'woori_data.csv'; 

    // --- [C] 이벤트 리스너 ---
    // (v20) DOMContentLoaded가 이미 발생했으므로, feather.replace()를 즉시 호출
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    if (localStorage.getItem('loggedInUser')) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        const userRows = JSON.parse(localStorage.getItem('userCourseList'));
        const selectedIndex = localStorage.getItem('selectedCourseIndex') || 0;
        
        setupCourseSwitcher(userRows, selectedIndex);
        showDashboard(user);
    } else {
        showLogin();
    }

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
     * (v18) CSV 파일 fetch (U4 날짜 감지, '충족' 확인)
     */
    async function fetchCSV(fileName) {
        const response = await fetch(DATA_PATH + fileName);
        if (!response.ok) { throw new Error(`${fileName} 파일을 불러올 수 없습니다.`); }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');

        let dataUpdatedDate = "날짜 정보 없음";
        if (lines.length >= 4) {
            const headerRowLine = lines[3];
            
            // Papa가 로드되었는지 확인
            if (typeof Papa === 'undefined') {
                 throw new Error("PapaParse 라이브러리가 로드되지 않았습니다.");
            }
            
            const headerRow = Papa.parse(headerRowLine, { header: false }).data[0]; 
            
            if (headerRow && headerRow.length > 20) {
                const dateValue = headerRow[20]; // 21번째 칸(U열) 값
                if (dateValue && dateValue.trim() !== "") {
                    dataUpdatedDate = dateValue.trim().replace(/"/g, ''); 
                }
            }
        }
        localStorage.setItem('dataUpdatedDate', dataUpdatedDate);

        const dataLines = lines.slice(3);
        const cleanedCsvText = dataLines.join('\n');

        return new Promise((resolve, reject) => {
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
     * (v18) "충족", "V열"
     */
    function buildFullUserData(userRow) {
        const GOAL_TIME = 16.0;
        const GOAL_SCORE = 60; 

        const examScore = parseInt(userRow['시험점수'] || -1);
        const isCompleted = (userRow['이수여부'] && userRow['이수여부'].trim() === '충족');
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
                isCompleted: isCompleted,
                goalTime: GOAL_TIME,
                goalScore: GOAL_SCORE
            }
        };
        return fullUserData;
    }

    /**
     * 1. 로그인 처리 함수
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
            const firstCourseUserData = buildFullUserData(firstCourseRow);

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
     * 2. 과정 선택 드롭다운 설정 함수
     */
    function setupCourseSwitcher(userRows, selectedIndex = 0) {
        if (!userRows || userRows.length === 0) {
            courseSwitcherWrapper.style.display = 'none'; return;
        }
        if (userRows.length === 1) {
            courseSwitcherWrapper.style.display = 'flex';
            courseSwitcher.disabled = true;
            courseSwitcherWrapper.classList.add('disabled');
        } else {
            courseSwitcherWrapper.style.display = 'flex';
            courseSwitcher.disabled = false;
            courseSwitcherWrapper.classList.remove('disabled');
        }
        courseSwitcher.innerHTML = '';
        userRows.forEach((row, index) => {
            const courseName = row['과정명.1'] || row['과정명'] || '과정명 없음';
            const option = document.createElement('option');
            option.value = index;
            option.textContent = courseName;
            courseSwitcher.appendChild(option);
        });
        courseSwitcher.value = selectedIndex;
    }


    /**
     * 4. 대시보드 UI 업데이트 함수 (v18)
     */
    function showDashboard(user) {
        const detail = user.courseDetail;
        const badge = document.getElementById('status-badge');
        
        const userRows = JSON.parse(localStorage.getItem('userCourseList') || '[]');
        if (userRows.length > 0) {
            courseCountNotice.textContent = `📚 총 ${userRows.length}개 과정`;
        } else {
            courseCountNotice.style.display = 'none';
        }

        const dataUpdatedDate = localStorage.getItem('dataUpdatedDate') || "날짜 없음";
        dataDateNotice.textContent = `🗓️ ${dataUpdatedDate} 기준`;


        // --- 개요 카드 ---
        document.getElementById('overview-name').textContent = user.name;
        document.getElementById('overview-dept').textContent = user.department;
        document.getElementById('overview-course').textContent = user.course; 
        document.getElementById('overview-goal-time').textContent = `${detail.goalTime.toFixed(1)} H`;
        document.getElementById('overview-my-time').textContent = `${detail.recognizedTime.toFixed(1)} H`;
        
        const statusCell = document.getElementById('overview-status');
        if (detail.isCompleted) {
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

        // --- 프로그레스 바 카드 ---
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
        
        // [v20] 이모지로 교체했으므로 feather.replace() 호출 제거
        // feather.replace(); 

        // [v18] '이수 완료' 시 축하 폭죽 발사
        if (detail.isCompleted) {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 9999
                });
            }
        }
    }

    /**
     * 5. 로그아웃 처리
     */
    function handleLogout() {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('userCourseList');
        localStorage.removeItem('selectedCourseIndex');
        localStorage.removeItem('dataUpdatedDate');
        showLogin();
    }

    // --- [E] UI 헬퍼 함수 ---
    function showLogin() {
        loginContainer.classList.add('active');
        dashboardContainer.classList.remove('active');
        nameInput.value = '';
        emailInput.value = '';
        loginError.style.display = 'none';
        // [v20] 이모지로 교체했으므로 feather.replace() 호출 제거
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

}); // [!!!] (v20) DOMContentLoaded 리스너 종료
