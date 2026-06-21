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
    if (!title) {
        showToast("Введите название плана!", 'error');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Сессия истекла. Пожалуйста, войдите снова.", 'error');
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
            body: JSON.stringify({title: title})
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("Не авторизован");
            throw new Error("Ошибка при создании");
        }

        const data = await response.json();
        window.location.href = `../roadmap_page/roadmap.html?key=${data.urlKey}`;
    } catch (e) {
        showToast("Ошибка сервера: " + e.message, 'error');
        btn.disabled = false;
        btn.innerText = "Создать холст";
    }
}

function openRoadmap() {
    const key = document.getElementById('urlKey').value.trim();
    if (key.length !== 8) {
        showToast("Ключ должен быть 8 символов!", 'error');
        return;
    }
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

        listContainer.replaceChildren();

        if (roadmaps.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'Пока нет ни одного холста';
            listContainer.appendChild(empty);
            return;
        }

        roadmaps.forEach(rm => {
            const item = document.createElement('div');
            item.className = 'roadmap-item';

            item.onclick = () => {
                window.location.href = `../roadmap_page/roadmap.html?key=${rm.urlKey}`;
            };

            const header = document.createElement('div');
            header.className = 'roadmap-item-header-row';

            const title = document.createElement('span');
            title.className = 'roadmap-name';
            title.textContent = rm.title || 'Без названия';

            const roleBadge = document.createElement('span');
            const roleClass = rm.role === 'Владелец' ? 'badge-owner' : 'badge-author';
            roleBadge.className = `role-badge ${roleClass}`;
            roleBadge.textContent = rm.role || 'Соавтор';

            header.appendChild(title);
            header.appendChild(roleBadge);

            const footer = document.createElement('div');
            footer.className = 'roadmap-item-footer';

            const keySpan = document.createElement('span');
            keySpan.className = 'roadmap-key';
            keySpan.textContent = rm.urlKey;

            const actions = document.createElement('div');
            actions.className = 'roadmap-actions-group';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy-small';
            copyBtn.title = 'Копировать ключ';
            copyBtn.textContent = '📋';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                copyToClipboard(rm.urlKey);
            };
            actions.appendChild(copyBtn);

            if (rm.role === 'Владелец') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-delete-small';
                deleteBtn.title = 'Удалить холст';
                deleteBtn.textContent = '🗑️';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteRoadmap(rm.urlKey, rm.title);
                };
                actions.appendChild(deleteBtn);
            }

            footer.appendChild(keySpan);
            footer.appendChild(actions);

            item.appendChild(header);
            item.appendChild(footer);

            listContainer.appendChild(item);
        });

    } catch (err) {
        console.error(err);
        listContainer.replaceChildren();
        const errDiv = document.createElement('div');
        errDiv.className = 'error';
        errDiv.textContent = 'Не удалось загрузить список';
        listContainer.appendChild(errDiv);
    }
}

async function deleteRoadmap(urlKey, title) {
    showConfirm(`Вы уверены, что хотите удалить холст "${title}"?`, async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE}/${urlKey}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showToast("Холст удален", "success");
                loadRoadmapsList();
            } else {
                showToast("Ошибка при удалении", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Нет связи с сервером", "error");
        }
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Ключ скопирован: ' + text, 'success');
    });
}

function handleLogout() {
    showConfirm("Вы уверены, что хотите выйти?", () => {
        localStorage.removeItem('token');
        window.location.href = "../auth_page/auth.html";
    });
}

function getUsernameFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
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