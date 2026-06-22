let isLoginMode = true;
const API_AUTH = "/api/auth";

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
        showToast("Заполните все поля!", 'error');
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
            showToast("Регистрация успешна! Войдите в аккаунт.", 'success');
            if (!isLoginMode) toggleAuthMode();
        }

    } catch (err) {
        showToast(err.message, 'error');
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

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');

    if (togglePassword && password) {
        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.textContent = type === 'password' ? 'Показать пароль' : 'Скрыть пароль';
        });
    }
});