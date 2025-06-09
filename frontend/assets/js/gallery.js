// gallery.js
document.addEventListener('DOMContentLoaded', () => {
    // 이미지 그리드 영역 - HTML에서 이미 정의된 요소들 사용
    const imageGrids = {
        'my-images': document.getElementById('my-images'),
        'all-images': document.getElementById('all-images'),
        'liked-images': document.getElementById('liked-images')
    };

    const paginationContainer = document.querySelector('.pagination');
    const imagesPerPage = 15;

    let activeTab = 'my-images';
    let imageToDelete = null;
    let currentIndex = -1;
    let currentGroupStartPage = 1;
    let currentPage = 1;
    let currentImages = []; // 현재 표시중인 이미지들
    let userLikes = {}; // 사용자의 좋아요 상태

    const modal = document.getElementById('delete-modal');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    const imageViewerModal = document.getElementById('image-viewer-modal');
    const viewerImage = document.getElementById('viewer-image');
    const imageDescription = document.getElementById('image-description');

    // 탭 클릭 이벤트
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            console.log('탭 클릭됨:', e.target.getAttribute('data-tab')); // 디버깅
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            activeTab = e.target.getAttribute('data-tab');
            
            // 모든 탭 컨텐츠 숨기기
            Object.values(imageGrids).forEach(grid => {
                if (grid) grid.classList.add('hidden');
            });
            
            // 현재 탭만 보이기
            if (imageGrids[activeTab]) {
                imageGrids[activeTab].classList.remove('hidden');
            }

            currentPage = 1;
            currentGroupStartPage = 1;

            document.getElementById('filter-month').value = '전체 월';
            document.getElementById('filter-color').value = '전체색깔';
            document.getElementById('filter-type').value = '전체타입';
            
            loadImages(1);
        }
    });

    // 서버에서 이미지 로드
    async function loadImages(page = 1) {
        try {
            console.log('=== 이미지 로드 시작 ===');
            console.log('현재 탭:', activeTab);
            console.log('페이지:', page);

            let endpoint;
            switch (activeTab) {
                case 'my-images':
                    endpoint = '/my-images';
                    break;
                case 'liked-images':
                    endpoint = '/liked-images';
                    break;
                case 'all-images':
                    endpoint = '/all-images';
                    break;
                default:
                    console.error('알 수 없는 탭:', activeTab);
                    return;
            }

            // 필터 값 가져오기
            const rawMonth = document.getElementById('filter-month').value;
            const rawColor = document.getElementById('filter-color').value;
            const rawType = document.getElementById('filter-type').value;

            const month = rawMonth !== '전체 월' ? rawMonth.replace('월', '') : '';
            const color = rawColor !== '전체색깔' ? rawColor : '';
            const type = rawType !== '전체타입' ? rawType : '';

            // URL 파라미터 구성
            const params = new URLSearchParams({
                page,
                limit: imagesPerPage,
                ...(month && { month }),
                ...(color && { color }),
                ...(type && { type }),
            });

            const url = `${endpoint}?${params}`;
            console.log('요청 URL:', url);

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                currentImages = result.data;
                await loadUserLikes();
                renderImages();
                updatePagination(result.pagination);
            } else {
                console.error('서버 에러:', result.message);
                showNoImages();
            }
        } catch (error) {
            console.error('네트워크 오류:', error);
            showNoImages();
        }
    }

    // 필터 <form>에서 submit 이벤트 처리
    document.querySelector('.gallery-filter-form').addEventListener('submit', (event) => {
        event.preventDefault(); // form 제출로 인한 페이지 새로고침 방지
        currentPage = 1;
        loadImages(1);
    });

    // 사용자의 좋아요 상태 로드
    async function loadUserLikes() {
        try {
            const imageIds = currentImages.map(img => img._id);
            if (imageIds.length === 0) return;

            const response = await fetch('/check-likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageIds })
            });

            const result = await response.json();
            if (result.success) {
                userLikes = result.likes;
            }
        } catch (error) {
            console.error('좋아요 상태 로드 오류:', error);
        }
    }

    // 이미지 렌더링
    function renderImages() {
        console.log('=== 이미지 렌더링 시작 ===');
        console.log('현재 탭:', activeTab);
        console.log('렌더링할 이미지 개수:', currentImages.length);

        const grid = imageGrids[activeTab];
        if (!grid) {
            console.error('그리드 요소를 찾을 수 없음:', activeTab);
            return;
        }

        grid.innerHTML = '';

        if (currentImages.length === 0) {
            showNoImages();
            return;
        }

        currentImages.forEach((image, index) => {
            console.log(`이미지 ${index + 1} 렌더링:`, image.imageUrl);

            const thumb = document.createElement('div');
            thumb.className = 'image-thumb';
            thumb.setAttribute('data-image-id', image._id);

            const img = document.createElement('img');
            img.src = image.imageUrl;
            img.alt = `${image.flowerName.join(', ')} - ${image.backgroundType}`;
            
            // 이미지 로드 오류 처리
            img.onerror = function() {
                console.error('이미지 로드 실패:', image.imageUrl);
                this.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.textContent = '이미지를 불러올 수 없습니다';
                errorDiv.style.cssText = 'text-align:center;padding:20px;color:#999;';
                thumb.appendChild(errorDiv);
            };

            // 좋아요 버튼
            const likeBtn = document.createElement('i');
            likeBtn.className = userLikes[image._id] ? 'bi bi-heart-fill like-icon liked' : 'bi bi-heart like-icon';
            likeBtn.title = '좋아요';
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(image._id, likeBtn);
            });

            // 좋아요 개수 표시
            const likeCount = document.createElement('span');
            likeCount.className = 'like-count';
            likeCount.textContent = image.likeCount || 0;

            // 삭제 버튼 (내 이미지에만 표시)
            let deleteBtn = null;
            if (activeTab === 'my-images') {
                deleteBtn = document.createElement('i');
                deleteBtn.className = 'bi bi-trash3 trash-icon';
                deleteBtn.title = '삭제';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    imageToDelete = image._id;
                    modal.classList.remove('hidden');
                });
            }

            // 다운로드 버튼
            const downloadBtn = document.createElement('i');
            downloadBtn.className = 'bi bi-download download-icon';
            downloadBtn.title = '이미지 저장';
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadImage(image.imageUrl, `flower_${image._id}.png`);
            });

            // 작성자 정보 (전체 보관함에서만 표시)
            let authorInfo = null;
            if (activeTab === 'all-images') {
                authorInfo = document.createElement('div');
                authorInfo.className = 'author-info';
                
                // 안전한 작성자 이름 접근
                let authorName = '알 수 없음';
                if (image.userId && image.userId.name) {
                    authorName = image.userId.name;
                } else if (image.userName) {
                    authorName = image.userName; // fallback으로 userName 사용
                }
                
                authorInfo.textContent = `by ${authorName}`;
            }

            // 썸네일 구성
            thumb.appendChild(likeBtn);
            thumb.appendChild(likeCount);
            if (deleteBtn) thumb.appendChild(deleteBtn);
            thumb.appendChild(downloadBtn);
            thumb.appendChild(img);
            if (authorInfo) thumb.appendChild(authorInfo);

            // 이미지 클릭으로 상세보기
            thumb.addEventListener('click', () => {
                currentIndex = index;
                openImageViewer(currentIndex);
            });

            grid.appendChild(thumb);
        });

        // 빈 칸 채우기
        const emptyCount = imagesPerPage - currentImages.length;
        for (let i = 0; i < emptyCount; i++) {
            const emptyThumb = document.createElement('div');
            emptyThumb.className = 'image-thumb empty';
            grid.appendChild(emptyThumb);
        }

        console.log('렌더링 완료');
    }

    // 이미지가 없을 때 표시
    function showNoImages() {
        const grid = imageGrids[activeTab];
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="no-images">
                <p>표시할 이미지가 없습니다.</p>
            </div>
        `;
        
        // 페이지네이션 숨기기
        paginationContainer.style.display = 'none';
    }

    // 좋아요 토글
    async function toggleLike(imageId, iconElement) {
        try {
            const response = await fetch('/toggle-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId })
            });

            const result = await response.json();
            if (result.success) {
                // 아이콘 상태 업데이트
                if (result.liked) {
                    iconElement.className = 'bi bi-heart-fill like-icon liked';
                } else {
                    iconElement.className = 'bi bi-heart like-icon';
                }

                // 좋아요 개수 업데이트
                const likeCountElement = iconElement.parentNode.querySelector('.like-count');
                const currentCount = parseInt(likeCountElement.textContent);
                likeCountElement.textContent = result.liked ? currentCount + 1 : currentCount - 1;

                // 사용자 좋아요 상태 업데이트
                userLikes[imageId] = result.liked;

                // 좋아요 탭에서 좋아요 취소한 경우 해당 이미지 제거
                if (activeTab === 'liked-images' && !result.liked) {
                    setTimeout(() => loadImages(currentPage), 500);
                }
            } else {
                alert(result.message || '좋아요 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('좋아요 토글 오류:', error);
            alert('좋아요 처리 중 오류가 발생했습니다.');
        }
    }

    // 이미지 다운로드
    function downloadImage(imageUrl) {
        const link = document.createElement('a');
        link.href = `/download-image?url=${encodeURIComponent(imageUrl)}`;
        link.download = 'flower.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 페이지네이션 업데이트
    function updatePagination(pagination) {
        paginationContainer.innerHTML = '';
        
        if (pagination.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        const maxVisibleButtons = 5;
        currentPage = pagination.currentPage;

        currentGroupStartPage = Math.floor((currentPage - 1) / maxVisibleButtons) * maxVisibleButtons + 1;
        const start = currentGroupStartPage;
        const end = Math.min(start + maxVisibleButtons - 1, pagination.totalPages);

        // 첫 페이지로 이동
        const firstBtn = document.createElement('button');
        firstBtn.innerHTML = '«';
        firstBtn.className = 'page-btn';
        firstBtn.disabled = currentPage === 1;
        firstBtn.addEventListener('click', () => loadImages(1));
        paginationContainer.appendChild(firstBtn);

        // 이전 페이지 그룹
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '‹';
        prevBtn.className = 'page-btn';
        prevBtn.disabled = start === 1;
        prevBtn.addEventListener('click', () => {
            if (start > 1) {
                const newStart = Math.max(1, start - maxVisibleButtons);
                loadImages(newStart);
            }
        });
        paginationContainer.appendChild(prevBtn);

        // 숫자 버튼
        for (let i = start; i <= end; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = 'page-btn page-number';
            if (i === currentPage) pageBtn.classList.add('active');

            pageBtn.addEventListener('click', () => loadImages(i));
            paginationContainer.appendChild(pageBtn);
        }

        // 다음 페이지 그룹
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '›';
        nextBtn.className = 'page-btn';
        nextBtn.disabled = end >= pagination.totalPages;
        nextBtn.addEventListener('click', () => {
            if (end < pagination.totalPages) {
                const newStart = start + maxVisibleButtons;
                loadImages(newStart);
            }
        });
        paginationContainer.appendChild(nextBtn);

        // 마지막 페이지로 이동
        const lastBtn = document.createElement('button');
        lastBtn.innerHTML = '»';
        lastBtn.className = 'page-btn';
        lastBtn.disabled = currentPage === pagination.totalPages;
        lastBtn.addEventListener('click', () => loadImages(pagination.totalPages));
        paginationContainer.appendChild(lastBtn);
    }

    // 삭제 확인 모달
    confirmBtn.addEventListener('click', async () => {
        if (imageToDelete) {
            try {
                const response = await fetch(`/delete-image/${imageToDelete}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                if (result.success) {
                    alert('이미지가 삭제되었습니다.');
                    loadImages(currentPage);
                } else {
                    alert(result.message || '이미지 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('이미지 삭제 오류:', error);
                alert('이미지 삭제 중 오류가 발생했습니다.');
            }
        }
        modal.classList.add('hidden');
        imageToDelete = null;
    });

    // 삭제 취소
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        imageToDelete = null;
    });

    // 작성자 정보를 안전하게 가져오는 함수
    function getAuthorInfo(image) {
        if (activeTab !== 'all-images') return '';
        
        let authorName = '알 수 없음';
        if (image.userId && image.userId.name) {
            authorName = image.userId.name;
        } else if (image.userName) {
            authorName = image.userName;
        }
        
        return `<p><strong>작성자:</strong> ${authorName}</p>`;
    }

    // 이미지 뷰어 열기
    function openImageViewer(index) {
        const image = currentImages[index];
        if (!image) return;

        viewerImage.src = image.imageUrl;
        viewerImage.alt = image.flowerName.join(', ');
        
        // 이미지 설명 구성
        const flowerInfo = image.flowerName.map((name, i) => {
            return `${name} (${image.flowerColor[i]})`;
        }).join(', ');
        
        imageDescription.innerHTML = `
            <div class="image-details">
                <p><strong>배경 타입:</strong> ${image.backgroundType}</p>
                <p><strong>사용한 꽃:</strong> ${flowerInfo}</p>
                <p><strong>좋아요:</strong> ${image.likeCount || 0}개</p>
                ${getAuthorInfo(image)}
                <p><strong>생성일:</strong> ${new Date(image.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        
        imageViewerModal.classList.remove('hidden');
    }

    // 모달 바깥 영역 클릭 시 닫기
    imageViewerModal.addEventListener('click', (e) => {
        if (e.target === imageViewerModal) {
            imageViewerModal.classList.add('hidden');
            viewerImage.src = '';
        }
    });

    // 이미지 뷰어에서 이전 이미지
    document.getElementById('prev-image').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            openImageViewer(currentIndex);
        }
    });

    // 이미지 뷰어에서 다음 이미지
    document.getElementById('next-image').addEventListener('click', () => {
        if (currentIndex < currentImages.length - 1) {
            currentIndex++;
            openImageViewer(currentIndex);
        }
    });

    // 뷰어에서 다운로드
    document.getElementById('viewer-download').addEventListener('click', () => {
        if (currentIndex >= 0 && currentImages[currentIndex]) {
            const image = currentImages[currentIndex];
            downloadImage(image.imageUrl, `flower_${image._id}.png`);
        }
    });

    // 뷰어에서 삭제 (내 이미지만)
    document.getElementById('viewer-delete').addEventListener('click', () => {
        if (activeTab === 'my-images' && currentIndex >= 0 && currentImages[currentIndex]) {
            imageToDelete = currentImages[currentIndex]._id;
            modal.classList.remove('hidden');
            imageViewerModal.classList.add('hidden');
        }
    });

    // 초기 로드
    console.log('초기 로드 시작');
    loadImages(1);
});