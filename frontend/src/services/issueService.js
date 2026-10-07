import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const token = () =>
    localStorage.getItem("token");

export const getMyIssues = () =>

    axios.get(

        `${API}/issues/my`,

        {

            headers: {

                Authorization:

                    `Bearer ${token()}`,

            },

        }

    );
export const createIssue = (data) =>

    axios.post(

        `${API}/issues`,

        data,

        {

            headers: {

                Authorization:

                    `Bearer ${token()}`,

                "Content-Type":

                    "multipart/form-data",

            },

        }

    );

export const getIssue = (id) =>

    axios.get(

        `${API}/issues/${id}`,

        {

            headers: {

                Authorization:

                    `Bearer ${token()}`,

            },

        }

    );

export const updateIssue = (id, data) =>

    axios.put(

        `${API}/issues/${id}`,

        data,

        {

            headers: {

                Authorization:
                    `Bearer ${token()}`,

                "Content-Type":
                    "multipart/form-data",

            },

        }

    );

export const deleteIssue = (id) =>

    axios.delete(

        `${API}/issues/${id}`,

        {

            headers: {

                Authorization:
                    `Bearer ${token()}`,

            },

        }

    );