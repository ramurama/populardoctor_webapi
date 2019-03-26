const routes = require("../constants/routes");
const passport = require("passport");
const frontdeskService = require("../services/frontdeskService");
const doctorService = require("../services/doctorService");

module.exports = app => {
  app.get(
    routes.GET_FD_TODAYS_BOOKINGS,
    passport.authenticate("jwt"),
    (req, res) => {
      const frontdeskUserId = req.user._id;
      frontdeskService.getTodaysBookings(frontdeskUserId, schedules => {
        res.send(schedules);
      });
    }
  );

  app.get(
    routes.GET_FD_QR_BOOKING_DETAIL + "/:bookingId",
    passport.authenticate("jwt"),
    (req, res) => {
      frontdeskService.getBookingDetail(
        req.user._id,
        req.params.bookingId,
        (status, message, bookingDetail) => {
          res.send({ status, message, bookingDetail });
        }
      );
    }
  );

  app.put(
    routes.CONFIRM_VISITING_FD + "/:bookingId",
    passport.authenticate("jwt"),
    (req, res) => {
      const { bookingId } = req.params;
      doctorService.confirmVisit(bookingId, status => {
        res.send({ status });
      });
    }
  );

  app.post(
    routes.VERIFY_BOOKING_OTP_FD,
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
    routes.GET_FD_BOOKING_STATUS + "/:bookingId",
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

  app.get(
    routes.GET_CONFIRMED_SCHEDULES_FD,
    passport.authenticate("jwt"),
    (req, res) => {
      const frontdeskUserId = req.user._id;
      frontdeskService.getConfirmedSchedules(
        frontdeskUserId,
        confirmedSchedules => {
          res.send(confirmedSchedules);
        }
      );
    }
  );

  app.put(
    routes.BLOCK_SCHEDULE_FD + "/:tokenTableId",
    passport.authenticate("jwt"),
    (req, res) => {
      const { tokenTableId } = req.params;
      doctorService.blockScheduleForTheDay(tokenTableId, status => {
        res.send({ status });
      });
    }
  );
};
