const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const salesmenRoutes = require('./salesmen');
const clientsRoutes = require('./clients');
const areasRoutes = require('./areas');
const statesRoutes = require('./states');
const citiesRoutes = require('./cities');
const otpRoutes = require('./otp');
const feedbackRoutes = require('./feedback');
const productsRoutes = require('./products');

const v1Routes = (app) => {
    app.use('/v1/auth', authRoutes);
    app.use('/v1/admin', adminRoutes);
    app.use('/v1/salesmen', salesmenRoutes);
    app.use('/v1/clients', clientsRoutes);
    app.use('/v1/areas', areasRoutes);
    app.use('/v1/states', statesRoutes);
    app.use('/v1/cities', citiesRoutes);
    app.use('/v1/otp', otpRoutes);
    app.use('/v1/feedback', feedbackRoutes);
    app.use('/v1/products', productsRoutes);
};

module.exports = v1Routes;
