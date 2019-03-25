const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const Schedule = mongoose.model(modelNames.SCHEDULE);
const Booking = mongoose.model(modelNames.BOOKING);
const tokenBookingStatus = require("../constants/tokenBookingStatus");
const utils = require("../utils");
const moment = require("moment");

module.exports = {
  /**
   * getTodaysBookings method is used to fetch all the todays bookings for the
   * doctorId and hospitalId mapped with the given frontdesk user.
   *
   * @param {String} frontdeskUserId
   * @param {Function} callback
   */
  async getTodaysBookings(frontdeskUserId, callback) {
    const today = utils.getDateString(new Date());
    const todayMoment = moment(new Date(today));
    const weekday = todayMoment.format("ddd");
    try {
      const { doctorId } = await _getFrontdeskDetails(frontdeskUserId);
      const schedulesPromise = _getTodaysSchedule(frontdeskUserId, weekday);
      const bookingsPromise = _getBookingsForTheDay(today, doctorId);

      Promise.all([schedulesPromise, bookingsPromise])
        .then(data => {
          const schedules = data[0];
          const bookings = data[1];

          let todaysBookings = [];
          schedules.forEach(schedule => {
            const visitorsList = bookings
              .map(booking => {
                const nowMoment = utils.getMoment(new Date());
                const endTimeMoment = utils.getMoment(booking.endTimeStamp);
                if (
                  utils.isEqual(schedule._id, booking.scheduleId) &&
                  !nowMoment.isAfter(endTimeMoment)
                ) {
                  const { userDetails, token, bookingId } = booking;
                  return {
                    bookingId,
                    name: userDetails.fullName,
                    number: userDetails.username,
                    tokenNumber: token.number,
                    tokenType: token.type,
                    tokenTime: token.time
                  };
                }
              })
              .filter(booking => {
                if (!utils.isNullOrEmpty(booking)) {
                  return booking;
                }
              });
            const { hospitalDetails, startTime, endTime } = schedule;
            const obj = {
              hospitalName: hospitalDetails.name,
              hospitalTime: startTime + " to " + endTime,
              appointmentDate: today,
              visitorsList
            };
            todaysBookings.push(obj);
          });
          todaysBookings = todaysBookings.filter(booking => {
            if (!utils.isNullOrEmpty(booking.visitorsList)) {
              return booking;
            }
          });
          callback(todaysBookings);
        })
        .catch(err => {
          console.log(err);
          callback([]);
        });
    } catch (err) {
      console.log(err);
    }
  },

  /**
   * getBookingDetail method fetches the details of the booking.
   * If the booking belogs to a different doctor and hospital 
   * then error message will be sent to the user.
   *
   * @param {String} frontdeskUserId
   * @param {String} bookingId
   * @param {Function} callback
   */
  async getBookingDetail(frontdeskUserId, bookingId, callback) {
    try {
      const { doctorId, hospitalId } = await _getFrontdeskDetails(
        frontdeskUserId
      );
      //bookingId is of type number in DB
      bookingId = parseInt(bookingId);
      Booking.aggregate(
        [
          {
            $match: {
              bookingId,
              doctorId
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDetails"
            }
          },
          {
            $unwind: "$userDetails"
          },
          {
            $lookup: {
              from: "schedules",
              localField: "scheduleId",
              foreignField: "_id",
              as: "scheduleDetails"
            }
          },
          {
            $unwind: "$scheduleDetails"
          },
          {
            $match: {
              "scheduleDetails.hospitalId": hospitalId
            }
          },
          {
            $lookup: {
              from: "hospitals",
              localField: "scheduleDetails.hospitalId",
              foreignField: "_id",
              as: "hospitalDetails"
            }
          },
          {
            $unwind: "$hospitalDetails"
          },
          {
            $project: {
              _id: 0,
              userId: 0,
              doctorId: 0,
              scheduleId: 0,
              latLng: 0,
              startTimeStamp: 0,
              endTimeStamp: 0,
              bookedTimeStamp: 0,
              status: 0,
              scheduleDetails: 0,
              "userDetails._id": 0,
              "userDetails.password": 0,
              "userDetails.userType": 0,
              "userDetails.status": 0,
              "userDetails.userId": 0,
              "userDetails.dateOfBirth": 0,
              "userDetails.gender": 0,
              "userDetails.deviceToken": 0,
              "userDetails.favorites": 0,
              "hospitalDetails._id": 0,
              "hospitalDetails.landmark": 0
            }
          }
        ],
        (err, booking) => {
          if (utils.isNullOrEmpty(booking)) {
            callback(
              false,
              "Appointment has been made for a different schedule.",
              null
            );
          } else {
            callback(true, null, booking[0]);
          }
        }
      );
    } catch (err) {
      console.log(err);
    }
  }
};

/**
 * _getTodaysSchedule method is used to fetch the scheduels for the given frontdesk user
 *
 * @param {String} frontdeskUserId
 * @param {String} weekday
 */
function _getTodaysSchedule(frontdeskUserId, weekday) {
  return new Promise((resolve, reject) => {
    Schedule.aggregate(
      [
        {
          $match: {
            frontdeskUserId,
            weekday
          }
        },
        {
          $lookup: {
            from: "hospitals",
            localField: "hospitalId",
            foreignField: "_id",
            as: "hospitalDetails"
          }
        },
        {
          $unwind: "$hospitalDetails"
        },
        {
          $project: {
            tokens: 0,
            isDeleted: 0,
            weekday: 0,
            frontdeskUserId: 0,
            "hospitalDetails._id": 0
          }
        }
      ],
      (err, schedules) => {
        if (err) {
          reject(err);
        } else {
          resolve(schedules);
        }
      }
    );
  });
}

/**
 * _getFrontdeskDetails method is used to fetch the doctorId for the given frontdesk user.
 * frontdeskId is mapped with doctorId and hospitalId and
 * there may be many occurances of the same mapping in the collection.
 * This method fetches only one of such mapping from the collection.
 *
 * @param {String} frontdeskUserId
 */
function _getFrontdeskDetails(frontdeskUserId) {
  return new Promise((resolve, reject) => {
    Schedule.findOne(
      { frontdeskUserId },
      {
        _id: 0,
        tokens: 0,
        weekday: 0,
        startTime: 0,
        endTime: 0,
        isDeleted: 0,
        frontdeskUserId: 0
      },
      (err, schedule) => {
        if (err) {
          reject(err);
        } else {
          const { doctorId, hospitalId } = schedule;
          resolve({ doctorId, hospitalId });
        }
      }
    );
  });
}

/**
 * _getBookingsForTheDay method fetches all the bookings for the given day and doctorId
 *
 * @param {String} today
 * @param {String} doctorId
 */
function _getBookingsForTheDay(today, doctorId) {
  return new Promise((resolve, reject) => {
    Booking.aggregate(
      [
        {
          $match: {
            tokenDate: new Date(today),
            doctorId: mongoose.Types.ObjectId(doctorId),
            status: tokenBookingStatus.BOOKED
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $unwind: "$userDetails"
        },
        {
          $project: {
            _id: 0,
            userId: 0,
            doctorId: 0,
            latLng: 0,
            startTime: 0,
            endTime: 0,
            startTimeStamp: 0,
            bookedTimeStamp: 0,
            status: 0,
            "userDetails._id": 0,
            "userDetails.password": 0,
            "userDetails.userType": 0,
            "userDetails.status": 0,
            "userDetails.userId": 0,
            "userDetails.dateOfBirth": 0,
            "userDetails.gender": 0,
            "userDetails.deviceToken": 0,
            "userDetails.favorites": 0
          }
        }
      ],
      (err, bookings) => {
        if (err) {
          reject(err);
        } else {
          resolve(bookings);
        }
      }
    );
  });
}
