import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import usersReducer from './usersSlice'
import deptsReducer from './deptsSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    depts: deptsReducer,
  },
})

export default store
