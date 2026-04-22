const express = require('express');
const app = express();
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

app.use(express.json());

/*
const userRoute = require('./routes/userRoutes')
app.use('/users',userRoute);


app.get('/', (req, res) => {
  res.send('FoodScope API running');
});

module.exports = app;
*/

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/restaurants', require('./modules/restaurants/restaurants.routes'));
app.use('/api/reviews', require('./modules/reviews/reviews.routes'));
app.use('/api/search', require('./modules/search/search.routes'));
app.use('/api/geo', require('./modules/geo/geo.routes'));
app.use('/api/reviews', require('./modules/comments/comments.routes'));
app.use('/api', require('./modules/tags/tags.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));

app.get('/', (req, res) => {
  res.send('API running');
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;