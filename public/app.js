// ========== 状态 ==========
let currentAddress = '';
let currentJWT = '';
let currentDomain = '';
let mailsCache = [];
let autoRefreshInterval = null;
let isRefreshing = false;
let historyData = [];

// ========== 配置 ==========
const DOMAINS = [];

// ========== DOM 元素 ==========
const emailInput = document.getElementById('emailInput');
const copyBtn = document.getElementById('copyBtn');
const customSelect = document.getElementById('customSelect');
const customSelectTrigger = document.getElementById('customSelectTrigger');
const customSelectValue = document.getElementById('customSelectValue');
const customSelectDropdown = document.getElementById('customSelectDropdown');
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

// AI 设置弹窗
const settingsBtn = document.getElementById('settingsBtn');
const aiSettingsModal = document.getElementById('aiSettingsModal');
const aiSettingsClose = document.getElementById('aiSettingsClose');
const aiSettingsCancel = document.getElementById('aiSettingsCancel');
const aiSettingsSave = document.getElementById('aiSettingsSave');
const aiEnabledToggle = document.getElementById('aiEnabledToggle');
const aiApiUrl = document.getElementById('aiApiUrl');
const aiApiKey = document.getElementById('aiApiKey');
const aiApiKeyToggle = document.getElementById('aiApiKeyToggle');
const aiModel = document.getElementById('aiModel');
const fetchModelsBtn = document.getElementById('fetchModelsBtn');
const aiModelSelect = document.getElementById('aiModelSelect');

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

function normalizeAIUrl(url) {
    if (!url) return '';
    url = url.trim().replace(/\/+$/, '');
    if (!url.endsWith('/v1')) {
        url += '/v1';
    }
    return url;
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

// ========== AI 配置管理 ==========
const AI_CONFIG_KEY = 'temp_mail_ai_config';

function getAIConfig() {
    try {
        const raw = localStorage.getItem(AI_CONFIG_KEY);
        const defaults = { enabled: false, url: '', apiKey: '', model: '' };
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
        return { enabled: false, url: '', apiKey: '', model: '' };
    }
}

function saveAIConfig(config) {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
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
    return currentDomain || DOMAINS[0];
}

function extractDomain(address) {
    if (!address) return '';
    const parts = address.split('@');
    return parts[1] || '';
}

function extractUsername(address) {
    if (!address) return '';
    const parts = address.split('@');
    return parts[0] || '';
}

function setDomainSelect(domain) {
    if (!domain || !DOMAINS.includes(domain)) return;
    currentDomain = domain;
    customSelectValue.textContent = domain;
    document.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === domain);
    });
    const username = extractUsername(currentAddress);
    if (username) {
        currentAddress = `${username}@${domain}`;
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

// ========== AI 识别 ==========
async function fetchModels(url, apiKey) {
    const normalizedUrl = normalizeAIUrl(url);
    if (!normalizedUrl || !apiKey) {
        showToast('请先填写 API 地址和 API Key', 'fa-exclamation-circle');
        return [];
    }
    try {
        const response = await fetch(`${normalizedUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
        });
        if (!response.ok) throw new Error('获取模型列表失败');
        const data = await response.json();
        const models = data.data?.map(m => m.id) || [];
        if (models.length === 0) throw new Error('未获取到模型列表');
        return models;
    } catch (err) {
        showToast(err.message, 'fa-exclamation-circle');
        return [];
    }
}

async function extractCodeWithAI(raw) {
    const config = getAIConfig();
    if (!config.enabled || !config.url || !config.apiKey || !config.model) return null;

    const url = normalizeAIUrl(config.url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${url}/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个验证码提取助手。你的唯一任务是从邮件内容中提取验证码、确认码或授权码。请只返回验证码本身，不要返回任何解释、引号、格式标记或多余内容。如果邮件中没有验证码，请只返回一个空字符串，不要返回"无"或"未找到"等文字。'
                    },
                    {
                        role: 'user',
                        content: `请从以下邮件内容中提取验证码（通常为4-8位数字或字母组合），只返回验证码本身，不要其他任何内容：\n\n${(raw || '').slice(0, 8000)}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 50
            })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI API 错误:', errText);
            return null;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content || content === '') return null;

        const cleaned = content.replace(/^["'`]+|["'`]+$/g, '').replace(/```[\s\S]*?```/g, '').trim();
        if (!cleaned || cleaned.length === 0) return null;

        if (/^[A-Za-z0-9]{3,12}$/.test(cleaned)) {
            return cleaned;
        }

        const extracted = cleaned.match(/[A-Za-z0-9]{3,12}/);
        if (extracted) return extracted[0];

        return null;
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('AI 请求超时');
        } else {
            console.error('AI 识别出错:', err);
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

// AI 请求队列（并发控制）
let aiQueue = [];
let aiRunningCount = 0;
const MAX_AI_CONCURRENT = 2;
const aiProcessingIds = new Set();
const aiCodeCache = new Map();

async function processAIQueue() {
    if (aiRunningCount >= MAX_AI_CONCURRENT || aiQueue.length === 0) return;
    aiRunningCount++;
    const task = aiQueue.shift();
    let code = null;
    try {
        code = await extractCodeWithAI(task.raw);
        if (code) {
            aiCodeCache.set(task.mailId, code);
        }
    } catch (e) {
        // 静默失败
    }
    if (typeof task.onSuccess === 'function') {
        task.onSuccess(code);
    }
    aiProcessingIds.delete(task.mailId);
    aiRunningCount--;
    processAIQueue();
}

function enqueueAIExtract(mailId, raw, onSuccess) {
    if (aiCodeCache.has(mailId)) {
        onSuccess(aiCodeCache.get(mailId));
        return;
    }
    if (aiProcessingIds.has(mailId)) return;
    aiProcessingIds.add(mailId);
    aiQueue.push({ mailId, raw, onSuccess });
    processAIQueue();
}

function updateMailCode(mailId, code) {
    const section = document.querySelector(`.mail-code-section[data-mail-id="${mailId}"]`);
    if (section) {
        if (!code) {
            section.innerHTML = '<span class="no-code"><i class="fas fa-times-circle"></i> 未识别到验证码</span>';
        } else {
            section.innerHTML = `
                <div class="code-badge ai-detected"><i class="fas fa-robot"></i>${escapeHtml(code)}</div>
                <button class="code-copy-btn" data-code="${escapeHtml(code)}" title="复制验证码"><i class="fas fa-copy"></i></button>
            `;
            const btn = section.querySelector('.code-copy-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(code).then(() => {
                        showToast(`验证码 ${code} 已复制`);
                    });
                });
            }
        }
    }
    // 同步更新详情弹窗（如果当前已打开）
    const detailCode = document.getElementById(`detailCode_${mailId}`);
    if (detailCode) {
        if (!code) {
            detailCode.style.display = 'none';
        } else {
            detailCode.classList.remove('ai-detecting');
            detailCode.innerHTML = `<i class="fas fa-robot"></i>${escapeHtml(code)}`;
        }
    }
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
            emailInput.value = extractUsername(currentAddress);
            setDomainSelect(extractDomain(currentAddress));
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
        const aiEnabled = getAIConfig().enabled;
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
                <div class="mail-code-section" data-mail-id="${mail.id}">
                    ${aiEnabled
                        ? `<span class="ai-pending"><i class="fas fa-robot fa-spin"></i> AI 识别中...</span>`
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

    // 统一走 AI 识别
    mails.forEach(mail => {
        if (getAIConfig().enabled) {
            enqueueAIExtract(mail.id, mail.raw, (code) => {
                updateMailCode(mail.id, code);
            });
        }
    });
}

function wrapIncompleteHtml(html) {
    if (!html) return html;
    if (/<html\b/i.test(html) && /<body\b/i.test(html)) return html;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${html}</body></html>`;
}

function showMailDetail(mail) {
    const htmlContent = extractHtmlFromRaw(mail.raw);
    const hasHtml = !!htmlContent;
    const processedHtml = wrapIncompleteHtml(htmlContent);
    const aiEnabled = getAIConfig().enabled;

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
            ${aiEnabled
                ? `<div class="mail-detail-code ai-detecting" id="detailCode_${mail.id}"><i class="fas fa-robot fa-spin"></i> AI 识别中...</div>`
                : ''
            }
        </div>
        <div class="mail-view-toggle">
            <button class="toggle-btn ${hasHtml ? '' : 'active'}" data-view="raw">
                <i class="fas fa-code"></i> 原始邮件
            </button>
            ${hasHtml ? `<button class="toggle-btn active" data-view="html"><i class="fab fa-html5"></i> HTML 预览</button>` : ''}
        </div>
        <div class="mail-view-content">
            <div class="mail-view-panel ${hasHtml ? '' : 'active'}" id="rawPanel">
                <div class="mail-raw-content">${escapeHtml(mail.raw || '（无内容）')}</div>
            </div>
            ${hasHtml ? `
            <div class="mail-view-panel active" id="htmlPanel">
                <div class="mail-html-frame-placeholder"></div>
            </div>
            ` : ''}
        </div>
    `;

    if (hasHtml && processedHtml) {
        const htmlPanel = mailModalBody.querySelector('#htmlPanel');
        if (htmlPanel) {
            const iframe = document.createElement('iframe');
            iframe.className = 'mail-html-frame';
            iframe.sandbox = '';
            iframe.srcdoc = processedHtml;
            htmlPanel.innerHTML = '';
            htmlPanel.appendChild(iframe);
        }
    }

    mailModalBody.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            mailModalBody.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mailModalBody.querySelectorAll('.mail-view-panel').forEach(p => p.classList.remove('active'));
            const panel = mailModalBody.querySelector('#' + view + 'Panel');
            if (panel) panel.classList.add('active');
        });
    });

    // 详情页统一走 AI 识别
    if (aiEnabled) {
        enqueueAIExtract(mail.id, mail.raw, (aiCode) => {
            const detailCode = document.getElementById(`detailCode_${mail.id}`);
            if (!detailCode) return;
            if (!aiCode) {
                detailCode.style.display = 'none';
            } else {
                detailCode.classList.remove('ai-detecting');
                detailCode.innerHTML = `<i class="fas fa-robot"></i>${escapeHtml(aiCode)}`;
            }
        });
    }

    mailModal.classList.add('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function extractBodyFromPart(part) {
    const idx = part.search(/\r?\n\r?\n/);
    return idx >= 0 ? part.slice(idx + 2).trim() : null;
}

function getCharset(part) {
    const m = part.match(/charset=["']?([^"'\s;]+)["']?/i);
    return m ? m[1].toLowerCase() : 'utf-8';
}

function bytesToString(binary, charset) {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    try {
        return new TextDecoder(charset).decode(bytes);
    } catch {
        return new TextDecoder('utf-8').decode(bytes);
    }
}

function decodeContent(body, part) {
    const cte = part.match(/Content-Transfer-Encoding:\s*([^\s;]+)/i);
    const encoding = cte ? cte[1].toLowerCase() : '';
    const charset = getCharset(part);

    if (encoding === 'base64') {
        try {
            const cleaned = body.replace(/\s/g, '');
            return bytesToString(atob(cleaned), charset);
        } catch {
            return body;
        }
    }
    if (encoding === 'quoted-printable') {
        const decoded = body
            .replace(/=\r?\n/g, '')
            .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        return bytesToString(decoded, charset);
    }
    return body;
}

function extractHtmlFromRaw(raw) {
    if (!raw) return null;

    const boundaryMatch = raw.match(/boundary=["']?([^"'\s;]+)["']?/i);
    if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = raw.split(new RegExp(`--${escapedBoundary}(?:--)?`));

        for (const part of parts) {
            if (/Content-Type:\s*text\/html/i.test(part)) {
                const body = extractBodyFromPart(part);
                if (body) return decodeContent(body, part);
            }
        }
    }

    if (/Content-Type:\s*text\/html/i.test(raw)) {
        const body = extractBodyFromPart(raw);
        if (body) return decodeContent(body, raw);
    }

    const body = extractBodyFromPart(raw);
    if (body && /<[a-z][\s\S]*>/i.test(body)) {
        return body;
    }

    return null;
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
    emailInput.value = extractUsername(address);
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
    if (!currentAddress) return;
    navigator.clipboard.writeText(currentAddress).then(() => {
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
    const suffix = document.querySelector('.domain-suffix');
    if (suffix) {
        suffix.textContent = '@' + getSelectedDomain();
    }
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

// ========== AI 设置弹窗 ==========
function openAISettings() {
    const config = getAIConfig();
    aiEnabledToggle.checked = config.enabled;
    aiApiUrl.value = config.url;
    aiApiKey.value = config.apiKey;
    aiModel.value = config.model;
    aiModelSelect.style.display = 'none';
    aiModelSelect.innerHTML = '<option value="">-- 选择模型 --</option>';
    aiSettingsModal.classList.add('active');
}

function closeAISettings() {
    aiSettingsModal.classList.remove('active');
}

settingsBtn.addEventListener('click', openAISettings);
aiSettingsClose.addEventListener('click', closeAISettings);
aiSettingsCancel.addEventListener('click', closeAISettings);
aiSettingsModal.addEventListener('click', (e) => {
    if (e.target === aiSettingsModal) closeAISettings();
});

aiApiKeyToggle.addEventListener('click', () => {
    const isPassword = aiApiKey.type === 'password';
    aiApiKey.type = isPassword ? 'text' : 'password';
    aiApiKeyToggle.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
});

fetchModelsBtn.addEventListener('click', async () => {
    fetchModelsBtn.disabled = true;
    fetchModelsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';

    const models = await fetchModels(aiApiUrl.value, aiApiKey.value);

    fetchModelsBtn.disabled = false;
    fetchModelsBtn.innerHTML = '<i class="fas fa-list"></i> 获取模型列表';

    if (models.length > 0) {
        aiModelSelect.innerHTML = '<option value="">-- 选择模型 --</option>' +
            models.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        aiModelSelect.style.display = 'block';
        aiModelSelect.value = aiModel.value || '';
    }
});

aiModelSelect.addEventListener('change', () => {
    if (aiModelSelect.value) {
        aiModel.value = aiModelSelect.value;
    }
});

aiSettingsSave.addEventListener('click', () => {
    const url = aiApiUrl.value.trim();
    const apiKey = aiApiKey.value.trim();
    const model = aiModel.value.trim();
    const enabled = aiEnabledToggle.checked;

    if (enabled && (!url || !apiKey || !model)) {
        showToast('启用 AI 识别需要填写完整的 API 地址、Key 和模型名', 'fa-exclamation-circle');
        return;
    }

    saveAIConfig({ enabled, url, apiKey, model });
    closeAISettings();
    showToast('AI 设置已保存');
});

// ========== 自定义下拉菜单 ==========
function toggleCustomSelect() {
    customSelect.classList.toggle('open');
}

function closeCustomSelect() {
    customSelect.classList.remove('open');
}

customSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCustomSelect();
});

customSelectDropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-select-option');
    if (!option) return;
    setDomainSelect(option.dataset.value);
    closeCustomSelect();
});

document.addEventListener('click', (e) => {
    if (!customSelect.contains(e.target)) {
        closeCustomSelect();
    }
});

// ========== 初始化 ==========
function initDomainSelect() {
    if (DOMAINS.length === 0) return;
    customSelectDropdown.innerHTML = DOMAINS.map(d =>
        `<div class="custom-select-option ${d === currentDomain ? 'selected' : ''}" data-value="${d}">${d}</div>`
    ).join('');
    if (!currentDomain || !DOMAINS.includes(currentDomain)) {
        currentDomain = DOMAINS[0];
    }
    customSelectValue.textContent = currentDomain;
}

async function loadDomains() {
    try {
        const res = await fetch('/api/domains');
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            DOMAINS.length = 0;
            DOMAINS.push(...data.domains);
        }
    } catch (err) {
        console.error('加载域名列表失败:', err);
    }
    initDomainSelect();
}

loadDomains().then(() => {
    historyData = loadHistory();
    showToast('临时邮箱控制台已就绪', 'fa-info-circle');
});
