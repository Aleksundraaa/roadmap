function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showConfirm(message, onConfirm, type = 'info') {
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = `confirm-overlay ${type === 'error' ? 'error-modal' : ''}`;

    let mainBtnClass = 'btn-confirm-blue';
    let btnText = 'Подтвердить';

    if (type === 'danger') mainBtnClass = 'btn-confirm-danger';
    if (type === 'error') {
        mainBtnClass = 'btn-confirm-danger';
        btnText = 'Вернуться на главную';
    }

    const showCancel = type !== 'error';

    overlay.innerHTML = `
        <div class="confirm-box">
            <p class="confirm-message">${message}</p>
            <div class="confirm-actions">
                <button class="modal-btn ${mainBtnClass}" id="confirm-ok">${btnText}</button>
                ${showCancel ? '<button class="modal-btn btn-cancel-modal" id="confirm-cancel">Отмена</button>' : ''}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-ok').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };

    if (showCancel) {
        overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
    }

    overlay.onclick = (e) => {
        if (e.target === overlay && type !== 'error') overlay.remove();
    };
}