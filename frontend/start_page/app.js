const API_URL = 'http://localhost:5000/api/Roadmap';

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

async function createRoadmap() {
    const title = document.getElementById('newTitle').value.trim();
    if (!title) return alert("Введите название плана!");

    const btn = document.getElementById('btnCreate');
    btn.disabled = true;
    btn.innerText = "Создание...";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title })
        });

        if (!response.ok) throw new Error();
        const data = await response.json();

        window.location.href = `../roadmap_page/roadmap.html?key=${data.urlKey}`;
    } catch (e) {
        alert("Ошибка сервера. Проверь Rider!");
        btn.disabled = false;
        btn.innerText = "Создать холст";
    }
}

function openRoadmap() {
    const key = document.getElementById('urlKey').value.trim();
    if (key.length !== 8) return alert("Ключ должен быть 8 символов!");
    window.location.href = `../roadmap_page/roadmap.html?key=${key}`;
}

const API_BASE = 'http://localhost:5000/api/Roadmap';

async function loadRoadmapsList() {
    const listContainer = document.getElementById('roadmap-list');

    try {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error('Ошибка сети');
        const roadmaps = await response.json();

        if (roadmaps.length === 0) {
            listContainer.innerHTML = '<div class="empty">Пока нет ни одного холста</div>';
            return;
        }

        listContainer.innerHTML = roadmaps.map(rm => `
        <div class="roadmap-item">
            <a href="../roadmap_page/roadmap.html?key=${rm.urlKey}" class="roadmap-name">
                ${rm.title || 'Без названия'}
            </a>
            <div class="roadmap-item-footer">
                <span class="roadmap-key">${rm.urlKey}</span>
                <button class="btn-copy-small" onclick="copyToClipboard('${rm.urlKey}')" title="Копировать ключ">📋</button>
            </div>
        </div>
    `).join('');

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div class="error">Не удалось загрузить список</div>';
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Ключ скопирован: ' + text);
    });
}

document.addEventListener('DOMContentLoaded', loadRoadmapsList);