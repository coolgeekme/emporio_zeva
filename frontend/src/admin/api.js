// Shared admin API helpers: axios instance with auto-attached bearer token.
import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const TOKEN_KEY = "ez_admin_token";
export const USER_KEY = "ez_admin_user";

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function adminClient(token) {
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function formatApiErrorDetail(detail, fallback = "Something went wrong. Please try again.") {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return (
      detail
        .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
        .filter(Boolean)
        .join(" ") || fallback
    );
  if (detail && typeof detail.msg === "string") return detail.msg;
  return fallback;
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export const ROLES = ["admin", "editor", "viewer"];
