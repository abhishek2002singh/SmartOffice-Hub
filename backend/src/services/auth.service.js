const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY });

const buildTokenPayload = (user) => ({
  userId: user._id,
  role: user.role,
  departmentId: user.department,
});

const login = async (email, password) => {
  const user = await User.findOne({ email, deletedAt: null, isActive: true }).select('+password +refreshTokens');
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const match = await user.comparePassword(password);
  if (!match) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokens.push(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  return { accessToken, refreshToken, user: user.toSafeObject() };
};

const refresh = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findOne({ _id: decoded.userId, deletedAt: null, isActive: true }).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(token)) {
    throw new AppError('Refresh token not found', 401, 'INVALID_REFRESH_TOKEN');
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (userId, token) => {
  const user = await User.findById(userId).select('+refreshTokens');
  if (user) {
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    await user.save();
  }
};

module.exports = { login, refresh, logout };
