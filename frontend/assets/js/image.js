// document.addEventListener('DOMContentLoaded', () => {
//   const input = document.getElementById("dropdownInput");
//   const dropdown = document.getElementById("dropdownList");
//   const imageGrid = document.querySelector('.image-grid');

//   // 장바구니에 꽃 추가하는 함수 (전역으로 한 번만 정의)
//   function addToBasket(name, season, color, imageUrl) {
//     console.log('addToBasket 호출됨:', name, season, color); // 디버깅용
//     const basketItems = document.getElementById('basketItems');
    
//     // 새로운 장바구니 아이템 요소 생성
//     const basketItem = document.createElement('div');
//     basketItem.className = 'basket-item';
    
//     basketItem.innerHTML = `
//       <div class="basket-item-info">
//         <img src="${imageUrl}" alt="${name}" class="basket-item-img">
//         <div class="basket-flower-name">${name}</div>
//         <div class="basket-flower-season">${season || ''}</div>
//         <div class="basket-flower-color">${color}</div>
//       </div>
//       <button class="remove-item">X</button>
//     `;
    
//     // 삭제 버튼에 이벤트 리스너 추가
//     const removeButton = basketItem.querySelector('.remove-item');
//     removeButton.addEventListener('click', (e) => {
//       e.stopPropagation(); // 이벤트 버블링 방지
//       basketItem.remove();
//       updateBasketCount();
//     });
    
//     // 장바구니에 아이템 추가
//     basketItems.appendChild(basketItem);
    
//     // 장바구니 카운트 업데이트
//     updateBasketCount();
//   }

//   // 장바구니 아이템 개수 업데이트 함수
//   function updateBasketCount() {
//     const totalCount = document.getElementById('totalCount');
//     const basketItemCount = document.querySelectorAll('.basket-item').length;
//     totalCount.textContent = basketItemCount;
//   }

//   // 꽃 이름 로딩
//   fetch("/flowers")
//     .then(res => res.json())
//     .then(data => {
//       dropdown.innerHTML = "";
//       data.forEach(name => {
//         const div = document.createElement("div");
//         div.textContent = name;
//         dropdown.appendChild(div);
//       });
//     });

//   input.addEventListener("focus", () => {
//     dropdown.style.display = "block";
//   });

//   input.addEventListener("input", () => {
//     const filter = input.value.toLowerCase();
//     const options = dropdown.querySelectorAll("div");
//     options.forEach(opt => {
//       opt.style.display = opt.textContent.toLowerCase().includes(filter) ? "" : "none";
//     });
//   });

//   dropdown.addEventListener("click", (e) => {
//     if (e.target.tagName === "DIV") {
//       input.value = e.target.textContent;
//       dropdown.style.display = "none";
//     }
//   });

//   document.addEventListener("click", (e) => {
//     if (!e.target.closest(".dropdown")) {
//       dropdown.style.display = "none";
//     }
//   });

//   // 라디오 중복 선택 해제
//   let selectedRadio = null;
//   document.querySelectorAll('input[name="season"]').forEach(radio => {
//     radio.addEventListener("click", function () {
//       if (this === selectedRadio) {
//         this.checked = false;
//         selectedRadio = null;
//       } else {
//         selectedRadio = this;
//       }
//     });
//   });

//   // 검색 동작 (장바구니 추가 로직 제거)
//   document.querySelector('.flower-search-form').addEventListener('submit', (e) => {
//     e.preventDefault();

//     const name = input.value.trim();
//     const season = document.querySelector('input[name="season"]:checked')?.value;
//     const colors = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value);

//     const query = {
//       ...(name && { name }),
//       ...(season && { season }),
//       ...(colors.length > 0 && { colors })
//     };

//     fetch("/search-flowers", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(query)
//     })
//     .then(res => res.json())
//     .then(data => {
//       imageGrid.innerHTML = "";

//       if (data.length === 0) {
//         imageGrid.innerHTML = "<p>검색 결과가 없습니다.</p>";
//         return;
//       }

//       data.forEach(flower => {
//         flower.variations
//           .filter(variation => colors.length === 0 || colors.includes(variation.color))
//           .forEach(variation => {
//             const card = document.createElement("div");
//             card.className = "image-card";

//             const img = document.createElement("img");
//             img.src = variation.imageUrl;
//             img.alt = `${flower.name} (${variation.color})`;

//             const overlay = document.createElement("div");
//             overlay.className = "image-overlay";

//             // 이름, 색깔, 계절 정보를 모두 표시합니다
//             overlay.innerHTML = `
//               <div class="flower-name">${flower.name}</div>
//               <div class="flower-season">${season || ''}</div>
//               <div class="flower-color">${variation.color}</div>
//             `;

//             // 꽃 카드 클릭 시에만 장바구니에 추가하는 이벤트 리스너
//             card.addEventListener('click', (e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               console.log('카드 클릭됨:', flower.name); // 디버깅용
//               addToBasket(flower.name, season, variation.color, variation.imageUrl);
//             });

//             card.appendChild(img);
//             card.appendChild(overlay);
//             imageGrid.appendChild(card);
//           });
//       });
//     });
//   });
// });