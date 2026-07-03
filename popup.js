// DOM 元素
const sitesEl = document.getElementById('sites');
const startTimeEl = document.getElementById('startTime');
const endTimeEl = document.getElementById('endTime');
const modeEl = document.getElementById('mode');
const saveBtn = document.getElementById('saveBtn');
const lockBtn = document.getElementById('lockBtn');
const lockStatusEl = document.getElementById('lockStatus');
const statusEl = document.getElementById('status');
const settingsArea = document.getElementById('settingsArea');

// 加载设置并处理锁定状态
async function load() {
  const data = await chrome.storage.local.get(['sites', 'startTime', 'endTime', 'mode', 'lockExpiry']);
  if (data.sites) sitesEl.value = data.sites.join('\n');
  if (data.startTime) startTimeEl.value = data.startTime;
  if (data.endTime) endTimeEl.value = data.endTime;
  if (data.mode) modeEl.value = data.mode;

  const lockExpiry = data.lockExpiry || 0;
  const locked = Date.now() < lockExpiry;

  if (locked) {
    // 锁定状态：禁用输入
    settingsArea.classList.add('locked');
    lockStatusEl.textContent = `⏰ 设置已锁定，解封时间：${new Date(lockExpiry).toLocaleTimeString()}`;
    lockBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    // 自动解锁检查（到时间后下次打开popup会自动解锁）
  } else {
    settingsArea.classList.remove('locked');
    lockStatusEl.textContent = '';
    lockBtn.style.display = 'block';
    saveBtn.style.display = 'block';
    // 清除已过期的锁
    if (lockExpiry > 0) {
      await chrome.storage.local.set({ lockExpiry: 0 });
    }
  }
}

// 计算锁定截止时间戳（当天或明天的 endTime）
function calcLockExpiry(startTime, endTime) {
  const now = new Date();
  const [eh, em] = endTime.split(':').map(Number);
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0);
  const [sh, sm] = startTime.split(':').map(Number);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm, 0);

  // 如果结束时间在开始时间之后（常规时段）
  if (endToday > startToday) {
    if (now < endToday) {
      return endToday.getTime();
    } else {
      // 已经过了今天的结束时间，锁定到明天此时
      return endToday.getTime() + 24 * 60 * 60 * 1000;
    }
  } else {
    // 跨天时段，如 22:00-02:00
    const endTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, eh, em, 0);
    return endTomorrow.getTime();
  }
}

// 保存设置（不含锁定）
async function save() {
  const sites = sitesEl.value.split('\n')
    .map(s => s.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
    .filter(s => s.length > 0);
  const startTime = startTimeEl.value;
  const endTime = endTimeEl.value;
  const mode = modeEl.value;

  await chrome.storage.local.set({ sites, startTime, endTime, mode });
  statusEl.textContent = '✅ 设置已保存';
  setTimeout(() => statusEl.textContent = '', 2000);
}

// 保存并锁定
async function saveAndLock() {
  const sites = sitesEl.value.split('\n')
    .map(s => s.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
    .filter(s => s.length > 0);
  const startTime = startTimeEl.value;
  const endTime = endTimeEl.value;
  const mode = modeEl.value;
  const lockExpiry = calcLockExpiry(startTime, endTime);

  await chrome.storage.local.set({ sites, startTime, endTime, mode, lockExpiry });
  statusEl.textContent = '🔒 设置已锁定，将在 ' + new Date(lockExpiry).toLocaleTimeString() + ' 自动解封';
  setTimeout(() => statusEl.textContent = '', 3000);
  // 重新加载显示锁定状态
  load();
}

saveBtn.addEventListener('click', save);
lockBtn.addEventListener('click', saveAndLock);
load();
