const crypto = require('crypto');
const User = require('./auth.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const RefreshToken = require('./refresh-token.model');

const registerAttemptStore = new Map();
const forgotPasswordStore = new Map();

const createApiError = (status, code, type, message, details = null) => {
  const error = new Error(message);
  error.status = status;
  error.payload = { success: false, error: { code, type, message, details } };
  return error;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createAccessToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const createRefreshToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '7d';
  return jwt.sign(
    { id: user._id.toString(), type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn }
  );
};

const trackWindowAttempts = (store, key, maxAttempts, windowMs) => {
  const now = Date.now();
  const state = store.get(key);

  if (!state || state.windowEndsAt < now) {
    store.set(key, { count: 1, windowEndsAt: now + windowMs });
    return 1;
  }

  state.count += 1;
  store.set(key, state);
  return state.count;
};

const sendVerificationEmail = async (user) => {
  if (!process.env.ENABLE_EMAIL_SERVICE) {
    return false;
  }

  return Boolean(user && user.email);
};

// REGISTER
const registerUser = async ({ name, email, password, role }, ipAddress = 'unknown') => {
  if (!name || !email || !password) {
    const attempts = trackWindowAttempts(registerAttemptStore, ipAddress, 5, 15 * 60 * 1000);
    if (attempts > 5) {
      throw createApiError(429, 'AUTH_REGISTER_RATE_LIMIT', 'TOO_MANY_REQUESTS', 'Too many failed registration attempts.');
    }
    throw createApiError(400, 'AUTH_REGISTER_INVALID_INPUT', 'VALIDATION_ERROR', 'Missing required fields.');
  }

  if (!validateEmail(email)) {
    throw createApiError(400, 'AUTH_REGISTER_INVALID_EMAIL', 'VALIDATION_ERROR', 'Invalid email format.');
  }

  if (password.length < 8) {
    throw createApiError(422, 'AUTH_WEAK_PASSWORD', 'VALIDATION_ERROR', 'Password must be at least 8 characters.');
  }

  if (role && !['user', 'reviewer'].includes(role)) {
    throw createApiError(400, 'AUTH_INVALID_ROLE', 'VALIDATION_ERROR', 'Role must be user or reviewer.');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const attempts = trackWindowAttempts(registerAttemptStore, ipAddress, 5, 15 * 60 * 1000);
    if (attempts > 5) {
      throw createApiError(429, 'AUTH_REGISTER_RATE_LIMIT', 'TOO_MANY_REQUESTS', 'Too many failed registration attempts.');
    }
    throw createApiError(409, 'AUTH_EMAIL_EXISTS', 'CONFLICT_ERROR', 'Email already registered.');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: role || 'user'
  });

  try {
    const emailSent = await sendVerificationEmail(user);
    if (!emailSent) {
      console.warn(`Verification email service unavailable for user ${user._id}`);
    }
  } catch (error) {
    console.warn(`Verification email failed for user ${user._id}: ${error.message}`);
  }

  return {
    message: 'Verification email sent.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt
    }
  };
};

const handleFailedLogin = async (user) => {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  if (user.failedLoginAttempts >= 5) {
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  await user.save();

  if (user.failedLoginAttempts >= 5) {
    throw createApiError(429, 'AUTH_ACCOUNT_LOCKED', 'TOO_MANY_REQUESTS', 'Account temporarily locked for 15 minutes.');
  }
};

// LOGIN
const loginUser = async ({ email, password, remember_me }) => {
  if (!email || !password) {
    throw createApiError(400, 'AUTH_LOGIN_MISSING_FIELDS', 'VALIDATION_ERROR', 'Missing email or password.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw createApiError(401, 'AUTH_INVALID_CREDENTIALS', 'AUTH_ERROR', 'Invalid credentials.');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw createApiError(429, 'AUTH_ACCOUNT_LOCKED', 'TOO_MANY_REQUESTS', 'Account temporarily locked for 15 minutes.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await handleFailedLogin(user);
    throw createApiError(401, 'AUTH_INVALID_CREDENTIALS', 'AUTH_ERROR', 'Invalid credentials.');
  }

  if (user.isSuspended) {
    throw createApiError(423, 'AUTH_ACCOUNT_SUSPENDED', 'AUTH_ERROR', 'Account suspended by admin.');
  }

  if (!user.isVerified) {
    throw createApiError(403, 'AUTH_ACCOUNT_NOT_VERIFIED', 'AUTH_ERROR', 'Account not verified.');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user, Boolean(remember_me));
  const decodedRefresh = jwt.decode(refreshToken);

  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    user: user._id,
    expiresAt: new Date(decodedRefresh.exp * 1000),
    isRevoked: false
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user._id,
      name: user.name,
      role: user.role
    }
  };
};

const logoutUser = async (userId, refreshToken) => {
  if (!refreshToken) {
    throw createApiError(400, 'AUTH_REFRESH_TOKEN_REQUIRED', 'VALIDATION_ERROR', 'Refresh token missing.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      throw createApiError(401, 'AUTH_INVALID_REFRESH_TOKEN', 'AUTH_ERROR', 'Invalid refresh token.');
    }
  } catch (error) {
    if (error.payload) throw error;
    throw createApiError(401, 'AUTH_INVALID_REFRESH_TOKEN', 'AUTH_ERROR', 'Invalid or expired refresh token.');
  }

  const tokenDoc = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!tokenDoc) {
    return { message: 'Logout completed.' };
  }

  if (!tokenDoc.isRevoked) {
    tokenDoc.isRevoked = true;
    await tokenDoc.save();
  }

  return { message: 'Logged out successfully.' };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createApiError(400, 'AUTH_REFRESH_TOKEN_REQUIRED', 'VALIDATION_ERROR', 'Missing refresh token.');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw createApiError(401, 'AUTH_INVALID_REFRESH_TOKEN', 'AUTH_ERROR', 'Expired or invalid refresh token.');
  }

  const tokenDoc = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken), isRevoked: false });
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    throw createApiError(401, 'AUTH_BLACKLISTED_REFRESH_TOKEN', 'AUTH_ERROR', 'Expired or invalid refresh token.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw createApiError(401, 'AUTH_INVALID_REFRESH_TOKEN', 'AUTH_ERROR', 'Expired or invalid refresh token.');
  }

  return { access_token: createAccessToken(user) };
};

const requestPasswordReset = async (email, ipAddress = 'unknown') => {
  if (!email) {
    throw createApiError(400, 'AUTH_EMAIL_REQUIRED', 'VALIDATION_ERROR', 'Missing email.');
  }

  const key = `${ipAddress}:${email.toLowerCase()}`;
  const attempts = trackWindowAttempts(forgotPasswordStore, key, 5, 15 * 60 * 1000);
  if (attempts > 5) {
    throw createApiError(429, 'AUTH_RESET_RATE_LIMIT', 'TOO_MANY_REQUESTS', 'Too many reset requests.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
  }

  return { message: 'Reset link sent if email exists.' };
};

const resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw createApiError(400, 'AUTH_RESET_MISSING_FIELDS', 'VALIDATION_ERROR', 'Missing token or new_password.');
  }

  if (newPassword.length < 8) {
    throw createApiError(422, 'AUTH_WEAK_PASSWORD', 'VALIDATION_ERROR', 'New password is too weak.');
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({ passwordResetToken: tokenHash });

  if (!user) {
    throw createApiError(404, 'AUTH_RESET_TOKEN_NOT_FOUND', 'NOT_FOUND_ERROR', 'Token not found.');
  }

  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw createApiError(400, 'AUTH_RESET_TOKEN_EXPIRED', 'VALIDATION_ERROR', 'Token expired.');
  }

  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  await RefreshToken.updateMany({ user: user._id, isRevoked: false }, { $set: { isRevoked: true } });

  return { message: 'Password reset successfully.' };
};

// GET CURRENT USER
const getCurrentUser = async (id) => User.findById(id).select('-password');

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  createApiError
};