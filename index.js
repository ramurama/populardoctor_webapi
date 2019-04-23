const express = require('express');
const mongoose = require('mongoose');
const keys = require('./config/keys');
const cookieSession = require('cookie-session');
const passport = require('passport');
const bodyParser = require('body-parser');

//v1 models
require('./v1/models/User');
require('./v1/models/MobileOtp');
require('./v1/models/BookingOtp');
require('./v1/models/Specialization');
require('./v1/models/Location');
require('./v1/models/Hospital');
require('./v1/models/Doctor');
require('./v1/models/Schedule');
require('./v1/models/TokenTable');
require('./v1/models/Booking');
require('./v1/models/AutoNumber');
require('./v1/models/UserSupport');
require('./v1/models/Announcement');
require('./v1/models/DoctorPdNumber');
require('./v1/models/HospitalPdNumber');

//v1 services
require('./v1/services/passport');
require('./v1/services/settingsService');
require('./v1/services/customerService');
require('./v1/services/adminService');
require('./v1/services/doctorService');
require('./v1/services/frontdeskService');

//v1 routers
const authRouterV1 = require('./v1/routers/authRouter');
const settingsRouterV1 = require('./v1/routers/settingsRouter');
const notificationRouterV1 = require('./v1/routers/notificationRouter');
const customerRouterV1 = require('./v1/routers/customerRouter');
const adminRouterV1 = require('./v1/routers/adminRouter');
const doctorRouterV1 = require('./v1/routers/doctorRouter');
const frontdeskRouterV1 = require('./v1/routers/frontdeskRouter');

mongoose.connect(keys.mongoURI, { useNewUrlParser: true });

const app = express();

app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey]
  })
);
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(passport.session());
app.use(express.static('adminclient/dist'));
authRouterV1(app);
settingsRouterV1(app);
notificationRouterV1(app);
customerRouterV1(app);
adminRouterV1(app);
doctorRouterV1(app);
frontdeskRouterV1(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT);
