// TickTick Chrome Extension Popup App

// 当前视图状态
let currentView = 'inbox';
let currentListId = null;

// DOM 元素
const elements = {
  // 快速添加
  quickAddInput: document.getElementById('quickAddInput'),
  quickAddBtn: document.getElementById('quickAddBtn'),

  // 智能列表
  smartLists: document.querySelectorAll('.smart-lists .list-item'),
  inboxCount: document.getElementById('inboxCount'),
  todayCount: document.getElementById('todayCount'),
  tomorrowCount: document.getElementById('tomorrowCount'),
  next7daysCount: document.getElementById('next7daysCount'),

  // 自定义列表
  addListBtn: document.getElementById('addListBtn'),
  listsContainer: document.getElementById('listsContainer'),

  // 任务区域
  tasksTitle: document.getElementById('tasksTitle'),
  tasksList: document.getElementById('tasksList'),
  sortBtn: document.getElementById('sortBtn'),
  moreBtn: document.getElementById('moreBtn'),

  // 已完成任务
  completedSection: document.getElementById('completedSection'),
  completedHeader: document.getElementById('completedHeader'),
  completedTasks: document.getElementById('completedTasks'),
  completedCountLabel: document.getElementById('completedCountLabel'),

  // 底部操作
  openFullBtn: document.getElementById('openFullBtn'),
  settingsBtn: document.getElementById('settingsBtn')
};

// 初始化应用
async function init() {
  await loadAllData();
  setupEventListeners();
}

// 加载所有数据
async function loadAllData() {
  await updateAllCounts();
  await renderCurrentView();
  await renderCustomLists();
}

// 设置事件监听器
function setupEventListeners() {
  // 快速添加任务
  elements.quickAddBtn.addEventListener('click', handleQuickAdd);
  elements.quickAddInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuickAdd();
  });

  // 智能列表切换
  elements.smartLists.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // 添加自定义列表
  elements.addListBtn.addEventListener('click', handleAddList);

  // 已完成任务折叠
  elements.completedHeader.addEventListener('click', toggleCompletedSection);

  // 底部操作
  elements.openFullBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'index.html' });
  });

  elements.settingsBtn.addEventListener('click', () => {
    // TODO: 打开设置页面
    alert('设置功能开发中...');
  });
}

// 快速添加任务
async function handleQuickAdd() {
  const text = elements.quickAddInput.value.trim();
  if (!text) return;

  const newTodo = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate: null,
    priority: 'none',
    tags: currentListId ? [currentListId] : [],
    notes: '',
    subtasks: [],
    repeat: null,
    reminders: [],
    pomodoroCount: 0
  };

  const todos = await Storage.getTodos();
  todos.push(newTodo);
  await Storage.saveTodos(todos);

  elements.quickAddInput.value = '';
  await loadAllData();
}

// 切换视图
async function switchView(view, listId = null) {
  currentView = view;
  currentListId = listId;

  // 更新激活状态
  elements.smartLists.forEach(item => {
    item.classList.toggle('active', item.dataset.view === view && !listId);
  });

  // 更新自定义列表激活状态
  document.querySelectorAll('.lists-container .list-item').forEach(item => {
    item.classList.toggle('active', item.dataset.listId === listId);
  });

  // 更新标题
  const titles = {
    'inbox': '收集箱',
    'today': '今天',
    'tomorrow': '明天',
    'next7days': '接下来7天'
  };

  if (listId) {
    const tags = await Storage.getTags();
    const tag = tags.find(t => t.id === listId);
    elements.tasksTitle.textContent = tag ? tag.name : '列表';
  } else {
    elements.tasksTitle.textContent = titles[view] || '任务';
  }

  await renderCurrentView();
}

// 渲染当前视图
async function renderCurrentView() {
  const todos = await Storage.getTodos();
  let filteredTodos = [];

  if (currentListId) {
    // 自定义列表视图
    filteredTodos = todos.filter(todo =>
      !todo.completed && todo.tags && todo.tags.includes(currentListId)
    );
  } else {
    // 智能列表视图
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const next7days = new Date(today);
    next7days.setDate(next7days.getDate() + 7);

    filteredTodos = todos.filter(todo => {
      if (todo.completed) return false;

      if (currentView === 'inbox') {
        return !todo.dueDate;
      } else if (currentView === 'today') {
        if (!todo.dueDate) return false;
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      } else if (currentView === 'tomorrow') {
        if (!todo.dueDate) return false;
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
      } else if (currentView === 'next7days') {
        if (!todo.dueDate) return false;
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate < next7days;
      }
      return false;
    });
  }

  // 渲染未完成任务
  if (filteredTodos.length === 0) {
    elements.tasksList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">暂无任务</div>
      </div>
    `;
  } else {
    elements.tasksList.innerHTML = filteredTodos.map(todo => createTaskHTML(todo)).join('');
    attachTaskEventListeners();
  }

  // 渲染已完成任务
  await renderCompletedTasks();
}

// 创建任务HTML
function createTaskHTML(todo) {
  const priorityClass = todo.priority && todo.priority !== 'none' ? `task-priority ${todo.priority}` : '';
  const priorityHTML = priorityClass ? `<div class="${priorityClass}"></div>` : '';

  const dueDateHTML = todo.dueDate ? `
    <span class="task-meta-item">
      📅 ${formatDate(todo.dueDate)}
    </span>
  ` : '';

  const tagsHTML = todo.tags && todo.tags.length > 0 ? `
    <span class="task-meta-item">
      🏷️ ${todo.tags.length}
    </span>
  ` : '';

  const metaHTML = (dueDateHTML || tagsHTML || priorityHTML) ? `
    <div class="task-meta">
      ${priorityHTML}
      ${dueDateHTML}
      ${tagsHTML}
    </div>
  ` : '';

  return `
    <div class="task-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <div class="task-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}"></div>
      <div class="task-content">
        <div class="task-title">${escapeHtml(todo.text)}</div>
        ${metaHTML}
      </div>
    </div>
  `;
}

// 渲染已完成任务
async function renderCompletedTasks() {
  const todos = await Storage.getTodos();
  const completedTodos = todos.filter(todo => todo.completed);

  if (completedTodos.length === 0) {
    elements.completedSection.classList.add('hidden');
  } else {
    elements.completedSection.classList.remove('hidden');
    elements.completedCountLabel.textContent = completedTodos.length;

    elements.completedTasks.innerHTML = completedTodos
      .slice(0, 10) // 只显示最近10个已完成任务
      .map(todo => createTaskHTML(todo))
      .join('');

    // 重新附加事件监听器
    attachTaskEventListeners();
  }
}

// 附加任务事件监听器
function attachTaskEventListeners() {
  // 复选框点击
  document.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      const todoId = checkbox.dataset.id;
      await toggleTodoCompletion(todoId);
    });
  });

  // 任务项点击（打开详情）
  document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('task-checkbox')) {
        // 在新标签页打开完整页面并聚焦到该任务
        chrome.tabs.create({ url: `index.html?task=${item.dataset.id}` });
      }
    });
  });
}

// 切换任务完成状态
async function toggleTodoCompletion(todoId) {
  const todos = await Storage.getTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) return;

  if (todo.repeat && !todo.completed) {
    // 处理重复任务
    await Storage.completeRepeatTodo(todoId);
  } else {
    todo.completed = !todo.completed;
    await Storage.saveTodos(todos);
  }

  await loadAllData();
}

// 更新所有计数
async function updateAllCounts() {
  const todos = await Storage.getTodos();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const next7days = new Date(today);
  next7days.setDate(next7days.getDate() + 7);

  // 收集箱：无截止日期的未完成任务
  const inboxCount = todos.filter(todo => !todo.completed && !todo.dueDate).length;

  // 今天：截止日期是今天的未完成任务
  const todayCount = todos.filter(todo => {
    if (todo.completed || !todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).length;

  // 明天：截止日期是明天的未完成任务
  const tomorrowCount = todos.filter(todo => {
    if (todo.completed || !todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === tomorrow.getTime();
  }).length;

  // 接下来7天：截止日期在未来7天内的未完成任务
  const next7daysCount = todos.filter(todo => {
    if (todo.completed || !todo.dueDate) return false;
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= today && dueDate < next7days;
  }).length;

  elements.inboxCount.textContent = inboxCount;
  elements.todayCount.textContent = todayCount;
  elements.tomorrowCount.textContent = tomorrowCount;
  elements.next7daysCount.textContent = next7daysCount;
}

// 渲染自定义列表
async function renderCustomLists() {
  const tags = await Storage.getTags();

  if (tags.length === 0) {
    elements.listsContainer.innerHTML = '';
    return;
  }

  const todos = await Storage.getTodos();

  elements.listsContainer.innerHTML = tags.map(tag => {
    const count = todos.filter(todo =>
      !todo.completed && todo.tags && todo.tags.includes(tag.id)
    ).length;

    return `
      <div class="list-item" data-list-id="${tag.id}">
        <span class="list-icon">${tag.color || '📁'}</span>
        <span class="list-name">${escapeHtml(tag.name)}</span>
        <span class="list-count">${count}</span>
      </div>
    `;
  }).join('');

  // 添加事件监听器
  elements.listsContainer.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const listId = item.dataset.listId;
      switchView('list', listId);
    });
  });
}

// 添加自定义列表
async function handleAddList() {
  const name = prompt('输入列表名称:');
  if (!name || !name.trim()) return;

  const newTag = {
    id: Date.now().toString(),
    name: name.trim(),
    color: '📁'
  };

  const tags = await Storage.getTags();
  tags.push(newTag);
  await Storage.saveTags(tags);

  await renderCustomLists();
}

// 切换已完成任务折叠状态
function toggleCompletedSection() {
  const toggle = elements.completedHeader.querySelector('.completed-toggle');
  const tasks = elements.completedTasks;

  tasks.classList.toggle('hidden');
  toggle.classList.toggle('expanded');
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return '今天';
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return '明天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化应用
init();
