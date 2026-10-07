import api from "./api";

export const issueFine = async (payload) => {
  return api.post("/fines/issue", payload);
};

export const getWardenFines = async () => {
  return api.get("/fines/warden");
};

export const getStudentFines = async () => {
  return api.get("/fines/student");
};

export const getMyFines = async () => api.get("/fines/my");

export const getFineById = async (id) => {
  return api.get(`/fines/${id}`);
};

export const downloadPaymentProof = async (fineId) => {
  return api.get(`/fines/${fineId}/payment-proof`, {
    responseType: "blob",
  });
};

export const uploadPaymentProof = async (fineId, formData) => {
  return api.post(`/fines/${fineId}/upload-proof`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const updateFineStatus = async (fineId, payload) => {
  return api.patch(`/fines/${fineId}/status`, payload);
};

export const deleteFine = async (fineId) => {
  return api.delete(`/fines/${fineId}`);
};

export const searchStudents = async (query) => {
  return api.get(`/fines/search/students?query=${encodeURIComponent(query)}`);
};
