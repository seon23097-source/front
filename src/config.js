// 모든 API/소켓 요청의 베이스 URL을 한 곳에서 관리한다.
// 운영(GitHub Pages) 빌드에서는 REACT_APP_API_URL이 주입되고,
// 로컬 개발에서는 백엔드 기본 포트(localhost:4000)로 폴백한다.
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';
