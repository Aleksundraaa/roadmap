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

function showInputDialog(label, defaultValue, onConfirm) {
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const msg = document.createElement('p');
    msg.className = 'confirm-message';
    msg.textContent = label;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-dialog-field';
    input.value = defaultValue || '';

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const okBtn = document.createElement('button');
    okBtn.className = 'modal-btn btn-confirm-blue';
    okBtn.textContent = 'Сохранить';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn btn-cancel-modal';
    cancelBtn.textContent = 'Отмена';

    const submit = () => {
        const value = input.value.trim();
        if (!value) return;
        overlay.remove();
        onConfirm(value);
    };

    okBtn.onclick = submit;
    cancelBtn.onclick = () => overlay.remove();
    input.onkeydown = (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') overlay.remove();
    };

    actions.appendChild(okBtn);
    actions.appendChild(cancelBtn);
    box.appendChild(msg);
    box.appendChild(input);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    setTimeout(() => input.focus(), 50);
}

function showConfirm(message, onConfirm, type = 'info') {
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = `confirm-overlay${type === 'error' ? ' error-modal' : ''}`;

    let mainBtnClass = 'btn-confirm-blue';
    let btnText = 'Подтвердить';

    if (type === 'danger') mainBtnClass = 'btn-confirm-danger';
    if (type === 'error') {
        mainBtnClass = 'btn-confirm-danger';
        btnText = 'Вернуться на главную';
    }

    const showCancel = type !== 'error';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const msg = document.createElement('p');
    msg.className = 'confirm-message';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const okBtn = document.createElement('button');
    okBtn.className = `modal-btn ${mainBtnClass}`;
    okBtn.textContent = btnText;
    okBtn.onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
    actions.appendChild(okBtn);

    if (showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn btn-cancel-modal';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.onclick = () => overlay.remove();
        actions.appendChild(cancelBtn);
    }

    box.appendChild(msg);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
        if (e.target === overlay && type !== 'error') overlay.remove();
    };
}
