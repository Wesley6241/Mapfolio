// handle like button
// and like count
function likePin(pinId) {
    const likeSection = event.currentTarget.closest('.like-section');
    
    // 触发飘心特效
    spawnHearts(likeSection);
    
    fetch(`/like/${pinId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('like-count').textContent = `${data.likes} likes`;
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

// 飘心特效函数
function spawnHearts(container) {
    // 生成3-5个爱心，像抖音那样
    const heartCount = 3 + Math.floor(Math.random() * 3); // 3-5个
    
    for (let i = 0; i < heartCount; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'flying-heart';
            heart.textContent = '💗'; // 可以换成 💖💞💓
            
            // 随机偏移一点，不每次都在正中
            const offset = (Math.random() - 0.5) * 40;
            heart.style.left = `calc(50% + ${offset}px)`;
            
            // 随机延迟，让爱心错开出现
            heart.style.animationDelay = `${Math.random() * 0.3}s`;
            
            container.appendChild(heart);
            
            // 动画结束后删除节点
            setTimeout(() => {
                if (heart.parentNode) {
                    heart.remove();
                }
            }, 1300); // 稍微延长一点时间确保动画完成
            
        }, i * 150); // 每个爱心间隔150ms出现
    }
}

// Lightbox functionality for gallery images
function openLightbox(imageSrc, description) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxDesc = document.getElementById('lightbox-description');
    
    if (lightbox && lightboxImg) {
        // Force image reload for GIF animations
        lightboxImg.src = '';
        
        // Use setTimeout to ensure the src change takes effect
        setTimeout(() => {
            // Add cache buster for GIFs to force reload
            const cacheBuster = imageSrc.includes('.gif') ? '?t=' + Date.now() : '';
            lightboxImg.src = imageSrc + cacheBuster;
            lightboxImg.alt = description || 'Gallery image';
            
            if (lightboxDesc) {
                lightboxDesc.textContent = description || '';
                lightboxDesc.style.display = description ? 'block' : 'none';
            }
        }, 0);
        
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeLightbox(event) {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Close lightbox with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
});

// Add click handlers to existing gallery images
document.addEventListener('DOMContentLoaded', function() {
    const galleryImgs = document.querySelectorAll('.gallery-img');
    galleryImgs.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            const imgSrc = this.getAttribute('data-img-src') || this.src;
            const imgDesc = this.getAttribute('data-img-desc');
            const descElement = this.nextElementSibling;
            const description = imgDesc || (descElement ? descElement.textContent : '');
            openLightbox(imgSrc, description);
        });
    });
    
    // Gallery scroll functionality with arrows
    (function() {
        const container = document.querySelector('.detail-gallery-container');
        if (!container) return;

        const scroller = container.querySelector('.detail-gallery');
        const leftBtn = container.querySelector('.gallery-nav--left');
        const rightBtn = container.querySelector('.gallery-nav--right');

        function updateArrows() {
            if (!scroller) return;
            const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 1;
            const canLeft = hasOverflow && scroller.scrollLeft > 0;
            const canRight = hasOverflow && (scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);

            leftBtn.classList.toggle('is-visible', canLeft);
            rightBtn.classList.toggle('is-visible', canRight);

            container.classList.toggle('has-left', canLeft);
            container.classList.toggle('has-right', canRight);
        }

        // 点击箭头滚动一屏 80%
        function scrollByAmount(dx) {
            scroller.scrollBy({ left: dx, behavior: 'smooth' });
        }
        if (leftBtn) {
            leftBtn.addEventListener('click', (e) => { e.stopPropagation(); scrollByAmount(-scroller.clientWidth * 0.8); });
        }
        if (rightBtn) {
            rightBtn.addEventListener('click', (e) => { e.stopPropagation(); scrollByAmount(+scroller.clientWidth * 0.8); });
        }

        // 监听滚动、窗口变化
        if (scroller) {
            scroller.addEventListener('scroll', updateArrows, { passive: true });
            window.addEventListener('resize', updateArrows);

            // 图片加载后再计算一次（避免首屏未溢出）
            scroller.querySelectorAll('img').forEach(img => {
                if (img.complete) return;
                img.addEventListener('load', updateArrows, { once: true });
            });

            // 初始计算
            requestAnimationFrame(updateArrows);
        }
    })();
});
