const AI_HINT_API = 'http://localhost:5000/api/Roadmap';

let aiSuggestedNodes = [];

document.getElementById('btnAiHint').onclick = toggleAiPanel;

function toggleAiPanel() {
    const panel = document.getElementById('ai-hint-panel');
    if (panel.classList.contains('open')) {
        closeAiPanel();
    } else {
        panel.classList.add('open');
        if (aiSuggestedNodes.length === 0 && !document.querySelector('.ai-hint-loading')) {
            requestAiHint();
        }
    }
}

function closeAiPanel() {
    document.getElementById('ai-hint-panel').classList.remove('open');
}

async function requestAiHint() {
    const key = new URLSearchParams(window.location.search).get('key');
    const token = localStorage.getItem('token');
    if (!key || !token) return;

    const btn = document.getElementById('btnAiHint');
    const content = document.getElementById('ai-hint-content');

    btn.disabled = true;
    aiSuggestedNodes = [];

    content.replaceChildren();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-hint-loading';
    const spinner = document.createElement('div');
    spinner.className = 'ai-spinner';
    const span = document.createElement('span');
    span.textContent = 'Анализирую роадмап...';
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(span);
    content.appendChild(loadingDiv);

    try {
        const res = await fetch(`${AI_HINT_API}/${key}/ai-hint`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const rawText = await res.text();
            console.error('[AI-Hint] Ошибка сервера. Статус:', res.status, 'Тело:', rawText);
            let errMsg = 'Ошибка при обращении к ИИ';
            try {
                const err = JSON.parse(rawText);
                errMsg = err.error || errMsg;
            } catch (_) {}
            content.replaceChildren();
            const errDiv1 = document.createElement('div');
            errDiv1.className = 'ai-hint-error';
            errDiv1.textContent = errMsg;
            content.appendChild(errDiv1);
            return;
        }

        const rawText = await res.text();
        console.log('[AI-Hint] Ответ сервера:', rawText);
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('[AI-Hint] Не удалось распарсить JSON:', e);
            content.replaceChildren();
            const errDiv2 = document.createElement('div');
            errDiv2.className = 'ai-hint-error';
            errDiv2.textContent = 'Сервер вернул некорректный ответ';
            content.appendChild(errDiv2);
            return;
        }
        aiSuggestedNodes = data.suggestedNodes || [];
        renderAiHintResult(data.advice, aiSuggestedNodes);
    } catch (e) {
        content.replaceChildren();
        const errDiv3 = document.createElement('div');
        errDiv3.className = 'ai-hint-error';
        errDiv3.textContent = 'Не удалось связаться с сервером.';
        content.appendChild(errDiv3);
    } finally {
        btn.disabled = false;
    }
}

function renderAiHintResult(advice, nodes) {
    const content = document.getElementById('ai-hint-content');
    content.replaceChildren();

    const adviceDiv = document.createElement('div');
    adviceDiv.className = 'ai-hint-advice';
    adviceDiv.textContent = advice || '';
    content.appendChild(adviceDiv);

    if (nodes.length > 0) {
        const title = document.createElement('div');
        title.className = 'ai-hint-nodes-title';
        title.textContent = 'Предлагаемые узлы';
        content.appendChild(title);

        if (nodes.length > 1) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'ai-hint-nodes-actions';
            const addAllBtn = document.createElement('button');
            addAllBtn.className = 'btn-add-all';
            addAllBtn.textContent = 'Добавить все';
            addAllBtn.onclick = addAllSuggestedNodes;
            actionsDiv.appendChild(addAllBtn);
            content.appendChild(actionsDiv);
        }

        nodes.forEach((node, i) => {
            const card = document.createElement('div');
            card.className = 'suggested-node-card';
            card.id = `suggested-${i}`;

            const info = document.createElement('div');
            info.className = 'suggested-node-info';

            const nodeTitle = document.createElement('div');
            nodeTitle.className = 'suggested-node-title';
            nodeTitle.textContent = node.title;

            const nodeDesc = document.createElement('div');
            nodeDesc.className = 'suggested-node-desc';
            nodeDesc.textContent = node.description || '';

            info.appendChild(nodeTitle);
            info.appendChild(nodeDesc);

            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-node';
            addBtn.title = 'Добавить узел';
            addBtn.textContent = '+';
            addBtn.onclick = () => addSuggestedNode(i);

            card.appendChild(info);
            card.appendChild(addBtn);
            content.appendChild(card);
        });
    }

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn-cancel';
    refreshBtn.style.cssText = 'width:100%;margin-top:16px;';
    refreshBtn.textContent = 'Обновить';
    refreshBtn.onclick = requestAiHint;
    content.appendChild(refreshBtn);
}

async function addSuggestedNode(index) {
    const node = aiSuggestedNodes[index];
    if (!node) return;

    const btn = document.querySelector(`#suggested-${index} .btn-add-node`);
    if (btn) btn.disabled = true;

    const existing = roadmapData?.nodes || [];
    const baseX = existing.length > 0 ? Math.max(...existing.map(n => n.x)) + 250 : 3000;
    const usedYs = existing.filter(n => n.x > baseX - 260).map(n => n.y);
    const baseY = usedYs.length > 0 ? Math.max(...usedYs) + 160 : 3000;

    const createdId = await createNodeFromSuggestion(node.title, node.description, baseX, baseY);
    await loadRoadmap();

    if (createdId && node.connectTo?.length) {
        for (const targetTitle of node.connectTo) {
            const target = roadmapData.nodes.find(n => n.title === targetTitle);
            if (target && target.id !== createdId) await connectNodes(createdId, target.id);
        }
        await loadRoadmap();
    }
}

async function addAllSuggestedNodes() {
    const addAllBtn = document.querySelector('.btn-add-all');
    if (addAllBtn) addAllBtn.disabled = true;
    document.querySelectorAll('.btn-add-node').forEach(b => b.disabled = true);

    const existing = roadmapData?.nodes || [];
    const baseX = existing.length > 0 ? Math.max(...existing.map(n => n.x)) + 250 : 3000;
    const baseY = existing.length > 0 ? Math.min(...existing.map(n => n.y)) : 3000;

    const titleToId = {};
    for (let i = 0; i < aiSuggestedNodes.length; i++) {
        const node = aiSuggestedNodes[i];
        const id = await createNodeFromSuggestion(node.title, node.description, baseX, baseY + i * 160);
        if (id) titleToId[node.title] = id;
    }

    await loadRoadmap();

    for (const node of aiSuggestedNodes) {
        const fromId = titleToId[node.title];
        if (!fromId || !node.connectTo?.length) continue;
        for (const targetTitle of node.connectTo) {
            const toId = titleToId[targetTitle] || roadmapData.nodes.find(n => n.title === targetTitle)?.id;
            if (toId && toId !== fromId) await connectNodes(fromId, toId);
        }
    }

    await loadRoadmap();
}

async function createNodeFromSuggestion(title, description, x, y) {
    const key = new URLSearchParams(window.location.search).get('key');
    const token = localStorage.getItem('token');
    if (!key || !token) return null;

    const res = await fetch(`${AI_HINT_API}/${key}/nodes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description: description || '', x, y })
    });

    if (!res.ok) return null;
    const created = await res.json();
    return created.id;
}

