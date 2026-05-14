import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { clientsApi } from '../api/clients.api';

export const fetchClients = createAsyncThunk('clients/fetch', async (params, { rejectWithValue }) => {
  try { const r = await clientsApi.list(params); return r.data.data; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

export const fetchClient = createAsyncThunk('clients/fetchOne', async (id, { rejectWithValue }) => {
  try { const r = await clientsApi.get(id); return r.data.data.client; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

export const createClient = createAsyncThunk('clients/create', async (data, { rejectWithValue }) => {
  try { const r = await clientsApi.create(data); return r.data.data.client; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

export const updateClient = createAsyncThunk('clients/update', async ({ id, data }, { rejectWithValue }) => {
  try { const r = await clientsApi.update(id, data); return r.data.data.client; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

export const deleteClient = createAsyncThunk('clients/delete', async (id, { rejectWithValue }) => {
  try { await clientsApi.remove(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

export const fetchServices = createAsyncThunk('clients/fetchServices', async (_, { rejectWithValue }) => {
  try { const r = await clientsApi.listServices(); return r.data.data.services; }
  catch (e) { return rejectWithValue(e.response?.data?.error?.message || 'Failed'); }
});

const clientsSlice = createSlice({
  name: 'clients',
  initialState: {
    items:         [],
    total:         0,
    currentClient: null,
    services:      [],
    loading:       false,
    saving:        false,
    error:         null,
  },
  reducers: {
    clearCurrentClient: (s) => { s.currentClient = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchClients.fulfilled, (s, a) => { s.loading = false; s.items = a.payload.clients; s.total = a.payload.total; })
      .addCase(fetchClients.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchClient.fulfilled,  (s, a) => { s.currentClient = a.payload; })

      .addCase(createClient.pending,   (s) => { s.saving = true; })
      .addCase(createClient.fulfilled, (s, a) => { s.saving = false; s.items.unshift(a.payload); s.total += 1; })
      .addCase(createClient.rejected,  (s, a) => { s.saving = false; s.error = a.payload; })

      .addCase(updateClient.fulfilled, (s, a) => {
        const i = s.items.findIndex((c) => c._id === a.payload._id);
        if (i !== -1) s.items[i] = a.payload;
        if (s.currentClient?._id === a.payload._id) s.currentClient = a.payload;
      })

      .addCase(deleteClient.fulfilled, (s, a) => { s.items = s.items.filter((c) => c._id !== a.payload); s.total -= 1; })

      .addCase(fetchServices.fulfilled, (s, a) => { s.services = a.payload; });
  },
});

export const { clearCurrentClient } = clientsSlice.actions;
export default clientsSlice.reducer;
