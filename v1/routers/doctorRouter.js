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
      doctorService.getNextDayScheduleConfirmations(req.user._id, schedules => {
        res.send(schedules);
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

  app.get(
    routes.GET_TODAYS_BOOKINGS,
    passport.authenticate("jwt"),
    (req, res) => {
      doctorService.getTodaysBookings(req.user._id, bookings => {
        res.send(bookings);
      });
    }
  );

  app.get(
    routes.GET_QR_BOOKING_DETAIL + "/:bookingId",
    passport.authenticate("jwt"),
    (req, res) => {
      const userId = req.user._id;
      const { bookingId } = req.params;
      doctorService.getBookingDetail(
        userId,
        bookingId,
        (status, message, bookingDetail) => {
          res.send({ status, message, bookingDetail });
        }
      );
    }
  );

  app.put(
    routes.CONFIRM_VISITING + "/:bookingId",
    passport.authenticate("jwt"),
    (req, res) => {
      const userId = req.user._id;
      const { bookingId } = req.params;
      doctorService.confirmVisit(bookingId, status => {
        res.send({ status });
      });
    }
  );

  app.post(
    routes.VERIFY_BOOKING_OTP,
    passport.authenticate("jwt"),
    async (req, res) => {
      const { otp, bookingId } = req.body;
      try {
        const data = await doctorService.verifyBookingOtp(bookingId, otp);
        res.send(data);
      } catch (err) {
        res.send({ status: false, message: "Unknown error!" });
      }
    }
  );

  app.get(
    routes.GET_BOOKING_STATUS + "/:bookingId",
    passport.authenticate("jwt"),
    async (req, res) => {
      try {
        const bookingStatus = await doctorService.getBookingStatus(
          req.params.bookingId
        );
        res.send({ status: bookingStatus });
      } catch (err) {
        res.send({ status: null });
      }
    }
  );
};
