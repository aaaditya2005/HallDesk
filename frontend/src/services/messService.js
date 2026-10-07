import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const token = () => localStorage.getItem("token");

// ========== DAILY MENU SERVICES ==========
export const getDailyMenus = (startDate = null, endDate = null, hallId = null) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (hallId) params.hallId = hallId;

  return axios.get(`${API}/mess/menus`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
    params,
  });
};

export const getDailyMenuById = (id) =>
  axios.get(`${API}/mess/menus/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const createDailyMenu = (data) =>
  axios.post(`${API}/mess/menus`, data, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const updateDailyMenu = (id, data) =>
  axios.put(`${API}/mess/menus/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const deleteDailyMenu = (id) =>
  axios.delete(`${API}/mess/menus/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

// ========== MESS EXPENSE SERVICES ==========
export const getMessExpenses = (startDate = null, endDate = null, hallId = null) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (hallId) params.hallId = hallId;

  return axios.get(`${API}/mess/expenses`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
    params,
  });
};

export const getMessExpenseById = (id) =>
  axios.get(`${API}/mess/expenses/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const createMessExpense = (data) => {
  const formData = new FormData();
  
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.hallId) formData.append("hallId", data.hallId);
  
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((file) => {
      formData.append("attachments", file);
    });
  }

  return axios.post(`${API}/mess/expenses`, formData, {
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const updateMessExpense = (id, data) => {
  const formData = new FormData();
  
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.amount) formData.append("amount", data.amount);
  if (data.category) formData.append("category", data.category);
  
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((file) => {
      formData.append("attachments", file);
    });
  }

  return axios.put(`${API}/mess/expenses/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const deleteMessExpense = (id) =>
  axios.delete(`${API}/mess/expenses/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const deleteExpenseAttachment = (id, attachmentPath) =>
  axios.delete(`${API}/mess/expenses/${id}/attachment`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
    data: {
      attachmentPath,
    },
  });
