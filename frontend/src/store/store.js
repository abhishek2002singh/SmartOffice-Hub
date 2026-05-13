import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import usersReducer from './usersSlice'
import deptsReducer from './deptsSlice'
import notificationReducer from './notificationSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    depts: deptsReducer,
    notifications: notificationReducer,
  },
})

export default store
