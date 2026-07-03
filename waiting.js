(async function() {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url');
  const timerEl = document.getElementById('timer');
  const enterBtn = document.getElementById('enterBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const urlDisplay = document.getElementById('urlDisplay');

  if (!targetUrl) {
    timerEl.textContent = '错误';
    return;
  }
  urlDisplay.textContent = '目标：' + targetUrl;

  const STORAGE_KEY = 'focus_blocker_waiting';
  const WAIT_SECONDS = 30;

  // 检查是否已经有倒计时记录（防止刷新重置）
  let startTime = localStorage.getItem(STORAGE_KEY);
  if (startTime) {
    startTime = parseInt(startTime, 10);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = WAIT_SECONDS - elapsed;
    if (remaining <= 0) {
      // 已经等了足够久，允许直接进入
      localStorage.removeItem(STORAGE_KEY);
      timerEl.textContent = '0';
      enterBtn.style.display = 'inline-block';
      timerEl.style.display = 'none';
    } else {
      // 继续倒计时
      startCountdown(remaining);
    }
  } else {
    // 首次访问，记录开始时间并倒计时
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    startCountdown(WAIT_SECONDS);
  }

  function startCountdown(seconds) {
    let remaining = seconds;
    timerEl.textContent = remaining;
    enterBtn.style.display = 'none';
    timerEl.style.display = 'block';

    const interval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        timerEl.style.display = 'none';
        enterBtn.style.display = 'inline-block';
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 1000);
  }

  // 按钮事件
  enterBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = targetUrl;
  });

  cancelBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    // 返回一个安全的页面，比如新标签页
    window.location.href = 'about:blank';
  });
})();
