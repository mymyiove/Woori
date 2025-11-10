/* [!!!] (v0.56) V열('과정명.1')이 삭제됨에 따라 H열('과정명')만 사용하도록 최종 수정 */

// (v0.39) 프록시 API URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby9B7_twYJIky-sQwwjidZItT88OK6HA0Ky7XLHsrMb8rnCTfnbIdqRcc7XKXFEpV99/exec'; 

document.addEventListener('DOMContentLoaded', () => {

    // --- [A] DOM 요소 선택 --- (v0.37과 동일)
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginBtn = document.getElementById('login-btn');
    
    const logoutBtnPC = document.getElementById('logout-btn');
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const loginError = document.getElementById('login-error');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginLoader = document.getElementById('login-loader');
    
    const courseSwitcherWrapper = document.getElementById('course-switcher-wrapper');
    const courseSwitcher = document.getElementById('course-switcher');
    const courseSwitcherMobile = document.getElementById('course-switcher-mobile');
    const courseCountNotice = document.getElementById('course-count-notice');
    const courseCountNoticeMobile = document.getElementById('course-count-notice-mobile');

    const timeProgressBar = document.getElementById('time-progress-bar');
    const examProgressBar = document.getElementById('exam-progress-bar');
    const examMetric = document.getElementById('exam-metric');
    const copyEmailBtn = document.getElementById('copy-email-btn');
    const goToCourseBtn = document.getElementById('go-to-course-btn');
    
    const mobileHeader = document.getElementById('mobile-header');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const menuCloseBtn = document.getElementById('menu-close-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    
    const quickNavBarMobile = document.getElementById('quick-nav-bar-mobile'); 
    
    const mainHeader = document.getElementById('main-header'); 
    const mobileHeaderControls = document.getElementById('mobile-header-controls'); 

    // --- [C] 이벤트 리스너 --- (v0.37과 동일)
    if (localStorage.getItem('loggedInUser')) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        const userRows = JSON.parse(localStorage.getItem('userCourseList'));
        const selectedIndex = localStorage.getItem('selectedCourseIndex') || 0;
        
        setupCourseSwitcher(userRows, selectedIndex);
        showDashboard(user);
        setupMobileNav();
    } else {
        showLogin();
    }

    loginBtn.addEventListener('click', handleLogin);
    
    if (logoutBtnPC) {
        logoutBtnPC.addEventListener('click', handleLogout);
    }
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', handleLogout);
    }

    const handleCourseChange = async (event) => {
        const selectedIndex = event.target.value;
        const userRows = JSON.parse(localStorage.getItem('userCourseList'));
        const selectedCourseRow = userRows[selectedIndex];
        
        const selectedCourseUserData = buildFullUserData(selectedCourseRow, JSON.parse(localStorage.getItem('userCourseList')));
        localStorage.setItem('loggedInUser', JSON.stringify(selectedCourseUserData));
        localStorage.setItem('selectedCourseIndex', selectedIndex);
        
        if (event.target === courseSwitcher) {
            courseSwitcherMobile.value = selectedIndex;
        } else {
            courseSwitcher.value = selectedIndex;
        }
        
        showDashboard(selectedCourseUserData);
    };

    courseSwitcher.addEventListener('change', handleCourseChange);
    courseSwitcherMobile.addEventListener('change', handleCourseChange);


    if(copyEmailBtn) {
        copyEmailBtn.addEventListener('click', () => {
            const email = 'jhj11@wjthinkbig.com';
            
            navigator.clipboard.writeText(email).then(() => {
                const originalTextEl = copyEmailBtn.querySelector('.btn-text');
                if (originalTextEl) {
                    const originalText = originalTextEl.innerHTML;
                    originalTextEl.innerHTML = '✅ 이메일 주소 복사됨!';
                    copyEmailBtn.disabled = true;
                    
                    setTimeout(() => {
                        originalTextEl.innerHTML = originalText;
                        copyEmailBtn.disabled = false;
                    }, 2000);
                }
            }).catch(err => {
                console.error('Email copy failed', err);
                alert('이메일 복사에 실패했습니다. 직접 복사해주세요: ' + email);
            });
        });
    }
    
    function setupMobileNav() {
        if(menuToggleBtn) {
            menuToggleBtn.addEventListener('click', () => {
                mobileNavOverlay.classList.add('visible');
            });
        }
        if(menuCloseBtn) {
            menuCloseBtn.addEventListener('click', () => {
                mobileNavOverlay.classList.remove('visible');
            });
        }
        if(mobileNavOverlay) {
            mobileNavOverlay.addEventListener('click', (e) => {
                if (e.target === mobileNavOverlay) { 
                    mobileNavOverlay.classList.remove('visible');
                }
            });
        }
        if(quickNavBarMobile) {
            quickNavBarMobile.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileNavOverlay.classList.remove('visible');
                });
            });
        }
    }
    
    if (!localStorage.getItem('loggedInUser')) {
        setupMobileNav();
    }
    
    let isMobile = window.innerWidth < 900;
    window.addEventListener('resize', () => {
        if (!localStorage.getItem('loggedInUser')) return;

        const currentlyMobile = window.innerWidth < 900;
        if (currentlyMobile === isMobile) return; 

        isMobile = currentlyMobile;
        
        window.location.reload();
    });


    // --- [D] 핵심 함수 ---

    function animateCountUpWithSuffix(el, end, decimals = 0, duration = 1000, prefix = '', suffix = '') {
        if (!el) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = progress * end;
            el.textContent = prefix + value.toFixed(decimals) + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        el.textContent = prefix + (0).toFixed(decimals) + suffix;
        window.requestAnimationFrame(step);
    }

    /**
     * [!!!] (MODIFIED) v0.56: '과정명'(H열)만 사용하도록 최종 수정
     */
    function buildFullUserData(userRow, allUserRows) {
        const GOAL_TIME = 16.0;
        const GOAL_SCORE = 60; 

        // --- (v0.52) '전체' 데이터 계산 ---
        const firstRow = allUserRows[0];
        const totalLearningTime = parseFloat(firstRow['전체학습시간'] || 0); // L열
        const totalRecognizedTime = parseFloat(firstRow['전체인정시간'] || 0); // M열
        
        const needsCheck = allUserRows.some(row => (row['확인필요'] || '').trim() === '확인필요');

        // --- (v0.56) '개별 과정' 데이터 계산 ---
        const examScore = parseInt(userRow['시험점수'] || -1);
        const isCompleted = (userRow['이수여부'] && userRow['이수여부'].trim() === '충족');
        
        // [!!!] (v0.56) V열을 삭제했으므로 H열('과정명')만 확인
        const courseName = userRow['과정명'] || '과정명 없음';

        const fullUserData = {
            name: userRow['성명'],
            email: userRow['이메일'],
            department: userRow['소속'],
            course: courseName,
            
            totalLearningTime: totalLearningTime,
            totalRecognizedTime: totalRecognizedTime,
            needsCheck: needsCheck,
            
            courseDetail: {
                recognizedTime: parseFloat(userRow['인정시간'] || 0), // R열
                examScore: examScore,
                isCompleted: isCompleted,
                goalTime: GOAL_TIME,
                goalScore: GOAL_SCORE
            }
        };
        return fullUserData;
    }

    /**
     * [!!!] (v0.39) 로그인 처리 함수 (API 호출)
     */
    async function handleLogin() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        
        if (!name || !email) { showError('이름과 이메일을 모두 입력하세요.'); return; }
        
        showButtonLoader(true);
        loginError.style.display = 'none';

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain', 
                },
                body: JSON.stringify({ name: name, email: email }) 
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                throw new Error(`API 오류: ${result.error}`);
            }

            const userRows = result.userRows;
            const dataUpdatedDate = result.dataUpdatedDate;

            if (!userRows || userRows.length === 0) {
                showError('일치하는 사용자가 없습니다. (이름/이메일 확인)');
                showButtonLoader(false);
                return;
            }

            localStorage.setItem('dataUpdatedDate', dataUpdatedDate);
            localStorage.setItem('userCourseList', JSON.stringify(userRows));
            
            const firstCourseRow = userRows[0];
            const firstCourseIndex = 0;
            
            const firstCourseUserData = buildFullUserData(firstCourseRow, userRows);

            localStorage.setItem('loggedInUser', JSON.stringify(firstCourseUserData));
            localStorage.setItem('selectedCourseIndex', firstCourseIndex);
            
            setupCourseSwitcher(userRows, firstCourseIndex);
            showDashboard(firstCourseUserData);
            setupMobileNav();
            
        } catch (error) {
            console.error(error);
            showError(`데이터 로드 오류: ${error.message}`);
        } finally {
            showButtonLoader(false);
        }
    }

    /**
     * [!!!] (MODIFIED) v0.56: '과정명'(H열)만 사용하도록 최종 수정
     */
    function setupCourseSwitcher(userRows, selectedIndex = 0) {
        if (!userRows || userRows.length === 0) {
            courseSwitcherWrapper.style.display = 'none'; 
            document.getElementById('mobile-header-controls').querySelector('.course-switcher-wrapper').style.display = 'none';
            return;
        }

        const switchers = [courseSwitcher, courseSwitcherMobile];
        
        switchers.forEach(switcher => {
            if (!switcher) return;
            
            const wrapper = switcher.parentElement;
            
            if (userRows.length === 1) {
                wrapper.style.display = 'flex';
                switcher.disabled = true;
                wrapper.classList.add('disabled');
            } else {
                wrapper.style.display = 'flex';
                switcher.disabled = false;
                wrapper.classList.remove('disabled');
            }
            
            switcher.innerHTML = '';
            userRows.forEach((row, index) => {
                // [!!!] (v0.56) V열을 삭제했으므로 H열('과정명')만 확인
                const courseName = row['과정명'] || '과정명 없음';
                const option = document.createElement('option');
                option.value = index;
                option.textContent = courseName;
                switcher.appendChild(option);
            });
            switcher.value = selectedIndex;
        });
    }


    /**
     * [!!!] (MODIFIED) v0.55: '학습 현황' h4 복원
     */
    function showDashboard(user) {
        const detail = user.courseDetail;
        const badge = document.getElementById('status-badge');
        const skillSetWarning = document.getElementById('skill-set-warning');
        
        const timeMetricH4 = document.getElementById('time-metric-h4');
        const examMetricH4 = document.getElementById('exam-metric-h4');
        const recognizedTimeLabel = document.getElementById('recognized-time');
        const examScoreLabel = document.getElementById('exam-score');
        
        // [!!!] (v0.55) h4의 과정명 span
        const courseNameSpan = document.getElementById('course-name');
        
        const userRows = JSON.parse(localStorage.getItem('userCourseList') || '[]');
        
        const countText = `<strong id="course-count-number">${userRows.length}</strong>과정 학습 중`;
        
        if (userRows.length > 0) {
            if (courseCountNotice) courseCountNotice.innerHTML = countText;
            if (courseCountNoticeMobile) courseCountNoticeMobile.innerHTML = countText;
        } else {
            if (courseCountNotice) courseCountNotice.style.display = 'none';
            if (courseCountNoticeMobile) courseCountNoticeMobile.style.display = 'none';
        }

        const dataUpdatedDate = localStorage.getItem('dataUpdatedDate') || "날짜 없음";
        const dataDateDynamic = document.getElementById('data-date-dynamic');
        if (dataDateDynamic) {
            dataDateDynamic.textContent = dataUpdatedDate;
        }

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
        
        const warningRow = document.getElementById('overview-warning-row');
        if (user.needsCheck) {
            document.getElementById('overview-warning-status').textContent = '확인 필요';
            document.getElementById('overview-warning-status').className = 'status-cell warning';
            warningRow.classList.remove('hidden-row');
        } else {
            warningRow.classList.add('hidden-row');
        }

        // --- 프로그레스 바 카드 ---
        // [!!!] (v0.55) h4의 과정명 span에 텍스트 바인딩
        if (courseNameSpan) {
            courseNameSpan.textContent = user.course;
        }
        
        if (detail.isCompleted) {
            badge.textContent = '이수 완료! 🎉';
            badge.className = 'status-badge completed';
        } else {
            badge.textContent = '학습 중 🏃‍♀️';
            badge.className = 'status-badge in-progress';
        }
        
        const totalTime = user.totalLearningTime.toFixed(1);
        const totalRecognizedTime = user.totalRecognizedTime.toFixed(1);
        let unrecognizedTime = (user.totalLearningTime - user.totalRecognizedTime).toFixed(1);
        unrecognizedTime = unrecognizedTime < 0 ? 0 : unrecognizedTime;

        document.getElementById('total-time').textContent = `${totalTime} H`;
        document.getElementById('recognized-time-detail').textContent = `${totalRecognizedTime} H`;
        document.getElementById('unrecognized-time').textContent = `${unrecognizedTime} H`;

        const timePercent = Math.min((detail.recognizedTime / detail.goalTime) * 100, 100);
        
        animateCountUpWithSuffix(timeMetricH4, detail.recognizedTime, 1, 1000, '', ' H');
        animateCountUpWithSuffix(recognizedTimeLabel, detail.recognizedTime, 1, 1000, '', ` / ${detail.goalTime.toFixed(1)} H`);

        
        if (detail.examScore > -1) {
            examMetric.style.display = 'block';
            const scorePercent = Math.min((detail.examScore / detail.goalScore) * 100, 100);
            
            animateCountUpWithSuffix(examMetricH4, detail.examScore, 0, 1000, '', ' 점');
            animateCountUpWithSuffix(examScoreLabel, detail.examScore, 0, 1000, '', ` / ${detail.goalScore} 점`);
            
            examProgressBar.style.width = '0%';
            setTimeout(() => { examProgressBar.style.width = `${scorePercent}%`; }, 100);
        } else {
            examMetric.style.display = 'none';
        }

        timeProgressBar.style.width = '0%';
        setTimeout(() => { timeProgressBar.style.width = `${timePercent}%`; }, 100);

        const courseName = user.course.trim();
        let link = '#';
        let display = 'none'; 
        let showWarning = false;

        // [!!!] (v0.56) CSV 데이터 기준('Skill-set')으로 수정
        if (courseName.includes('Skill-set')) { 
            display = 'none';
            showWarning = true;
        } else if (courseName.includes('IT-정보 보호')) {
            link = 'https://wooribank.udemy.com/learning-paths/10631499/';
            display = 'flex';
        } else if (courseName.includes('디지털 직무 기본')) {
            link = 'https://wooribank.udemy.com/learning-paths/10631535/';
            display = 'flex';
        } else if (courseName.includes('디지털/IT 사이버')) {
            link = 'https://wooribank.udemy.com/organization/home/category/it/';
            display = 'flex';
        }
        
        if (goToCourseBtn) {
            goToCourseBtn.href = link;
            goToCourseBtn.style.display = display;
        }
        if (skillSetWarning) {
            skillSetWarning.style.display = showWarning ? 'block' : 'none';
        }

        loginContainer.classList.remove('active');
        dashboardContainer.classList.add('active');
        
        if (detail.isCompleted) {
            const congratulatedKey = `congrats_${user.email}_${courseName}`;
            if (!sessionStorage.getItem(congratulatedKey)) {
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 },
                        zIndex: 9999
                    });
                }
                sessionStorage.setItem(congratulatedKey, 'true');
            }
        }

        setTimeout(() => {
            if (window.innerWidth >= 900) {
                const overviewCard = document.getElementById('overview');
                const rightNav = document.getElementById('quick-nav-bar');
                if (overviewCard && rightNav) {
                    const overviewHeight = overviewCard.offsetHeight;
                    rightNav.style.minHeight = `${overviewHeight}px`;
                }
            }
        }, 0);
    }

    function handleLogout() {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('userCourseList');
        localStorage.removeItem('selectedCourseIndex');
        localStorage.removeItem('dataUpdatedDate');
        sessionStorage.clear();
        
        window.location.reload();
    }

    function showLogin() {
        loginContainer.classList.add('active');
        dashboardContainer.classList.remove('active');
        nameInput.value = '';
        emailInput.value = '';
        loginError.style.display = 'none';
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

}); // DOMContentLoaded 리스너 종료
