const API_URL = 'http://localhost:5000/api/Roadmap';
let roadmapData = null;
let currentNode = null;

let isDraggingNode = false;
let draggedNodeElement = null;
let draggedNodeData = null;
let dragStartX = 0;
let dragStartY = 0;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;

let scale = 1;
let pointX = 0;
let pointY = 0;
let isPanning = false;
let startPanX, startPanY;

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

function renderNodes(nodes) {
    nodesLayer.innerHTML = '';
    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = 'node';
        card.style.left = `${node.x}px`;
        card.style.top = `${node.y}px`;

        card.innerHTML = `
            <div class="node-status">В ПЛАНЕ</div>
            <h3>${node.title}</h3>
            <div class="progress-track"></div>
        `;

        card.ondblclick = (e) => {
            e.stopPropagation();
            showNodeDetails(node);
        };

        card.onmousedown = (e) => {
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

document.getElementById('btnDeleteNode').onclick = async () => {
    if (!currentNode) return;

    if (!confirm(`Вы уверены, что хотите удалить тему "${currentNode.title}"?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            closeDetails();
            await loadRoadmap();
        } else {
            alert("Не удалось удалить ноду");
        }
    } catch (e) {
        console.error("Ошибка при удалении:", e);
    }
};

function renderEdges(nodes) {
    svgLayer.innerHTML = '';
    nodes.forEach(node => {
        if (node.parentNodeId) {
            const parent = nodes.find(n => n.id === node.parentNodeId);
            if (parent) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const x1 = parent.x + NODE_WIDTH;
                const y1 = parent.y + NODE_HEIGHT / 2;
                const x2 = node.x;
                const y2 = node.y + NODE_HEIGHT / 2;
                const cp = x1 + (x2 - x1) / 2;
                path.setAttribute("d", `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", "var(--primary)");
                path.setAttribute("stroke-width", "2");
                path.setAttribute("opacity", "0.4");
                svgLayer.appendChild(path);
            }
        }
    });
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
    }
    else if (isPanning) {
        pointX = e.clientX - startPanX;
        pointY = e.clientY - startPanY;
        updateTransform();
    }
};

window.onmouseup = async () => {
    if (isDraggingNode && draggedNodeData) {
        saveNodePosition(draggedNodeData);
    }
    isDraggingNode = false;
    isPanning = false;
    draggedNodeElement = null;
    container.style.cursor = 'grab';
};

async function saveNodePosition(node) {
    const updated = {
        title: node.title,
        description: node.description,
        x: Math.round(node.x),
        y: Math.round(node.y),
        parentNodeId: node.parentNodeId
    };
    await fetch(`${API_URL}/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
    });
}

function showNodeDetails(node) {
    currentNode = node;
    document.getElementById('node-edit-title').value = node.title || "";
    document.getElementById('node-edit-desc').value = node.description || "";
    document.getElementById('node-modal').classList.add('active');
}

function closeDetails() {
    document.getElementById('node-modal').classList.remove('active');
    currentNode = null;
}

function handleOverlayClick(e) { if (e.target.id === 'node-modal') closeDetails(); }

document.getElementById('btnSaveNode').onclick = async () => {
    if (!currentNode) return;
    const updated = {
        title: document.getElementById('node-edit-title').value,
        description: document.getElementById('node-edit-desc').value,
        x: currentNode.x,
        y: currentNode.y,
        parentNodeId: currentNode.parentNodeId
    };
    const res = await fetch(`${API_URL}/nodes/${currentNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
    });
    if (res.ok) { closeDetails(); loadRoadmap(); }
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
    const factor = Math.pow(1.1, -e.deltaY / 200);
    scale = Math.min(Math.max(scale * factor, 0.1), 3);
    updateTransform();
};

container.onmousedown = (e) => {
    if(e.target === container || e.target === nodesLayer) {
        isPanning = true;
        startPanX = e.clientX - pointX;
        startPanY = e.clientY - pointY;
        container.style.cursor = 'grabbing';
    }
};

function applyTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); }
function switchThemeToggle() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}
function copyKey() {
    navigator.clipboard.writeText(document.getElementById('roadmapKey').innerText);
    const status = document.getElementById('copyStatus');
    status.style.display = 'inline';
    setTimeout(() => status.style.display = 'none', 2000);
}

document.getElementById('btnCreateNode').onclick = async () => {
    const key = new URLSearchParams(window.location.search).get('key');
    const newNode = { title: "Новая тема", description: "", x: 3000, y: 3000 };
    const res = await fetch(`${API_URL}/${key}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNode)
    });
    if (res.ok) loadRoadmap();
};

applyTheme();
loadRoadmap();