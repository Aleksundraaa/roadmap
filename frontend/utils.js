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

function showCriticalError(message) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay error-modal';

    overlay.innerHTML = `
        <div class="confirm-box">
            <p class="confirm-message">${message}</p>
            <div class="confirm-actions" style="justify-content: center;">
                <button class="btn-home" onclick="location.href='../start_page/index.html'">
                    Вернуться на главную
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const title = document.getElementById('roadmapTitle');
    if (title) title.textContent = "Доступ ограничен";

    const canvas = document.getElementById('canvas-container');
    if (canvas) canvas.style.filter = "blur(4px)";
}

function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const msg = document.createElement('p');
    msg.className = 'confirm-message';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const btnOk = document.createElement('button');
    btnOk.className = 'btn-save';
    btnOk.textContent = 'Подтвердить';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-cancel';
    btnCancel.textContent = 'Отмена';

    btnOk.onclick = () => { overlay.remove(); onConfirm(); };
    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    actions.appendChild(btnOk);
    actions.appendChild(btnCancel);
    box.appendChild(msg);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}
