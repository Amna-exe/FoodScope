const {
  listRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  bookmarkRestaurant
} = require('./restaurants.service');

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

const getAllRestaurants = async (req, res) => {
  try {
    const result = await listRestaurants(req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const getSingleRestaurant = async (req, res) => {
  try {
    const role = req.user ? req.user.role : null;
    const result = await getRestaurantById(req.params.id, role);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const createNewRestaurant = async (req, res) => {
  try {
    const result = await createRestaurant(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const updateExistingRestaurant = async (req, res) => {
  try {
    const result = await updateRestaurant(req.params.id, req.user, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const removeRestaurant = async (req, res) => {
  try {
    const result = await deleteRestaurant(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const bookmarkRestaurantById = async (req, res) => {
  try {
    const result = await bookmarkRestaurant(req.params.id, req.user);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getAllRestaurants,
  getSingleRestaurant,
  createNewRestaurant,
  updateExistingRestaurant,
  removeRestaurant,
  bookmarkRestaurantById
};
