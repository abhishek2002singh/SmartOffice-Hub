import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    return data.data.user
  } catch (err) {
    return rejectWithValue(err.response?.data?.error?.message || 'Login failed')
  }
})

export const fetchMeThunk = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me')
    return data.data.user
  } catch (err) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return rejectWithValue(err.response?.data?.error?.message || 'Session expired')
  }
})

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') })
  } catch { /* ignore */ } finally {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null })
      .addCase(loginThunk.fulfilled, (state, action) => { state.loading = false; state.user = action.payload })
      .addCase(loginThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // fetchMe
      .addCase(fetchMeThunk.pending, (state) => { state.loading = true })
      .addCase(fetchMeThunk.fulfilled, (state, action) => { state.loading = false; state.user = action.payload })
      .addCase(fetchMeThunk.rejected, (state) => { state.loading = false; state.user = null })

      // logout
      .addCase(logoutThunk.fulfilled, (state) => { state.user = null; state.loading = false })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
