import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = sessionStorage.getItem("access_token");
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = sessionStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${
              import.meta.env.MODE === "development"
                ? "http://localhost:5001/api"
                : "/api"
            }/auth/refresh`,
            { refreshToken }
          );

          sessionStorage.setItem("access_token", data.accessToken);
          sessionStorage.setItem("refresh_token", data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          window.location.href = "/login"; // Redirect to login
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
