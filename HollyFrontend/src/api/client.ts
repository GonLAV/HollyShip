import { APIClient } from './api'
import { API_BASE_URL } from '../config'
import { useSessionStore } from '../state/session'

export const api = new APIClient(API_BASE_URL, () => useSessionStore.getState().token)
