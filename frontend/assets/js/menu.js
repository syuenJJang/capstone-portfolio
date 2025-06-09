// menu.js
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const slideMenu = document.getElementById('slide-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    
    // 햄버거 메뉴 클릭 시
    hamburgerBtn.addEventListener('click', function() {
      // 햄버거 메뉴 X로 변환
      hamburgerBtn.classList.toggle('active');
      
      // 슬라이드 메뉴 열기/닫기
      slideMenu.classList.toggle('active');
      menuOverlay.classList.toggle('active');
      
      // 스크롤 제어
      if (slideMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden'; // 스크롤 방지
      } else {
        document.body.style.overflow = ''; // 스크롤 복원
      }
    });
    
    // 오버레이 클릭 시 메뉴 닫기
    menuOverlay.addEventListener('click', function() {
      closeMenu();
    });
    
    // 메뉴 아이템 클릭 시 메뉴 닫기
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', function() {
        closeMenu();
      });
    });
    
    // 메뉴 닫기 함수
    function closeMenu() {
      hamburgerBtn.classList.remove('active'); // X에서 햄버거로 변환
      slideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = ''; // 스크롤 복원
    }
  });