const passport = require("passport");
const route = require("./routes");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const processStatus = require("../../constants/processStatus");
const userTypes = require("../../constants/userType");
const utils = require("../utils");
const activationStatus = require("../../constants/activationStatus");
const settingsService = require("../services/settingsService");

const success = {
  status: processStatus.SUCCESS
};

const failute = {
  status: processStatus.FAILURE
};

module.exports = app => {
  app.post(route.AUTH_ADMIN, passport.authenticate("local"), (req, res) => {
    res.send(success);
  });

  app.get(route.LOGOUT_ADMIN, (req, res) => {
    req.logout();
    res.send(success);
  });

  app.get(route.ADMIN_LOGIN_STATUS, (req, res) => {
    console.log(req.user);
    if (
      req.user &&
      utils.isStringsEqual(req.user.status, activationStatus.ACTIVE)
    ) {
      res.send(success);
    } else {
      res.send(failute);
    }
  });

  /**
   * User type CUSTOMER & DOCTOR can login as CUSTOMER.
   * Any other users will not be allowed to login.
   */
  app.post(route.AUTH_CUSTOMER, (req, res) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err || !user) {
        let response = null;
        settingsService.isMobileNumberExists(req.body.username, status => {
          if (status) {
            response = res.status(200).json({
              status: false,
              message: "Incorrect username or password!"
            });
          } else {
            response = res.status(200).json({
              status: false,
              message: "Mobile number not registered!"
            });
          }
        });
        return response;
      }
      //if user is blocked, notify him
      if (utils.isStringsEqual(user.status, activationStatus.INACTIVE)) {
        return res.status(200).json({
          status: false,
          message: "Your account has been blocked. Please contact support."
        });
      }
      //throw message if user is not customer/doctor
      if (
        user.userType != userTypes.CUSTOMER &&
        user.userType != userTypes.DOCTOR
      ) {
        return res.status(200).json({
          status: false,
          message: "User is not registered!"
        });
      }
      req.login(user, { session: false }, err => {
        if (err) {
          res.send(err);
        }
        const token = jwt.sign(JSON.stringify(user), keys.jwtKey);
        return res.json({
          status: true,
          token,
          message: "Logged in successfully.",
          userData: extractUserData(user)
        });
      });
    })(req, res);
  });

  /**
   * User type DOCTOR only can login as DOCTOR
   */
  app.post(route.AUTH_DOCTOR, (req, res) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err || !user) {
        let response = null;
        settingsService.isMobileNumberExists(req.body.username, status => {
          if (status) {
            response = res.status(200).json({
              status: false,
              message: "Incorrect username or password!"
            });
          } else {
            response = res.status(200).json({
              status: false,
              message: "Mobile number not registered!"
            });
          }
        });
        return response;
      }
      //if user is blocked, notify him
      if (utils.isStringsEqual(user.status, activationStatus.INACTIVE)) {
        return res.status(200).json({
          status: false,
          message: "Your account has been blocked. Please contact support."
        });
      }
      //throw message if user is not doctor
      if (user.userType != userTypes.DOCTOR) {
        return res.status(200).json({
          status: false,
          message: "User is not registered as Doctor!"
        });
      }
      req.login(user, { session: false }, err => {
        if (err) {
          res.send(err);
        }
        const token = jwt.sign(JSON.stringify(user), keys.jwtKey);
        return res.json({
          status: true,
          token,
          message: "Logged in successfully.",
          userData: extractUserData(user)
        });
      });
    })(req, res);
  });

  /**
   * User type FRONTDESK only can login as FRONTDESK
   */
  app.post(route.AUTH_FRONTDESK, (req, res) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err || !user) {
        let response = null;
        settingsService.isMobileNumberExists(req.body.username, status => {
          if (status) {
            response = res.status(200).json({
              status: false,
              message: "Incorrect username or password!"
            });
          } else {
            response = res.status(200).json({
              status: false,
              message: "Mobile number not registered!"
            });
          }
        });
        return response;
      }
      //if user is blocked, notify him
      if (utils.isStringsEqual(user.status, activationStatus.INACTIVE)) {
        return res.status(200).json({
          status: false,
          message: "Your account has been blocked. Please contact support."
        });
      }
      //throw message if user is not doctor
      if (user.userType != userTypes.FRONTDESK) {
        return res.status(200).json({
          status: false,
          message: "User is not registered as Front Desk user!"
        });
      }
      req.login(user, { session: false }, err => {
        if (err) {
          res.send(err);
        }
        const token = jwt.sign(JSON.stringify(user), keys.jwtKey);
        return res.json({
          status: true,
          token,
          message: "Logged in successfully.",
          userData: extractUserData(user)
        });
      });
    })(req, res);
  });

  app.get(
    "/api/v1/customer/welcome",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      res.send("Welcome, " + req.user.username);
      setTimeout(
        () => console.log("*************** after 1 minute" + req.user.username),
        1000 * 10 * 6 * 1
      );
    }
  );

  app.get(
    "/api/v1/doctor/welcome",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      res.send("Welcome, " + req.user.username);
      setTimeout(
        () => console.log("*************** after 1 minute" + req.user.username),
        1000 * 10 * 6 * 1
      );
    }
  );
};

function extractUserData(userRaw) {
  const { username, fullName, dateOfBirth, gender, favorites } = userRaw;
  return {
    fullName,
    mobile: username,
    gender,
    dateOfBirth
  };
}
