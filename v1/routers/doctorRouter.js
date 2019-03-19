const routes = require("../constants/routes");
const passport = require("passport");
const doctorService = require("../services/doctorService");

module.exports = app => {
  app.post(
    routes.CONFIRM_SCHEDULE,
    passport.authenticate("jwt"),
    (req, res) => {
      const userId = req.user._id;
      const { scheduleId, tokenDate } = req.body;
      doctorService.createTokenTable(userId, scheduleId, tokenDate, status => {
        res.send({ status });
      });
    }
  );

  app.get(
    routes.GET_NEXT_DAY_SCHEDULE_CONFIRMATIONS,
    passport.authenticate("jwt"),
    (req, res) => {
      doctorService.getNextDayScheduleConfirmations(req.user._id, data => {
        res.send(data);
      });
    }
  );

  app.get(
    routes.GET_BOOKING_HISTORY_DR,
    passport.authenticate("jwt"),
    (req, res) => {
      doctorService.getBookingHistory(req.user._id, bookings => {
        res.send(bookings);
      });
    }
  );
};
