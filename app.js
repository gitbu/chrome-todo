// Todo Manager 主应用逻辑

// 应用状态
const App = {
  currentView: 'home',
  currentListId: null,
  selectedTodoId: null,
  searchQuery: '',
  sortBy: 'manual', // manual, date, priority, title
  completedExpanded: true, // 已完成区域是否展开
  quickDate: null, // 快速添加的日期
  quickPriority: 'none', // 快速添加的优先级
  quickList: null, // 快速添加的列表
  todos: [],
  lists: [],
  // 番茄钟状态
  pomodoro: {
    timeRemaining: 25 * 60, // 秒
    isRunning: false,
    isWorkMode: true, // true=工作时间, false=休息时间
    workDuration: 25 * 60, // 25分钟
    breakDuration: 5 * 60, // 5分钟
    timerInterval: null
  }
};

// DOM 元素
const DOM = {
  // 导航
  navItems: document.querySelectorAll('.nav-item'),
  listsList: document.getElementById('tagsList'), // 元素ID保持不变，但语义改为列表
  addListBtn: document.getElementById('addTagBtn'),

  // 计数
  homeCount: document.getElementById('homeCount'),
  todayCount: document.getElementById('todayCount'),
  tomorrowCount: document.getElementById('tomorrowCount'),
  next7daysCount: document.getElementById('next7daysCount'),

  // 头部
  viewTitle: document.getElementById('viewTitle'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  sortBtn: document.getElementById('sortBtn'),
  sortMenu: document.getElementById('sortMenu'),

  // 统计面板
  statsPanel: document.getElementById('statsPanel'),
  totalTasks: document.getElementById('totalTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  completedTasks: document.getElementById('completedTasks'),
  todayTasks: document.getElementById('todayTasks'),

  // 添加待办
  newTodoInput: document.getElementById('newTodoInput'),
  quickDateBtn: document.getElementById('quickDateBtn'),
  quickPriorityBtn: document.getElementById('quickPriorityBtn'),
  quickListBtn: document.getElementById('quickListBtn'),

  // 待办列表
  todosContainer: document.getElementById('todosContainer'),
  completedSection: document.getElementById('completedSection'),
  completedHeader: document.getElementById('completedHeader'),
  completedCount: document.getElementById('completedCount'),
  completedTasks: document.getElementById('completedTasks'),

  // 详情面板
  detailPanel: document.getElementById('detailPanel'),
  detailForm: document.getElementById('detailForm'),
  detailTitleInput: document.getElementById('detailTitleInput'),
  detailCompletedCheckbox: document.getElementById('detailCompletedCheckbox'),
  detailListSelect: document.getElementById('detailListSelect'),
  detailDateInput: document.getElementById('detailDateInput'),
  dateShortcuts: document.getElementById('dateShortcuts'),
  detailNotesInput: document.getElementById('detailNotesInput'),
  closeDetailBtn: document.getElementById('closeDetailBtn'),
  deleteTodoBtn: document.getElementById('deleteTodoBtn'),

  // 高级功能
  detailRepeatSelect: document.getElementById('detailRepeatSelect'),
  remindersList: document.getElementById('remindersList'),
  addReminderBtn: document.getElementById('addReminderBtn'),
  tagsDisplay: document.getElementById('tagsDisplay'),
  newTagInput: document.getElementById('newTagInput'),

  // 番茄钟
  pomodoroCount: document.getElementById('pomodoroCount'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerMode: document.getElementById('timerMode'),
  startTimerBtn: document.getElementById('startTimerBtn'),
  pauseTimerBtn: document.getElementById('pauseTimerBtn'),
  resetTimerBtn: document.getElementById('resetTimerBtn'),

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
  App.lists = await Storage.getLists();
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

  // 添加列表
  DOM.addListBtn.addEventListener('click', addList);

  // 添加待办
  DOM.newTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  // 快速操作按钮
  DOM.quickDateBtn.addEventListener('click', toggleQuickDate);
  DOM.quickPriorityBtn.addEventListener('click', toggleQuickPriority);
  DOM.quickListBtn.addEventListener('click', toggleQuickList);

  // 详情面板
  DOM.closeDetailBtn.addEventListener('click', closeDetailPanel);
  DOM.deleteTodoBtn.addEventListener('click', deleteTodo);

  // 详情输入变化 - 自动保存
  DOM.detailTitleInput.addEventListener('blur', updateSelectedTodo);
  DOM.detailTitleInput.addEventListener('input', autoResizeTextarea);
  DOM.detailCompletedCheckbox.addEventListener('change', async () => {
    if (!App.selectedTodoId) return;

    const todo = await Storage.getTodo(App.selectedTodoId);
    const wasCompleted = todo.completed;
    const nowCompleted = DOM.detailCompletedCheckbox.checked;

    // 如果是重复任务且从未完成变为完成
    if (todo.repeat && !wasCompleted && nowCompleted) {
      await Storage.completeRepeatTodo(App.selectedTodoId);
      closeDetailPanel(); // 关闭详情面板因为创建了新任务
      await updateUI();
    } else {
      await Storage.toggleTodo(App.selectedTodoId);
      await updateUI();
    }
  });
  DOM.detailListSelect.addEventListener('change', updateSelectedTodo);
  DOM.detailDateInput.addEventListener('change', updateSelectedTodo);
  DOM.detailNotesInput.addEventListener('blur', updateSelectedTodo);

  // 高级功能 - 重复、提醒、标签
  DOM.detailRepeatSelect.addEventListener('change', updateRepeat);
  DOM.addReminderBtn.addEventListener('click', addReminder);
  DOM.newTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });

  // 优先级按钮
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const priority = btn.dataset.priority;
      setPriority(priority);
    });
  });

  // 日期快捷选项
  DOM.detailDateInput.addEventListener('click', () => {
    DOM.dateShortcuts.classList.remove('hidden');
  });

  document.querySelectorAll('.date-shortcut').forEach(shortcut => {
    shortcut.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = shortcut.dataset.shortcut;
      setDateShortcut(type);
    });
  });

  // 点击外部关闭日期快捷选项
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#detailDateItem')) {
      DOM.dateShortcuts.classList.add('hidden');
    }
  });

  // 搜索功能
  DOM.searchInput.addEventListener('input', handleSearch);
  DOM.clearSearchBtn.addEventListener('click', clearSearch);

  // 排序菜单
  DOM.sortBtn.addEventListener('click', toggleSortMenu);
  DOM.sortMenu.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const sortType = e.currentTarget.dataset.sort;
      setSortBy(sortType);
    });
  });

  // 已完成区域折叠
  DOM.completedHeader.addEventListener('click', toggleCompletedSection);

  // 点击外部关闭排序菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-dropdown')) {
      DOM.sortMenu.classList.add('hidden');
    }
  });

  // 番茄钟
  DOM.startTimerBtn.addEventListener('click', startPomodoro);
  DOM.pauseTimerBtn.addEventListener('click', pausePomodoro);
  DOM.resetTimerBtn.addEventListener('click', resetPomodoro);

  // 子任务
  DOM.addSubtaskBtn.addEventListener('click', addSubtask);
  DOM.newSubtaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSubtask();
  });
}

// ============= 视图切换 =============

async function switchView(view, listId = null) {
  App.currentView = view;
  App.currentListId = listId;

  // 更新导航激活状态
  document.querySelectorAll('.nav-item, .list-item').forEach(item => {
    item.classList.remove('active');
  });

  if (listId) {
    document.querySelector(`.list-item[data-id="${listId}"]`)?.classList.add('active');
  } else {
    document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  }

  // 更新标题
  let title = '首页';
  if (view === 'today') {
    title = '今天';
  } else if (view === 'tomorrow') {
    title = '明天';
  } else if (view === 'next7days') {
    title = '接下来7天';
  } else if (view === 'list' && listId) {
    const list = App.lists.find(l => l.id === listId);
    title = list ? list.name : '列表';
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
  await renderLists();
  await renderTodos();
  updateListSelect();
}

async function updateStats() {
  const stats = await Storage.getStats();

  DOM.homeCount.textContent = stats.pending;
  DOM.todayCount.textContent = stats.today;
  DOM.tomorrowCount.textContent = stats.tomorrow;
  DOM.next7daysCount.textContent = stats.next7days;

  DOM.totalTasks.textContent = stats.total;
  DOM.pendingTasks.textContent = stats.pending;
  DOM.completedTasks.textContent = stats.completed;
  DOM.todayTasks.textContent = stats.today;
}

async function renderLists() {
  App.lists = await Storage.getLists();
  const listStats = await Storage.getListStats();

  if (App.lists.length === 0) {
    DOM.listsList.innerHTML = `
      <div style="padding: 8px 20px; font-size: 13px; color: var(--text-secondary);">
        暂无列表
      </div>
    `;
    return;
  }

  // 构建层级结构
  const topLevelLists = App.lists.filter(list => !list.parentId);

  function renderListItem(list, level = 0) {
    const stats = listStats[list.id] || { total: 0 };
    const childLists = App.lists.filter(l => l.parentId === list.id);
    const hasChildren = childLists.length > 0;
    const indent = level * 16;

    let html = `
      <div class="list-item" data-id="${list.id}" style="padding-left: ${20 + indent}px;">
        ${hasChildren ? '<span class="list-toggle">▼</span>' : '<span class="list-toggle-empty"></span>'}
        <span class="tag-color" style="background: ${list.color};"></span>
        <span class="tag-name">${escapeHtml(list.name)}</span>
        <span class="nav-count">${stats.total}</span>
        <div class="tag-actions">
          <button class="icon-btn-tiny delete-list" data-id="${list.id}">×</button>
        </div>
      </div>
    `;

    // 递归渲染子列表
    if (hasChildren) {
      childLists.forEach(child => {
        html += renderListItem(child, level + 1);
      });
    }

    return html;
  }

  DOM.listsList.innerHTML = topLevelLists.map(list => renderListItem(list)).join('');

  // 绑定列表点击事件
  DOM.listsList.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-list') && !e.target.classList.contains('list-toggle')) {
        switchView('list', item.dataset.id);
      }
    });
  });

  // 绑定删除列表事件
  DOM.listsList.querySelectorAll('.delete-list').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const listId = btn.dataset.id;
      if (confirm('确定要删除这个列表及其子列表吗？')) {
        await Storage.deleteList(listId);
        if (App.currentListId === listId) {
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
  } else if (App.currentView === 'tomorrow') {
    todos = await Storage.getTomorrowTodos();
  } else if (App.currentView === 'next7days') {
    todos = await Storage.getNext7DaysTodos();
  } else if (App.currentView === 'list' && App.currentListId) {
    todos = await Storage.getTodosByList(App.currentListId);
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

  // 分离未完成和已完成任务
  const pending = todos.filter(todo => !todo.completed);
  const completed = todos.filter(todo => todo.completed);

  // 应用排序
  sortTodos(pending);
  sortTodos(completed);

  // 渲染未完成任务
  if (pending.length === 0 && completed.length === 0) {
    const emptyText = App.searchQuery ? '没有找到匹配的待办事项' : '还没有待办事项';
    DOM.todosContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">${emptyText}</div>
      </div>
    `;
    DOM.completedSection.style.display = 'none';
    return;
  }

  // 递归计算所有子任务
  function countSubtasks(subtasks) {
    let total = 0;
    let completed = 0;

    subtasks.forEach(subtask => {
      total++;
      if (subtask.completed) completed++;

      if (subtask.subtasks && subtask.subtasks.length > 0) {
        const childCount = countSubtasks(subtask.subtasks);
        total += childCount.total;
        completed += childCount.completed;
      }
    });

    return { total, completed };
  }

  // 渲染单个任务的HTML
  function renderTodoItem(todo) {
    const list = todo.listId ? App.lists.find(l => l.id === todo.listId) : null;
    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
    const isActive = App.selectedTodoId === todo.id;

    // 优先级标识
    const priorityMap = {
      high: { icon: '🔴', class: 'priority-high' },
      medium: { icon: '🟡', class: 'priority-medium' },
      low: { icon: '🔵', class: 'priority-low' },
      none: { icon: '', class: '' }
    };
    const priority = priorityMap[todo.priority || 'none'];

    // 计算子任务进度（递归）
    let subtaskProgress = '';
    if (todo.subtasks && todo.subtasks.length > 0) {
      const { total, completed } = countSubtasks(todo.subtasks);
      subtaskProgress = `
        <span class="subtask-progress">
          ☑️ ${completed}/${total}
        </span>
      `;
    }

    return `
      <div class="todo-item ${todo.completed ? 'completed' : ''} ${isActive ? 'active' : ''} ${priority.class}" data-id="${todo.id}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <div class="todo-content">
          <div class="todo-title">
            ${priority.icon ? `<span class="priority-icon">${priority.icon}</span>` : ''}
            ${escapeHtml(todo.title)}
          </div>
          <div class="todo-meta">
            ${list ? `
              <span class="todo-tag">
                <span class="tag-color" style="background: ${list.color}; width: 8px; height: 8px; border-radius: 50%;"></span>
                ${escapeHtml(list.name)}
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
  }

  // 渲染未完成任务
  DOM.todosContainer.innerHTML = pending.length > 0 ? pending.map(renderTodoItem).join('') :
    '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">没有未完成的任务</div>';

  // 渲染已完成任务
  if (completed.length > 0) {
    DOM.completedSection.style.display = 'block';
    DOM.completedCount.textContent = completed.length;
    DOM.completedTasks.innerHTML = completed.map(renderTodoItem).join('');

    // 更新折叠状态
    if (App.completedExpanded) {
      DOM.completedSection.classList.remove('collapsed');
    } else {
      DOM.completedSection.classList.add('collapsed');
    }
  } else {
    DOM.completedSection.style.display = 'none';
  }

  // 绑定待办事项事件
  const bindTodoEvents = (container) => {
    container.querySelectorAll('.todo-item').forEach(item => {
      const todoId = item.dataset.id;

      // 复选框切换
      const checkbox = item.querySelector('.todo-checkbox');
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();

        // 检查是否是重复任务
        const todo = await Storage.getTodo(todoId);
        if (todo && !todo.completed && todo.repeat) {
          // 重复任务完成时创建新实例
          await Storage.completeRepeatTodo(todoId);
        } else {
          await Storage.toggleTodo(todoId);
        }

        await updateUI();
        // 如果当前正在编辑这个待办，更新详情面板
        if (App.selectedTodoId === todoId) {
          const updatedTodo = await Storage.getTodo(todoId);
          if (updatedTodo) {
            DOM.detailCompletedCheckbox.checked = updatedTodo.completed;
          }
        }
      });

      // 点击待办打开详情
      item.addEventListener('click', () => {
        openDetailPanel(todoId);
      });
    });
  };

  bindTodoEvents(DOM.todosContainer);
  bindTodoEvents(DOM.completedTasks);
}

// ============= 待办事项操作 =============

// 排序函数
function sortTodos(todos) {
  switch (App.sortBy) {
    case 'date':
      todos.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      break;
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
      todos.sort((a, b) => {
        return priorityOrder[a.priority || 'none'] - priorityOrder[b.priority || 'none'];
      });
      break;
    case 'title':
      todos.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      break;
    case 'manual':
    default:
      // 按创建时间倒序
      todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
}

// 切换排序菜单
function toggleSortMenu(e) {
  e.stopPropagation();
  DOM.sortMenu.classList.toggle('hidden');
}

// 设置排序方式
function setSortBy(sortType) {
  App.sortBy = sortType;

  // 更新菜单选中状态
  DOM.sortMenu.querySelectorAll('.sort-option').forEach(option => {
    if (option.dataset.sort === sortType) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  DOM.sortMenu.classList.add('hidden');
  renderTodos();
}

// 切换已完成区域折叠
function toggleCompletedSection() {
  App.completedExpanded = !App.completedExpanded;
  if (App.completedExpanded) {
    DOM.completedSection.classList.remove('collapsed');
  } else {
    DOM.completedSection.classList.add('collapsed');
  }
}

// 快速操作按钮
function toggleQuickDate() {
  if (App.quickDate) {
    App.quickDate = null;
    DOM.quickDateBtn.classList.remove('active');
  } else {
    const today = new Date().toISOString().split('T')[0];
    App.quickDate = today;
    DOM.quickDateBtn.classList.add('active');
  }
}

function toggleQuickPriority() {
  const priorities = ['none', 'low', 'medium', 'high'];
  const currentIndex = priorities.indexOf(App.quickPriority);
  const nextIndex = (currentIndex + 1) % priorities.length;
  App.quickPriority = priorities[nextIndex];

  if (App.quickPriority === 'none') {
    DOM.quickPriorityBtn.classList.remove('active');
    DOM.quickPriorityBtn.textContent = '⭐';
  } else {
    DOM.quickPriorityBtn.classList.add('active');
    const icons = { low: '🔵', medium: '🟡', high: '🔴' };
    DOM.quickPriorityBtn.textContent = icons[App.quickPriority];
  }
}

function toggleQuickList() {
  if (App.quickList || App.lists.length === 0) {
    App.quickList = null;
    DOM.quickListBtn.classList.remove('active');
  } else {
    // 简单地选择第一个列表
    if (App.lists.length > 0) {
      App.quickList = App.lists[0].id;
      DOM.quickListBtn.classList.add('active');
    }
  }
}

async function addTodo() {
  const title = DOM.newTodoInput.value.trim();
  if (!title) return;

  const options = {
    priority: App.quickPriority,
    dueDate: App.quickDate,
    listId: App.quickList
  };

  // 如果在列表视图下且没有设置快速列表，自动设置列表
  if (App.currentView === 'list' && App.currentListId && !options.listId) {
    options.listId = App.currentListId;
  }

  // 如果在今天视图下且没有设置快速日期，自动设置日期为今天
  if (App.currentView === 'today' && !options.dueDate) {
    options.dueDate = new Date().toISOString().split('T')[0];
  }

  // 如果在明天视图下且没有设置快速日期，自动设置日期为明天
  if (App.currentView === 'tomorrow' && !options.dueDate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    options.dueDate = tomorrow.toISOString().split('T')[0];
  }

  await Storage.addTodo(title, options);
  DOM.newTodoInput.value = '';

  // 重置快速操作状态
  App.quickDate = null;
  App.quickPriority = 'none';
  App.quickList = null;
  DOM.quickDateBtn.classList.remove('active');
  DOM.quickPriorityBtn.classList.remove('active');
  DOM.quickPriorityBtn.textContent = '⭐';
  DOM.quickListBtn.classList.remove('active');

  await updateUI();
}

// 自动调整文本框高度
function autoResizeTextarea() {
  DOM.detailTitleInput.style.height = 'auto';
  DOM.detailTitleInput.style.height = DOM.detailTitleInput.scrollHeight + 'px';
}

// 设置优先级
async function setPriority(priority) {
  if (!App.selectedTodoId) return;

  // 更新UI显示
  document.querySelectorAll('.priority-btn').forEach(btn => {
    if (btn.dataset.priority === priority) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 保存
  await Storage.updateTodo(App.selectedTodoId, { priority });
  await updateUI();
}

// 设置日期快捷选项
async function setDateShortcut(type) {
  if (!App.selectedTodoId) return;

  let date = null;
  const today = new Date();

  switch (type) {
    case 'today':
      date = today.toISOString().split('T')[0];
      break;
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
      break;
    case 'nextWeek':
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      date = nextWeek.toISOString().split('T')[0];
      break;
    case 'clear':
      date = null;
      break;
  }

  DOM.detailDateInput.value = date || '';
  DOM.dateShortcuts.classList.add('hidden');

  // 保存
  await Storage.updateTodo(App.selectedTodoId, { dueDate: date });
  await updateUI();
}

async function updateSelectedTodo() {
  if (!App.selectedTodoId) return;

  const updates = {
    title: DOM.detailTitleInput.value.trim(),
    completed: DOM.detailCompletedCheckbox.checked,
    listId: DOM.detailListSelect.value || null,
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

// ============= 高级功能 - 重复、提醒、标签 =============

async function updateRepeat() {
  if (!App.selectedTodoId) return;

  const repeatType = DOM.detailRepeatSelect.value;
  const repeat = repeatType ? { type: repeatType, interval: 1 } : null;

  await Storage.updateTodo(App.selectedTodoId, { repeat });
  await updateUI();
}

async function addReminder() {
  if (!App.selectedTodoId) return;

  const time = prompt('请输入提醒时间 (格式: HH:MM):', '09:00');
  if (!time || !time.trim()) return;

  // 验证时间格式
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(time.trim())) {
    alert('时间格式不正确，请使用 HH:MM 格式');
    return;
  }

  const todo = await Storage.getTodo(App.selectedTodoId);
  const reminders = [...(todo.reminders || []), { time: time.trim(), enabled: true }];

  await Storage.updateTodo(App.selectedTodoId, { reminders });
  await openDetailPanel(App.selectedTodoId); // 重新加载详情
}

async function toggleReminder(index) {
  if (!App.selectedTodoId) return;

  const todo = await Storage.getTodo(App.selectedTodoId);
  const reminders = [...todo.reminders];
  reminders[index].enabled = !reminders[index].enabled;

  await Storage.updateTodo(App.selectedTodoId, { reminders });
  await openDetailPanel(App.selectedTodoId); // 重新加载详情
}

async function deleteReminder(index) {
  if (!App.selectedTodoId) return;

  const todo = await Storage.getTodo(App.selectedTodoId);
  const reminders = todo.reminders.filter((_, i) => i !== index);

  await Storage.updateTodo(App.selectedTodoId, { reminders });
  await openDetailPanel(App.selectedTodoId); // 重新加载详情
}

async function addTag() {
  if (!App.selectedTodoId) return;

  const tagName = DOM.newTagInput.value.trim();
  if (!tagName) return;

  const todo = await Storage.getTodo(App.selectedTodoId);
  const tags = [...(todo.tags || [])];

  // 避免重复标签
  if (tags.includes(tagName)) {
    DOM.newTagInput.value = '';
    return;
  }

  tags.push(tagName);
  await Storage.updateTodo(App.selectedTodoId, { tags });

  DOM.newTagInput.value = '';
  await openDetailPanel(App.selectedTodoId); // 重新加载详情
}

async function removeTag(tagName) {
  if (!App.selectedTodoId) return;

  const todo = await Storage.getTodo(App.selectedTodoId);
  const tags = todo.tags.filter(t => t !== tagName);

  await Storage.updateTodo(App.selectedTodoId, { tags });
  await openDetailPanel(App.selectedTodoId); // 重新加载详情
}

function renderReminders(todo) {
  const reminders = todo.reminders || [];

  if (reminders.length === 0) {
    DOM.remindersList.innerHTML = '';
    return;
  }

  DOM.remindersList.innerHTML = reminders.map((reminder, index) => `
    <div class="reminder-item">
      <span class="reminder-time">${escapeHtml(reminder.time)}</span>
      <div class="reminder-toggle ${reminder.enabled ? 'active' : ''}" onclick="toggleReminder(${index})"></div>
      <button class="reminder-delete" onclick="deleteReminder(${index})">✕</button>
    </div>
  `).join('');
}

function renderTags(todo) {
  const tags = todo.tags || [];

  if (tags.length === 0) {
    DOM.tagsDisplay.innerHTML = '';
    return;
  }

  DOM.tagsDisplay.innerHTML = tags.map(tag => `
    <div class="tag-chip">
      <span>${escapeHtml(tag)}</span>
      <span class="tag-chip-remove" onclick="removeTag('${escapeHtml(tag)}')">×</span>
    </div>
  `).join('');
}

// ============= 番茄钟计时器 =============

function startPomodoro() {
  if (!App.selectedTodoId) return;

  App.pomodoro.isRunning = true;

  // 切换按钮显示
  DOM.startTimerBtn.style.display = 'none';
  DOM.pauseTimerBtn.style.display = 'inline-block';

  // 启动计时器
  App.pomodoro.timerInterval = setInterval(timerTick, 1000);
}

function pausePomodoro() {
  App.pomodoro.isRunning = false;

  // 切换按钮显示
  DOM.startTimerBtn.style.display = 'inline-block';
  DOM.pauseTimerBtn.style.display = 'none';

  // 停止计时器
  if (App.pomodoro.timerInterval) {
    clearInterval(App.pomodoro.timerInterval);
    App.pomodoro.timerInterval = null;
  }
}

function resetPomodoro() {
  pausePomodoro();

  // 重置时间
  App.pomodoro.isWorkMode = true;
  App.pomodoro.timeRemaining = App.pomodoro.workDuration;

  updateTimerDisplay();
}

function timerTick() {
  if (!App.pomodoro.isRunning) return;

  App.pomodoro.timeRemaining--;

  if (App.pomodoro.timeRemaining <= 0) {
    completePomodoro();
  } else {
    updateTimerDisplay();
  }
}

async function completePomodoro() {
  pausePomodoro();

  if (App.pomodoro.isWorkMode) {
    // 工作时间结束，增加计数
    if (App.selectedTodoId) {
      const todo = await Storage.getTodo(App.selectedTodoId);
      const newCount = (todo.pomodoroCount || 0) + 1;
      await Storage.updateTodo(App.selectedTodoId, { pomodoroCount: newCount });
      DOM.pomodoroCount.textContent = newCount;
    }

    // 切换到休息时间
    App.pomodoro.isWorkMode = false;
    App.pomodoro.timeRemaining = App.pomodoro.breakDuration;
    DOM.timerMode.textContent = '休息时间';

    alert('🎉 番茄钟完成！休息一下吧！');
  } else {
    // 休息时间结束，切换回工作时间
    App.pomodoro.isWorkMode = true;
    App.pomodoro.timeRemaining = App.pomodoro.workDuration;
    DOM.timerMode.textContent = '工作时间';

    alert('⏰ 休息结束！继续加油！');
  }

  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(App.pomodoro.timeRemaining / 60);
  const seconds = App.pomodoro.timeRemaining % 60;
  DOM.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  DOM.detailListSelect.value = todo.listId || '';
  DOM.detailDateInput.value = todo.dueDate || '';
  DOM.detailNotesInput.value = todo.notes || '';

  // 设置优先级按钮状态
  document.querySelectorAll('.priority-btn').forEach(btn => {
    if (btn.dataset.priority === (todo.priority || 'none')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 设置重复选项
  DOM.detailRepeatSelect.value = todo.repeat ? todo.repeat.type : '';

  // 渲染提醒
  renderReminders(todo);

  // 渲染标签
  renderTags(todo);

  // 加载番茄钟计数
  DOM.pomodoroCount.textContent = todo.pomodoroCount || 0;

  // 重置番茄钟计时器
  resetPomodoro();

  // 自动调整标题高度
  autoResizeTextarea();

  // 渲染子任务
  renderSubtasks(todo);

  // 显示详情面板
  document.querySelector('.detail-empty').classList.add('hidden');
  DOM.detailForm.classList.remove('hidden');
}

function closeDetailPanel() {
  App.selectedTodoId = null;

  // 暂停番茄钟
  pausePomodoro();

  // 清除激活状态
  document.querySelectorAll('.todo-item').forEach(item => {
    item.classList.remove('active');
  });

  // 隐藏详情面板
  DOM.detailForm.classList.add('hidden');
  document.querySelector('.detail-empty').classList.remove('hidden');
}

// ============= 列表操作 =============

async function addList() {
  const name = prompt('请输入列表名称:');
  if (!name || !name.trim()) return;

  // 随机颜色
  const colors = ['#4A90E2', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await Storage.addList(name.trim(), color);
  await updateUI();
}

function updateListSelect() {
  const currentValue = DOM.detailListSelect.value;

  DOM.detailListSelect.innerHTML = '<option value="">无列表</option>' +
    App.lists.map(list => `
      <option value="${list.id}">${escapeHtml(list.name)}</option>
    `).join('');

  DOM.detailListSelect.value = currentValue;
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

// 递归渲染子任务
function renderSubtaskItem(subtask, level = 0) {
  const hasChildren = subtask.subtasks && subtask.subtasks.length > 0;
  const isExpanded = subtask.expanded !== false;
  const toggleClass = hasChildren ? (isExpanded ? 'expanded' : 'collapsed') : 'empty';

  let html = `
    <div class="subtask-wrapper" data-id="${subtask.id}">
      <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
        <button class="subtask-toggle ${toggleClass}"></button>
        <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
        <div class="subtask-content">
          <div class="subtask-main">
            <span class="subtask-text">${escapeHtml(subtask.title)}</span>
            <div class="subtask-actions">
              <button class="btn-add-child" title="添加子任务">+ 子任务</button>
              <button class="icon-btn-tiny edit-subtask" title="编辑">✏️</button>
              <button class="icon-btn-tiny delete-subtask" title="删除">🗑️</button>
            </div>
          </div>
        </div>
      </div>
  `;

  // 递归渲染子任务的子任务
  if (hasChildren) {
    html += `<div class="subtask-children ${!isExpanded ? 'collapsed' : ''}">`;
    subtask.subtasks.forEach(child => {
      html += renderSubtaskItem(child, level + 1);
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function renderSubtasks(todo) {
  if (!todo.subtasks || todo.subtasks.length === 0) {
    DOM.subtasksList.innerHTML = '<div style="font-size: 13px; color: var(--text-secondary); padding: 8px;">暂无子任务</div>';
    return;
  }

  DOM.subtasksList.innerHTML = todo.subtasks.map(subtask => renderSubtaskItem(subtask)).join('');
  attachSubtaskEvents();
}

function attachSubtaskEvents() {
  // 展开/收起按钮
  DOM.subtasksList.querySelectorAll('.subtask-toggle:not(.empty)').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.subtask-wrapper');
      const subtaskId = wrapper.dataset.id;

      await Storage.toggleSubtaskExpanded(App.selectedTodoId, subtaskId);
      const todo = await Storage.getTodo(App.selectedTodoId);
      renderSubtasks(todo);
    });
  });

  // 复选框
  DOM.subtasksList.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      const wrapper = checkbox.closest('.subtask-wrapper');
      const subtaskId = wrapper.dataset.id;

      await Storage.toggleSubtask(App.selectedTodoId, subtaskId);
      const todo = await Storage.getTodo(App.selectedTodoId);
      renderSubtasks(todo);
      await updateUI();
    });
  });

  // 添加子任务按钮
  DOM.subtasksList.querySelectorAll('.btn-add-child').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.subtask-wrapper');
      const subtaskId = wrapper.dataset.id;

      // 隐藏其他所有内联输入框
      DOM.subtasksList.querySelectorAll('.inline-add-subtask').forEach(form => form.remove());

      // 创建内联输入框
      const content = wrapper.querySelector('.subtask-content');
      const inlineForm = document.createElement('div');
      inlineForm.className = 'inline-add-subtask';
      inlineForm.innerHTML = `
        <input type="text" placeholder="输入子任务..." autofocus>
        <button>添加</button>
        <button type="button" class="cancel-btn" style="background: #999;">取消</button>
      `;
      content.appendChild(inlineForm);

      const input = inlineForm.querySelector('input');
      const addBtn = inlineForm.querySelector('button:not(.cancel-btn)');
      const cancelBtn = inlineForm.querySelector('.cancel-btn');

      input.focus();

      const handleAdd = async () => {
        const title = input.value.trim();
        if (!title) return;

        await Storage.addSubtask(App.selectedTodoId, title, subtaskId);
        const todo = await Storage.getTodo(App.selectedTodoId);
        renderSubtasks(todo);
        await updateUI();
      };

      addBtn.addEventListener('click', handleAdd);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdd();
      });

      cancelBtn.addEventListener('click', () => {
        inlineForm.remove();
      });
    });
  });

  // 编辑按钮
  DOM.subtasksList.querySelectorAll('.edit-subtask').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.subtask-wrapper');
      const subtaskId = wrapper.dataset.id;

      // 获取当前子任务
      const todo = await Storage.getTodo(App.selectedTodoId);
      const subtask = Storage._findSubtask(todo.subtasks, subtaskId);

      const newTitle = prompt('编辑子任务:', subtask.title);
      if (newTitle && newTitle.trim()) {
        await Storage.updateSubtask(App.selectedTodoId, subtaskId, { title: newTitle.trim() });
        const updatedTodo = await Storage.getTodo(App.selectedTodoId);
        renderSubtasks(updatedTodo);
      }
    });
  });

  // 删除按钮
  DOM.subtasksList.querySelectorAll('.delete-subtask').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wrapper = btn.closest('.subtask-wrapper');
      const subtaskId = wrapper.dataset.id;

      if (confirm('确定要删除这个子任务及其所有子任务吗？')) {
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

  await Storage.addSubtask(App.selectedTodoId, title, null);
  DOM.newSubtaskInput.value = '';

  const todo = await Storage.getTodo(App.selectedTodoId);
  renderSubtasks(todo);
  await updateUI();
}

// ============= 启动应用 =============

document.addEventListener('DOMContentLoaded', init);
