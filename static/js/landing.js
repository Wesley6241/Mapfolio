// 状态机：0,1,2 三个框架
const frames = [
  document.getElementById('frame1'), 
  document.getElementById('frame2'), 
  document.getElementById('frame3')
];
const hint = document.getElementById('hint');
const skip = document.getElementById('skipBtn');

let currentFrame = 0;
let isTransitioning = false;
let touchStartDistance = 0;
let touchStartTime = 0;

function setActiveFrame(frameIndex) {
  if (isTransitioning || frameIndex < 0 || frameIndex > 2) return;
  
  isTransitioning = true;
  currentFrame = frameIndex;
  
  // 重置滚动进度
  resetScrollProgress();
  
  // 更新框架显示
  frames.forEach((frame, index) => {
    frame.classList.toggle('active', index === frameIndex);
  });
  
  // 更新提示文字
  hint.textContent = `Scroll / ↑↓ / Gesture · ${frameIndex + 1} / 3`;
  
  // 根据框架设置不同的过渡效果
  setTimeout(() => {
    isTransitioning = false;
  }, 1200); // 匹配CSS过渡时间
}

// 添加平滑滚动过渡效果
let scrollProgress = 0;
let isScrolling = false;

function updateScrollProgress(deltaY) {
  if (isTransitioning) return;
  
  scrollProgress += deltaY * 0.05; // 大幅降低敏感度，更微妙
  scrollProgress = Math.max(0, Math.min(100, scrollProgress)); // 限制在0-100%
  
  // 只在Frame 1时更新目标元素
  if (currentFrame === 0) {
    const targetElement = document.querySelector('.target-element');
    if (targetElement) {
      // 更渐进的缩放和透明度变化
      const scale = Math.max(0.3, 1 - (scrollProgress / 150)); // 更慢的缩放
      const opacity = Math.max(0.2, 1 - (scrollProgress / 80)); // 更慢的透明度
      targetElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      targetElement.style.opacity = opacity;
    }
  }
  
  // 更新当前激活框架的遮罩层透明度
  const activeFrame = document.querySelector('.landing-frame.active');
  if (activeFrame) {
    const mask = activeFrame.querySelector('.covering-mask');
    if (mask) {
      if (currentFrame === 0) { // Frame 1
        const maskOpacity = Math.max(0.3, 1 - (scrollProgress / 120)); // 更慢的遮罩变化
        mask.style.opacity = maskOpacity;
      } else if (currentFrame === 1) { // Frame 2
        const maskOpacity = Math.max(0.2, 0.6 - (scrollProgress / 300)); // 更慢的变化
        mask.style.opacity = maskOpacity;
      } else if (currentFrame === 2) { // Frame 3
        const maskOpacity = Math.max(0.05, 0.2 - (scrollProgress / 400)); // 最慢的变化
        mask.style.opacity = maskOpacity;
      }
    }
  }
}

// 重置滚动进度
function resetScrollProgress() {
  scrollProgress = 0;
  
  // 重置目标元素（只在Frame 1时）
  if (currentFrame === 0) {
    const targetElement = document.querySelector('.target-element');
    if (targetElement) {
      targetElement.style.transform = 'translate(-50%, -50%) scale(1)';
      targetElement.style.opacity = '1';
    }
  }
  
  // 重置当前框架的遮罩层
  const activeFrame = document.querySelector('.landing-frame.active');
  if (activeFrame) {
    const mask = activeFrame.querySelector('.covering-mask');
    if (mask) {
      if (currentFrame === 0) mask.style.opacity = '1';
      else if (currentFrame === 1) mask.style.opacity = '0.6';
      else if (currentFrame === 2) mask.style.opacity = '0.2';
    }
  }
}

function nextFrame() {
  if (currentFrame < 2) { 
    setActiveFrame(currentFrame + 1); 
  } else { 
    window.location.href = '/map'; // 结束后进入地图
  }
}

function prevFrame() { 
  if (currentFrame > 0) { 
    setActiveFrame(currentFrame - 1); 
  }
}

function throttle(fn, delay = 300) {
  if (isTransitioning) return;
  isTransitioning = true;
  fn();
  setTimeout(() => {
    isTransitioning = false;
  }, delay);
}

// 超敏感的滚轮交互 - 平滑过渡
let scrollAccumulator = 0;
const scrollThreshold = 150; // 大幅增加阈值，让动画更微妙

window.addEventListener('wheel', e => {
  e.preventDefault();
  
  // 更新平滑滚动进度
  updateScrollProgress(e.deltaY);
  
  scrollAccumulator += e.deltaY;
  
  // 当累积滚动超过阈值时触发框架切换
  if (Math.abs(scrollAccumulator) >= scrollThreshold) {
    if (scrollAccumulator > 0) {
      nextFrame();
    } else {
      prevFrame();
    }
    scrollAccumulator = 0; // 重置累积器
  }
}, { passive: false });

// 键盘交互
window.addEventListener('keydown', e => {
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { 
    e.preventDefault(); 
    throttle(nextFrame); 
  }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { 
    e.preventDefault(); 
    throttle(prevFrame); 
  }
  if (e.key === 'Enter') {
    throttle(nextFrame);
  }
});

// 跳过按钮
skip.addEventListener('click', () => window.location.href = '/map');

// iPad 手势支持 - 更敏感的缩放手势
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// 触摸开始
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    touchStartDistance = getTouchDistance(e.touches);
    touchStartTime = Date.now();
  }
}, { passive: true });

// 触摸移动 - 手机端优化：更敏感的缩放手势检测
document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && touchStartDistance > 0) {
    e.preventDefault();
    const currentDistance = getTouchDistance(e.touches);
    const scale = currentDistance / touchStartDistance;
    const timeElapsed = Date.now() - touchStartTime;
    
    // 手机端：降低阈值，更敏感的手势检测
    const isMobile = window.innerWidth <= 768;
    const scaleThreshold = isMobile ? 0.1 : 0.15; // 手机端更敏感
    const scaleTrigger = isMobile ? 1.1 : 1.15; // 手机端更容易触发
    
    if (timeElapsed < 1500 && Math.abs(scale - 1) > scaleThreshold) {
      if (scale > scaleTrigger) {
        // 放大 - 前进到下一帧
        throttle(nextFrame);
      } else if (scale < (2 - scaleTrigger)) {
        // 缩小 - 后退到上一帧
        throttle(prevFrame);
      }
      touchStartDistance = 0; // 重置
    }
  }
}, { passive: false });

// 触摸结束
document.addEventListener('touchend', () => {
  touchStartDistance = 0;
  touchStartTime = 0;
}, { passive: true });

// 添加设备运动检测 (适用于移动设备)
if (window.DeviceMotionEvent) {
  let lastMotionTime = 0;
  let motionThreshold = 0.5; // 运动敏感度阈值
  
  window.addEventListener('devicemotion', (e) => {
    const now = Date.now();
    if (now - lastMotionTime < 1000) return; // 限制频率
    
    const acceleration = e.accelerationIncludingGravity;
    if (acceleration) {
      const totalAcceleration = Math.sqrt(
        Math.pow(acceleration.x, 2) + 
        Math.pow(acceleration.y, 2) + 
        Math.pow(acceleration.z, 2)
      );
      
      // 检测明显的设备倾斜或运动
      if (Math.abs(acceleration.x) > motionThreshold) {
        if (acceleration.x > 0) {
          throttle(nextFrame);
        } else {
          throttle(prevFrame);
        }
        lastMotionTime = now;
      }
    }
  });
}


// 初始化
setActiveFrame(0);

// 创建动态粒子效果
function createParticles(container, count = 30) {
  if (!container) return;
  
  // 清空现有粒子（如果有）
  container.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // 随机大小 (2-8px)
    const size = Math.random() * 6 + 2;
    // 随机位置
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    // 随机透明度 (0.3-0.9)
    const opacity = Math.random() * 0.6 + 0.3;
    // 随机动画延迟
    const delay = Math.random() * 5;
    // 随机动画持续时间
    const duration = Math.random() * 10 + 15;
    
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      top: ${y}%;
      background: rgba(255, 255, 255, ${opacity});
      border-radius: 50%;
      pointer-events: none;
      animation: particleMove ${duration}s ease-in-out infinite;
      animation-delay: ${delay}s;
      filter: blur(0.5px);
      box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, ${opacity * 0.8});
    `;
    
    container.appendChild(particle);
  }
}

// 确保目标元素在Frame 1中可见
document.addEventListener('DOMContentLoaded', () => {
  const targetElement = document.querySelector('.target-element');
  if (targetElement) {
    targetElement.style.transform = 'translate(-50%, -50%) scale(1)';
    targetElement.style.opacity = '1';
  }
  
  // 为所有粒子容器创建动态粒子
  const particleContainers = document.querySelectorAll('.particles-container');
  particleContainers.forEach(container => {
    createParticles(container, 40);
  });
  
  // 调试信息
  console.log('Landing page loaded');
  console.log('Current frame:', currentFrame);
  console.log('Target element:', targetElement);
  
  // 添加调试事件监听器
  window.addEventListener('wheel', (e) => {
    console.log('Wheel event:', e.deltaY, 'Scroll progress:', scrollProgress);
  });
  
  // 添加进度指示器
  const progressIndicator = document.createElement('div');
  progressIndicator.id = 'progress-indicator';
  progressIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 1000;
    font-family: monospace;
  `;
  document.body.appendChild(progressIndicator);
  
  // 更新进度指示器
  function updateProgressIndicator() {
    progressIndicator.textContent = `Frame: ${currentFrame + 1}/3 | Progress: ${Math.round(scrollProgress)}%`;
  }
  
  // 定期更新进度指示器
  setInterval(updateProgressIndicator, 100);
});
