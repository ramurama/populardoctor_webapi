require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const keys = require("./config/keys");
const cookieSession = require("cookie-session");
const passport = require("passport");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

//models
require("./models/User");
require("./models/MobileOtp");
require("./models/BookingOtp");
require("./models/Specialization");
require("./models/Location");
require("./models/Hospital");
require("./models/Doctor");
require("./models/Schedule");
require("./models/TokenTable");
require("./models/Booking");
require("./models/AutoNumber");
require("./models/UserSupport");
require("./models/Announcement");
require("./models/DoctorPdNumber");
require("./models/HospitalPdNumber");
require("./models/Scores");

//v1 services
require("./v1/services/passport");
require("./v1/services/settingsService");
require("./v1/services/customerService");
require("./v1/services/adminService");
require("./v1/services/doctorService");
require("./v1/services/frontdeskService");
require("./v1/services/scoringService");

//v1 routers
const authRouterV1 = require("./v1/routers/authRouter");
const settingsRouterV1 = require("./v1/routers/settingsRouter");
const notificationRouterV1 = require("./v1/routers/notificationRouter");
const customerRouterV1 = require("./v1/routers/customerRouter");
const adminRouterV1 = require("./v1/routers/adminRouter");
const doctorRouterV1 = require("./v1/routers/doctorRouter");
const frontdeskRouterV1 = require("./v1/routers/frontdeskRouter");
const scoringEngineRouterV1 = require("./v1/routers/scoringRouter");

//file uploader setup begins
const diskStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, __dirname + "/doctor-profile-images");
  },
  filename: (req, file, callback) => {
    const extension = file.originalname.split(".")[1];
    const filename = `${req.params.doctorPdNumber}.${extension}`;
    callback(null, filename);
  }
});
const uploader = multer({ storage: diskStorage });
//file uploader setup ends

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
app.use(express.static("adminclient/dist"));
authRouterV1(app);
settingsRouterV1(app);
notificationRouterV1(app);
customerRouterV1(app);
adminRouterV1(app, uploader);
doctorRouterV1(app);
frontdeskRouterV1(app);
scoringEngineRouterV1(app);

//for admin client send the admin panel
// app.use(express.static(path.join(__dirname, "build")));
// app.get("/", function(req, res) {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT);
