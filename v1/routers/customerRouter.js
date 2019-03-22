const passport = require("passport");
const routes = require("../constants/routes");
const customerService = require("../services/customerService");
const settingsService = require("../services/settingsService");

module.exports = app => {
  app.get(
    routes.GET_INITIAL_DATA,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const specializations = customerService.getSpecializations();
      const locations = customerService.getLocations();
      const favorites = customerService.getFavorites(req.user.username);
      const support = settingsService.getSupportDetails();
      Promise.all([specializations, locations, favorites, support]).then(
        data => {
          res.send({
            specializations: data[0],
            locations: data[1],
            favorites: data[2],
            support: data[3]
          });
        }
      );
    }
  );

  app.get(
    routes.GET_DOCTORS_LIST + "/:location/:specialization",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { location, specialization } = req.params;
      customerService.getDoctorsList(
        location,
        specialization,
        (status, doctorsList) => {
          res.send(doctorsList);
        }
      );
    }
  );

  app.get(
    routes.GET_DOCTOR_SCHEDULES + "/:userId",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      customerService.getSchedules(req.params.userId, (status, schedules) => {
        res.send(schedules);
      });
    }
  );

  app.get(
    routes.GET_TOKENS + "/:doctorId" + "/:scheduleId",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { doctorId, scheduleId } = req.params;
      customerService.getTokens(doctorId, scheduleId, (status, tokens) => {
        res.send({ status, tokens });
      });
    }
  );

  app.post(
    routes.BLOCK_TOKEN,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { doctorId, scheduleId, tokenDate, tokenNumber } = req.body;
      customerService.blockToken(
        doctorId,
        scheduleId,
        tokenDate,
        tokenNumber,
        (status, message) => {
          res.send({ status, message });
        }
      );
    }
  );

  app.post(
    routes.ADD_FAVORITE,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { userId } = req.body;
      const mobile = req.user.username;
      customerService.addFavorite(mobile, userId, (status, favorites) => {
        res.send({ status, favorites });
      });
    }
  );

  app.post(
    routes.REMOVE_FAVORITE,
    passport.authenticate("jwt", { send: false }),
    (req, res) => {
      const { userId } = req.body;
      const mobile = req.user.username;
      customerService.removeFavorite(mobile, userId, (status, favorites) => {
        res.send({ status, favorites });
      });
    }
  );

  app.post(
    routes.GET_FAVORITES,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { favorites } = req.body;
      customerService.getFavoriteDoctors(favorites, favoriteDoctors => {
        res.send(favoriteDoctors);
      });
    }
  );

  app.post(
    routes.BOOK_TOKEN,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const bookingData = {
        ...req.body,
        userId: req.user._id
      };
      customerService.bookToken(bookingData, (status, bookingId) => {
        res.send({ status, bookingId });
      });
    }
  );

  app.get(
    routes.GET_BOOKING_HISTORY,
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      customerService.getBookingHistory(req.user._id, data => {
        res.send(data);
      });
    }
  );
};
