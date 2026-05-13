import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchUsers = createAsyncThunk('users/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/users', { params })
    return data.data
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch users') }
})

export const createUser = createAsyncThunk('users/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/users', payload)
    return data.data.user
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to create user') }
})

export const updateUser = createAsyncThunk('users/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/users/${id}`, payload)
    return data.data.user
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to update user') }
})

export const deleteUser = createAsyncThunk('users/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/users/${id}`)
    return id
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to delete user') }
})

const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], total: 0, loading: false, error: null },
  reducers: { clearUsersError: (state) => { state.error = null } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUsers.fulfilled, (state, action) => { state.loading = false; state.list = action.payload.users; state.total = action.payload.total })
      .addCase(fetchUsers.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createUser.fulfilled, (state, action) => { state.list.unshift(action.payload); state.total += 1 })
      .addCase(updateUser.fulfilled, (state, action) => { const i = state.list.findIndex((u) => u._id === action.payload._id); if (i !== -1) state.list[i] = action.payload })
      .addCase(deleteUser.fulfilled, (state, action) => { state.list = state.list.filter((u) => u._id !== action.payload); state.total -= 1 })
  },
})

export const { clearUsersError } = usersSlice.actions
export default usersSlice.reducer
