// 数据存储模块 - 使用 Chrome Storage API

const Storage = {
  // 获取所有项目
  async getProjects() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['projects'], (result) => {
        resolve(result.projects || []);
      });
    });
  },

  // 保存所有项目
  async saveProjects(projects) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ projects }, () => {
        resolve();
      });
    });
  },

  // 添加新项目
  async addProject(name) {
    const projects = await this.getProjects();
    const newProject = {
      id: Date.now().toString(),
      name: name,
      createdAt: new Date().toISOString(),
      todos: []
    };
    projects.push(newProject);
    await this.saveProjects(projects);
    return newProject;
  },

  // 更新项目
  async updateProject(projectId, updates) {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      await this.saveProjects(projects);
      return projects[index];
    }
    return null;
  },

  // 删除项目
  async deleteProject(projectId) {
    const projects = await this.getProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    await this.saveProjects(filteredProjects);
  },

  // 获取指定项目
  async getProject(projectId) {
    const projects = await this.getProjects();
    return projects.find(p => p.id === projectId);
  },

  // 添加待办事项到项目
  async addTodo(projectId, todoText) {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const newTodo = {
        id: Date.now().toString(),
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
      };
      project.todos.push(newTodo);
      await this.saveProjects(projects);
      return newTodo;
    }
    return null;
  },

  // 更新待办事项
  async updateTodo(projectId, todoId, updates) {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const todoIndex = project.todos.findIndex(t => t.id === todoId);
      if (todoIndex !== -1) {
        project.todos[todoIndex] = { ...project.todos[todoIndex], ...updates };
        await this.saveProjects(projects);
        return project.todos[todoIndex];
      }
    }
    return null;
  },

  // 删除待办事项
  async deleteTodo(projectId, todoId) {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      project.todos = project.todos.filter(t => t.id !== todoId);
      await this.saveProjects(projects);
    }
  },

  // 切换待办事项完成状态
  async toggleTodo(projectId, todoId) {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const todo = project.todos.find(t => t.id === todoId);
      if (todo) {
        todo.completed = !todo.completed;
        await this.saveProjects(projects);
        return todo;
      }
    }
    return null;
  },

  // 获取所有待办事项（跨项目）
  async getAllTodos() {
    const projects = await this.getProjects();
    const allTodos = [];
    projects.forEach(project => {
      project.todos.forEach(todo => {
        allTodos.push({
          ...todo,
          projectId: project.id,
          projectName: project.name
        });
      });
    });
    return allTodos;
  },

  // 获取统计数据
  async getStats() {
    const projects = await this.getProjects();
    let total = 0;
    let completed = 0;
    let pending = 0;

    projects.forEach(project => {
      project.todos.forEach(todo => {
        total++;
        if (todo.completed) {
          completed++;
        } else {
          pending++;
        }
      });
    });

    return { total, completed, pending };
  }
};
