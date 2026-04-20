const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

toggleSwitch.addEventListener('change', switchTheme, false);


async function createRoadmap() {
    const btn = document.getElementById('btnCreate');
    const title = document.getElementById('newTitle').value;

    if (!title) return alert("Дайте название вашему пути!");

    btn.innerText = "Создаем...";
    btn.disabled = true;

    // Имитация работы сервера (заглушка)
    setTimeout(() => {
        // Генерируем случайный 8-значный ключ для вида
        const dummyKey = Math.random().toString(36).substring(2, 10);
        // Сохраняем название в localStorage (опционально, для красоты на след. странице)
        localStorage.setItem('lastCreatedTitle', title);
        
        // Переходим на страницу холста
        window.location.href = `../roadmap_page/roadmap.html?key=${dummyKey}`;
    }, 1200);
}

function openRoadmap() {
    const keyInput = document.getElementById('urlKey');
    const key = keyInput.value.trim();

    if (key.length !== 8) {
        alert("Пожалуйста, введите корректный 8-значный ключ.");
        return;
    }

    // Имитируем "вход" по ключу
    window.location.href = `../roadmap_page/roadmap.html?key=${key}`;
}


/* Старый код!


const API_URL = '/api/Roadmap';

const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

toggleSwitch.addEventListener('change', switchTheme, false);


async function createRoadmap() {
    const btn = document.getElementById('btnCreate');
    const title = document.getElementById('newTitle').value;

    if (!title) return alert("Дайте название вашему пути!");

    btn.innerText = "Создаем...";
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title })
        });

        const data = await response.json();
        window.location.href = `../roadmap_page/roadmap.html?key=${data.urlKey}`;
    } catch (e) {
        alert("Ошибка сервера. Проверьте соединение.");
    } finally {
        btn.innerText = "Создать холст";
        btn.disabled = false;
    }
}

function openRoadmap() {
    const keyInput = document.getElementById('urlKey');
    const key = keyInput.value.trim();

    if (key.length !== 8) {
        alert("Пожалуйста, введите корректный 8-значный ключ.");
        return;
    }

    window.location.href = `../roadmap_page/roadmap.html?key=${key}`;
}

*/