// 아이콘 클릭 시 gallery.html로 이동
document.getElementById('archive-icon').addEventListener('click', async function () {
  try {
    const response = await fetch('/check-login', {
      method: 'GET',
      credentials: 'include'  // 세션 쿠키 포함
    });

    const result = await response.json();

    if (result.loggedIn) {
      window.location.href = '/gallery';
    } else {
      alert('보관함은 로그인한 사용자만 이용할 수 있습니다.');
      window.location.href = '/login';
    }

  } catch (err) {
    console.error('로그인 상태 확인 중 오류 발생:', err);
    alert('서버 오류가 발생했습니다.');
  }
});