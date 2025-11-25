/* ==================== 首頁 JavaScript ==================== */

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadTrips();
    loadSharedSettlements();
});

async function checkAuth() {
    try {
        const response = await fetch('/auth/user', {
            credentials: 'same-origin' // 確保發送 cookies
        });
        if (response.ok) {
            const data = await response.json();
            const mainContent = document.getElementById('main-content');
            const userInfo = document.getElementById('user-info');
            const logoutBtn = document.getElementById('logout-btn');
            const loginLink = document.getElementById('login-link');

            mainContent.style.display = 'block';
            userInfo.textContent = `歡迎，${data.user.username}！`;
            logoutBtn.style.display = 'inline-block';
            loginLink.style.display = 'none';
        } else {
            window.location.href = '/login';
        }
    } catch (err) {
        console.error('驗證失敗:', err);
        window.location.href = '/login';
    }
}

async function loadTrips() {
    try {
        console.log('📋 載入旅遊列表...');
        const response = await fetch('/api/trips', {
            credentials: 'same-origin' // 確保發送 cookies
        });

        if (response.ok) {
            const trips = await response.json();
            console.log('載入旅遊:', trips);
            renderTrips(trips);
        } else {
            console.error('載入旅遊失敗:', response.status);
        }
    } catch (error) {
        console.error('載入旅遊錯誤:', error);
    }
}

async function loadSharedSettlements() {
    try {
        const response = await fetch('/api/shared-settlements', {
            credentials: 'same-origin' // 確保發送 cookies
        });
        if (response.ok) {
            const sharedSettlements = await response.json();
            renderSharedSettlements(sharedSettlements);
        }
    } catch (error) {
        console.error('載入分享分帳錯誤:', error);
    }
}

function renderSharedSettlements(sharedSettlements) {
    const container = document.getElementById('shared-settlements-container');

    if (sharedSettlements.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); font-style: italic;">還沒有朋友分享分帳給你</p>';
        return;
    }

    container.innerHTML = sharedSettlements.map(shared => `
        <div class="shared-settlement-card">
            <div class="shared-settlement-header">
                <div class="shared-settlement-title">${escapeHtml(shared.trips.name)}</div>
                <div class="shared-settlement-from">來自 ${escapeHtml(shared.users.username)}</div>
            </div>
            <div class="shared-settlement-balances">
                ${Object.entries(shared.settlement_data).map(([person, amount]) => `
                    <div class="shared-balance-item">
                        <span>${escapeHtml(person)}</span>
                        <span class="${amount > 0 ? 'shared-balance-positive' : amount < 0 ? 'shared-balance-negative' : ''}">
                            ${amount > 0 ? '+' : ''}$${amount.toFixed(2)}
                        </span>
                    </div>
                `).join('')}
            </div>
            ${shared.message ? `<div class="shared-settlement-message">${escapeHtml(shared.message)}</div>` : ''}
        </div>
    `).join('');
}

function renderTrips(trips) {
    const container = document.getElementById('trips-container');
    const emptyState = document.getElementById('empty-state');

    if (trips.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = trips.map(trip => `
        <a href="/trip?id=${trip.id}" class="trip-card">
            <div class="trip-card-header">
                <div class="trip-card-title">${escapeHtml(trip.name)}</div>
            </div>
            <div class="trip-card-dates">
                📅 ${trip.start_date} ~ ${trip.end_date}
            </div>
            ${trip.description ? `<div class="trip-card-desc">${escapeHtml(trip.description)}</div>` : ''}
            <div class="trip-card-meta">
                <span>建立於 ${new Date(trip.created_at).toLocaleDateString()}</span>
            </div>
        </a>
    `).join('');
}

function openNewTripModal() {
    document.getElementById('new-trip-modal').classList.add('show');
}

function closeNewTripModal() {
    document.getElementById('new-trip-modal').classList.remove('show');
    document.getElementById('new-trip-form').reset();
}

async function createTrip(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById('trip-name').value,
        start_date: document.getElementById('trip-start').value,
        end_date: document.getElementById('trip-end').value,
        description: document.getElementById('trip-desc').value
    };

    console.log('📝 建立旅遊:', data);

    try {
        const response = await fetch('/api/trips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin', // 確保發送 cookies
            body: JSON.stringify(data)
        });

        console.log('API 回應狀態:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('建立成功:', result);
            closeNewTripModal();
            loadTrips();
            alert('旅遊建立成功！');
        } else {
            const error = await response.json();
            console.error('建立失敗:', error);
            alert('建立失敗: ' + (error.error || '請再試一次'));
        }
    } catch (error) {
        console.error('網路錯誤:', error);
        alert('網路錯誤，請檢查網路連線後再試一次');
    }
}

async function logout() {
    if (confirm('確定要登出嗎？')) {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin' // 確保發送 cookies
            });

            if (response.ok) {
                window.location.href = '/login';
            } else {
                alert('登出失敗，請再試一次');
            }
        } catch (error) {
            console.error('登出錯誤:', error);
            alert('登出失敗，請再試一次');
        }
    }
}

// 關閉 Modal（點擊外面）
window.onclick = function(event) {
    const modal = document.getElementById('new-trip-modal');
    if (event.target === modal) {
        closeNewTripModal();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}