import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/notifications', { params })
    return data.data
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed') }
})

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await api.patch(`/notifications/${id}/read`)
    return id
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed') }
})

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await api.patch('/notifications/read-all')
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed') }
})

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { list: [], unread: 0, loading: false },
  reducers: {
    pushNotification: (state, action) => {
      state.list.unshift(action.payload)
      state.unread += 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.notifications
        state.unread = action.payload.unread
      })
      .addCase(markRead.fulfilled, (state, action) => {
        const n = state.list.find((n) => n._id === action.payload)
        if (n && !n.isRead) { n.isRead = true; state.unread = Math.max(0, state.unread - 1) }
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.list.forEach((n) => { n.isRead = true })
        state.unread = 0
      })
  },
})

export const { pushNotification } = notificationSlice.actions
export default notificationSlice.reducer
