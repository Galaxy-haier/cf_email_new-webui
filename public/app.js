// ========== 状态 ==========
let currentAddress = '';
let currentJWT = '';
let mailsCache = [];
let autoRefreshInterval = null;
let isRefreshing = false;
let historyData = [];

// ========== 配置 ==========
const DOMAINS = [
    'zsxh.dpdns.org'
    // 在此添加更多域名，如：'your-other-domain.com'
];

// ========== DOM 元素 ==========
const emailInput = document.getElementById('emailInput');
const copyBtn = document.getElementById('copyBtn');
const domainSelect = document.getElementById('domainSelect');
const generateBtn = document.getElementById('generateBtn');
const customBtn = document.getElementById('customBtn');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const autoRefreshToggle = document.getElementById('autoRefreshToggle');
const lastUpdate = document.getElementById('lastUpdate');
const mailsList = document.getElementById('mailsList');
const mailCount = document.getElementById('mailCount');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// 弹窗
const customModal = document.getElementById('customModal');
const modalClose = document.getElementById('modalClose');
const cancelCustom = document.getElementById('cancelCustom');
const confirmCustom = document.getElementById('confirmCustom');
const customName = document.getElementById('customName');
const enablePrefix = document.getElementById('enablePrefix');

const mailModal = document.getElementById('mailModal');
const mailModalClose = document.getElementById('mailModalClose');
const mailModalBody = document.getElementById('mailModalBody');

// 历史邮箱弹窗
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const historyModalClose = document.getElementById('historyModalClose');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const historySearch = document.getElementById('historySearch');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// ========== 工具函数 ==========
function showToast(msg, icon = 'fa-check-circle') {
    toastMsg.textContent = msg;
    toast.querySelector('i').className = `fas ${icon}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function generateRandomName() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    let name = '';
    for (let i = 0; i < 5; i++) name += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 2; i++) name += nums[Math.floor(Math.random() * nums.length)];
    for (let i = 0; i < 3; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name;
}

function formatTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function extractCode(raw) {
    if (!raw) return null;
    const patterns = [
        /(?:验证码|verification code|code|verification)[^0-9]{0,80}(\d{4,8})(?!\d)/i,
        /(\d{4,8})(?:[^0-9]{0,40})(?:5天内有效|valid|expires|分钟内)/i,
        /(?:^|\s)(\d{4,8})(?:\s|$)/m,
        /(?:【|[])(\d{4,8})(?:】|])/,
    ];
    for (const p of patterns) {
        const m = raw.match(p);
        if (m) return m[1];
    }
    const generic = raw.match(/(?<!\d)\d{4,8}(?!\d)/);
    return generic ? generic[0] : null;
}

function getSenderInitial(from) {
    if (!from) return '?';
    const m = from.match(/^["']?([^"'<>]+)/);
    const name = m ? m[1] : from;
    return name.charAt(0).toUpperCase();
}

function getSenderName(from) {
    if (!from) return '未知发件人';
    const m = from.match(/^["']?([^"'<>]+)/);
    return m ? m[1] : from;
}

function getSenderEmail(from) {
    if (!from) return '';
    const m = from.match(/<([^>]+)>/);
    return m ? m[1] : from;
}

// ========== 历史记录管理 ==========
const HISTORY_KEY = 'temp_mail_history';
const MAX_HISTORY = 100;

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

function addToHistory(address) {
    if (!address) return;
    const list = loadHistory();
    const idx = list.findIndex(h => h.address === address);
    const now = Date.now();
    if (idx >= 0) {
        list[idx].usedAt = now;
    } else {
        list.unshift({ address, createdAt: now, usedAt: now });
    }
    saveHistory(list);
    historyData = loadHistory();
}

function removeFromHistory(address) {
    const list = loadHistory().filter(h => h.address !== address);
    saveHistory(list);
    historyData = list;
    renderHistoryList(historySearch.value.trim());
}

function clearAllHistory() {
    localStorage.removeItem(HISTORY_KEY);
    historyData = [];
    renderHistoryList('');
    showToast('历史记录已清空');
}

function formatRelativeTime(ts) {
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '刚刚';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}小时前`;
    const day = Math.floor(hour / 24);
    return `${day}天前`;
}

// ========== API 调用 ==========
function getSelectedDomain() {
    return domainSelect.value || DOMAINS[0];
}

function extractDomain(address) {
    if (!address) return DOMAINS[0];
    const parts = address.split('@');
    return parts[1] || DOMAINS[0];
}

function setDomainSelect(domain) {
    if (DOMAINS.includes(domain)) {
        domainSelect.value = domain;
    }
}

async function createEmail(name, prefix = true) {
    const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enablePrefix: prefix, domain: getSelectedDomain() })
    });
    if (!res.ok) throw new Error('创建失败');
    return res.json();
}

async function fetchMails(address) {
    const res = await fetch(`/api/mails?address=${encodeURIComponent(address)}&limit=20&offset=0`);
    if (!res.ok) throw new Error('获取邮件失败');
    return res.json();
}

// ========== 核心功能 ==========
async function generateEmail(name = null, prefix = true) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>生成中...</span>';

    try {
        const username = name || generateRandomName();
        const data = await createEmail(username, prefix);
        if (data.address) {
            currentAddress = data.address;
            currentJWT = data.jwt || '';
            emailInput.value = currentAddress;
            mailsCache = [];
            renderMails([]);
            addToHistory(currentAddress);
            showToast('邮箱创建成功');
            await refreshMails();
        } else {
            throw new Error(data.error || '未知错误');
        }
    } catch (err) {
        showToast(err.message, 'fa-exclamation-circle');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i><span>一键生成</span>';
    }
}

async function refreshMails() {
    if (!currentAddress || isRefreshing) return;
    isRefreshing = true;
    refreshBtn.classList.add('spinning');

    try {
        const data = await fetchMails(currentAddress);
        const results = data.results || [];

        // 检查新邮件
        const newIds = new Set(results.map(m => m.id));
        const oldIds = new Set(mailsCache.map(m => m.id));
        const hasNew = results.some(m => !oldIds.has(m.id));

        mailsCache = results;
        renderMails(results, hasNew);
        lastUpdate.textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN');
    } catch (err) {
        showToast(err.message, 'fa-exclamation-circle');
    } finally {
        isRefreshing = false;
        refreshBtn.classList.remove('spinning');
    }
}

// ========== 渲染 ==========
function renderMails(mails, highlightNew = false) {
    mailCount.textContent = `${mails.length} 封邮件`;

    if (mails.length === 0) {
        mailsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-paper-plane"></i>
                <p>暂无邮件</p>
                <span>${currentAddress ? '等待接收邮件...' : '生成邮箱后等待接收邮件'}</span>
            </div>`;
        return;
    }

    mailsList.innerHTML = mails.map((mail, idx) => {
        const code = extractCode(mail.raw);
        const isNew = highlightNew && idx === 0;
        return `
            <div class="mail-card ${isNew ? 'new-mail' : ''}" data-id="${mail.id}">
                <div class="mail-header">
                    <div class="mail-sender">
                        <div class="sender-avatar">${getSenderInitial(mail.source)}</div>
                        <div class="sender-info">
                            <div class="sender-name">${escapeHtml(getSenderName(mail.source))}</div>
                            <div class="sender-email">${escapeHtml(getSenderEmail(mail.source))}</div>
                        </div>
                    </div>
                    <div class="mail-time">${formatTime(mail.created_at)}</div>
                </div>
                <div class="mail-subject">${escapeHtml(mail.subject || '（无主题）')}</div>
                <div class="mail-code-section">
                    ${code
                        ? `<div class="code-badge"><i class="fas fa-shield-alt"></i>${code}</div>
                           <button class="code-copy-btn" data-code="${code}" title="复制验证码"><i class="fas fa-copy"></i></button>`
                        : '<span class="no-code"><i class="fas fa-times-circle"></i> 未识别到验证码</span>'
                    }
                </div>
            </div>`;
    }).join('');

    // 绑定点击事件
    document.querySelectorAll('.mail-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.code-copy-btn')) return;
            const id = parseInt(card.dataset.id);
            const mail = mailsCache.find(m => m.id === id);
            if (mail) showMailDetail(mail);
        });
    });

    document.querySelectorAll('.code-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            navigator.clipboard.writeText(code).then(() => {
                showToast(`验证码 ${code} 已复制`);
            });
        });
    });
}

function showMailDetail(mail) {
    const code = extractCode(mail.raw);
    mailModalBody.innerHTML = `
        <div class="mail-detail-header">
            <div class="mail-detail-row">
                <span class="mail-detail-label">发件人</span>
                <span class="mail-detail-value">${escapeHtml(mail.source || '-')}</span>
            </div>
            <div class="mail-detail-row">
                <span class="mail-detail-label">收件人</span>
                <span class="mail-detail-value">${escapeHtml(mail.address || currentAddress)}</span>
            </div>
            <div class="mail-detail-row">
                <span class="mail-detail-label">时间</span>
                <span class="mail-detail-value">${formatTime(mail.created_at)}</span>
            </div>
            <div class="mail-detail-subject">${escapeHtml(mail.subject || '（无主题）')}</div>
            ${code ? `<div class="mail-detail-code"><i class="fas fa-shield-alt"></i>${code}</div>` : ''}
        </div>
        <div class="mail-raw-content">${escapeHtml(mail.raw || '（无内容）')}</div>
    `;
    mailModal.classList.add('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 历史记录弹窗 ==========
function openHistoryModal() {
    historyData = loadHistory();
    renderHistoryList('');
    historyModal.classList.add('active');
}

function closeHistoryModal() {
    historyModal.classList.remove('active');
    historySearch.value = '';
}

function renderHistoryList(filter = '') {
    const list = filter
        ? historyData.filter(h => h.address.toLowerCase().includes(filter.toLowerCase()))
        : historyData;

    historyCount.textContent = `${list.length} 个`;

    if (list.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <p>${filter ? '未找到匹配的邮箱' : '暂无历史记录'}</p>
                <span>${filter ? '尝试其他关键词' : '生成的邮箱将自动保存到这里'}</span>
            </div>`;
        return;
    }

    historyList.innerHTML = list.map(h => {
        const isActive = h.address === currentAddress;
        const initial = h.address.charAt(0).toUpperCase();
        return `
            <div class="history-item ${isActive ? 'active' : ''}" data-address="${escapeHtml(h.address)}">
                <div class="history-item-info">
                    <div class="history-item-avatar">${initial}</div>
                    <div class="history-item-details">
                        <div class="history-item-email">${escapeHtml(h.address)}</div>
                        <div class="history-item-meta">创建于 ${formatRelativeTime(h.createdAt)} · 最近使用 ${formatRelativeTime(h.usedAt)}</div>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="history-item-btn use" title="切换到此邮箱" data-address="${escapeHtml(h.address)}">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="history-item-btn delete" title="删除记录" data-address="${escapeHtml(h.address)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    // 点击整个条目切换
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-item-btn')) return;
            switchToHistory(item.dataset.address);
        });
    });

    // 使用按钮
    document.querySelectorAll('.history-item-btn.use').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            switchToHistory(btn.dataset.address);
        });
    });

    // 删除按钮
    document.querySelectorAll('.history-item-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromHistory(btn.dataset.address);
        });
    });
}

async function switchToHistory(address) {
    currentAddress = address;
    currentJWT = '';
    emailInput.value = address;
    setDomainSelect(extractDomain(address));
    mailsCache = [];
    renderMails([]);
    addToHistory(address);
    closeHistoryModal();
    showToast(`已切换到 ${address}`);
    await refreshMails();
}

// ========== 自动刷新 ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (currentAddress) refreshMails();
    }, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ========== 事件绑定 ==========
generateBtn.addEventListener('click', () => generateEmail());

copyBtn.addEventListener('click', () => {
    if (!emailInput.value) return;
    navigator.clipboard.writeText(emailInput.value).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        showToast('邮箱地址已复制');
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });
});

refreshBtn.addEventListener('click', refreshMails);

autoRefreshToggle.addEventListener('change', () => {
    if (autoRefreshToggle.checked) {
        startAutoRefresh();
        if (currentAddress) refreshMails();
    } else {
        stopAutoRefresh();
    }
});

// 自定义弹窗
customBtn.addEventListener('click', () => {
    customModal.classList.add('active');
    customName.focus();
});

function closeCustomModal() {
    customModal.classList.remove('active');
    customName.value = '';
}

modalClose.addEventListener('click', closeCustomModal);
cancelCustom.addEventListener('click', closeCustomModal);

confirmCustom.addEventListener('click', async () => {
    const name = customName.value.trim();
    if (!name) {
        showToast('请输入用户名', 'fa-exclamation-circle');
        return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        showToast('用户名只能包含字母、数字、点、下划线和横线', 'fa-exclamation-circle');
        return;
    }
    closeCustomModal();
    await generateEmail(name, enablePrefix.checked);
});

customName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmCustom.click();
});

// 邮件详情弹窗
mailModalClose.addEventListener('click', () => mailModal.classList.remove('active'));
mailModal.addEventListener('click', (e) => {
    if (e.target === mailModal) mailModal.classList.remove('active');
});

customModal.addEventListener('click', (e) => {
    if (e.target === customModal) closeCustomModal();
});

// 历史邮箱弹窗
historyBtn.addEventListener('click', openHistoryModal);
historyModalClose.addEventListener('click', closeHistoryModal);
historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistoryModal();
});

historySearch.addEventListener('input', (e) => {
    renderHistoryList(e.target.value.trim());
});

clearHistoryBtn.addEventListener('click', () => {
    if (historyData.length === 0) return;
    if (confirm(`确定要清空全部 ${historyData.length} 条历史记录吗？`)) {
        clearAllHistory();
    }
});

// ========== 初始化 ==========
function initDomainSelect() {
    domainSelect.innerHTML = DOMAINS.map(d => `<option value="${d}">${d}</option>`).join('');
}

initDomainSelect();
historyData = loadHistory();
showToast('临时邮箱控制台已就绪', 'fa-info-circle');
