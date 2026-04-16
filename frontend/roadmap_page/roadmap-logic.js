const API_URL = 'http://localhost:5130/api/Roadmap';

async function loadRoadmap() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');

    if (!key) {
        alert("Ключ не найден в URL!");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('roadmapKey').innerText = `${key}`;

    try {
        const response = await fetch(`${API_URL}/${key}`);

        if (response.status === 404) {
            alert("Такой дорожной карты не существует!");
            window.location.href = 'index.html';
            return;
        }

        const data = await response.json();

        document.getElementById('roadmapTitle').innerText = data.title || "Без названия";

        console.log("Данные успешно загружены:", data);

    } catch (error) {
        console.error("Ошибка загрузки:", error);
        alert("Не удалось связаться с сервером");
    }
}

function copyKey() {
    const keyText = document.getElementById('roadmapKey').innerText;

    navigator.clipboard.writeText(keyText).then(() => {
        const status = document.getElementById('copyStatus');
        status.style.display = 'inline';

        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    });
}

loadRoadmap();

let scale = 1;
const minScale = 0.2;
const maxScale = 3;
const zoomSpeed = 0.001;

const container = document.getElementById('canvas-container');
const content = document.getElementById('canvas-content');

let pointX = 0;
let pointY = 0;

container.addEventListener('wheel', (e) => {
    e.preventDefault(); // Запрещаем скролл страницы

    const rect = container.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100); // Плавный коэффициент
    const newScale = Math.min(Math.max(scale * factor, minScale), maxScale);

    pointX = x - (x - pointX) * (newScale / scale);
    pointY = y - (y - pointY) * (newScale / scale);

    scale = newScale;

    updateTransform();
}, { passive: false });

function updateTransform() {
    content.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}