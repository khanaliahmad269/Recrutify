import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

const ACCESS_KEY = 'recrutify_access_token'
const REFRESH_KEY = 'recrutify_refresh_token'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem(ACCESS_KEY, access_token)
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try a one-shot refresh and replay the original request.
let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/')) {
      return Promise.reject(error)
    }
    original._retry = true
    try {
      refreshing = refreshing || refreshRequest()
      const tokens = await refreshing
      refreshing = null
      tokenStore.set(tokens)
      original.headers.Authorization = `Bearer ${tokens.access_token}`
      return api(original)
    } catch (e) {
      refreshing = null
      tokenStore.clear()
      throw e
    }
  },
)

async function refreshRequest() {
  const refresh_token = tokenStore.getRefresh()
  if (!refresh_token) throw new Error('No refresh token')
  // Use a clean axios call so the interceptor doesn't recurse.
  const r = await axios.post(`${baseURL}/auth/refresh`, { refresh_token })
  return r.data
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: ({ email, password }) => {
    const body = new URLSearchParams()
    body.append('username', email)
    body.append('password', password)
    return axios
      .post(`${baseURL}/auth/login`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((r) => r.data)
  },
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (payload) => api.patch('/auth/me', payload).then((r) => r.data),
  changePassword: (payload) => api.post('/auth/me/password', payload).then((r) => r.data),
}

// Strip null/undefined/empty-string params so the URL stays clean.
function cleanParams(params = {}) {
  const out = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue
    out[k] = v
  }
  return out
}

export const jobsApi = {
  list: (params) => api.get('/jobs', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data),
  create: (payload) => api.post('/jobs', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/jobs/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/jobs/${id}`).then((r) => r.data),
  apply: (id, payload = {}) => api.post(`/jobs/${id}/apply`, payload).then((r) => r.data),
  applicationsForJob: (id, params) =>
    api.get(`/jobs/${id}/applications`, { params: cleanParams(params) }).then((r) => r.data),
  updateApplicationStatus: (jobId, applicationId, status) =>
    api.patch(`/jobs/${jobId}/applications/${applicationId}`, { status }).then((r) => r.data),
  myPostedJobs: (params) =>
    api.get('/me/employer/jobs', { params: cleanParams(params) }).then((r) => r.data),
}

export const companiesApi = {
  list: (params) => api.get('/companies', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => api.get(`/companies/${id}`).then((r) => r.data),
  myOwned: () => api.get('/companies/me/owned').then((r) => r.data),
  create: (payload) => api.post('/companies', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/companies/${id}`, payload).then((r) => r.data),
}

export const meApi = {
  applications: (params) =>
    api.get('/me/applications', { params: cleanParams(params) }).then((r) => r.data),
  savedJobs: (params) =>
    api.get('/me/saved-jobs', { params: cleanParams(params) }).then((r) => r.data),
  save: (jobId) => api.post(`/me/saved-jobs/${jobId}`).then((r) => r.data),
  unsave: (jobId) => api.delete(`/me/saved-jobs/${jobId}`).then((r) => r.data),
  getResume: () => api.get('/me/resume').then((r) => r.data),
  upsertResume: (payload) => api.put('/me/resume', payload).then((r) => r.data),
  deleteResume: () => api.delete('/me/resume').then((r) => r.data),
  jobMatches: (params) =>
    api.get('/me/job-matches', { params: cleanParams(params) }).then((r) => r.data),
  uploadResume: (file, onUploadProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post('/me/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then((r) => r.data)
  },
  downloadResume: async (fallbackName = 'resume') => {
    // Auth-protected endpoint: fetch as blob via the axios instance so the token header is sent,
    // then trigger a browser download via an object URL.
    const res = await api.get('/me/resume/file', { responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const match = /filename\*?="?([^";]+)"?/i.exec(cd)
    const filename = match?.[1] || fallbackName
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const matchingApi = {
  applicantScores: (jobId, params) =>
    api.get(`/jobs/${jobId}/applicant-scores`, { params: cleanParams(params) }).then((r) => r.data),
}

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  users: (params) => api.get('/admin/users', { params: cleanParams(params) }).then((r) => r.data),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload).then((r) => r.data),
  companies: (params) => api.get('/admin/companies', { params: cleanParams(params) }).then((r) => r.data),
  verifyCompany: (id, is_verified) =>
    api.patch(`/admin/companies/${id}/verify`, { is_verified }).then((r) => r.data),
  jobs: (params) => api.get('/admin/jobs', { params: cleanParams(params) }).then((r) => r.data),
  setJobActive: (id, is_active) =>
    api.patch(`/admin/jobs/${id}`, { is_active }).then((r) => r.data),
  deleteJob: (id) => api.delete(`/admin/jobs/${id}`).then((r) => r.data),
}
