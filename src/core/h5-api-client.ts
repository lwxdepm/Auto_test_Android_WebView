import { H5Runtime } from './h5-runtime.js'

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string
  code?: string
}

export class H5ApiClient {
  static async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    return H5Runtime.execute(async (httpMethod, apiPath, payload) => {
      const token = localStorage.getItem('cx-token')
      if (!token) {
        throw new Error('当前 WebView 未登录，无法调用测试数据 API')
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
      if (httpMethod === 'GET') {
        headers['Cache-Control'] = 'no-cache, no-store, max-age=0'
        headers.Pragma = 'no-cache'
      }

      const init: RequestInit = {
        method: httpMethod,
        headers,
        cache: httpMethod === 'GET' ? 'no-store' : undefined,
      }
      // WebDriver execute 参数会把 undefined 序列化成 null；GET/HEAD 携带 body 会被浏览器直接拒绝。
      // 与前端 api.get 行为保持一致：GET 仅带 method/headers/cache，POST/PUT 等有 payload 时才带 body。
      if (httpMethod !== 'GET' && payload !== undefined && payload !== null) {
        init.body = JSON.stringify(payload)
      }

      const response = await fetch(`/api${apiPath}`, init)
      const json = await response.json().catch(() => ({})) as ApiEnvelope<T>
      if (!response.ok || json.success === false) {
        throw new Error(json.error || `${httpMethod} /api${apiPath} HTTP ${response.status}`)
      }
      return json.data as T
    }, method, path, body)
  }

  static get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  static post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  static put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  static delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body)
  }
}
