import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (refreshToken) {
      const { data } = await axiosInstance.post("/auth/refresh", {
        refreshToken,
      });

      if (data.accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${data.accessToken}`;

        sessionStorage.setItem("refresh_token", data.refreshToken);

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
