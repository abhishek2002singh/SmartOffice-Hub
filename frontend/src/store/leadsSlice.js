import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { leadsApi } from '../api/leads.api';

export const fetchLeads = createAsyncThunk('leads/fetch', async (params, { rejectWithValue }) => {
  try {
    const res = await leadsApi.list(params);
    return res.data.data;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to fetch leads'); }
});

export const fetchLead = createAsyncThunk('leads/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const res = await leadsApi.get(id);
    return res.data.data.lead;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to fetch lead'); }
});

export const createLead = createAsyncThunk('leads/create', async (data, { rejectWithValue }) => {
  try {
    const res = await leadsApi.create(data);
    return res.data.data.lead;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to create lead'); }
});

export const updateLead = createAsyncThunk('leads/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await leadsApi.update(id, data);
    return res.data.data.lead;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to update lead'); }
});

export const deleteLead = createAsyncThunk('leads/delete', async (id, { rejectWithValue }) => {
  try {
    await leadsApi.remove(id);
    return id;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to delete lead'); }
});

export const assignLead = createAsyncThunk('leads/assign', async ({ id, assignedTo }, { rejectWithValue }) => {
  try {
    const res = await leadsApi.assign(id, assignedTo);
    return res.data.data.lead;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to assign lead'); }
});

export const changeStage = createAsyncThunk('leads/changeStage', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await leadsApi.changeStage(id, data);
    return res.data.data.lead;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to change stage'); }
});

export const fetchSources = createAsyncThunk('leads/fetchSources', async (_, { rejectWithValue }) => {
  try {
    const res = await leadsApi.getSources();
    return res.data.data.sources;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to fetch sources'); }
});

export const fetchStats = createAsyncThunk('leads/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const res = await leadsApi.getStats();
    return res.data.data;
  } catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed to fetch stats'); }
});

const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    items:        [],
    total:        0,
    currentLead:  null,
    sources:      [],
    stats:        null,
    loading:      false,
    saving:       false,
    error:        null,
  },
  reducers: {
    clearCurrentLead: (state) => { state.currentLead = null; },
    clearError:       (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(fetchLeads.fulfilled,(s, a) => { s.loading = false; s.items = a.payload.leads; s.total = a.payload.total; })
      .addCase(fetchLeads.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchLead.fulfilled, (s, a) => { s.currentLead = a.payload; })

      .addCase(createLead.pending,  (s) => { s.saving = true; s.error = null; })
      .addCase(createLead.fulfilled,(s, a) => { s.saving = false; s.items.unshift(a.payload); s.total += 1; })
      .addCase(createLead.rejected, (s, a) => { s.saving = false; s.error = a.payload; })

      .addCase(updateLead.pending,  (s) => { s.saving = true; })
      .addCase(updateLead.fulfilled,(s, a) => {
        s.saving = false;
        const idx = s.items.findIndex((l) => l._id === a.payload._id);
        if (idx !== -1) s.items[idx] = a.payload;
        if (s.currentLead?._id === a.payload._id) s.currentLead = a.payload;
      })
      .addCase(updateLead.rejected, (s, a) => { s.saving = false; s.error = a.payload; })

      .addCase(deleteLead.fulfilled,(s, a) => { s.items = s.items.filter((l) => l._id !== a.payload); s.total -= 1; })

      .addCase(assignLead.fulfilled,(s, a) => {
        const idx = s.items.findIndex((l) => l._id === a.payload._id);
        if (idx !== -1) s.items[idx] = a.payload;
        if (s.currentLead?._id === a.payload._id) s.currentLead = a.payload;
      })

      .addCase(changeStage.fulfilled,(s, a) => {
        const idx = s.items.findIndex((l) => l._id === a.payload._id);
        if (idx !== -1) s.items[idx] = a.payload;
        if (s.currentLead?._id === a.payload._id) s.currentLead = a.payload;
      })

      .addCase(fetchSources.fulfilled, (s, a) => { s.sources = a.payload; })
      .addCase(fetchStats.fulfilled,   (s, a) => { s.stats = a.payload; });
  },
});

export const { clearCurrentLead, clearError } = leadsSlice.actions;
export default leadsSlice.reducer;
