// feedback.js
(function () {
    const form = document.getElementById('feedbackForm');
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const msgEl = document.getElementById('message');
    const ratingEl = document.getElementById('rating');
    const charCount = document.getElementById('charCount');
  
    const statsBox = document.getElementById('feedbackStats');
    const listBox = document.getElementById('feedbackList');
  
    // 1) 字数计数
    const MAX = 1000;
    const updateCount = () => {
      const n = msgEl.value.length;
      charCount.textContent = `${n} / ${MAX}`;
      charCount.style.color = n > MAX ? '#b00' : '';
    };
    msgEl.addEventListener('input', updateCount);
    updateCount();
  
    // 2) 基础校验
    form.addEventListener('submit', (e) => {
      const errs = [];
      if (!nameEl.value.trim()) errs.push('Name is required.');
      if (!msgEl.value.trim()) errs.push('Message is required.');
      if (msgEl.value.length > MAX) errs.push(`Message must be ≤ ${MAX} characters.`);
      if (emailEl.value.trim() && !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(emailEl.value.trim())) {
        errs.push('Please enter a valid email address.');
      }
      if (errs.length) {
        e.preventDefault();
        alert(errs.join('\n'));
      }
    });
  
    // 3) 拉取统计与最近留言（/api/feedback/stats）
    async function loadStats() {
      try {
        const res = await fetch('/api/feedback/stats');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
  
        // 顶部统计
        const total = data.total_feedback ?? 0;
        const avg = data.average_rating ?? 0;
        statsBox.textContent = `Total: ${total} • Average Rating: ${avg.toFixed ? avg.toFixed(1) : avg}`;
  
        // 最近 10 条
        listBox.innerHTML = '';
        (data.recent_feedback || []).forEach(item => {
          const card = document.createElement('div');
          card.style.padding = '10px 12px';
          card.style.background = 'rgba(255,255,255,0.7)';
          card.style.border = '1px solid rgba(0,0,0,0.06)';
          card.style.borderRadius = '10px';
          card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
  
          const head = document.createElement('div');
          head.style.display = 'flex';
          head.style.justifyContent = 'space-between';
          head.style.gap = '8px';
          head.style.marginBottom = '6px';
          head.innerHTML = `
            <strong>${escapeHtml(item.name || 'Anonymous')}</strong>
            <span style="opacity:.8;">★ ${item.rating ?? '-'}</span>
          `;
  
          const msg = document.createElement('div');
          msg.style.whiteSpace = 'pre-wrap';
          msg.textContent = item.message || '';
  
          const time = document.createElement('div');
          time.style.textAlign = 'right';
          time.style.fontSize = '12px';
          time.style.opacity = '.7';
          time.style.marginTop = '6px';
          time.textContent = item.timestamp || '';
  
          card.appendChild(head);
          card.appendChild(msg);
          card.appendChild(time);
          listBox.appendChild(card);
        });
      } catch (err) {
        statsBox.textContent = 'Failed to load feedback stats.';
        console.error(err);
      }
    }
  
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
      }[c]));
    }
  
    loadStats();
  })();
  