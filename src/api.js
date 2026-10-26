let password = sessionStorage.getItem("adminPw") || "";
export const hasPassword = () => !!password;
export const getPassword = () => password;
export const setPassword = (p) => {
  password = p;
  sessionStorage.setItem("adminPw", p);
};
export const clearPassword = () => {
  password = "";
  sessionStorage.removeItem("adminPw");
};

export const getMediaUrl = (url) => {
  if (!url) return "";
  if (!password) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}auth=${encodeURIComponent(password)}`;
};

async function req(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "x-admin-password": password, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hiba történt");
  return data;
}
export const getUsers = () => req("/api/users");
export const getImages = (id) =>
  req(id === "all" ? "/api/images/all" : `/api/users/${id}/images`);
export const getAllImages = () => req("/api/images/all");
export const login = () => req("/api/login", { method: "POST" });
export const createUser = (body) =>
  req("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const updateUser = (id, body) =>
  req(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const reorderUsers = (ids) =>
  req("/api/users/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
export const deleteUser = (id) => req(`/api/users/${id}`, { method: "DELETE" });
export const deleteImage = (id) =>
  req(`/api/images/${id}`, { method: "DELETE" });
export const updateImage = (id, body) =>
  req(`/api/images/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const uploadImages = (id, files) => {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  return req(`/api/users/${id}/images`, { method: "POST", body: fd });
};

