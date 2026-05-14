import { configureStore } from '@reduxjs/toolkit'
import authReducer         from './authSlice'
import usersReducer        from './usersSlice'
import deptsReducer        from './deptsSlice'
import notificationReducer from './notificationSlice'
import leadsReducer        from './leadsSlice'
import clientsReducer      from './clientsSlice'

const store = configureStore({
  reducer: {
    auth:          authReducer,
    users:         usersReducer,
    depts:         deptsReducer,
    notifications: notificationReducer,
    leads:         leadsReducer,
    clients:       clientsReducer,
  },
})

export default store
