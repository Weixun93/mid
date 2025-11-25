/* ==================== 旅遊詳情 JavaScript ==================== */

let currentTripId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 從 URL 獲取 trip_id
    const urlParams = new URLSearchParams(window.location.search);
    currentTripId = urlParams.get('id');

    if (!currentTripId) {
        alert('無效的旅遊 ID');
        window.location.href = '/';
        return;
    }

    loadTripDetails();
    loadDestinations();
    loadExpenses();

    // 設置表單事件監聽器
    setupFormListeners();
});

function setupFormListeners() {
    // 景點表單
    document.getElementById('destination-form').addEventListener('submit', handleDestinationSubmit);

    // 費用表單
    document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

    // 分享表單
    document.getElementById('share-form').addEventListener('submit', handleShareSubmit);
}

async function loadTripDetails() {
    try {
        const response = await fetch(`/api/trips/${currentTripId}`);
        if (!response.ok) {
            if (response.status === 404) {
                alert('找不到該旅遊');
                window.location.href = '/';
                return;
            }
            throw new Error('載入旅遊詳情失敗');
        }

        const trip = await response.json();
        renderTripHeader(trip);
    } catch (error) {
        console.error('載入旅遊詳情錯誤:', error);
        alert('載入旅遊詳情失敗');
    }
}

function renderTripHeader(trip) {
    document.getElementById('trip-title').textContent = trip.name;
    document.getElementById('trip-meta').textContent = `${trip.start_date} ~ ${trip.end_date}`;
    document.getElementById('trip-description').textContent = trip.description || '沒有描述';
}

async function loadDestinations() {
    try {
        const response = await fetch(`/api/trips/${currentTripId}/destinations`);
        if (!response.ok) {
            throw new Error('載入景點失敗');
        }

        const destinations = await response.json();
        renderDestinations(destinations);
    } catch (error) {
        console.error('載入景點錯誤:', error);
    }
}

function renderDestinations(destinations) {
    const container = document.getElementById('destinations-container');

    if (destinations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>還沒有景點</h3>
                <p>點擊上方按鈕新增第一個景點</p>
            </div>
        `;
        return;
    }

    container.innerHTML = destinations.map(destination => `
        <div class="destination-card">
            <div class="destination-header">
                <h3 class="destination-title">${escapeHtml(destination.name)}</h3>
                <button class="delete-btn" onclick="deleteDestination('${destination.id}')">刪除</button>
            </div>
            <div class="destination-meta">
                ${destination.location ? `📍 ${escapeHtml(destination.location)}` : ''}
                ${destination.visit_date ? `📅 ${destination.visit_date}` : ''}
            </div>
            ${destination.notes ? `<div class="destination-notes">${escapeHtml(destination.notes)}</div>` : ''}
        </div>
    `).join('');
}

async function loadExpenses() {
    try {
        const response = await fetch(`/api/trips/${currentTripId}/expenses`);
        if (!response.ok) {
            throw new Error('載入費用失敗');
        }

        const expenses = await response.json();
        renderExpenses(expenses);
        loadSettlement();
    } catch (error) {
        console.error('載入費用錯誤:', error);
    }
}

function renderExpenses(expenses) {
    const container = document.getElementById('expenses-container');

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>還沒有費用記錄</h3>
                <p>點擊上方按鈕記錄第一筆費用</p>
            </div>
        `;
        return;
    }

    container.innerHTML = expenses.map(expense => `
        <div class="expense-card">
            <div class="expense-header">
                <h3 class="expense-title">${escapeHtml(expense.description)}</h3>
                <button class="delete-btn" onclick="deleteExpense('${expense.id}')">刪除</button>
            </div>
            <div class="expense-meta">
                💰 $${expense.amount} • 👤 ${escapeHtml(expense.payer)}
            </div>
            <div class="expense-details">
                分帳對象：${expense.split_with.join(', ')}
            </div>
        </div>
    `).join('');
}

async function loadSettlement() {
    try {
        const response = await fetch(`/api/trips/${currentTripId}/settlement`);
        if (!response.ok) {
            throw new Error('載入結帳資訊失敗');
        }

        const balances = await response.json();
        renderSettlement(balances);
    } catch (error) {
        console.error('載入結帳錯誤:', error);
    }
}

function renderSettlement(balances) {
    const section = document.getElementById('settlement-section');
    const list = document.getElementById('settlement-list');

    if (!balances || Object.keys(balances).length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const balanceItems = Object.entries(balances).map(([person, amount]) => {
        const amountClass = amount > 0 ? 'balance-positive' : amount < 0 ? 'balance-negative' : '';
        const amountText = amount > 0 ? `+$${amount.toFixed(2)}` : amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : '$0.00';

        return `
            <div class="balance-item">
                <span class="balance-name">${escapeHtml(person)}</span>
                <span class="balance-amount ${amountClass}">${amountText}</span>
            </div>
        `;
    }).join('');

    list.innerHTML = `
        ${balanceItems}
        <div class="share-section">
            <button class="share-btn" onclick="openShareModal()">分享分帳給朋友</button>
        </div>
    `;
}

// 景點相關函數
function openDestinationModal() {
    document.getElementById('destination-modal').classList.add('show');
}

function closeDestinationModal() {
    document.getElementById('destination-modal').classList.remove('show');
    document.getElementById('destination-form').reset();
}

async function handleDestinationSubmit(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById('destination-name').value,
        location: document.getElementById('destination-location').value,
        visit_date: document.getElementById('destination-date').value,
        notes: document.getElementById('destination-notes').value
    };

    try {
        const response = await fetch(`/api/trips/${currentTripId}/destinations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeDestinationModal();
            loadDestinations();
            alert('景點新增成功！');
        } else {
            alert('新增景點失敗，請再試一次');
        }
    } catch (error) {
        console.error('新增景點錯誤:', error);
        alert('新增景點失敗，請再試一次');
    }
}

async function deleteDestination(destinationId) {
    if (!confirm('確定要刪除這個景點嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/trips/${currentTripId}/destinations/${destinationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadDestinations();
            alert('景點刪除成功！');
        } else {
            alert('刪除景點失敗，請再試一次');
        }
    } catch (error) {
        console.error('刪除景點錯誤:', error);
        alert('刪除景點失敗，請再試一次');
    }
}

// 費用相關函數
function openExpenseModal() {
    document.getElementById('expense-modal').classList.add('show');
}

function closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('show');
    document.getElementById('expense-form').reset();
}

async function handleExpenseSubmit(event) {
    event.preventDefault();

    const splitWith = document.getElementById('expense-split').value
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    const data = {
        trip_id: currentTripId,
        description: document.getElementById('expense-description').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        payer: document.getElementById('expense-payer').value,
        split_with: splitWith
    };

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeExpenseModal();
            loadExpenses();
            alert('費用記錄成功！');
        } else {
            alert('記錄費用失敗，請再試一次');
        }
    } catch (error) {
        console.error('記錄費用錯誤:', error);
        alert('記錄費用失敗，請再試一次');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('確定要刪除這筆費用嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadExpenses();
            alert('費用刪除成功！');
        } else {
            alert('刪除費用失敗，請再試一次');
        }
    } catch (error) {
        console.error('刪除費用錯誤:', error);
        alert('刪除費用失敗，請再試一次');
    }
}

// 分享相關函數
function openShareModal() {
    document.getElementById('share-modal').classList.add('show');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.remove('show');
    document.getElementById('share-form').reset();
}

async function handleShareSubmit(event) {
    event.preventDefault();

    const username = document.getElementById('share-username').value.trim();
    const message = document.getElementById('share-message').value.trim();

    if (!username) {
        alert('請輸入朋友的使用者名稱');
        return;
    }

    try {
        const response = await fetch(`/api/trips/${currentTripId}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_username: username,
                message: message
            })
        });

        if (response.ok) {
            closeShareModal();
            alert('分帳已分享給朋友！');
        } else {
            const error = await response.json();
            alert('分享失敗：' + (error.error || '請再試一次'));
        }
    } catch (error) {
        console.error('分享錯誤:', error);
        alert('分享失敗，請再試一次');
    }
}

// 關閉 Modal（點擊外面）
window.onclick = function(event) {
    const destinationModal = document.getElementById('destination-modal');
    const expenseModal = document.getElementById('expense-modal');
    const shareModal = document.getElementById('share-modal');

    if (event.target === destinationModal) {
        closeDestinationModal();
    }
    if (event.target === expenseModal) {
        closeExpenseModal();
    }
    if (event.target === shareModal) {
        closeShareModal();
    }
}