/* About Page Interactions (about.js)
   - Scroll shadows for .glass-scroll
   - Collapsible manual sections (h3 + next block)
   - Optional Table of Contents (if .about-toc exists)
   - Smooth in-page scrolling
   - Prevent body from scrolling; only container scrolls
*/

(function () {
  const container = document.querySelector('.glass-scroll');
  if (!container) return;

  // -------------------------------
  // 0) 防止页面主体滚动（兜底）
  // -------------------------------
  function stopBodyScroll(e) {
    // 只允许在 .glass-scroll 内滚动
    if (!container.contains(e.target)) {
      e.preventDefault();
    }
  }
  // Wheel 在 body 上兜底（移动端由 CSS 解决，这里主要是桌面触控板）
  document.addEventListener('wheel', stopBodyScroll, { passive: false });

  // -------------------------------
  // 1) 顶/底滚动阴影提示（渐隐）
  // -------------------------------
  const topFade = document.createElement('div');
  const bottomFade = document.createElement('div');

  Object.assign(topFade.style, {
    position: 'sticky',
    top: '-1px',
    left: '0',
    right: '0',
    height: '28px',
    pointerEvents: 'none',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0))',
    opacity: '0',
    transition: 'opacity 160ms ease',
    zIndex: '3',
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
    marginTop: '-8px'
  });

  Object.assign(bottomFade.style, {
    position: 'sticky',
    bottom: '-1px',
    left: '0',
    right: '0',
    height: '28px',
    pointerEvents: 'none',
    background: 'linear-gradient(to top, rgba(0,0,0,0.18), rgba(0,0,0,0))',
    opacity: '0',
    transition: 'opacity 160ms ease',
    zIndex: '3',
    borderBottomLeftRadius: 'inherit',
    borderBottomRightRadius: 'inherit',
    marginBottom: '-8px'
  });

  // 把阴影插入容器的最前和最后位置（sticky 依赖于容器滚动上下文）
  container.prepend(topFade);
  container.appendChild(bottomFade);

  function updateFades() {
    const atTop = container.scrollTop <= 0;
    const atBottom = Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight;

    topFade.style.opacity = atTop ? '0' : '1';
    bottomFade.style.opacity = atBottom ? '0' : '1';
  }

  container.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', updateFades);
  setTimeout(updateFades, 0);

  // -------------------------------
  // 2) 折叠/展开 Manual 小节
  // -------------------------------
  // 规则：在 .manual-section 内，找到所有 h3，把它与后面的相邻块作为一组
  const manualRoot = container.querySelector('.manual-section');
  if (manualRoot) {
    const headings = Array.from(manualRoot.querySelectorAll('h3'));
    headings.forEach((h3, idx) => {
      // 找到 h3 后面的“内容块”，通常是 ul/p/div（直到遇到下一个 h3 或末尾）
      const contentBlocks = [];
      let sibling = h3.nextElementSibling;
      while (sibling && sibling.tagName !== 'H3') {
        contentBlocks.push(sibling);
        sibling = sibling.nextElementSibling;
      }

      // 包一层 wrapper，便于折叠动画
      const wrapper = document.createElement('div');
      wrapper.className = 'manual-collapse';
      wrapper.style.overflow = 'hidden';
      wrapper.style.transition = 'height 200ms ease';
      wrapper.setAttribute('role', 'region');

      // 将内容块移入 wrapper
      contentBlocks.forEach(node => wrapper.appendChild(node));
      // 将 wrapper 插在 h3 后面
      h3.insertAdjacentElement('afterend', wrapper);

      // h3 可点击/可回车
      h3.setAttribute('tabindex', '0');
      h3.setAttribute('role', 'button');
      h3.setAttribute('aria-expanded', String(idx === 0));

      // 初始状态：第一个展开，其余折叠
      if (idx === 0) {
        wrapper.style.height = wrapper.scrollHeight + 'px';
      } else {
        wrapper.style.height = '0px';
        wrapper.hidden = true;
        h3.setAttribute('aria-expanded', 'false');
      }

      function toggle() {
        const expanded = h3.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          // 折叠
          h3.setAttribute('aria-expanded', 'false');
          // 固定当前高度，下一帧设为 0 触发展开动画
          wrapper.style.height = wrapper.scrollHeight + 'px';
          requestAnimationFrame(() => {
            wrapper.style.height = '0px';
          });
          // 动画结束后隐藏以移除可聚焦元素
          wrapper.addEventListener('transitionend', function onEnd() {
            wrapper.hidden = true;
            wrapper.removeEventListener('transitionend', onEnd);
          });
        } else {
          // 展开
          h3.setAttribute('aria-expanded', 'true');
          wrapper.hidden = false;
          // 先置为 0，再置为 scrollHeight 触发动画
          wrapper.style.height = '0px';
          requestAnimationFrame(() => {
            wrapper.style.height = wrapper.scrollHeight + 'px';
          });
        }
        // 更新滚动阴影
        setTimeout(updateFades, 210);
      }

      h3.addEventListener('click', toggle);
      h3.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // -------------------------------
  // 3) 可选：自动生成 TOC（如页面有 .about-toc）
  // -------------------------------
  const toc = container.querySelector('.about-toc');
  if (toc) {
    const headings = Array.from(container.querySelectorAll('.about-content h2, .about-content h3'));
    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
    list.style.gap = '10px 16px';

    headings.forEach(h => {
      if (!h.id) {
        h.id = h.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      a.style.textDecoration = 'none';
      a.style.fontSize = h.tagName === 'H2' ? '14px' : '13px';
      a.style.opacity = h.tagName === 'H2' ? '1' : '0.85';

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = container.querySelector(a.getAttribute('href'));
        if (!target) return;
        smoothScrollIntoView(container, target, 480);
      });

      li.appendChild(a);
      list.appendChild(li);
    });

    toc.appendChild(list);
  }

  // -------------------------------
  // 4) 平滑滚动到容器内目标
  // -------------------------------
  function smoothScrollIntoView(scrollContainer, targetEl, duration = 400) {
    const startTop = scrollContainer.scrollTop;
    const rect = targetEl.getBoundingClientRect();
    const contRect = scrollContainer.getBoundingClientRect();
    const offset = rect.top - contRect.top + startTop - 12; // 顶部留点间距

    const startTime = performance.now();
    function animate(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutQuad(t);
      scrollContainer.scrollTop = startTop + (offset - startTop) * eased;
      if (t < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // 初次进入时，确保阴影正确
  updateFades();
})();
