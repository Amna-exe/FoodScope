const {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  getCurrentUser
} = require('./auth.service');

const handleError = (res, err) => {
  if (err.payload) {
    return res.status(err.status || 500).json(err.payload);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      type: 'SERVER_ERROR',
      message: err.message || 'Something went wrong.',
      details: null
    }
  });
};

// REGISTER
const register = async (req, res) => {
  try {
    const result = await registerUser(req.body, req.ip);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

// GET ME
const getMe = async (req, res) => {
  try {
    const user = await getCurrentUser(req.user.id);
    res.json(user);
  } catch (err) {
    handleError(res, err);
  }
};

const logout = async (req, res) => {
  try {
    const result = await logoutUser(req.user.id, req.body.refresh_token);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const refresh = async (req, res) => {
  try {
    const result = await refreshAccessToken(req.body.refresh_token);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const result = await requestPasswordReset(req.body.email, req.ip);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const result = await resetPassword(req.body.token, req.body.new_password);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetUserPassword,
  getMe
};