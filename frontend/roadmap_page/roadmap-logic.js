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

async function loadRoadmap() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (!key) return window.location.href = '../start_page/index.html';

    document.getElementById('roadmapKey').innerText = key;

    try {
        const response = await fetch(`${API_URL}/${key}`);
        if (!response.ok) throw new Error();
        roadmapData = await response.json();

        document.getElementById('roadmapTitle').innerText = roadmapData.title;

        renderNodes(roadmapData.nodes);
        renderEdges(roadmapData.nodes);

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
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedData)
        });

        if (res.ok) {
            closeDetails();
            await loadRoadmap();
        } else {
            const errorData = await res.json();
            console.error("Ошибка сервера:", errorData);
            alert("Не удалось сохранить изменения");
        }
    } catch (e) {
        console.error("Ошибка при сохранении:", e);
        alert("Ошибка связи с сервером");
    }
}

function renderNodes(nodes) {
    if (!nodes) return;
    nodesLayer.innerHTML = '';

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
            card.style.outline = "3px solid var(--primary)";
        }
        const currentStatus = node.status || 'todo';

        card.innerHTML = `
        <div class="node-status ${statusInfo.class}">${statusInfo.text}</div>
        <h3>${node.title}</h3>
        <p class="node-desc">${node.description || "Нет описания"}</p>
        <div class="node-line ${currentStatus}"></div>`;

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

function renderEdges(nodes) {
    if (!nodes || !svgLayer) return;
    svgLayer.innerHTML = '';

    const colors = {
        todo: '#8B0000',
        doing: '#f59e0b',
        done: '#10b981',
        default: '#0088ff'
    };

    nodes.forEach(node => {
        if (node.parentNodeId) {
            const parent = nodes.find(n => n.id === node.parentNodeId);
            if (parent) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                let edgeColor = colors.default;
                const s1 = parent.status || 'todo';
                const s2 = node.status || 'todo';

                if (s1 === s2) {
                    edgeColor = colors[s1];
                } else if ((s1 === 'todo' && s2 === 'doing') || (s1 === 'doing' && s2 === 'todo')) {
                    edgeColor = '#bc4f06';
                } else if ((s1 === 'doing' && s2 === 'done') || (s1 === 'done' && s2 === 'doing')) {
                    edgeColor = '#82ab46';
                }

                const x1 = parent.x + NODE_WIDTH;
                const y1 = parent.y + NODE_HEIGHT / 2;
                const x2 = node.x;
                const y2 = node.y + NODE_HEIGHT / 2;
                const cp = x1 + (x2 - x1) / 2;

                path.setAttribute("d", `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", edgeColor);
                path.setAttribute("stroke-width", "4.5");
                path.setAttribute("opacity", "0.8");
                path.style.cursor = "pointer";

                path.ondblclick = async (e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить связь между "${parent.title}" и "${node.title}"?`)) {
                        await deleteEdge(node);
                    }
                };

                svgLayer.appendChild(path);
            }
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
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedData)
        });

        if (res.ok) {
            await loadRoadmap();
        } else {
            alert("Не удалось удалить связь на сервере");
        }
    } catch (e) {
        console.error("Ошибка при удалении связи:", e);
    }
}

async function connectNodes(parentId, childNode) {
    const updatedData = {
        title: childNode.title,
        description: childNode.description,
        x: childNode.x,
        y: childNode.y,
        parentNodeId: parentId,
        status: childNode.status || "todo"
    };

    try {
        const res = await fetch(`${API_URL}/nodes/${childNode.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedData)
        });
        if (!res.ok) throw new Error("Ошибка сервера при создании связи");
    } catch (e) {
        console.error(e);
        alert("Не удалось сохранить связь");
    }
}

function showNodeDetails(node) {
    currentNode = node;
    document.getElementById('node-edit-title').value = node.title || "";
    document.getElementById('node-edit-desc').value = node.description || "";
    document.getElementById('node-edit-status').value = node.status || "todo";
    document.getElementById('node-modal').classList.add('active');
}

function closeDetails() {
    document.getElementById('node-modal').classList.remove('active');
    currentNode = null;
}

document.getElementById('btnSaveNode').onclick = handleSave;

document.getElementById('btnDeleteNode').onclick = async () => {
    if (!currentNode || !confirm(`Удалить тему "${currentNode.title}"?`)) return;
    const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {method: 'DELETE'});
    if (res.ok) {
        closeDetails();
        loadRoadmap();
    }
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
    if (e.key === 'Escape') closeDetails();
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
        renderEdges(roadmapData.nodes);
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
            headers: {'Content-Type': 'application/json'},
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
        headers: {'Content-Type': 'application/json'},
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
        resultsContainer.innerHTML = filtered.map(node => `
            <div class="search-item" onclick="goToNode(${node.id})">
                ${node.title}
            </div>
        `).join('');
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

applyTheme();
loadRoadmap();