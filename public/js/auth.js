/* ==================== 認證 JavaScript ==================== */

let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // 登入表單提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuth('/auth/login', {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        });
    });

    // 註冊表單提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuth('/auth/register', {
            username: document.getElementById('reg-username').value,
            password: document.getElementById('reg-password').value
        });
    });

    async function handleAuth(url, data) {
        const submitBtn = document.getElementById(isLoginMode ? 'login-btn' : 'register-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = isLoginMode ? '登入中...' : '註冊中...';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess(result.message);
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('網路錯誤，請稍後再試');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? '登入' : '註冊';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
});

function toggleForm() {
    isLoginMode = !isLoginMode;

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleLink = document.querySelector('.register-link a');

    if (isLoginMode) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        toggleLink.textContent = '還沒有帳戶？點擊註冊';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        toggleLink.textContent = '已有帳戶？點擊登入';
    }

    // 清除錯誤訊息
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
}