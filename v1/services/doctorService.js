const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const Doctor = mongoose.model(modelNames.DOCTOR);
const TokenTable = mongoose.model(modelNames.TOKEN_TABLE);
const Schedule = mongoose.model(modelNames.SCHEDULE);
const Booking = mongoose.model(modelNames.BOOKING);
const BookingOtp = mongoose.model(modelNames.BOOKING_OTP);
const tokenBookingStatus = require("../constants/tokenBookingStatus");
const utils = require("../utils");
const moment = require("moment");
const momentTz = require("moment-timezone");

module.exports = {
  /**
   * createTokenTable method creates a token table document for every schedule
   * that is been confirmed by the doctor.
   *
   * @param {String} userId
   * @param {String} scheduleId
   * @param {String} tokenDate  -- date string
   * @param {Function} callback
   */
  async createTokenTable(userId, scheduleId, tokenDate, callback) {
    try {
      const doctorId = await _getDoctorIdByUserId(userId);
      const schedule = await _getSchedule(doctorId, scheduleId);
      // console.log(getDateTime(tokenDate, schedule.endTime));
      let tokenTable = new TokenTable();
      tokenTable.doctorId = doctorId;
      tokenTable.scheduleId = scheduleId;
      tokenTable.tokenDate = new Date(tokenDate);
      tokenTable.startTime = schedule.startTime;
      tokenTable.endTime = schedule.endTime;
      let tokens = schedule.tokens;
      tokens.map(token => {
        token.status = tokenBookingStatus.OPEN;
      });
      tokenTable.tokens = tokens;
      TokenTable.collection
        .insertOne(tokenTable)
        .then(res => callback(true))
        .catch(err => console.log("***** Error creating token table. " + err));
    } catch (err) {
      callback(false);
    }
  },

  async getNextDayScheduleConfirmations(userid, callback) {
    try {
      const doctorId = await _getDoctorIdByUserId(userid);
      //today
      const today = new Date();
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0);
      //tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowMoment = utils.getMoment(tomorrow);

      const tokenDate = tomorrowMoment.format("YYYY-MM-DD").toString();
      const weekday = tomorrowMoment.format("ddd").toString();

      const schedules = await _getSchedulesForWeekday(doctorId, weekday);
      const tokenTables = await _getTokenTablesForWeekday(doctorId, tokenDate);

      let nextDayScheduleConfirmations = schedules
        .map(schedule => {
          const tokenTable = tokenTables.find(tokenTable => {
            return utils.isEqual(schedule._id, tokenTable.scheduleId);
          });
          if (utils.isNullOrEmpty(tokenTable)) {
            return schedule;
          }
        })
        .filter(schedule => {
          return !utils.isNullOrEmpty(schedule);
        });
      callback({ schedules: nextDayScheduleConfirmations, tokenDate });
    } catch (err) {
      callback({ schedules: [], tokenDate });
    }
  },

  /**
   * getBookingHistory method fetches all the list of bookings for the given doctor's userId.
   *
   * @param {String} userId
   * @param {Function} callback
   */
  async getBookingHistory(userId, callback) {
    try {
      const doctorId = await _getDoctorIdByUserId(userId);
      const today = utils.getDateString(new Date());
      const yesterday = new Date(today).setDate(new Date().getDate() - 1);
      const threeMonthsPast = new Date(yesterday).setMonth(
        new Date().getMonth() - 3
      );

      Booking.aggregate(
        [
          {
            $match: {
              doctorId: mongoose.Types.ObjectId(doctorId),
              tokenDate: {
                $gte: new Date(threeMonthsPast)
              },
              status: tokenBookingStatus.VISITED
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
            $sort: {
              bookingId: -1
            }
          },
          {
            $project: {
              _id: 0,
              userId: 0,
              doctorId: 0,
              scheduleId: 0,
              startTime: 0,
              endTime: 0,
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
        (err, bookings) => {
          if (err) {
            callback(null);
          } else {
            callback(bookings);
          }
        }
      );
    } catch (err) {
      callback([]);
    }
  },

  /**
   * getTodaysBookings method gets the list of bookings for the current day,
   * given a doctor's userId
   *
   * @param {String} userId
   * @param {Function} callback
   */
  async getTodaysBookings(userId, callback) {
    try {
      const today = utils.getDateString(new Date());
      const doctorId = await _getDoctorIdByUserId(userId);

      const bookingsPromise = _getBookingsForTheDay(today, doctorId);
      const schedulesPromise = _getSchedulesForTheDay(today, doctorId);

      Promise.all([bookingsPromise, schedulesPromise])
        .then(data => {
          bookings = data[0];
          schedules = data[1];

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
      callback([]);
    }
  },

  /**
   * getBookingDetail method fetches the details of the booking.
   * If the booking belogs to a different doctor then error message will be sent to the user.
   *
   * @param {String} userId
   * @param {String} bookingId
   * @param {Function} callback
   */
  async getBookingDetail(userId, bookingId, callback) {
    try {
      const doctorId = await _getDoctorIdByUserId(userId);
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
              "Appointment has been made for a different doctor.",
              null
            );
          } else {
            callback(true, null, booking[0]);
          }
        }
      );
    } catch (err) {
      callback(false, "Unknown error!", null);
    }
  },

  /**
   * confirmVisit method updates the status of the booking to VISITED from BLOCKED.
   * It also addes visitedTime to the document.
   *
   * @param {String} userId
   * @param {String} bookingId
   * @param {Function} callback
   */
  async confirmVisit(bookingId, callback) {
    //bookingId is of type number in DB
    bookingId = parseInt(bookingId);
    try {
      const status = await _confirmVisit(bookingId);
      if (status) {
        callback(true);
      } else {
        callback(false);
      }
    } catch (err) {
      callback(false);
    }
  },

  /**
   * verifyBookingOtp method is used to verify booking OTP.
   *
   * @param {String} bookingId
   * @param {String} otp
   */
  verifyBookingOtp(bookingId, otp) {
    bookingId = parseInt(bookingId);
    return new Promise((resolve, reject) => {
      BookingOtp.findOne({ bookingId }, async (err, booking) => {
        if (err) {
          reject(false);
        } else {
          if (utils.isEqual(parseInt(otp), booking.otp)) {
            try {
              const bookingUpdateStatus = await _confirmVisit(bookingId);
              if (bookingUpdateStatus) {
                resolve({ status: true, message: null });
              } else {
                resolve({ status: false, message: "Unknown error!" });
              }
            } catch (err) {
              reject(err);
            }
          } else {
            resolve({ status: false, message: "Incorrect OTP entered." });
          }
        }
      });
    });
  },

  /**
   * getBookingStatus method returns the status of the booking.
   *
   * @param {String} bookingId
   */
  getBookingStatus(bookingId) {
    bookingId = parseInt(bookingId);
    return new Promise((resolve, reject) => {
      Booking.findOne({ bookingId }, (err, booking) => {
        if (err) {
          reject(err);
        } else {
          resolve(booking.status);
        }
      });
    });
  },

  /**
   * getConfirmedSchedules method fetches all the schedules
   * that are confirmed by the doctor for the given date.
   *
   * @param {String} doctorId
   * @param {Function} callback
   */
  async getConfirmedSchedules(userId, callback) {
    try {
      const doctorId = await _getDoctorIdByUserId(userId);
      const today = utils.getDateString(new Date());
      TokenTable.aggregate(
        [
          {
            $match: {
              doctorId: mongoose.Types.ObjectId(doctorId),
              tokenDate: new Date(today)
            }
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
              tokens: 0,
              doctorId: 0,
              tokenDate: 0,
              scheduleDetails: 0,
              "hospitalDetails._id": 0,
              "hospitalDetails.landmark": 0,
              "hospitalDetails.address": 0,
              "hospitalDetails.pincode": 0
            }
          }
        ],
        (err, tokenTableDocs) => {
          if (err) {
            console.log(err);
            callback([]);
          } else {
            let confirmedSchedules = tokenTableDocs
              .map(doc => {
                const {
                  _id,
                  scheduleId,
                  startTime,
                  endTime,
                  hospitalDetails
                } = doc;
                return {
                  tokenTableId: _id,
                  scheduleId,
                  startTime,
                  endTime,
                  hospitalName: hospitalDetails.name,
                  hospitalLocation: hospitalDetails.location
                };
              })
              .filter(schedule => {
                const endTimeMoment = utils.getDateTime(
                  new Date(),
                  schedule.endTime
                );
                const nowMoment = utils.getMoment(new Date());
                if (!nowMoment.isAfter(endTimeMoment)) {
                  return schedule;
                }
              });
            callback(confirmedSchedules);
          }
        }
      );
    } catch (err) {
      console.log(err);
      callback([]);
    }
  }
};

/**
 * _getDoctorIdByUserId method returns a doctorId given userId.
 *
 * @param {String} userId
 */
function _getDoctorIdByUserId(userId) {
  return new Promise((resolve, reject) => {
    Doctor.findOne({ userId }, (err, doctor) => {
      if (err) {
        reject(err);
      } else {
        resolve(doctor._id);
      }
    });
  });
}

/**
 * _getSchedule method returns a schedule for a given doctorId and scheduleId
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 */
function _getSchedule(doctorId, scheduleId) {
  return new Promise((resolve, reject) => {
    Schedule.findOne({ doctorId, _id: scheduleId }, (err, schedule) => {
      if (err) {
        reject(err);
      } else {
        resolve(schedule);
      }
    });
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

/**
 * _getSchedulesForTheDay method fetches the schedules for the given day and doctorId.
 *
 * @param {String} today
 * @param {String} doctorId
 */
function _getSchedulesForTheDay(today, doctorId) {
  return new Promise((resolve, reject) => {
    today = new Date(today);
    const todayMoment = moment(today);
    const weekday = todayMoment.format("ddd");
    Schedule.aggregate(
      [
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
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
            isDeleted: 0
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
 * _getSchedulesForWeekday method fetches the list of schedules for the given doctorId and weekday.
 *
 * @param {String} doctorId
 * @param {String} weekday
 */
function _getSchedulesForWeekday(doctorId, weekday) {
  return new Promise((resolve, reject) => {
    Schedule.aggregate(
      [
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
            weekday,
            isDeleted: false
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
            tokens: 0
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
 * _getTokenTablesForWeekday method fetches the list of token table docs for the given doctorId and date.
 *
 * @param {String} doctorId
 * @param {String} weekday
 */
function _getTokenTablesForWeekday(doctorId, tokenDate) {
  return new Promise((resolve, reject) => {
    TokenTable.find(
      { doctorId, tokenDate: new Date(tokenDate) },
      { tokens: 0 },
      (err, tokenTableDocs) => {
        if (err) {
          reject(err);
        } else {
          resolve(tokenTableDocs);
        }
      }
    );
  });
}

/**
 * _confirmVisit method updates the booking status from BOOKED to VISITED.
 *
 * @param {Number} bookingId
 */
function _confirmVisit(bookingId) {
  return new Promise((resolve, reject) => {
    const visitedTimeStamp = moment(new Date())
      .tz("Asia/Calcutta")
      .format();
    Booking.updateOne(
      { bookingId },
      { $set: { status: tokenBookingStatus.VISITED, visitedTimeStamp } },
      (err, raw) => {
        if (err) {
          reject(err);
        } else {
          //delete booking otp
          _deleteBookingOtp(bookingId);
          resolve(true);
        }
      }
    );
  });
}

/**
 * _deleteBookingOtp method deletes the document with given bookingId
 *
 * @param {Number} bookingId
 */
function _deleteBookingOtp(bookingId) {
  BookingOtp.deleteOne({ bookingId })
    .then(res => console.log("Bookint OTP deleted for bookingId: " + bookingId))
    .catch(err => console.log("Error deleting bookingId." + err));
}
