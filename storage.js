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
      listId: options.listId || null,
      dueDate: options.dueDate || null,
      notes: options.notes || '',
      priority: options.priority || 'none', // none, low, medium, high
      subtasks: [],
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

  // 获取明天的待办事项
  async getTomorrowTodos() {
    const todos = await this.getTodos();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.split('T')[0];
      return dueDate === tomorrowStr;
    });
  },

  // 获取接下来7天的待办事项
  async getNext7DaysTodos() {
    const todos = await this.getTodos();
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const next7DaysStr = next7Days.toISOString().split('T')[0];

    return todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = todo.dueDate.split('T')[0];
      return dueDate >= todayStr && dueDate <= next7DaysStr;
    });
  },

  // 获取按列表筛选的待办事项
  async getTodosByList(listId) {
    const todos = await this.getTodos();
    return todos.filter(todo => todo.listId === listId);
  },

  // ============= 列表/项目 =============

  // 获取所有列表
  async getLists() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['lists'], (result) => {
        resolve(result.lists || []);
      });
    });
  },

  // 保存所有列表
  async saveLists(lists) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ lists }, () => {
        resolve();
      });
    });
  },

  // 添加列表
  async addList(name, color = '#4A90E2', parentId = null) {
    const lists = await this.getLists();
    const newList = {
      id: Date.now().toString(),
      name: name,
      color: color,
      parentId: parentId, // 支持文件夹层级
      createdAt: new Date().toISOString()
    };
    lists.push(newList);
    await this.saveLists(lists);
    return newList;
  },

  // 获取单个列表
  async getList(listId) {
    const lists = await this.getLists();
    return lists.find(l => l.id === listId);
  },

  // 更新列表
  async updateList(listId, updates) {
    const lists = await this.getLists();
    const index = lists.findIndex(l => l.id === listId);
    if (index !== -1) {
      lists[index] = { ...lists[index], ...updates };
      await this.saveLists(lists);
      return lists[index];
    }
    return null;
  },

  // 删除列表（及其所有子列表）
  async deleteList(listId) {
    const lists = await this.getLists();

    // 递归查找所有子列表
    const findChildLists = (parentId) => {
      const children = lists.filter(l => l.parentId === parentId);
      let allChildren = [...children];
      children.forEach(child => {
        allChildren = allChildren.concat(findChildLists(child.id));
      });
      return allChildren;
    };

    // 获取要删除的列表ID集合（包括自身和所有子列表）
    const childLists = findChildLists(listId);
    const idsToDelete = [listId, ...childLists.map(l => l.id)];

    // 删除列表
    const filteredLists = lists.filter(l => !idsToDelete.includes(l.id));
    await this.saveLists(filteredLists);

    // 移除所有待办事项的该列表关联
    const todos = await this.getTodos();
    todos.forEach(todo => {
      if (idsToDelete.includes(todo.listId)) {
        todo.listId = null;
      }
    });
    await this.saveTodos(todos);
  },

  // ============= 统计数据 =============

  // 获取统计数据
  async getStats() {
    const todos = await this.getTodos();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];

    let total = todos.length;
    let completed = 0;
    let pending = 0;
    let todayCount = 0;
    let tomorrowCount = 0;
    let next7daysCount = 0;

    todos.forEach(todo => {
      if (todo.completed) {
        completed++;
      } else {
        pending++;
      }

      // 统计各个日期段的任务
      if (todo.dueDate) {
        const dueDate = todo.dueDate.split('T')[0];

        if (dueDate === todayStr) {
          todayCount++;
        }

        if (dueDate === tomorrowStr) {
          tomorrowCount++;
        }

        if (dueDate >= todayStr && dueDate <= next7DaysStr) {
          next7daysCount++;
        }
      }
    });

    return {
      total,
      completed,
      pending,
      today: todayCount,
      tomorrow: tomorrowCount,
      next7days: next7daysCount
    };
  },

  // 获取列表统计
  async getListStats() {
    const todos = await this.getTodos();
    const lists = await this.getLists();

    const stats = {};
    lists.forEach(list => {
      stats[list.id] = {
        total: 0,
        completed: 0,
        pending: 0
      };
    });

    todos.forEach(todo => {
      if (todo.listId && stats[todo.listId]) {
        stats[todo.listId].total++;
        if (todo.completed) {
          stats[todo.listId].completed++;
        } else {
          stats[todo.listId].pending++;
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
    const lists = await this.getLists();
    return {
      todos,
      lists,
      exportedAt: new Date().toISOString(),
      version: '3.0.0'
    };
  },

  // 导入数据
  async importData(data) {
    if (data.todos) {
      await this.saveTodos(data.todos);
    }
    if (data.lists) {
      await this.saveLists(data.lists);
    }
  },

  // ============= 子任务管理 =============

  // 递归查找子任务
  _findSubtask(subtasks, subtaskId) {
    for (const subtask of subtasks) {
      if (subtask.id === subtaskId) {
        return subtask;
      }
      if (subtask.subtasks && subtask.subtasks.length > 0) {
        const found = this._findSubtask(subtask.subtasks, subtaskId);
        if (found) return found;
      }
    }
    return null;
  },

  // 递归删除子任务
  _deleteSubtaskRecursive(subtasks, subtaskId) {
    for (let i = 0; i < subtasks.length; i++) {
      if (subtasks[i].id === subtaskId) {
        subtasks.splice(i, 1);
        return true;
      }
      if (subtasks[i].subtasks && subtasks[i].subtasks.length > 0) {
        if (this._deleteSubtaskRecursive(subtasks[i].subtasks, subtaskId)) {
          return true;
        }
      }
    }
    return false;
  },

  // 添加子任务（支持父子任务ID）
  async addSubtask(todoId, title, parentSubtaskId = null) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return null;

    if (!todo.subtasks) {
      todo.subtasks = [];
    }

    const newSubtask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title,
      completed: false,
      expanded: true,
      subtasks: [],
      createdAt: new Date().toISOString()
    };

    // 如果指定了父子任务，添加到父子任务下
    if (parentSubtaskId) {
      const parentSubtask = this._findSubtask(todo.subtasks, parentSubtaskId);
      if (parentSubtask) {
        if (!parentSubtask.subtasks) {
          parentSubtask.subtasks = [];
        }
        parentSubtask.subtasks.push(newSubtask);
      } else {
        return null;
      }
    } else {
      // 添加到顶层
      todo.subtasks.push(newSubtask);
    }

    todo.updatedAt = new Date().toISOString();
    await this.saveTodos(todos);
    return newSubtask;
  },

  // 更新子任务
  async updateSubtask(todoId, subtaskId, updates) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      const subtask = this._findSubtask(todo.subtasks, subtaskId);
      if (subtask) {
        Object.assign(subtask, updates);
        todo.updatedAt = new Date().toISOString();
        await this.saveTodos(todos);
        return subtask;
      }
    }
    return null;
  },

  // 切换子任务完成状态
  async toggleSubtask(todoId, subtaskId) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      const subtask = this._findSubtask(todo.subtasks, subtaskId);
      if (subtask) {
        subtask.completed = !subtask.completed;
        todo.updatedAt = new Date().toISOString();
        await this.saveTodos(todos);
        return subtask;
      }
    }
    return null;
  },

  // 切换子任务展开状态
  async toggleSubtaskExpanded(todoId, subtaskId) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      const subtask = this._findSubtask(todo.subtasks, subtaskId);
      if (subtask) {
        subtask.expanded = !subtask.expanded;
        todo.updatedAt = new Date().toISOString();
        await this.saveTodos(todos);
        return subtask;
      }
    }
    return null;
  },

  // 删除子任务
  async deleteSubtask(todoId, subtaskId) {
    const todos = await this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      const deleted = this._deleteSubtaskRecursive(todo.subtasks, subtaskId);
      if (deleted) {
        todo.updatedAt = new Date().toISOString();
        await this.saveTodos(todos);
        return true;
      }
    }
    return false;
  }
};
