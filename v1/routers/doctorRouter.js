const routes = require("../constants/routes");
const passport = require("passport");
const doctorService = require("../services/doctorService");

module.exports = app => {
  app.post(
    routes.CONFIRM_SCHEDULE,
    passport.authenticate("jwt"),
    (req, res) => {
      const { userId, scheduleId, tokenDate } = req.body;
      doctorService.createTokenTable(userId, scheduleId, tokenDate, status => {
        res.send({ status });
      });
    }
  );
};
