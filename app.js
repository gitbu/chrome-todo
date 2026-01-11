// Todo Manager 主应用逻辑

// 应用状态
const App = {
  currentView: 'home',
  currentTagId: null,
  selectedTodoId: null,
  searchQuery: '',
  todos: [],
  tags: []
};

// DOM 元素
const DOM = {
  // 导航
  navItems: document.querySelectorAll('.nav-item'),
  tagsList: document.getElementById('tagsList'),
  addTagBtn: document.getElementById('addTagBtn'),

  // 计数
  homeCount: document.getElementById('homeCount'),
  todayCount: document.getElementById('todayCount'),

  // 头部
  viewTitle: document.getElementById('viewTitle'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),

  // 统计面板
  statsPanel: document.getElementById('statsPanel'),
  totalTasks: document.getElementById('totalTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  completedTasks: document.getElementById('completedTasks'),
  todayTasks: document.getElementById('todayTasks'),

  // 添加待办
  newTodoInput: document.getElementById('newTodoInput'),
  addTodoBtn: document.getElementById('addTodoBtn'),

  // 待办列表
  todosContainer: document.getElementById('todosContainer'),

  // 详情面板
  detailPanel: document.getElementById('detailPanel'),
  detailForm: document.getElementById('detailForm'),
  detailTitleInput: document.getElementById('detailTitleInput'),
  detailCompletedCheckbox: document.getElementById('detailCompletedCheckbox'),
  detailTagSelect: document.getElementById('detailTagSelect'),
  detailDateInput: document.getElementById('detailDateInput'),
  detailNotesInput: document.getElementById('detailNotesInput'),
  closeDetailBtn: document.getElementById('closeDetailBtn'),
  deleteTodoBtn: document.getElementById('deleteTodoBtn'),

  // 子任务
  subtasksList: document.getElementById('subtasksList'),
  newSubtaskInput: document.getElementById('newSubtaskInput'),
  addSubtaskBtn: document.getElementById('addSubtaskBtn')
};

// ============= 初始化 =============

async function init() {
  await loadData();
  setupEventListeners();
  await updateUI();
}

async function loadData() {
  App.todos = await Storage.getTodos();
  App.tags = await Storage.getTags();
}

function setupEventListeners() {
  // 导航切换
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view) {
        switchView(view);
      }
    });
  });

  // 添加标签
  DOM.addTagBtn.addEventListener('click', addTag);

  // 添加待办
  DOM.addTodoBtn.addEventListener('click', addTodo);
  DOM.newTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  // 详情面板
  DOM.closeDetailBtn.addEventListener('click', closeDetailPanel);
  DOM.deleteTodoBtn.addEventListener('click', deleteTodo);

  // 详情输入变化 - 自动保存
  DOM.detailTitleInput.addEventListener('blur', updateSelectedTodo);
  DOM.detailCompletedCheckbox.addEventListener('change', updateSelectedTodo);
  DOM.detailTagSelect.addEventListener('change', updateSelectedTodo);
  DOM.detailDateInput.addEventListener('change', updateSelectedTodo);
  DOM.detailNotesInput.addEventListener('blur', updateSelectedTodo);

  // 搜索功能
  DOM.searchInput.addEventListener('input', handleSearch);
  DOM.clearSearchBtn.addEventListener('click', clearSearch);

  // 子任务
  DOM.addSubtaskBtn.addEventListener('click', addSubtask);
  DOM.newSubtaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSubtask();
  });
}

// ============= 视图切换 =============

async function switchView(view, tagId = null) {
  App.currentView = view;
  App.currentTagId = tagId;

  // 更新导航激活状态
  document.querySelectorAll('.nav-item, .tag-item').forEach(item => {
    item.classList.remove('active');
  });

  if (tagId) {
    document.querySelector(`.tag-item[data-id="${tagId}"]`)?.classList.add('active');
  } else {
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  }

  // 更新标题
  let title = '首页';
  if (view === 'today') {
    title = '今天';
  } else if (view === 'tag' && tagId) {
    const tag = App.tags.find(t => t.id === tagId);
    title = tag ? tag.name : '标签';
  }
  DOM.viewTitle.textContent = title;

  // 显示/隐藏统计面板
  if (view === 'home') {
    DOM.statsPanel.classList.remove('hidden');
  } else {
    DOM.statsPanel.classList.add('hidden');
  }

  await renderTodos();
}

// ============= UI 渲染 =============

async function updateUI() {
  await updateStats();
  await renderTags();
  await renderTodos();
  updateTagSelect();
}

async function updateStats() {
  const stats = await Storage.getStats();

  DOM.homeCount.textContent = stats.pending;
  DOM.todayCount.textContent = stats.today;

  DOM.totalTasks.textContent = stats.total;
  DOM.pendingTasks.textContent = stats.pending;
  DOM.completedTasks.textContent = stats.completed;
  DOM.todayTasks.textContent = stats.today;
}

async function renderTags() {
  App.tags = await Storage.getTags();
  const tagStats = await Storage.getTagStats();

  if (App.tags.length === 0) {
    DOM.tagsList.innerHTML = `
      <div style="padding: 8px 20px; font-size: 13px; color: var(--text-secondary);">
        暂无标签
      </div>
    `;
    return;
  }

  DOM.tagsList.innerHTML = App.tags.map(tag => {
    const stats = tagStats[tag.id] || { total: 0 };
    return `
      <div class="tag-item" data-id="${tag.id}">
        <span class="tag-color" style="background: ${tag.color};"></span>
        <span class="tag-name">${escapeHtml(tag.name)}</span>
        <span class="nav-count">${stats.total}</span>
        <div class="tag-actions">
          <button class="icon-btn-tiny delete-tag" data-id="${tag.id}">×</button>
        </div>
      </div>
    `;
  }).join('');

  // 绑定标签点击事件
  DOM.tagsList.querySelectorAll('.tag-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-tag')) {
        switchView('tag', item.dataset.id);
      }
    });
  });

  // 绑定删除标签事件
  DOM.tagsList.querySelectorAll('.delete-tag').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tagId = btn.dataset.id;
      if (confirm('确定要删除这个标签吗？')) {
        await Storage.deleteTag(tagId);
        if (App.currentTagId === tagId) {
          switchView('home');
        }
        await updateUI();
      }
    });
  });
}

async function renderTodos() {
  let todos = [];

  // 根据当前视图获取待办事项
  if (App.currentView === 'home') {
    todos = await Storage.getTodos();
  } else if (App.currentView === 'today') {
    todos = await Storage.getTodayTodos();
  } else if (App.currentView === 'tag' && App.currentTagId) {
    todos = await Storage.getTodosByTag(App.currentTagId);
  }

  // 应用搜索过滤
  if (App.searchQuery) {
    const query = App.searchQuery.toLowerCase();
    todos = todos.filter(todo => {
      const titleMatch = todo.title.toLowerCase().includes(query);
      const notesMatch = todo.notes && todo.notes.toLowerCase().includes(query);
      return titleMatch || notesMatch;
    });
  }

  App.todos = todos;

  if (todos.length === 0) {
    const emptyText = App.searchQuery ? '没有找到匹配的待办事项' : '还没有待办事项';
    DOM.todosContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">${emptyText}</div>
      </div>
    `;
    return;
  }

  // 排序：未完成的在前，已完成的在后
  todos.sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return a.completed ? 1 : -1;
  });

  DOM.todosContainer.innerHTML = todos.map(todo => {
    const tag = todo.tagId ? App.tags.find(t => t.id === todo.tagId) : null;
    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
    const isActive = App.selectedTodoId === todo.id;

    // 计算子任务进度
    let subtaskProgress = '';
    if (todo.subtasks && todo.subtasks.length > 0) {
      const completedCount = todo.subtasks.filter(s => s.completed).length;
      const totalCount = todo.subtasks.length;
      subtaskProgress = `
        <span class="subtask-progress">
          ☑️ ${completedCount}/${totalCount}
        </span>
      `;
    }

    return `
      <div class="todo-item ${todo.completed ? 'completed' : ''} ${isActive ? 'active' : ''}" data-id="${todo.id}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <div class="todo-content">
          <div class="todo-title">${escapeHtml(todo.title)}</div>
          <div class="todo-meta">
            ${tag ? `
              <span class="todo-tag">
                <span class="tag-color" style="background: ${tag.color}; width: 8px; height: 8px; border-radius: 50%;"></span>
                ${escapeHtml(tag.name)}
              </span>
            ` : ''}
            ${todo.dueDate ? `
              <span class="todo-date ${isOverdue ? 'overdue' : ''}">
                📅 ${formatDate(todo.dueDate)}
              </span>
            ` : ''}
            ${subtaskProgress}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 绑定待办事项事件
  DOM.todosContainer.querySelectorAll('.todo-item').forEach(item => {
    const todoId = item.dataset.id;

    // 复选框切换
    const checkbox = item.querySelector('.todo-checkbox');
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await Storage.toggleTodo(todoId);
      await updateUI();
      // 如果当前正在编辑这个待办，更新详情面板
      if (App.selectedTodoId === todoId) {
        const todo = await Storage.getTodo(todoId);
        DOM.detailCompletedCheckbox.checked = todo.completed;
      }
    });

    // 点击待办打开详情
    item.addEventListener('click', () => {
      openDetailPanel(todoId);
    });
  });
}

// ============= 待办事项操作 =============

async function addTodo() {
  const title = DOM.newTodoInput.value.trim();
  if (!title) return;

  const options = {};

  // 如果在标签视图下，自动设置标签
  if (App.currentView === 'tag' && App.currentTagId) {
    options.tagId = App.currentTagId;
  }

  // 如果在今天视图下，自动设置日期为今天
  if (App.currentView === 'today') {
    options.dueDate = new Date().toISOString().split('T')[0];
  }

  await Storage.addTodo(title, options);
  DOM.newTodoInput.value = '';
  await updateUI();
}

async function updateSelectedTodo() {
  if (!App.selectedTodoId) return;

  const updates = {
    title: DOM.detailTitleInput.value.trim(),
    completed: DOM.detailCompletedCheckbox.checked,
    tagId: DOM.detailTagSelect.value || null,
    dueDate: DOM.detailDateInput.value || null,
    notes: DOM.detailNotesInput.value.trim()
  };

  await Storage.updateTodo(App.selectedTodoId, updates);
  await updateUI();
}

async function deleteTodo() {
  if (!App.selectedTodoId) return;

  if (confirm('确定要删除这个待办事项吗？')) {
    await Storage.deleteTodo(App.selectedTodoId);
    closeDetailPanel();
    await updateUI();
  }
}

// ============= 详情面板 =============

async function openDetailPanel(todoId) {
  App.selectedTodoId = todoId;
  const todo = await Storage.getTodo(todoId);

  if (!todo) return;

  // 更新激活状态
  document.querySelectorAll('.todo-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === todoId);
  });

  // 填充表单
  DOM.detailTitleInput.value = todo.title;
  DOM.detailCompletedCheckbox.checked = todo.completed;
  DOM.detailTagSelect.value = todo.tagId || '';
  DOM.detailDateInput.value = todo.dueDate || '';
  DOM.detailNotesInput.value = todo.notes || '';

  // 渲染子任务
  renderSubtasks(todo);

  // 显示详情面板
  document.querySelector('.detail-empty').classList.add('hidden');
  DOM.detailForm.classList.remove('hidden');
}

function closeDetailPanel() {
  App.selectedTodoId = null;

  // 清除激活状态
  document.querySelectorAll('.todo-item').forEach(item => {
    item.classList.remove('active');
  });

  // 隐藏详情面板
  DOM.detailForm.classList.add('hidden');
  document.querySelector('.detail-empty').classList.remove('hidden');
}

// ============= 标签操作 =============

async function addTag() {
  const name = prompt('请输入标签名称:');
  if (!name || !name.trim()) return;

  // 随机颜色
  const colors = ['#4A90E2', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await Storage.addTag(name.trim(), color);
  await updateUI();
}

function updateTagSelect() {
  const currentValue = DOM.detailTagSelect.value;

  DOM.detailTagSelect.innerHTML = '<option value="">无标签</option>' +
    App.tags.map(tag => `
      <option value="${tag.id}">${escapeHtml(tag.name)}</option>
    `).join('');

  DOM.detailTagSelect.value = currentValue;
}

// ============= 工具函数 =============

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = date.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return '今天';
  } else if (dateStr === tomorrowStr) {
    return '明天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

// ============= 搜索功能 =============

function handleSearch(e) {
  const query = e.target.value.trim();
  App.searchQuery = query;

  // 显示或隐藏清除按钮
  if (query) {
    DOM.clearSearchBtn.style.display = 'block';
  } else {
    DOM.clearSearchBtn.style.display = 'none';
  }

  // 重新渲染待办列表
  renderTodos();
}

function clearSearch() {
  App.searchQuery = '';
  DOM.searchInput.value = '';
  DOM.clearSearchBtn.style.display = 'none';
  renderTodos();
}

// ============= 子任务管理 =============

function renderSubtasks(todo) {
  if (!todo.subtasks || todo.subtasks.length === 0) {
    DOM.subtasksList.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary); padding: 8px;">暂无子任务</div>';
    return;
  }

  DOM.subtasksList.innerHTML = todo.subtasks.map(subtask => `
    <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-id="${subtask.id}">
      <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
      <span class="subtask-text">${escapeHtml(subtask.title)}</span>
      <div class="subtask-actions">
        <button class="icon-btn-tiny edit-subtask" title="编辑">✏️</button>
        <button class="icon-btn-tiny delete-subtask" title="删除">🗑️</button>
      </div>
    </div>
  `).join('');

  // 绑定事件
  DOM.subtasksList.querySelectorAll('.subtask-item').forEach(item => {
    const subtaskId = item.dataset.id;

    // 切换完成状态
    const checkbox = item.querySelector('.subtask-checkbox');
    checkbox.addEventListener('change', async () => {
      await Storage.toggleSubtask(App.selectedTodoId, subtaskId);
      const todo = await Storage.getTodo(App.selectedTodoId);
      renderSubtasks(todo);
      await updateUI();
    });

    // 编辑子任务
    const editBtn = item.querySelector('.edit-subtask');
    editBtn.addEventListener('click', async () => {
      const todo = await Storage.getTodo(App.selectedTodoId);
      const subtask = todo.subtasks.find(s => s.id === subtaskId);
      const newTitle = prompt('编辑子任务:', subtask.title);
      if (newTitle && newTitle.trim()) {
        await Storage.updateSubtask(App.selectedTodoId, subtaskId, { title: newTitle.trim() });
        const updatedTodo = await Storage.getTodo(App.selectedTodoId);
        renderSubtasks(updatedTodo);
      }
    });

    // 删除子任务
    const deleteBtn = item.querySelector('.delete-subtask');
    deleteBtn.addEventListener('click', async () => {
      if (confirm('确定要删除这个子任务吗？')) {
        await Storage.deleteSubtask(App.selectedTodoId, subtaskId);
        const todo = await Storage.getTodo(App.selectedTodoId);
        renderSubtasks(todo);
        await updateUI();
      }
    });
  });
}

async function addSubtask() {
  if (!App.selectedTodoId) return;

  const title = DOM.newSubtaskInput.value.trim();
  if (!title) return;

  await Storage.addSubtask(App.selectedTodoId, title);
  DOM.newSubtaskInput.value = '';

  const todo = await Storage.getTodo(App.selectedTodoId);
  renderSubtasks(todo);
  await updateUI();
}

// ============= 启动应用 =============

document.addEventListener('DOMContentLoaded', init);
