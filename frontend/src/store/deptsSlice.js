import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/axios'

export const fetchDepts = createAsyncThunk('depts/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/departments')
    return data.data
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch departments') }
})

export const createDept = createAsyncThunk('depts/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/departments', payload)
    return data.data.department
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to create department') }
})

export const updateDept = createAsyncThunk('depts/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/departments/${id}`, payload)
    return data.data.department
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to update department') }
})

export const deleteDept = createAsyncThunk('depts/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/departments/${id}`)
    return id
  } catch (err) { return rejectWithValue(err.response?.data?.error?.message || 'Failed to delete department') }
})

const deptsSlice = createSlice({
  name: 'depts',
  initialState: { list: [], loading: false, error: null },
  reducers: { clearDeptsError: (state) => { state.error = null } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepts.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDepts.fulfilled, (state, action) => { state.loading = false; state.list = action.payload.departments })
      .addCase(fetchDepts.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createDept.fulfilled, (state, action) => { state.list.push(action.payload) })
      .addCase(updateDept.fulfilled, (state, action) => { const i = state.list.findIndex((d) => d._id === action.payload._id); if (i !== -1) state.list[i] = action.payload })
      .addCase(deleteDept.fulfilled, (state, action) => { state.list = state.list.filter((d) => d._id !== action.payload) })
  },
})

export const { clearDeptsError } = deptsSlice.actions
export default deptsSlice.reducer
