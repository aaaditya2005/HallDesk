import { useEffect, useState } from "react";
import api from "../services/api";
import { AuthContext } from "./authContextValue.js";

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
    const [token, setToken] = useState(() => localStorage.getItem("token"));

    useEffect(() => {
        if (!token) return undefined;

        let mounted = true;
        api.get("/auth/me")
            .then(({ data }) => {
                if (mounted && data.user) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    setUser(data.user);
                }
            })
            .catch(() => {
                // The API interceptor handles invalid sessions globally.
            });

        return () => {
            mounted = false;
        };
    }, [token]);

    const login = (userData, tokenData) => {

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

        localStorage.setItem(
            "token",
            tokenData
        );

        setUser(userData);

        setToken(tokenData);

    };

    const logout = () => {

        localStorage.removeItem("user");

        localStorage.removeItem("token");

        setUser(null);

        setToken(null);

    };

    return (

        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
            }}
        >

            {children}

        </AuthContext.Provider>

    );

}
