const routes = require("./routes");
const passport = require("passport");
const settingsService = require("../services/settingsService");
const messageService = require("../services/messageService");

module.exports = app => {
  app.post(routes.SIGNUP_CUSTOMER, (req, res) => {
    settingsService.signUpUser(req.body, status => {
      if (status) {
        res.send({ status, message: "Signed up successfully." });
      } else {
        res.send({ status, message: "Error signing up user." });
      }
    });
  });

  app.post(routes.SEND_OTP, (req, res) => {
    messageService.sendOtpByUserMobileNumber(req.body.mobile, status => {
      if (status) {
        res.send({ status, message: "OTP sent to mobile number." });
      } else {
        res.send({ status, message: "Error sending OTP." });
      }
    });
  });

  app.post(
    routes.CHANGE_PASSWORD,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      settingsService.changePassword(
        req.user.username,
        req.body,
        (status, message) => {
          res.send({ status, message });
        }
      );
    }
  );

  app.post(
    routes.UPDATE_DEVICE_TOKEN,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      settingsService.updateDeviceToken(
        req.user.username,
        req.body.deviceToken,
        status => {
          res.send({ status });
        }
      );
    }
  );

  app.post(routes.USER_VERIFY_OTP, (req, res) => {
    const { mobile, otp } = req.body;
    settingsService.verifyOtp(mobile, otp, (status, message) => {
      res.send({ status, message });
    });
  });

  app.get(routes.IS_MOBILE_NUMBER_EXISTS + "/:mobile", (req, res) => {
    const { mobile } = req.params;
    settingsService.isMobileNumberExists(mobile, status => {
      res.send({ status });
    });
  });

  app.get(routes.GET_SUPPORT_DETAILS, async (req, res) => {
    try {
      const support = await settingsService.getSupportDetails();
      res.send(support);
    } catch (err) {
      res.send({});
    }
  });

  app.put(routes.RESET_PASSWORD, (req, res) => {
    const { mobile, password } = req.body;
    settingsService.resetPassword(mobile, password, (status, message) => {
      res.send({status, message})
    })
  })
};
