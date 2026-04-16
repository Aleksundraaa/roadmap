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