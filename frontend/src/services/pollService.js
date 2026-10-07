import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const token = () => localStorage.getItem("token");

export const getPolls = (status = "All") =>
  axios.get(`${API}/polls`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
    params: {
      status,
    },
  });

export const getPoll = (id) =>
  axios.get(`${API}/polls/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });

export const votePoll = (id, selectedOption) =>
  axios.post(
    `${API}/polls/${id}/vote`,
    { selectedIndex: selectedOption },
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  );

export const createPoll = (data) =>
  axios.post(
    `${API}/polls`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  );

export const deletePoll = (id) =>
  axios.delete(`${API}/polls/${id}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  });
