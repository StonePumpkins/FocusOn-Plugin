// ========== 专注屏蔽器 Pro - 后台主程序 ==========

// 默认设置
const DEFAULT_SETTINGS = {
  sites: [],
  startTime: '08:00',
  endTime: '18:00',
  mode: 'block', // 'block' 完全封禁 或 'delay' 延迟30秒
  lockExpiry: 0  // 设置锁定的截止时间戳，0表示未锁定
};

// 检查当前是否在屏蔽时段内
function isBlockTime(startTime, endTime) {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins <= endMins) {
    return mins >= startMins && mins <= endMins;
  } else {
    // 跨天情况（如 22:00 - 02:00）
    return mins >= startMins || mins <= endMins;
  }
}

// 获取当前设置
async function getSettings() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...data };
}

// 完全封禁模式：更新 declarativeNetRequest 规则
async function updateBlockRules(settings) {
  const { sites, startTime, endTime, mode } = settings;
  const inTime = isBlockTime(startTime, endTime);

  if (mode !== 'block' || !inTime || sites.length === 0) {
    // 非完全封禁模式 或 不在时段内 或 没有网站，移除所有动态规则
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    if (existing.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing.map(r => r.id)
      });
    }
    return;
  }

  // 构建屏蔽规则
  const rules = sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `*://*${site}/*`,
      resourceTypes: ['main_frame']
    }
  }));

  // 先清空再添加
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: rules
  });
}

// 延迟模式：监听导航并重定向到等待页
// 用一个变量保存当前活动的监听器，方便移除
let navListener = null;

async function updateDelayListener(settings) {
  const { sites, startTime, endTime, mode } = settings;
  const inTime = isBlockTime(startTime, endTime);

  // 移除旧监听
  if (navListener) {
    chrome.webNavigation.onBeforeNavigate.removeListener(navListener);
    navListener = null;
  }

  if (mode !== 'delay' || !inTime || sites.length === 0) return;

  // 创建新的监听函数
  navListener = (details) => {
    // 只处理主框架导航
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    const hostname = url.hostname.replace('www.', '');
    // 检查是否匹配屏蔽列表
    const matched = sites.some(site => hostname.includes(site));
    if (matched) {
      // 重定向到等待页
      const waitingUrl = chrome.runtime.getURL('waiting.html') + '?url=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: waitingUrl });
    }
  };

  // 绑定事件
  chrome.webNavigation.onBeforeNavigate.addListener(navListener, {
    url: [{ urlMatches: '.*' }] // 监听所有URL，在回调中过滤
  });
}

// 统一刷新规则和监听
async function refresh() {
  const settings = await getSettings();
  await updateBlockRules(settings);
  await updateDelayListener(settings);
}

// 监听存储变化，自动刷新
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    refresh();
  }
});

// 定时检查时间边界（每分钟）
chrome.alarms.create('timeCheck', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'timeCheck') refresh();
});

// 启动时执行一次
refresh();
