const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIG =================
const EXTERNAL_APIS = {
    lc79: {
        taixiu: 'https://wtx.tele68.com/v1/tx/sessions',
        taixiu_md5: 'https://wtxmd52.tele68.com/v1/txmd5/sessions'
    },
    betvip: {
        taixiu: 'https://wtx.macminim6.online/v1/tx/sessions',
        taixiu_md5: 'https://wtxmd52.macminim6.online/v1/txmd5/sessions'
    }
};

const HISTORY_LIMIT = 50;

// ================= HELPERS =================
async function fetchFromExternal(url) {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && Array.isArray(response.data.list)) {
            return response.data.list.slice(0, HISTORY_LIMIT);
        }
        return [];
    } catch (error) {
        console.error(`❌ Lỗi fetch ${url}:`, error.message);
        return null;
    }
}

function transformSessions(rawSessions) {
    return rawSessions.map(item => {
        const result = item.resultTruyenThong === 'TAI' ? 'T' : 'X';
        const dices = item.dices || [];
        const total = dices.reduce((sum, d) => sum + d, 0);
        return {
            phien: item.id,
            dice_1: dices[0] ?? null,
            dice_2: dices[1] ?? null,
            dice_3: dices[2] ?? null,
            tong: total,
            ket_qua: result === 'T' ? 'Tài' : 'Xỉu'
        };
    });
}

// ================= ROUTES =================
// Trang chủ: phục vụ file index.html cùng cấp
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API nội bộ cho frontend
app.get('/api/:game/:mode', async (req, res) => {
    const { game, mode } = req.params;
    const gameConfig = EXTERNAL_APIS[game];
    if (!gameConfig || !gameConfig[mode]) {
        return res.status(404).json({ error: 'Không tìm thấy game hoặc mode' });
    }
    const raw = await fetchFromExternal(gameConfig[mode]);
    if (raw === null) {
        return res.status(502).json({ error: 'Không thể kết nối API gốc' });
    }
    const transformed = transformSessions(raw);
    res.json({ list: transformed, total: transformed.length });
});

// Các route lịch sử
app.get('/lc79/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/lc79md5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.lc79.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/betvip/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

app.get('/betvipmd5/history', async (req, res) => {
    const raw = await fetchFromExternal(EXTERNAL_APIS.betvip.taixiu_md5);
    if (raw === null) return res.status(502).json({ error: 'Lỗi kết nối' });
    res.json(transformSessions(raw));
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📜 API lịch sử:`);
    console.log(`   - http://localhost:${PORT}/lc79/history`);
    console.log(`   - http://localhost:${PORT}/lc79md5/history`);
    console.log(`   - http://localhost:${PORT}/betvip/history`);
    console.log(`   - http://localhost:${PORT}/betvipmd5/history`);
});