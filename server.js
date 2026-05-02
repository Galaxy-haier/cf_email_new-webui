const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const WORKER_URL = 'https://linshiyouxiang.zsxh.dpdns.org';
const ADMIN_AUTH = '314119Aa';
const DOMAIN = 'zsxh.dpdns.org';

// 创建邮箱
app.post('/api/create', async (req, res) => {
    const { name, enablePrefix = true, domain } = req.body;
    try {
        const response = await fetch(`${WORKER_URL}/admin/new_address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-auth': ADMIN_AUTH
            },
            body: JSON.stringify({
                enablePrefix,
                name,
                domain: domain || DOMAIN
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取邮件列表
app.get('/api/mails', async (req, res) => {
    const { address, limit = 10, offset = 0 } = req.query;
    try {
        const url = new URL(`${WORKER_URL}/admin/mails`);
        url.searchParams.set('address', address);
        url.searchParams.set('limit', limit);
        url.searchParams.set('offset', offset);

        const response = await fetch(url, {
            headers: { 'x-admin-auth': ADMIN_AUTH }
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => {
    console.log(`临时邮箱控制台已启动: http://localhost:${PORT}`);
});
