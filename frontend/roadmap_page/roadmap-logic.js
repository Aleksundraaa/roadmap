const API_URL = 'http://localhost:5000/api/Roadmap';
const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const EDGE_COLORS = {
    'todo': '#94a3b8',
    'doing': '#f59e0b',
    'done': '#10b981',
    'default': '#0088ff'
};

let roadmapData = null;
let currentNode = null;
let connectionSource = null;

let scale = 1;
let pointX = 0;
let pointY = 0;
let isPanning = false;
let startPanX, startPanY;

let isDraggingNode = false;
let draggedNodeElement = null;
let draggedNodeData = null;
let dragStartX = 0;
let dragStartY = 0;

const container = document.getElementById('canvas-container');
const content = document.getElementById('canvas-content');
const nodesLayer = document.getElementById('nodes-layer');
const svgLayer = document.getElementById('canvas-svg');

async function loadRoadmap() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) return window.location.href = '../start_page/index.html';

    const token = localStorage.getItem('token');
    if (!token) return window.location.href = '../auth_page/auth.html';

    document.getElementById('roadmapKey').innerText = key;

    try {
        const response = await fetch(`${API_URL}/${key}`, {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (!response.ok) {
            if (response.status === 404) {
                showConfirm("Холст не найден", () => {
                    location.href = '../start_page/index.html';
                }, 'error');
            }
            return;
        }

        const data = await response.json();
        console.log("Данные загружены:", data);

        roadmapData = data.roadmap;
        document.getElementById('roadmapTitle').innerText = roadmapData.title || "Без названия";

        renderNodes(roadmapData.nodes || []);
        renderEdges(roadmapData.nodes || [], roadmapData.edges || []);

        if (roadmapData.nodes && roadmapData.nodes.length > 0 && pointX === 0) {
            centerOnNode(roadmapData.nodes[0]);
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

function renderNodes(nodes) {
    nodesLayer.replaceChildren();
    const statusMap = {
        'todo': {text: 'В ПЛАНЕ', class: 'status-todo'},
        'doing': {text: 'В ПРОЦЕССЕ', class: 'status-doing'},
        'done': {text: 'ЗАВЕРШЕНО', class: 'status-done'}
    };

    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = 'node';
        card.style.left = `${Math.round(node.x)}px`;
        card.style.top = `${Math.round(node.y)}px`;

        const status = statusMap[node.status || 'todo'];

        if (connectionSource && connectionSource.id === node.id) {
            card.style.outline = '3px solid var(--primary)';
        }

        card.innerHTML = `
            <div class="node-status ${status.class}">${status.text}</div>
            ${node.files?.length > 0 ? `<div class="node-files-count">📎 Конспектов: ${node.files.length}</div>` : ''}
            <h3>${node.title}</h3>
            <p class="node-desc">${node.description || 'Нет описания'}</p>
            <div class="node-line ${node.status || 'todo'}"></div>
        `;

        card.ondblclick = (e) => {
            e.stopPropagation();
            showNodeDetails(node);
        };

        card.onmousedown = (e) => {
            if (e.altKey || e.button !== 0) return;
            e.stopPropagation();
            isDraggingNode = true;
            draggedNodeElement = card;
            draggedNodeData = node;
            dragStartX = e.clientX / scale - node.x;
            dragStartY = e.clientY / scale - node.y;
            card.style.cursor = 'grabbing';
        };

        card.onclick = async (e) => {
            if (e.altKey) {
                e.stopPropagation();
                if (!connectionSource) {
                    connectionSource = node;
                    showToast("Выберите вторую ноду для связи", "info");
                    renderNodes(roadmapData.nodes);
                } else {
                    if (connectionSource.id !== node.id) await connectNodes(connectionSource.id, node.id);
                    connectionSource = null;
                    await loadRoadmap();
                }
            }
        };

        nodesLayer.appendChild(card);
    });
}

function renderEdges(nodes, edges) {
    svgLayer.replaceChildren();

    nodes.forEach(node => {
        if (node.parentNodeId) {
            const parent = nodes.find(n => n.id === node.parentNodeId);
            if (parent) {
                drawPath(parent, node);
            }
        }
    });

    (edges || []).forEach(edge => {
        const from = nodes.find(n => n.id === edge.fromNodeId);
        const to = nodes.find(n => n.id === edge.toNodeId);
        if (from && to) {
            drawPath(from, to, edge.id);
        }
    });
}

function drawPath(from, to, edgeId = null) {
    const x1 = from.x + NODE_WIDTH / 2;
    const y1 = from.y + NODE_HEIGHT / 2;
    const x2 = to.x + NODE_WIDTH / 2;
    const y2 = to.y + NODE_HEIGHT / 2;
    const cp = x1 + (x2 - x1) / 2;

    const status = to.status || 'todo';
    const color = EDGE_COLORS[status] || EDGE_COLORS.default;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`);
    path.setAttribute("fill", "none");

    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "4");

    path.setAttribute("opacity", status === 'done' ? "0.9" : "0.5");

    if (edgeId) {
        path.style.cursor = "pointer";
        path.ondblclick = (e) => {
            e.stopPropagation();
            showConfirm("Удалить эту связь?", () => deleteEdge(edgeId), 'danger');
        };
    }
    svgLayer.appendChild(path);
}

function showNodeDetails(node) {
    currentNode = node;
    document.getElementById('node-edit-title').value = node.title || "";
    document.getElementById('node-edit-desc').value = node.description || "";
    document.getElementById('node-edit-status').value = node.status || "todo";

    const display = document.getElementById('conspect-display');
    display.replaceChildren();
    if (node.files?.length > 0) {
        node.files.forEach(f => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<a href="http://localhost:5000/uploads/${f.storagePath}" target="_blank">📄 ${f.fileName}</a>`;
            display.appendChild(div);
        });
    } else {
        display.innerHTML = '<p style="color:#888; font-size:0.8rem">Нет прикрепленных файлов</p>';
    }
    document.getElementById('node-modal').classList.add('active');
}

function closeDetails() {
    document.getElementById('node-modal').classList.remove('active');
    currentNode = null;
}

async function handleSave() {
    if (!currentNode) return;
    const updated = {
        title: document.getElementById('node-edit-title').value,
        description: document.getElementById('node-edit-desc').value,
        status: document.getElementById('node-edit-status').value,
        x: currentNode.x,
        y: currentNode.y,
        parentNodeId: currentNode.parentNodeId
    };

    const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
    });
    if (res.ok) {
        closeDetails();
        await loadRoadmap();
        showToast("Сохранено", "success");
    }
}

document.getElementById('btnSaveNode').onclick = handleSave;

document.getElementById('btnDeleteNode').onclick = () => {
    if (!currentNode) return;
    showConfirm(`Удалить тему "${currentNode.title}"?`, async () => {
        const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        });
        if (res.ok) {
            closeDetails();
            loadRoadmap();
        }
    }, 'danger');
};

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !currentNode) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_URL}/nodes/${currentNode.id}/upload-conspect`, {
            method: 'POST',
            headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`},
            body: formData
        });

        if (res.ok) {
            showToast("Файл загружен", "success");
            await loadRoadmap();
            const freshNode = roadmapData.nodes.find(n => n.id === currentNode.id);
            if (freshNode) showNodeDetails(freshNode);
        }
    } catch (err) {
        console.error(err);
    }
}

window.onmousemove = (e) => {
    if (isDraggingNode && draggedNodeElement) {
        const newX = e.clientX / scale - dragStartX;
        const newY = e.clientY / scale - dragStartY;
        draggedNodeElement.style.left = `${newX}px`;
        draggedNodeElement.style.top = `${newY}px`;
        draggedNodeData.x = newX;
        draggedNodeData.y = newY;
        renderEdges(roadmapData.nodes, roadmapData.edges || []);
    } else if (isPanning) {
        pointX = e.clientX - startPanX;
        pointY = e.clientY - startPanY;
        updateTransform();
    }
};

window.onmouseup = async () => {
    if (isDraggingNode && draggedNodeData) {
        await fetch(`${API_URL}/nodes/${draggedNodeData.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...draggedNodeData,
                x: Math.round(draggedNodeData.x),
                y: Math.round(draggedNodeData.y),
                status: draggedNodeData.status || "todo"
            })
        });
    }
    isDraggingNode = false;
    isPanning = false;
    draggedNodeElement = null;
    container.style.cursor = 'grab';
};

container.onwheel = (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = Math.pow(1.1, -e.deltaY / 200);
    const newScale = Math.min(Math.max(scale * factor, 0.1), 3);
    pointX = mouseX - (mouseX - pointX) * (newScale / scale);
    pointY = mouseY - (mouseY - pointY) * (newScale / scale);
    scale = newScale;
    updateTransform();
};

container.onmousedown = (e) => {
    if (e.altKey) return;
    if (e.target === container || e.target === nodesLayer || e.target === svgLayer) {
        isPanning = true;
        startPanX = e.clientX - pointX;
        startPanY = e.clientY - pointY;
        container.style.cursor = 'grabbing';
    }
};

function updateTransform() {
    content.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function centerOnNode(node) {
    pointX = (window.innerWidth / 2) - node.x - (NODE_WIDTH / 2);
    pointY = (window.innerHeight / 2) - node.y - (NODE_HEIGHT / 2);
    updateTransform();
}

async function connectNodes(fromId, toId) {
    const key = new URLSearchParams(window.location.search).get('key');
    await fetch(`${API_URL}/${key}/edges`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({fromNodeId: fromId, toNodeId: toId})
    });
}

async function renameRoadmap() {
    const titleElement = document.getElementById('roadmapTitle');
    const oldTitle = titleElement.innerText;
    const newTitle = prompt("Введите новое название холста:", oldTitle);

    if (!newTitle || newTitle.trim() === "" || newTitle === oldTitle) return;

    const key = new URLSearchParams(window.location.search).get('key');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/${key}/update`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({title: newTitle.trim()})
        });

        if (response.ok) {
            titleElement.innerText = newTitle.trim();
            if (roadmapData) roadmapData.title = newTitle.trim(); // Обновляем локальные данные
            showToast("Название обновлено", "success");
        } else {
            showToast("Ошибка при переименовании", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Нет связи с сервером", "error");
    }
}

const deleteRoadmapBtn = document.getElementById('btnDeleteRoadmap');
if (deleteRoadmapBtn) {
    deleteRoadmapBtn.onclick = () => {
        const key = new URLSearchParams(window.location.search).get('key');

        showConfirm("Вы уверены, что хотите полностью удалить этот холст?", async () => {
            try {
                const res = await fetch(`${API_URL}/${key}`, {
                    method: 'DELETE',
                    headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
                });

                if (res.ok) {
                    window.location.href = '../start_page/index.html';
                } else {
                    showToast("Не удалось удалить холст", "error");
                }
            } catch (e) {
                showToast("Ошибка сети", "error");
            }
        }, 'danger');
    };
}

document.getElementById('btnCreateNode').onclick = async () => {
    const key = new URLSearchParams(window.location.search).get('key');
    const centerX = (window.innerWidth / 2 - pointX) / scale;
    const centerY = (window.innerHeight / 2 - pointY) / scale;
    const newNode = {title: "Новая тема", description: "", x: centerX, y: centerY};
    const res = await fetch(`${API_URL}/${key}/nodes`, {
        method: 'POST',
        headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json'},
        body: JSON.stringify(newNode)
    });
    if (res.ok) {
        loadRoadmap();
    }
};

document.getElementById('node-edit-title').onkeydown = (e) => {
    if (e.key === 'Enter') handleSave();
};
document.getElementById('node-edit-desc').onkeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
};
window.onkeydown = (e) => {
    if (e.key === 'Escape') {
        closeDetails();
        if (window.closeHelp) closeHelp();
    }
};

function applyTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
}

function switchThemeToggle() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function handleOverlayClick(e) {
    if (e.target.id === 'node-modal') closeDetails();
}

applyTheme();
loadRoadmap();