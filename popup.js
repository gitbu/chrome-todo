// 主应用逻辑

let currentProjectId = null;
let currentView = 'projects';

// DOM 元素
const elements = {
  // 统计
  totalTodos: document.getElementById('totalTodos'),
  pendingTodos: document.getElementById('pendingTodos'),
  completedTodos: document.getElementById('completedTodos'),

  // 视图切换
  viewToggleBtns: document.querySelectorAll('.toggle-btn'),
  projectsView: document.getElementById('projectsView'),
  allTodosView: document.getElementById('allTodosView'),

  // 项目相关
  newProjectInput: document.getElementById('newProjectInput'),
  addProjectBtn: document.getElementById('addProjectBtn'),
  projectsList: document.getElementById('projectsList'),

  // 待办事项相关
  newTodoInput: document.getElementById('newTodoInput'),
  addTodoBtn: document.getElementById('addTodoBtn'),
  todosList: document.getElementById('todosList'),
  allTodosList: document.getElementById('allTodosList'),

  // 模态框
  projectModal: document.getElementById('projectModal'),
  modalProjectName: document.getElementById('modalProjectName'),
  editProjectBtn: document.getElementById('editProjectBtn'),
  deleteProjectBtn: document.getElementById('deleteProjectBtn'),
  closeModalBtn: document.getElementById('closeModalBtn')
};

// 初始化应用
async function init() {
  await updateStats();
  await renderProjects();
  setupEventListeners();
}

// 设置事件监听器
function setupEventListeners() {
  // 视图切换
  elements.viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // 添加项目
  elements.addProjectBtn.addEventListener('click', addProject);
  elements.newProjectInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addProject();
  });

  // 添加待办事项
  elements.addTodoBtn.addEventListener('click', addTodo);
  elements.newTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
  });

  // 模态框操作
  elements.closeModalBtn.addEventListener('click', closeModal);
  elements.editProjectBtn.addEventListener('click', editProject);
  elements.deleteProjectBtn.addEventListener('click', deleteProject);

  // 点击模态框外部关闭
  elements.projectModal.addEventListener('click', (e) => {
    if (e.target === elements.projectModal) {
      closeModal();
    }
  });
}

// 切换视图
async function switchView(view) {
  currentView = view;

  // 更新按钮状态
  elements.viewToggleBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // 切换视图显示
  if (view === 'projects') {
    elements.projectsView.classList.remove('hidden');
    elements.allTodosView.classList.add('hidden');
    await renderProjects();
  } else {
    elements.projectsView.classList.add('hidden');
    elements.allTodosView.classList.remove('hidden');
    await renderAllTodos();
  }
}

// 更新统计数据
async function updateStats() {
  const stats = await Storage.getStats();
  elements.totalTodos.textContent = stats.total;
  elements.pendingTodos.textContent = stats.pending;
  elements.completedTodos.textContent = stats.completed;
}

// 渲染项目列表
async function renderProjects() {
  const projects = await Storage.getProjects();

  if (projects.length === 0) {
    elements.projectsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div class="empty-state-text">还没有项目，创建一个开始吧！</div>
      </div>
    `;
    return;
  }

  elements.projectsList.innerHTML = projects.map(project => {
    const totalTodos = project.todos.length;
    const completedTodos = project.todos.filter(t => t.completed).length;
    const pendingTodos = totalTodos - completedTodos;

    return `
      <div class="project-item" data-id="${project.id}">
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-stats">
          <span>📊 总计: ${totalTodos}</span>
          <span>⏳ 未完成: ${pendingTodos}</span>
          <span>✅ 已完成: ${completedTodos}</span>
        </div>
      </div>
    `;
  }).join('');

  // 添加点击事件
  elements.projectsList.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('click', () => {
      openProjectModal(item.dataset.id);
    });
  });
}

// 渲染所有待办事项
async function renderAllTodos() {
  const todos = await Storage.getAllTodos();

  if (todos.length === 0) {
    elements.allTodosList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">还没有待办事项</div>
      </div>
    `;
    return;
  }

  elements.allTodosList.innerHTML = todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" data-project-id="${todo.projectId}" data-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
      <div class="todo-text">
        <div>${escapeHtml(todo.text)}</div>
        <small style="color: #999;">项目: ${escapeHtml(todo.projectName)}</small>
      </div>
      <div class="todo-actions">
        <button class="icon-btn edit-todo">✏️</button>
        <button class="icon-btn delete-todo">🗑️</button>
      </div>
    </div>
  `).join('');

  // 添加事件监听
  attachTodoEventListeners(elements.allTodosList, true);
}

// 打开项目模态框
async function openProjectModal(projectId) {
  currentProjectId = projectId;
  const project = await Storage.getProject(projectId);

  if (!project) return;

  elements.modalProjectName.textContent = project.name;
  elements.projectModal.classList.remove('hidden');

  await renderTodos();
}

// 关闭模态框
function closeModal() {
  elements.projectModal.classList.add('hidden');
  currentProjectId = null;
  elements.newTodoInput.value = '';
}

// 渲染待办事项列表
async function renderTodos() {
  if (!currentProjectId) return;

  const project = await Storage.getProject(currentProjectId);
  if (!project) return;

  if (project.todos.length === 0) {
    elements.todosList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">还没有待办事项，添加一个开始吧！</div>
      </div>
    `;
    return;
  }

  elements.todosList.innerHTML = project.todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
      <div class="todo-text">${escapeHtml(todo.text)}</div>
      <div class="todo-actions">
        <button class="icon-btn edit-todo">✏️</button>
        <button class="icon-btn delete-todo">🗑️</button>
      </div>
    </div>
  `).join('');

  // 添加事件监听
  attachTodoEventListeners(elements.todosList, false);
}

// 添加待办事项事件监听器
function attachTodoEventListeners(container, isAllView) {
  container.querySelectorAll('.todo-item').forEach(item => {
    const todoId = item.dataset.id;
    const projectId = isAllView ? item.dataset.projectId : currentProjectId;

    // 切换完成状态
    const checkbox = item.querySelector('.todo-checkbox');
    checkbox.addEventListener('change', async () => {
      await Storage.toggleTodo(projectId, todoId);
      await updateStats();
      if (isAllView) {
        await renderAllTodos();
      } else {
        await renderTodos();
      }
      if (currentView === 'projects') {
        await renderProjects();
      }
    });

    // 编辑待办事项
    const editBtn = item.querySelector('.edit-todo');
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const todo = isAllView
        ? (await Storage.getAllTodos()).find(t => t.id === todoId)
        : (await Storage.getProject(projectId)).todos.find(t => t.id === todoId);

      const newText = prompt('编辑待办事项:', todo.text);
      if (newText && newText.trim()) {
        await Storage.updateTodo(projectId, todoId, { text: newText.trim() });
        await updateStats();
        if (isAllView) {
          await renderAllTodos();
        } else {
          await renderTodos();
        }
      }
    });

    // 删除待办事项
    const deleteBtn = item.querySelector('.delete-todo');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('确定要删除这个待办事项吗？')) {
        await Storage.deleteTodo(projectId, todoId);
        await updateStats();
        if (isAllView) {
          await renderAllTodos();
        } else {
          await renderTodos();
        }
        if (currentView === 'projects') {
          await renderProjects();
        }
      }
    });
  });
}

// 添加项目
async function addProject() {
  const name = elements.newProjectInput.value.trim();
  if (!name) return;

  await Storage.addProject(name);
  elements.newProjectInput.value = '';
  await renderProjects();
  await updateStats();
}

// 编辑项目
async function editProject() {
  if (!currentProjectId) return;

  const project = await Storage.getProject(currentProjectId);
  const newName = prompt('编辑项目名称:', project.name);

  if (newName && newName.trim()) {
    await Storage.updateProject(currentProjectId, { name: newName.trim() });
    elements.modalProjectName.textContent = newName.trim();
    await renderProjects();
  }
}

// 删除项目
async function deleteProject() {
  if (!currentProjectId) return;

  if (confirm('确定要删除这个项目吗？这将删除项目下的所有待办事项。')) {
    await Storage.deleteProject(currentProjectId);
    closeModal();
    await renderProjects();
    await updateStats();
  }
}

// 添加待办事项
async function addTodo() {
  if (!currentProjectId) return;

  const text = elements.newTodoInput.value.trim();
  if (!text) return;

  await Storage.addTodo(currentProjectId, text);
  elements.newTodoInput.value = '';
  await renderTodos();
  await renderProjects();
  await updateStats();
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 启动应用
init();
