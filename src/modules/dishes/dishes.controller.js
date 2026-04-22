const {
  listDishesByRestaurant,
  createDishForRestaurant,
  updateDishForRestaurant,
  deleteDishForRestaurant
} = require('./dishes.service');

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

const listDishes = async (req, res) => {
  try {
    const result = await listDishesByRestaurant(req.restaurant._id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const addDish = async (req, res) => {
  try {
    const result = await createDishForRestaurant(req.restaurant._id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const updateDish = async (req, res) => {
  try {
    const result = await updateDishForRestaurant(req.restaurant._id, req.params.dish_id, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const deleteDish = async (req, res) => {
  try {
    const result = await deleteDishForRestaurant(req.restaurant._id, req.params.dish_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  listDishes,
  addDish,
  updateDish,
  deleteDish
};
