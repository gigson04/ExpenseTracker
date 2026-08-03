let transactions = JSON.parse(localStorage.getItem('bf_transactions')) || [];
let accounts = JSON.parse(localStorage.getItem('bf_accounts')) || [];
let goals = JSON.parse(localStorage.getItem('bf_goals')) || [];

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatLog = document.getElementById('chatLog');
const accountForm = document.getElementById('accountForm');
const accountsList = document.getElementById('accountsList');
const goalForm = document.getElementById('goalForm');
const goalsList = document.getElementById('goalsList');
const tableBody = document.getElementById('transactionTable');
const searchInput = document.getElementById('searchInput');
const darkModeToggle = document.getElementById('darkModeToggle');

let categoryChart, monthlyChart;

function saveAll() {
  localStorage.setItem('bf_transactions', JSON.stringify(transactions));
  localStorage.setItem('bf_accounts', JSON.stringify(accounts));
  localStorage.setItem('bf_goals', JSON.stringify(goals));
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- CHAT PARSER ---------- */
// Examples it understands:
// "Spent 250 on food from GCash"
// "Received 5000 salary in BPI"
// "Paid 100 for transport using Cash"
function parseMessage(text) {
  const lower = text.toLowerCase();
  const amountMatch = lower.match(/(\d+(\.\d+)?)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1]);

  const isIncome = /received|got|salary|income|added/.test(lower);
  const type = isIncome ? 'income' : 'expense';

  const categories = ['food', 'bills', 'transport', 'salary', 'shopping', 'entertainment', 'other'];
  let category = categories.find(c => lower.includes(c)) || (isIncome ? 'Salary' : 'Other');
  category = category.charAt(0).toUpperCase() + category.slice(1);

  let account = accounts.find(a => lower.includes(a.name.toLowerCase()));
  const accountName = account ? account.name : (accounts[0] ? accounts[0].name : 'Cash');

  return {
    id: Date.now(),
    description: text,
    amount, category, type,
    account: accountName,
    date: new Date().toISOString().split('T')[0]
  };
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addChatBubble(text, 'user');

  const parsed = parseMessage(text);
  if (!parsed) {
    addChatBubble("Sorry, I couldn't find an amount in that. Try: 'Spent 250 on food from GCash'", 'bot');
    chatInput.value = '';
    return;
  }

  transactions.push(parsed);
  updateAccountBalance(parsed.account, parsed.type === 'income' ? parsed.amount : -parsed.amount);
  saveAll();
  refreshAll();

  addChatBubble(`Logged ${parsed.type}: ₱${parsed.amount.toLocaleString()} (${parsed.category}) — ${parsed.account}`, 'bot');
  chatInput.value = '';
});

function addChatBubble(text, sender) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/* ---------- ACCOUNTS ---------- */
accountForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('accountName').value.trim();
  const balance = parseFloat(document.getElementById('accountBalance').value);
  accounts.push({ id: Date.now(), name, balance });
  saveAll();
  renderAccounts();
  accountForm.reset();
  showToast('Account added!');
});

function updateAccountBalance(name, delta) {
  const acc = accounts.find(a => a.name === name);
  if (acc) acc.balance += delta;
  else if (accounts.length) accounts[0].balance += delta;
}

function renderAccounts() {
  accountsList.innerHTML = '';
  accounts.forEach(a => {
    const div = document.createElement('div');
    div.className = 'account-item';
    div.innerHTML = `<h4>${a.name}</h4><p>₱${a.balance.toLocaleString()}</p>`;
    accountsList.appendChild(div);
  });
}

/* ---------- GOALS ---------- */
goalForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  goals.push({ id: Date.now(), name, target, saved: 0 });
  saveAll();
  renderGoals();
  goalForm.reset();
  showToast('Goal added!');
});

function renderGoals() {
  goalsList.innerHTML = '';
  goals.forEach(g => {
    const pct = Math.min(100, (g.saved / g.target) * 100);
    const div = document.createElement('div');
    div.className = 'goal-item';
    div.innerHTML = `
      <h4>${g.name}</h4>
      <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
      <small>₱${g.saved.toLocaleString()} / ₱${g.target.toLocaleString()}</small>
    `;
    goalsList.appendChild(div);
  });
}

/* ---------- TRANSACTIONS / TABLE ---------- */
function calculateBalance() {
  const income = transactions.filter(t => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const balance = income - expense;

  document.getElementById('incomeVal').textContent = '₱' + income.toLocaleString();
  document.getElementById('expenseVal').textContent = '₱' + expense.toLocaleString();
  document.getElementById('balanceVal').textContent = '₱' + balance.toLocaleString();
  document.getElementById('savingsVal').textContent = '₱' + balance.toLocaleString();
}

function renderTable(filtered = transactions) {
  tableBody.innerHTML = '';
  filtered.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td>${t.account}</td>
      <td>₱${Number(t.amount).toLocaleString()}</td>
      <td>${t.date}</td>
      <td><span class="delete-btn" onclick="deleteTransaction(${t.id})">🗑️</span></td>
    `;
    tableBody.appendChild(row);
  });
}

function deleteTransaction(id) {
  const t = transactions.find(t => t.id === id);
  if (t) updateAccountBalance(t.account, t.type === 'income' ? -t.amount : t.amount);
  transactions = transactions.filter(t => t.id !== id);
  saveAll();
  refreshAll();
  showToast('Transaction deleted!');
}

searchInput.addEventListener('input', () => {
  const search = searchInput.value.toLowerCase();
  renderTable(transactions.filter(t => t.description.toLowerCase().includes(search)));
});

/* ---------- CHARTS ---------- */
function renderCharts() {
  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
  });

  const months = {};
  transactions.forEach(t => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short' });
    months[month] = (months[month] || 0) + Number(t.amount);
  });

  if (categoryChart) categoryChart.destroy();
  if (monthlyChart) monthlyChart.destroy();

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{ data: Object.values(categories), backgroundColor: ['#5f4bd6','#059669','#dc2626','#d97706','#2563eb','#db2777','#64748b'] }]
    },
    options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Expenses by Category' } } }
  });

  monthlyChart = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(months),
      datasets: [{ label: 'Spending', data: Object.values(months), backgroundColor: '#5f4bd6' }]
    },
    options: { maintainAspectRatio: false, plugins: { title: { display: true, text: 'Monthly Spending' } } }
  });
}

/* ---------- DARK MODE ---------- */
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('bf_darkMode', document.body.classList.contains('dark'));
  darkModeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});
if (localStorage.getItem('bf_darkMode') === 'true') {
  document.body.classList.add('dark');
  darkModeToggle.textContent = '☀️';
}

/* ---------- INIT ---------- */
function refreshAll() {
  renderTable();
  calculateBalance();
  renderCharts();
  renderAccounts();
  renderGoals();
}

if (accounts.length === 0) {
  accounts.push({ id: Date.now(), name: 'Cash', balance: 0 });
  saveAll();
}

refreshAll();
