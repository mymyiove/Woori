/* [!!!] (v0.52) Cloudflare '개인 비서' 프록시
 * - 파일 위치: /functions/api/login.js
 * - 역할: app.js의 요청을 받아 Google Apps Script로 대신 전달하고,
 * 결과에 '보안 헤더'를 붙여 app.js로 최종 응답합니다.
 */

// [!!!] (필수!) 2단계에서 배포한 'Google Apps Script URL'을 여기에 붙여넣으세요.
const GAS_URL = "https://script.google.com/macros/s/AKfycby9B7_twYJIky-sQwwjidZItT88OK6HA0Ky7XLHsrMb8rnCTfnbIdqRcc7XKXFEpV99/exec";

// [!!!] (필수!) 님의 웹페이지 도메인으로 변경하세요.
const MY_DOMAIN = "https://woori-1ua.pages.dev";

// -------------------------------------------------------------------

// 1. 브라우저에 붙여줄 '보안 통과 헤더'
const CORS_HEADERS = {
  // '*' 대신, 정확히 '내 도메인'만 허용합니다. (가장 강력한 보안)
  "Access-Control-Allow-Origin": MY_DOMAIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Cloudflare가 모든 요청을 이 함수로 받습니다.
 */
export async function onRequest(context) {
  
  // 2. 브라우저가 "혹시 POST 보내도 되나요?"라고 묻는 '사전 요청(OPTIONS)' 처리
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 3. '내 이름 확인하기' 버튼을 누른 실제 '로그인(POST)' 요청 처리
  if (context.request.method === "POST") {
    try {
      // 4. app.js가 보낸 body (이름, 이메일 JSON)를 그대로 읽음
      const browserRequestBody = await context.request.text();
      
      // 5. Google Apps Script로 '대신' 요청을 보냄 (서버간 통신이라 CORS 없음)
      const gasResponse = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: browserRequestBody,
      });

      if (!gasResponse.ok) {
        throw new Error("Google Apps Script 서버에서 오류가 발생했습니다.");
      }
      
      // 6. Google이 응답한 순수 JSON 데이터를 가져옴
      const data = await gasResponse.json();

      // 7. 이 데이터에 '보안 헤더'를 붙여서 브라우저(app.js)로 최종 응답
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS, // 1번에서 만든 헤더를 여기에 적용
        },
      });
      
    } catch (err) {
      // 8. Google Apps Script에서 에러가 나도, '보안 헤더'를 붙여서 응답
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }
  }

  // 9. POST나 OPTIONS가 아닌 다른 요청은 거부
  return new Response("Method not allowed", { status: 405 });
}
