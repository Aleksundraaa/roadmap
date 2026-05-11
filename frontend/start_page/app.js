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

    const token = localStorage.getItem('token');
    if (!token) {
        alert("Сессия истекла. Пожалуйста, войдите снова.");
        window.location.href = "../auth_page/auth.html";
        return;
    }

    const btn = document.getElementById('btnCreate');
    btn.disabled = true;
    btn.innerText = "Создание...";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: title })
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("Не авторизован");
            throw new Error("Ошибка при создании");
        }

        const data = await response.json();
        window.location.href = `../roadmap_page/roadmap.html?key=${data.urlKey}`;
    } catch (e) {
        alert("Ошибка сервера: " + e.message);
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
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "../auth_page/auth.html";
        return;
    }
    try {
        const response = await fetch(API_BASE, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
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

function handleLogout() {
    if (confirm("Вы уверены, что хотите выйти?")) {
        localStorage.removeItem('token');
        window.location.href = "../auth_page/auth.html";
    }
}

function getUsernameFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);

        return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
            payload.unique_name ||
            payload.name ||
            payload.sub ||
            "Пользователь";
    } catch (e) {
        console.error("Ошибка декодирования токена:", e);
        return "Ошибка чтения";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const usernameElement = document.getElementById('current-username');
    if (usernameElement) {
        const name = getUsernameFromToken();
        usernameElement.innerText = name || "Гость";
    }
});

document.addEventListener('DOMContentLoaded', loadRoadmapsList);