// --- КОНСТАНТЫ И НАСТРОЙКИ ---
const CANVAS_WIDTH = 6000;
const CANVAS_HEIGHT = 6000;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 120; // Примерная высота карточки

// --- MOCK DATA (ЗАГЛУШКИ) ---
const mockNodes = [
    { id: 1, title: 'Основы HTML & CSS', status: 'done', parentId: null, x: 2800, y: 2800, tasks: 8, completed: 8, desc: 'Базовая разметка, семантика и стилизация страниц.' },
    { id: 2, title: 'JavaScript Basic', status: 'done', parentId: 1, x: 3100, y: 2800, tasks: 12, completed: 12, desc: 'Переменные, циклы, функции и основы работы с DOM.' },
    { id: 3, title: 'Продвинутый JS', status: 'progress', parentId: 2, x: 3400, y: 2700, tasks: 10, completed: 4, desc: 'Замыкания, прототипы, асинхронность и Fetch API.' },
    { id: 4, title: 'React.js Основы', status: 'todo', parentId: 3, x: 3750, y: 2650, tasks: 15, completed: 0, desc: 'Компоненты, хуки и управление состоянием.' },
    { id: 5, title: 'Node.js & Express', status: 'todo', parentId: 3, x: 3750, y: 2850, tasks: 10, completed: 0, desc: 'Создание серверных приложений и API.' }
];

// --- ИНИЦИАЛИЗАЦИЯ ---
let scale = 1;
let pointX = -2800 + (window.innerWidth / 2); // Центрируем на стартовом узле
let pointY = -2800 + (window.innerHeight / 2);
let isDragging = false;
let startX, startY;

const container = document.getElementById('canvas-container');
const content = document.getElementById('canvas-content');
const nodesLayer = document.getElementById('nodes-layer');
const svgLayer = document.getElementById('canvas-svg');

// Применение темы
const applyTheme = () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
};

// Рендеринг связей (ребер)
function renderEdges() {
    svgLayer.innerHTML = '';
    mockNodes.forEach(node => {
        if (node.parentId) {
            const parent = mockNodes.find(n => n.id === node.parentId);
            if (parent) {
                drawEdge(parent, node);
            }
        }
    });
}

function drawEdge(source, target) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    // Координаты центров сторон (выход справа, вход слева)
    const x1 = source.x + NODE_WIDTH;
    const y1 = source.y + (NODE_HEIGHT / 2);
    const x2 = target.x;
    const y2 = target.y + (NODE_HEIGHT / 2);

    // Рисуем кривую Безье
    const cp1x = x1 + (x2 - x1) / 2;
    const cp2x = x1 + (x2 - x1) / 2;

    const d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--accent)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("opacity", "0.4");
    svgLayer.appendChild(path);
}

// Рендеринг карточек
function renderNodes() {
    nodesLayer.innerHTML = '';
    mockNodes.forEach(node => {
        const card = document.createElement('div');
        card.className = `node ${node.status}`;
        card.style.left = `${node.x}px`;
        card.style.top = `${node.y}px`;

        const progressPercent = (node.completed / node.tasks) * 100;
        const statusClass = node.status === 'done' ? 'status-done' : (node.status === 'progress' ? 'status-progress' : 'status-todo');
        const statusText = node.status === 'done' ? 'Завершено' : (node.status === 'progress' ? 'В процессе' : 'В плане');

        card.innerHTML = `
            <div class="node-status ${statusClass}">${statusText}</div>
            <h3>${node.title}</h3>
            <div class="progress-container">
                <div class="progress-label">
                    <span>${node.completed}/${node.tasks} задач</span>
                    <span>${Math.round(progressPercent)}%</span>
                </div>
                <div class="progress-track">
                    <div class="progress-bar" style="width: ${progressPercent}%; background: ${node.status === 'done' ? 'var(--node-done)' : 'var(--accent)'}"></div>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            e.stopPropagation();
            showNodeDetails(node);
        };

        nodesLayer.appendChild(card);
    });
}

// --- ВЗАИМОДЕЙСТВИЕ ---

function showNodeDetails(node) {
    const panel = document.getElementById('details-panel');
    document.getElementById('node-detail-title').innerText = node.title;
    document.getElementById('node-detail-desc').innerText = node.desc;
    document.getElementById('node-detail-progress').innerText = `${node.completed}/${node.tasks} задач`;
    panel.classList.add('open');
}

function closeDetails() {
    document.getElementById('details-panel').classList.remove('open');
}

// Управление холстом (Zoom & Pan)
container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY;
    const factor = Math.min(Math.max(Math.pow(1.1, delta / 200), 0.1), 2);
    const newScale = Math.min(Math.max(scale * factor, 0.2), 3);

    pointX = mouseX - (mouseX - pointX) * (newScale / scale);
    pointY = mouseY - (mouseY - pointY) * (newScale / scale);

    scale = newScale;
    updateTransform();
}, { passive: false });

container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.node')) return;
    isDragging = true;
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    container.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    pointX = e.clientX - startX;
    pointY = e.clientY - startY;
    updateTransform();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
});

function updateTransform() {
    content.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

// Кнопка создания (Заглушка)
document.getElementById('btnCreateNode').onclick = () => {
    const btn = document.getElementById('btnCreateNode');
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Отправка...";
    btn.disabled = true;

    // Имитируем запрос на сервер
    setTimeout(() => {
        alert("Запрос отправлен на сервер (заглушка)! Логику добавления реализует бэкенд-разработчик.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1500);
};

function copyKey() {
    const keyText = document.getElementById('roadmapKey').innerText;
    navigator.clipboard.writeText(keyText).then(() => {
        const status = document.getElementById('copyStatus');
        status.style.display = 'inline';
        setTimeout(() => status.style.display = 'none', 2000);
    });
}

function switchThemeToggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Запуск
applyTheme();
renderNodes();
renderEdges();
updateTransform();
