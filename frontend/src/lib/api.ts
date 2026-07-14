// This file replaces the direct Supabase client.
// It acts as a lightweight wrapper around standard fetch to talk to our Python Bridge API.

const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://backend1688-production.up.railway.app/api';

const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleUnauthorized = (response: Response) => {
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/'; // Simple redirect to reload app state
    }
};

export const api = {
    async get(endpoint: string) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: getHeaders()
        });
        handleUnauthorized(response);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },

    async patch(endpoint: string, data: any) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        handleUnauthorized(response);
        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.detail || `API Error: ${response.statusText}`);
        }
        return response.json();
    },

    async post(endpoint: string, data: any, customHeaders?: Record<string, string>) {
        const headers = { ...getHeaders(), ...customHeaders };
        
        let body;
        if (data instanceof URLSearchParams) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = data.toString();
        } else if (data instanceof FormData) {
            delete headers['Content-Type'];
            body = data;
        } else {
            body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body
        });
        handleUnauthorized(response);
        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            let errMsg = `API Error: ${response.statusText}`;
            if (errData?.detail) {
                if (typeof errData.detail === 'string') {
                    errMsg = errData.detail;
                } else if (Array.isArray(errData.detail)) {
                    errMsg = errData.detail.map((e: any) => e.msg).join(', ');
                } else {
                    errMsg = JSON.stringify(errData.detail);
                }
            }
            throw new Error(errMsg);
        }
        return response.json();
    },

    async delete(endpoint: string) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        handleUnauthorized(response);
        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.detail || `API Error: ${response.statusText}`);
        }
        return response.json();
    }
};
