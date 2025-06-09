document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const modalClose = document.getElementById("modal-close");
  
    // 모든 best-item 안의 이미지에 이벤트 연결
    document.querySelectorAll(".best-item img").forEach(img => {
      img.addEventListener("click", () => {
        modal.style.display = "block";
        modalImg.src = img.src;
        modalImg.alt = img.alt;
      });
    });
  
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
    });
  
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });
  