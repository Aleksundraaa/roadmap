const API_URL = 'http://localhost:5000/api/Roadmap';
const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
let connectionSource = null;
let roadmapData = null;
let currentNode = null;

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

const toggleSwitch = document.querySelector('#checkbox');
const currentTheme = localStorage.getItem('theme') || 'light';

document.documentElement.setAttribute('data-theme', currentTheme);
if (toggleSwitch) {
    toggleSwitch.checked = currentTheme === 'dark';
    toggleSwitch.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}

async function loadRoadmap() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');

    if (!key) return window.location.href = '../start_page/index.html';

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth_page/auth.html';
        return;
    }

    document.getElementById('roadmapKey').innerText = key;

    try {
        const response = await fetch(`${API_URL}/${key}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '../auth_page/auth.html';
                return;
            }

            if (response.status === 404) {
                showCriticalError("Этот холст не существует или у вас нет прав на его просмотр");
                return;
            }

            throw new Error("Не удалось загрузить холст");
        }

        roadmapData = await response.json();

        document.getElementById('roadmapTitle').innerText = roadmapData.title;

        renderNodes(roadmapData.nodes);
        renderEdges(roadmapData.nodes, roadmapData.edges || []);

        if (roadmapData.nodes.length > 0 && pointX === 0) {
            centerOnNode(roadmapData.nodes[0]);
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

async function handleSave() {
    if (!currentNode) return;

    const updatedData = {
        title: document.getElementById('node-edit-title').value,
        description: document.getElementById('node-edit-desc').value,
        x: currentNode.x,
        y: currentNode.y,
        parentNodeId: currentNode.parentNodeId,
        status: document.getElementById('node-edit-status').value
    };

    try {
        const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (res.ok) {
            closeDetails();
            await loadRoadmap();
        } else {
            showToast("Не удалось сохранить изменения", 'error');
        }
    } catch (e) {
        console.error("Ошибка при сохранении:", e);
    }
}

function renderNodes(nodes) {
    if (!nodes) return;
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

        const statusInfo = statusMap[node.status || 'todo'];

        if (connectionSource && connectionSource.id === node.id) {
            card.style.outline = '3px solid var(--primary)';
        }

        const statusBadge = document.createElement('div');
        statusBadge.className = `node-status ${statusInfo.class}`;
        statusBadge.textContent = statusInfo.text;
        card.appendChild(statusBadge);

        const filesCount = node.files ? node.files.length : 0;
        if (filesCount > 0) {
            const badge = document.createElement('div');
            badge.className = `node-files-count ${statusInfo.class}`;
            badge.style.cssText = 'font-size:0.65rem;font-weight:700;margin-top:4px;';
            badge.textContent = `КОНСПЕКТЫ: ${filesCount}`;
            card.appendChild(badge);
        }

        const title = document.createElement('h3');
        title.textContent = node.title;
        card.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'node-desc';
        desc.textContent = node.description || 'Нет описания';
        card.appendChild(desc);

        const line = document.createElement('div');
        line.className = `node-line ${node.status || 'todo'}`;
        card.appendChild(line);

        card.onclick = async (e) => {
            if (e.altKey) {
                e.stopPropagation();
                if (!connectionSource) {
                    connectionSource = node;
                    renderNodes(roadmapData.nodes);
                } else {
                    if (connectionSource.id !== node.id) {
                        await connectNodes(connectionSource.id, node);
                    }
                    connectionSource = null;
                    await loadRoadmap();
                }
            }
        };

        card.ondblclick = (e) => {
            e.stopPropagation();
            showNodeDetails(node);
        };

        card.onmousedown = (e) => {
            if (e.altKey) return;
            if (e.button !== 0) return;
            e.stopPropagation();
            isDraggingNode = true;
            draggedNodeElement = card;
            draggedNodeData = node;
            dragStartX = e.clientX / scale - node.x;
            dragStartY = e.clientY / scale - node.y;
            card.style.cursor = 'grabbing';
        };

        nodesLayer.appendChild(card);
    });
}

function renderEdges(nodes, edges) {
    if (!nodes || !svgLayer) return;
    svgLayer.replaceChildren();

    const colors = {
        todo: '#8B0000',
        doing: '#f59e0b',
        done: '#10b981',
        default: '#0088ff'
    };

    function makeEdgePath(fromNode, toNode) {
        const x1 = fromNode.x + NODE_WIDTH / 2;
        const y1 = fromNode.y + NODE_HEIGHT / 2;
        const x2 = toNode.x + NODE_WIDTH / 2;
        const y2 = toNode.y + NODE_HEIGHT / 2;
        const cp = x1 + (x2 - x1) / 2;

        let edgeColor = colors.default;
        const s1 = fromNode.status || 'todo';
        const s2 = toNode.status || 'todo';
        if (s1 === s2) {
            edgeColor = colors[s1];
        } else if ((s1 === 'todo' && s2 === 'doing') || (s1 === 'doing' && s2 === 'todo')) {
            edgeColor = '#bc4f06';
        } else if ((s1 === 'doing' && s2 === 'done') || (s1 === 'done' && s2 === 'doing')) {
            edgeColor = '#82ab46';
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", edgeColor);
        path.setAttribute("stroke-width", "4.5");
        path.setAttribute("opacity", "0.8");
        path.style.cursor = "pointer";
        return path;
    }

    nodes.forEach(node => {
        if (node.parentNodeId) {
            const parent = nodes.find(n => n.id === node.parentNodeId);
            if (parent) {
                const path = makeEdgePath(parent, node);
                path.ondblclick = (e) => {
                    e.stopPropagation();
                    showConfirm(`Удалить связь между "${parent.title}" и "${node.title}"?`, async () => {
                        await deleteEdge(node);
                    });
                };
                svgLayer.appendChild(path);
            }
        }
    });

    (edges || []).forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.fromNodeId);
        const toNode = nodes.find(n => n.id === edge.toNodeId);
        if (fromNode && toNode) {
            const path = makeEdgePath(fromNode, toNode);
            path.ondblclick = (e) => {
                e.stopPropagation();
                showConfirm(`Удалить связь между "${fromNode.title}" и "${toNode.title}"?`, async () => {
                    await deleteNodeEdge(edge.id);
                });
            };
            svgLayer.appendChild(path);
        }
    });
}

async function deleteEdge(childNode) {
    const updatedData = {
        title: childNode.title,
        description: childNode.description,
        x: childNode.x,
        y: childNode.y,
        parentNodeId: null,
        status: childNode.status || "todo"
    };

    try {
        const res = await fetch(`${API_URL}/nodes/${childNode.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (res.ok) {
            await loadRoadmap();
        } else {
            showToast("Не удалось удалить связь на сервере", 'error');
        }
    } catch (e) {
        console.error("Ошибка при удалении связи:", e);
    }
}

async function connectNodes(parentId, childNode) {
    const key = new URLSearchParams(window.location.search).get('key');
    try {
        const res = await fetch(`${API_URL}/${key}/edges`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({fromNodeId: parentId, toNodeId: childNode.id})
        });
        if (!res.ok) throw new Error("Ошибка сервера при создании связи");
    } catch (e) {
        console.error(e);
        showToast("Не удалось сохранить связь", 'error');
    }
}

async function deleteNodeEdge(edgeId) {
    try {
        const res = await fetch(`${API_URL}/edges/${edgeId}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        });
        if (res.ok) await loadRoadmap();
        else showToast("Не удалось удалить связь", 'error');
    } catch (e) {
        console.error(e);
    }
}

function showNodeDetails(node) {
    currentNode = node;
    document.getElementById('node-edit-title').value = node.title || "";
    document.getElementById('node-edit-desc').value = node.description || "";
    document.getElementById('node-edit-status').value = node.status || "todo";
    document.getElementById('node-modal').classList.add('active');

    const display = document.getElementById('conspect-display');
    display.replaceChildren();

    if (node.files && node.files.length > 0) {
        node.files.forEach(file => {
            const fileUrl = `http://localhost:5000/uploads/${file.storagePath}`;
            const item = document.createElement('div');
            item.className = 'file-item';
            item.style.marginBottom = '5px';
            const link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.className = 'file-link';
            link.textContent = file.fileName;
            item.appendChild(link);
            display.appendChild(item);
        });
    } else {
        const p = document.createElement('p');
        p.style.color = '#888';
        p.textContent = 'Конспекты не прикреплены';
        display.appendChild(p);
    }
}

let selectedFile = null;

function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        document.getElementById('uploadBtn').style.display = 'inline-block';
        const display = document.getElementById('conspect-display');
        display.replaceChildren();
        display.textContent = 'Выбран файл: ';
        const strong = document.createElement('strong');
        strong.textContent = selectedFile.name;
        display.appendChild(strong);
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !currentNode) return;

    const formData = new FormData();
    formData.append('file', file);

    const display = document.getElementById('conspect-display');
    display.replaceChildren();
    const loadingP = document.createElement('p');
    loadingP.style.color = 'var(--primary)';
    loadingP.textContent = 'Загрузка...';
    display.appendChild(loadingP);

    try {
        const response = await fetch(`${API_URL}/nodes/${currentNode.id}/upload-conspect`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentNode.conspectPath = data.fileName;
            showNodeDetails(currentNode);
            await loadRoadmap();
        } else {
            const error = await response.text();
            showToast("Ошибка при загрузке: " + error, 'error');
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
    }
}

async function uploadConspect() {
    if (!selectedFile || !selectedNodeId) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const response = await fetch(`${API_URL}/roadmap/nodes/${selectedNodeId}/upload-conspect`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('uploadBtn').style.display = 'none';
            loadRoadmap();
        } else {
            const error = await response.text();
            showToast("Ошибка: " + error, 'error');
        }
    } catch (err) {
        console.error("Критическая ошибка загрузки:", err);
    }
}

function closeDetails() {
    document.getElementById('node-modal').classList.remove('active');
    currentNode = null;
}

document.getElementById('btnSaveNode').onclick = handleSave;

document.getElementById('btnDeleteNode').onclick = () => {
    if (!currentNode) return;
    showConfirm(`Удалить тему "${currentNode.title}"?`, async () => {
        const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (res.ok) {
            closeDetails();
            loadRoadmap();
        }
    });
};

document.getElementById('node-edit-title').onkeydown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
    }
};

document.getElementById('node-edit-desc').onkeydown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
    }
};

window.onkeydown = (e) => {
    if (e.key === 'Escape') {
        closeDetails();
        closeHelp();
    }
};

function handleOverlayClick(e) {
    if (e.target.id === 'node-modal') closeDetails();
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
        const updated = {
            title: draggedNodeData.title,
            description: draggedNodeData.description,
            x: Math.round(draggedNodeData.x),
            y: Math.round(draggedNodeData.y),
            parentNodeId: draggedNodeData.parentNodeId,
            status: draggedNodeData.status || "todo"
        };
        await fetch(`${API_URL}/nodes/${draggedNodeData.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updated)
        });
    }
    isDraggingNode = false;
    isPanning = false;
    draggedNodeElement = null;
    container.style.cursor = 'grab';
};

function centerOnNode(node) {
    pointX = (window.innerWidth / 2) - node.x - (NODE_WIDTH / 2);
    pointY = (window.innerHeight / 2) - node.y - (NODE_HEIGHT / 2);
    updateTransform();
}

function updateTransform() {
    content.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

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
        if (connectionSource) {
            connectionSource = null;
            renderNodes(roadmapData.nodes);
        }

        e.preventDefault();
        isPanning = true;
        startPanX = e.clientX - pointX;
        startPanY = e.clientY - pointY;
        container.style.cursor = 'grabbing';
    }
};

document.getElementById('btnCreateNode').onclick = async () => {
    const key = new URLSearchParams(window.location.search).get('key');
    const newNode = {title: "Новая тема", description: "", x: 3000, y: 3000};
    const res = await fetch(`${API_URL}/${key}/nodes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNode)
    });
    if (res.ok) loadRoadmap();
};

function switchThemeToggle() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
}

function copyKey() {
    navigator.clipboard.writeText(document.getElementById('roadmapKey').innerText);
    const status = document.getElementById('copyStatus');
    status.style.display = 'inline';
    setTimeout(() => status.style.display = 'none', 2000);
}

function handleSearch() {
    const query = document.getElementById('nodeSearch').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (!query) {
        resultsContainer.style.display = 'none';
        return;
    }

    const filtered = roadmapData.nodes.filter(n =>
        n.title.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        resultsContainer.replaceChildren();
        filtered.forEach(node => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.textContent = node.title;
            item.onclick = () => goToNode(node.id);
            resultsContainer.appendChild(item);
        });
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
    }
}

function goToNode(nodeId) {
    const node = roadmapData.nodes.find(n => n.id === nodeId);
    if (node) {
        centerOnNode(node);

        const nodeElements = document.querySelectorAll('.node');
        nodeElements.forEach(el => {
            if (parseInt(el.style.left) === Math.round(node.x) &&
                parseInt(el.style.top) === Math.round(node.y)) {
                el.style.boxShadow = "0 0 20px var(--primary)";
                setTimeout(() => el.style.boxShadow = "", 2000);
            }
        });
    }
    document.getElementById('nodeSearch').value = '';
    document.getElementById('searchResults').style.display = 'none';
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        document.getElementById('searchResults').style.display = 'none';
    }
});

document.getElementById('btnDeleteRoadmap').onclick = () => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    const title = document.getElementById('roadmapTitle').innerText;

    if (!key) return;

    showConfirm(`Вы уверены, что хотите полностью удалить холст "${title}"? Это действие нельзя отменить.`, async () => {
        try {
            const res = await fetch(`${API_URL}/${key}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (res.ok) {
                window.location.href = '../start_page/index.html';
            } else {
                const errorData = await res.json();
                showToast(`Ошибка при удалении: ${errorData.message || 'Не удалось удалить холст'}`, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Ошибка при обращении к серверу.', 'error');
        }
    });
};

function toggleHelpPanel() {
    const modal = document.getElementById('help-modal');
    modal.classList.toggle('active');
}

function closeHelp() {
    document.getElementById('help-modal').classList.remove('active');
}

function closeHelpIfOverlay(e) {
    if (e.target.id === 'help-modal') closeHelp();
}

applyTheme();
loadRoadmap();