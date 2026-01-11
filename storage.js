// 数据存储模块 - 使用 Chrome Storage API

const Storage = {
  // ============= 待办事项 =============

  // 获取所有待办事项
  async getTodos() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['todos'], (result) => {
        resolve(result.todos || []);
      });
    });
  },

  // 保存所有待办事项
  async saveTodos(todos) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ todos }, () => {
        resolve();
      });
    });
  },

  // 添加待办事项
  async addTodo(title, options = {}) {
    const todos = await this.getTodos();
    const newTodo = {
      id: Date.now().toString(),
      title: title,
      completed: false,
      tagId: options.tagId || null,
      dueDate: options.dueDate || null,
      notes: options.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    todos.push(newTodo);
    await this.saveTodos(todos);
    return newTodo;
  },

  // 获取单个待办事项
  async getTodo(todoId) {
    const todos = await this.getTodos();
    return todos.find(t => t.id === todoId);
  },

  // 更新待办事项
  async updateTodo(todoId, updates) {
    const todos = await this.getTodos();
    const index = todos.findIndex(t => t.id === todoId);
    if (index !== -1) {
      todos[index] = {
        ...todos[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.saveTodos(todos);
      return todos[index];
    }
    return null;
  },

  // 删除待办事项
  async deleteTodo(todoId) {
    const todos = await this.getTodos();
    const filteredTodos = todos.filter(t => t.id !== todoId);
    await this.saveTodos(filteredTodos);
  },

  // 切换完成状态
  async toggleTodo(todoId) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
      todo.completed = !todo.completed;
      todo.updatedAt = new Date().toISOString();
      await this.saveTodos(todos);
      return todo;
    }
    return null;
  },

  // 获取今天的待办事项
  async getTodayTodos() {
    const todos = await this.getTodos();
    const today = new Date().toISOString().split('T')[0];
    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.split('T')[0];
      return dueDate === today;
    });
  },

  // 获取按标签筛选的待办事项
  async getTodosByTag(tagId) {
    const todos = await this.getTodos();
    return todos.filter(todo => todo.tagId === tagId);
  },

  // ============= 标签 =============

  // 获取所有标签
  async getTags() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tags'], (result) => {
        resolve(result.tags || []);
      });
    });
  },

  // 保存所有标签
  async saveTags(tags) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ tags }, () => {
        resolve();
      });
    });
  },

  // 添加标签
  async addTag(name, color = '#4A90E2') {
    const tags = await this.getTags();
    const newTag = {
      id: Date.now().toString(),
      name: name,
      color: color,
      createdAt: new Date().toISOString()
    };
    tags.push(newTag);
    await this.saveTags(tags);
    return newTag;
  },

  // 获取单个标签
  async getTag(tagId) {
    const tags = await this.getTags();
    return tags.find(t => t.id === tagId);
  },

  // 更新标签
  async updateTag(tagId, updates) {
    const tags = await this.getTags();
    const index = tags.findIndex(t => t.id === tagId);
    if (index !== -1) {
      tags[index] = { ...tags[index], ...updates };
      await this.saveTags(tags);
      return tags[index];
    }
    return null;
  },

  // 删除标签
  async deleteTag(tagId) {
    const tags = await this.getTags();
    const filteredTags = tags.filter(t => t.id !== tagId);
    await this.saveTags(filteredTags);

    // 同时移除所有待办事项的该标签
    const todos = await this.getTodos();
    todos.forEach(todo => {
      if (todo.tagId === tagId) {
        todo.tagId = null;
      }
    });
    await this.saveTodos(todos);
  },

  // ============= 统计数据 =============

  // 获取统计数据
  async getStats() {
    const todos = await this.getTodos();
    const today = new Date().toISOString().split('T')[0];

    let total = todos.length;
    let completed = 0;
    let pending = 0;
    let todayCount = 0;

    todos.forEach(todo => {
      if (todo.completed) {
        completed++;
      } else {
        pending++;
      }

      // 今天的任务
      if (todo.dueDate) {
        const dueDate = todo.dueDate.split('T')[0];
        if (dueDate === today) {
          todayCount++;
        }
      }
    });

    return {
      total,
      completed,
      pending,
      today: todayCount
    };
  },

  // 获取标签统计
  async getTagStats() {
    const todos = await this.getTodos();
    const tags = await this.getTags();

    const stats = {};
    tags.forEach(tag => {
      stats[tag.id] = {
        total: 0,
        completed: 0,
        pending: 0
      };
    });

    todos.forEach(todo => {
      if (todo.tagId && stats[todo.tagId]) {
        stats[todo.tagId].total++;
        if (todo.completed) {
          stats[todo.tagId].completed++;
        } else {
          stats[todo.tagId].pending++;
        }
      }
    });

    return stats;
  },

  // ============= 数据清理 =============

  // 清空所有数据
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  },

  // 导出数据
  async exportData() {
    const todos = await this.getTodos();
    const tags = await this.getTags();
    return {
      todos,
      tags,
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };
  },

  // 导入数据
  async importData(data) {
    if (data.todos) {
      await this.saveTodos(data.todos);
    }
    if (data.tags) {
      await this.saveTags(data.tags);
    }
  }
};
