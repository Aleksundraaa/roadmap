let isLoginMode = true;
const API_AUTH = "http://localhost:5000/api/auth";

function toggleAuthMode() {
    isLoginMode = !isLoginMode;

    const title = document.getElementById('auth-title');
    const btn = document.getElementById('btnAuth');
    const toggleText = document.getElementById('toggle-text');
    const subtitle = document.querySelector('.subtitle');

    if (isLoginMode) {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        toggleText.innerText = "Нет аккаунта? Зарегистрироваться";
        subtitle.innerText = "Добро пожаловать";
    } else {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        toggleText.innerText = "Уже есть аккаунт? Войти";
        subtitle.innerText = "Присоединяйтесь к нам";
    }
}

async function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert("Заполните все поля!");
        return;
    }

    const endpoint = isLoginMode ? "login" : "register";
    const btn = document.getElementById('btnAuth');

    btn.disabled = true;
    btn.innerText = isLoginMode ? "Входим..." : "Регистрируем...";

    try {
        const res = await fetch(`${API_AUTH}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const responseText = await res.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: responseText };
        }

        if (!res.ok) {
            throw new Error(data.message || "Ошибка запроса");
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = "../start_page/index.html";
        } else {
            alert("Регистрация успешна! Войдите в аккаунт.");
            if (!isLoginMode) toggleAuthMode();
        }

    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = isLoginMode ? "Войти" : "Создать аккаунт";
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleAuth();
    }
});