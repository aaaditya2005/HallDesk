import api from "./api";

export const getStudentCertificates = async () => {
  return api.get("/certificates/student");
};

export const getHallCertificates = async () => {
  return api.get("/certificates/hall");
};

export const getCertificateById = async (id) => {
  return api.get(`/certificates/${id}`);
};

export const requestCertificate = async (payload) => {
  return api.post("/certificates/request", payload);
};

export const approveCertificate = async (id, payload) => {
  return api.patch(`/certificates/${id}/approve`, payload);
};

export const rejectCertificate = async (id, payload) => {
  return api.patch(`/certificates/${id}/reject`, payload);
};

export const deleteCertificate = async (id, deletionReason = "") => {
  return api.delete(`/certificates/${id}`, { data: { deletionReason } });
};

export const uploadStampAndSignature = async (formData) => {
  return api.post("/certificates/upload/stamp-signature", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const downloadApprovedCertificate = async (id) => {
  return api.patch(`/certificates/${id}/download`);
};

export const downloadApprovedCertificateFile = async (id) => {
  return api.get(`/certificates/${id}/file`, {
    responseType: "blob",
  });
};
