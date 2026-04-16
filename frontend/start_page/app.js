const API_URL = 'http://localhost:5130/api/Roadmap';

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
        alert("Ошибка сервера. Проверьте CORS и запущен ли бэкенд.");
    } finally {
        btn.innerText = "Создать холст";
        btn.disabled = false;
    }
}

function openRoadmap() {
    const keyInput = document.getElementById('urlKey');
    const key = keyInput.value.trim(); // trim() уберет случайные пробелы

    if (key.length !== 8) {
        alert("Пожалуйста, введите корректный 8-значный ключ.");
        return;
    }

    window.location.href = `../roadmap_page/roadmap.html?key=${key}`;
}
