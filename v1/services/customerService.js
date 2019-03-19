const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const User = mongoose.model(modelNames.USERS);
const Doctor = mongoose.model(modelNames.DOCTOR);
const Specialization = mongoose.model(modelNames.SPECIALIZATION);
const Hospital = mongoose.model(modelNames.HOSPITAL);
const Location = mongoose.model(modelNames.LOCATION);
const Schedule = mongoose.model(modelNames.SCHEDULE);
const TokenTable = mongoose.model(modelNames.TOKEN_TABLE);
const AutoNumber = mongoose.model(modelNames.AUTO_NUMBER);
const Booking = mongoose.model(modelNames.BOOKING);
const BookingOtp = mongoose.model(modelNames.BOOKING_OTP);
const utils = require("../utils");
const tokenBookingStatus = require("../constants/tokenBookingStatus");
const moment = require("moment");
const momentTz = require("moment-timezone");
const CronJob = require("cron").CronJob;
const operations = require("../constants/operation");

const BOOKING_TIME_LIMIT = 4; //4 hours

module.exports = {
  /**
   * getSpecializations fetches the complete list of specializations available.
   * It returns a promise.
   */
  getSpecializations() {
    return new Promise((resolve, reject) => {
      Specialization.find({}, (err, specializationList) => {
        if (err) {
          reject(err);
        } else {
          resolve(specializationList);
        }
      });
    });
  },

  /**
   * getLocations method fetches the complete list of available locations.
   * It returns a promise.
   */
  getLocations() {
    return new Promise((resolve, reject) => {
      Location.find({}, (err, locationList) => {
        if (err) {
          reject(err);
        } else {
          resolve(locationList);
        }
      });
    });
  },

  /**
   * getFavorites method returns the list of favorites for the given user
   * @param {String} mobile
   */
  getFavorites(mobile) {
    return new Promise((resolve, reject) => {
      User.findOne({ username: mobile }, (err, user) => {
        if (err) {
          reject(err);
        } else {
          if (utils.isNullOrEmpty(user.favorites)) {
            resolve([]);
          } else {
            resolve(user.favorites);
          }
        }
      });
    });
  },

  /**
   * addFavorite method adds the new userId of a doctor to the favorites list of the given user.
   *
   * @param {String} mobile
   * @param {String} userId
   * @param {Function} callback
   */
  async addFavorite(mobile, userId, callback) {
    try {
      const favorites = await _updateFavorites(mobile, userId, operations.ADD);
      callback(true, favorites);
    } catch (err) {
      callback(false, null);
    }
  },

  /**
   * removeFavorite method removes the userId of the doctor from the favorites list of the given user.
   *
   * @param {String} mobile
   * @param {String} userId
   * @param {Function} callback
   */
  async removeFavorite(mobile, userId, callback) {
    try {
      const favorites = await _updateFavorites(
        mobile,
        userId,
        operations.REMOVE
      );
      callback(true, favorites);
    } catch (err) {
      callback(false, null);
    }
  },

  /**
   * getFavorites method fetches a list of doctors matching the favoritesArray.
   *
   * @param {Array} favoritesArray
   * @param {Function} callback
   */
  getFavoriteDoctors(favoritesArray, callback) {
    Doctor.aggregate(
      [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "doctorDetails"
          }
        },
        {
          $unwind: "$doctorDetails"
        },
        {
          $project: {
            "doctorDetails._id": 0,
            "doctorDetails.password": 0,
            "doctorDetails.username": 0,
            "doctorDetails.userType": 0,
            "doctorDetails.status": 0,
            "doctorDetails.favorites": 0,
            "doctorDetails.dateOfBirth": 0,
            yearsOfExperience: 0
          }
        }
      ],
      (err, favoriteDoctors) => {
        if (err) {
          callback([]);
        } else {
          const favorites = favoriteDoctors
            .map(doctor => {
              if (favoritesArray.includes(doctor.userId.toString())) {
                return doctor;
              }
            })
            .filter(element => !utils.isUndefined(element));
          callback(favorites);
        }
      }
    );
  },

  /**
   * getDoctorsList method fetches a list of doctors based on the given location and specialization.
   *
   * lookup order:
   * doctors --> schedules --> hospitals --> filter location and specialization --> users
   *
   * @param {String} location
   * @param {String} specialization
   * @param {Function} callback
   */
  getDoctorsList(location, specialization, callback) {
    Doctor.aggregate(
      [
        {
          $lookup: {
            from: "schedules",
            localField: "_id",
            foreignField: "doctorId",
            as: "schedule"
          }
        },
        {
          $unwind: "$schedule"
        },
        {
          $lookup: {
            from: "hospitals",
            localField: "schedule.hospitalId",
            foreignField: "_id",
            as: "hospital"
          }
        },
        {
          $unwind: "$hospital"
        },
        {
          $match: {
            "hospital.location": location,
            specialization
          }
        },
        {
          $group: {
            _id: "$userId"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "doctorDetails"
          }
        },
        {
          $unwind: "$doctorDetails"
        },
        {
          $project: {
            "doctorDetails.password": 0,
            "doctorDetails.userType": 0,
            "doctorDetails.status": 0,
            "doctorDetails.favorites": 0,
            "doctorDetails.dateOfBirth": 0,
            "doctorDetails.username": 0,
            "doctorDetails._id": 0
          }
        },
        {
          $unwind: "$doctorDetails"
        }
      ],
      (err, doctorsList) => {
        if (err) {
          callback(false, null);
        } else {
          callback(true, doctorsList);
        }
      }
    );
  },

  /**
   * getScheduels method fetches all the schedules given a doctorId.
   *
   * lookup order:
   * schedules --> hospitals --> filter by doctorId
   *
   * @param {String} doctorId
   * @param {Function} callback
   */
  async getSchedules(userId, callback) {
    const doctorId = await _getDoctorIdByUserId(userId);
    Schedule.aggregate(
      [
        {
          $lookup: {
            from: "hospitals",
            localField: "hospitalId",
            foreignField: "_id",
            as: "hospital"
          }
        },
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
            isDeleted: false
          }
        },
        {
          $lookup: {
            from: "doctors",
            localField: "doctorId",
            foreignField: "_id",
            as: "doctorDetails"
          }
        },
        {
          $unwind: "$doctorDetails"
        },
        {
          $unwind: "$hospital"
        },
        {
          $group: {
            _id: "$doctorDetails",
            schedules: {
              $push: {
                scheduleId: "$_id",
                weekday: "$weekday",
                startTime: "$startTime",
                endTime: "$endTime",
                hospital: "$hospital"
              }
            }
          }
        }
      ],
      async (err, drSchedules) => {
        if (err) {
          callback(false, null);
        } else {
          let drScheduleData = {
            doctorDetails: drSchedules[0]._id,
            schedules: drSchedules[0].schedules,
            availabilityStatus: await _getAvailabilityStatus(
              drSchedules[0]._id._id
            )
          };
          callback(true, drScheduleData);
        }
      }
    );
  },

  /**
   * getTokens method fetches all the tokens available irrespective of their status.
   *
   * @param {String} doctorId
   * @param {String} scheduleId
   * @param {Function} callback
   */
  getTokens(doctorId, scheduleId, callback) {
    TokenTable.findOne({ doctorId, scheduleId }, (err, tokenTable) => {
      if (err) {
        callback(false, null);
      } else {
        if (utils.isNullOrEmpty(tokenTable)) {
          callback(false, []);
        } else {
          callback(true, tokenTable.tokens);
        }
      }
    });
  },

  /**
   * blockToken method checks if the token is BLOCKED, if so returns false with message.
   * Otherwise, it will block the token, creates a cron job for checking if the token is still
   * BLOCKED after the window time ends.
   *
   * @param {*} doctorId
   * @param {*} scheduleId
   * @param {*} tokenDate
   * @param {*} tokenNumber
   * @param {*} callback
   */
  blockToken(doctorId, scheduleId, tokenDate, tokenNumber, callback) {
    //fetch tokens based on the given data
    TokenTable.findOne(
      { doctorId, scheduleId, tokenDate },
      (err, tokenTableDoc) => {
        if (err) {
          callback(false, null);
        } else {
          if (utils.isNullOrEmpty(tokenTableDoc)) {
            callback(false, null);
          } else {
            const { tokens } = tokenTableDoc;
            //iterate and find the user selected token
            const selectedToken = _findToken(tokens, tokenNumber);
            //check if the status of the selected token is already BLOCKED.
            //if so, return status as false with a message.
            if (utils.isEqual(tokenNumber, 0)) {
              callback(true, null);
            } else {
              if (
                utils.isStringsEqual(
                  selectedToken.status,
                  tokenBookingStatus.BLOCKED
                )
              ) {
                callback(
                  false,
                  "Selected token has been blocked by someone. Please try again after sometime."
                );
              } else {
                //if the satus of the token is OPEN, set the status to BLOCKED
                selectedToken.status = tokenBookingStatus.BLOCKED;
                //update the status in token table
                TokenTable.updateOne(
                  { doctorId, scheduleId, tokenDate },
                  {
                    $set: {
                      tokens
                    }
                  },
                  (err, raw) => {
                    if (err) {
                      callback(false);
                    } else {
                      //create a cron job for checking after 3 minutes if the token is in blocked state
                      _createCronJob(
                        doctorId,
                        scheduleId,
                        tokenDate,
                        tokenNumber
                      );
                      console.log(
                        "Token number: " + tokenNumber + " has been blocked."
                      );
                      callback(true, null);
                    }
                  }
                );
              }
            }
          }
        }
      }
    );
  },

  /**
   * bookToken updates the status of the token in tokenTableDoc.
   * It then adds a new document to the BOOKINGS collection.
   *
   * @param {Object} bookingData
   * @param {Function} callback
   */
  async bookToken(bookingData, callback) {
    const {
      userId,
      doctorId,
      scheduleId,
      tokenDate,
      tokenNumber,
      latLng
    } = bookingData;
    const status = tokenBookingStatus.BOOKED;
    const isTokenTableDocUpdated = await _updateTokenTableDocStatus(
      doctorId,
      scheduleId,
      tokenDate,
      tokenNumber,
      status
    );
    if (isTokenTableDocUpdated) {
      const tokenTableDoc = await _getTokenTableData(
        doctorId,
        scheduleId,
        tokenDate
      );
      const { startTime, endTime } = tokenTableDoc;
      const startTimeStamp = _getDateTime(tokenDate, startTime)
        .subtract(BOOKING_TIME_LIMIT, "hours")
        .toDate();
      const endTimeStamp = _getDateTime(tokenDate, endTime).toDate();
      const selectedToken = _findToken(tokenTableDoc.tokens, tokenNumber);
      delete selectedToken.status;
      const bookingId = await _getAutoNumber();
      const bookedTimeStamp = new Date();
      Booking.collection
        .insertOne({
          bookingId,
          userId,
          doctorId: mongoose.Types.ObjectId(doctorId),
          scheduleId: mongoose.Types.ObjectId(scheduleId),
          tokenDate: new Date(tokenDate),
          token: selectedToken,
          startTime,
          endTime,
          latLng,
          startTimeStamp,
          endTimeStamp,
          bookedTimeStamp,
          status
        })
        .then(res => {
          //generate OTP for this booking
          const otp = utils.generateOtp();
          BookingOtp.collection
            .insertOne({ bookingId, otp })
            .then(res => {
              callback(true, bookingId);
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    } else {
      callback(false, null);
    }
  },

  /**
   * getBookingHistory method fetches all the booking data given a userId.
   *
   * @param {String} userId
   * @param {Function} callback
   */
  getBookingHistory(userId, callback) {
    Booking.aggregate(
      [
        {
          $lookup: {
            from: "doctors",
            localField: "doctorId",
            foreignField: "_id",
            as: "doctorDetailsTemp"
          }
        },
        {
          $match: {
            userId
          }
        },
        {
          $unwind: "$doctorDetailsTemp"
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
          $lookup: {
            from: "users",
            localField: "doctorDetailsTemp.userId",
            foreignField: "_id",
            as: "doctorUserDetails"
          }
        },
        {
          $unwind: "$doctorUserDetails"
        },
        {
          $addFields: {
            doctorDetails: {
              $mergeObjects: ["$doctorDetailsTemp", "$doctorUserDetails"]
            }
          }
        },
        {
          $lookup: {
            from: "booking_otps",
            localField: "bookingId",
            foreignField: "bookingId",
            as: "bookingOtp"
          }
        },
        {
          $unwind: "$bookingOtp"
        },
        {
          $sort: {
            bookedTimeStamp: -1
          }
        },
        {
          $project: {
            latLng: 0,
            _id: 0,
            startTimeStamp: 0,
            endTimeStamp: 0,
            userId: 0,
            doctorId: 0,
            scheduleId: 0,
            bookedTimeStamp: 0,
            doctorDetailsTemp: 0,
            doctorUserDetails: 0,
            "scheduleDetails._id": 0,
            "scheduleDetails.tokens": 0,
            "scheduleDetails.doctorId": 0,
            "scheduleDetails.hospitalId": 0,
            "hospitalDetails._id": 0,
            "doctorDetails._id": 0,
            "doctorDetails.userType": 0,
            "doctorDetails.status": 0,
            "doctorDetails.favorites": 0,
            "doctorDetails.dateOfBirth": 0,
            "doctorDetails.gender": 0,
            "doctorDetails.password": 0,
            "doctorDetails.username": 0,
            "doctorDetails.yearsOfExperience": 0,
            "doctorDetails.degree": 0,
            "doctorDetails.userId": 0,
            "bookingOtp._id": 0,
            "bookingOtp.bookingId": 0
          }
        }
      ],
      (err, bookings) => {
        if (err) {
          callback(err);
        } else {
          let currentBookings = [];
          let pastBookings = [];
          bookings.forEach(booking => {
            const tokenEndMoment = _getDateTime(
              booking.tokenDate,
              booking.endTime
            );
            const nowMoment = _getMoment(new Date());
            if (
              !nowMoment.isAfter(tokenEndMoment) &&
              utils.isStringsEqual(booking.status, tokenBookingStatus.BOOKED)
            ) {
              //bookings that are before the schedule end time and
              //in BOOKED status only should listed under current bookings
              currentBookings.push(booking);
            } else {
              pastBookings.push(booking);
            }
          });
          callback({ currentBookings, pastBookings });
        }
      }
    );
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
 * _getAvailabilityStatus method returns the tokenTableDocs for the corresponding schudule.
 *
 * @param {String} doctorId
 * @param {scheduleId} scheduleId
 */
function _getAvailabilityStatus(doctorId) {
  let today = new Date();
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);

  return new Promise((resolve, reject) => {
    TokenTable.find(
      {
        doctorId,
        tokenDate: {
          $gte: today
        }
      },
      { _id: 0 },
      (err, tokenTableDocs) => {
        if (err) {
          callback(false, null);
        } else {
          if (utils.isNullOrEmpty(tokenTableDocs)) {
            resolve([]);
          } else {
            let availabilityStatus = tokenTableDocs.map(tokenTableDoc => {
              const isBookingOpen = _computeAvailabilityStatus(tokenTableDoc);
              return { scheduleId: tokenTableDoc.scheduleId, isBookingOpen };
            });
            resolve(availabilityStatus);
          }
        }
      }
    );
  });
}

/**
 * _computeAvailabilityStatus method computes the status of token booking.
 *
 * case 1 - current time is above the start time and below the end time.
 * (or)
 * case 2 - current time is lesser than or equal to 4 hours before the start time
 * (and)
 * case 3 - atleast one token must be in OPEN status.
 *
 * @param {Object} tokenTableDoc
 */
function _computeAvailabilityStatus(tokenTableDoc) {
  // process.env.TZ = "Asia/Calcutta|Asia/Kolkata";

  const now = new Date();
  const bookingThreshold = new Date();
  bookingThreshold.setHours(now.getHours() - BOOKING_TIME_LIMIT);
  const { startTime, endTime, tokenDate } = tokenTableDoc;

  const nowMoment = _getMoment(now);
  const startTimeMoment = _getDateTime(tokenDate, startTime);
  const endTimeMoment = _getDateTime(tokenDate, endTime);

  //cloning start time
  const bookingTimeStartMoment = moment(startTimeMoment);
  bookingTimeStartMoment.subtract(BOOKING_TIME_LIMIT, "hours");

  // console.log(nowMoment);
  // console.log(startTimeMoment);
  // console.log(endTimeMoment);

  let isBookingTimeAllowed = false;
  isBookingTimeAllowed =
    nowMoment.isBetween(startTimeMoment, endTimeMoment) ||
    nowMoment.isBetween(bookingTimeStartMoment, endTimeMoment);

  const isTokensOpen = tokenTableDoc.tokens.some(token =>
    utils.isStringsEqual(token.status, tokenBookingStatus.OPEN)
  );

  console.log(nowMoment);
  console.log(startTimeMoment);
  console.log(endTimeMoment);
  console.log(bookingTimeStartMoment);

  return isBookingTimeAllowed && isTokensOpen;
}

function _getMoment(time) {
  return momentTz.tz(time, "Asia/Calcutta");
}

function _get24HrFormatTime(time) {
  return moment(time, ["h:mm A"]).format("HH:mm");
}

function _getDateTime(date, time) {
  // process.env.TZ = "Asia/Calcutta|Asia/Kolkata";
  const timeArr = _get24HrFormatTime(time).split(":");
  date = new Date(date);
  date.setHours(timeArr[0]);
  date.setMinutes(timeArr[1]);
  return _getMoment(date);
}

/**
 * _createCronJob method creates a cron job for updating the statud of the token to OPEN if BLOCKED.
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 * @param {String} tokenDate
 * @param {String} tokenNumber
 */
function _createCronJob(doctorId, scheduleId, tokenDate, tokenNumber) {
  let time = new Date();
  time.setMinutes(time.getMinutes() + 1);
  new CronJob(
    time,
    () => {
      _updateTokenStatus(doctorId, scheduleId, tokenDate, tokenNumber);
    },
    null,
    true,
    "Asia/Calcutta"
  );
}

/**
 * _updateTokenStatus method checks if the token is BLOCKED.
 * If BLOCKED it will reset the status to OPEN.
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 * @param {String} tokenDate
 * @param {Number} tokenNumber
 */
function _updateTokenStatus(doctorId, scheduleId, tokenDate, tokenNumber) {
  TokenTable.findOne(
    { doctorId, scheduleId, tokenDate },
    (err, tokenTableDoc) => {
      if (!err && !utils.isNullOrEmpty(tokenTableDoc)) {
        const { tokens } = tokenTableDoc;
        let selectedToken = tokens.find(token => {
          if (utils.isEqual(token.number, tokenNumber)) {
            return token;
          }
        });
        if (
          utils.isStringsEqual(selectedToken.status, tokenBookingStatus.BLOCKED)
        ) {
          //update token status to OPEN
          selectedToken.status = tokenBookingStatus.OPEN;
          TokenTable.updateOne(
            { doctorId, scheduleId, tokenDate },
            { $set: { tokens } },
            (err, raw) => {
              console.log(
                "Token number: " +
                  tokenNumber +
                  " has been updated to OPEN status."
              );
            }
          );
        }
      }
    }
  );
}

/**
 * _updateFavorites method adds/removes a userId of the  doctor
 * to the favorites array of the passed mobile(username).
 *
 * @param {String} mobile
 * @param {String} userId
 * @param {String} operation
 */
function _updateFavorites(mobile, userId, operation) {
  return new Promise((resolve, reject) => {
    User.findOne({ username: mobile }, (err, user) => {
      if (err) {
        reject(err);
      } else {
        let favorites = user.favorites;
        const initialSize = favorites.length;

        if (utils.isStringsEqual(operation, operations.ADD)) {
          //add favorite if not exists already
          if (!favorites.includes(userId)) {
            favorites.push(userId);
          }
        } else if (utils.isStringsEqual(operation, operations.REMOVE)) {
          //remove favorite
          favorites = utils.removeElement(favorites, userId);
        }
        const modifiedSize = favorites.length;

        if (utils.isEqual(initialSize, modifiedSize)) {
          resolve(favorites);
        } else {
          User.updateOne(
            { username: mobile },
            { $set: { favorites } },
            (err, raw) => {
              if (err) {
                reject(err);
              } else {
                resolve(favorites);
              }
            }
          );
        }
      }
    });
  });
}

/**
 * _getAutoNumber method fetches the number from collection.
 * It then increments the number by one and is saved to the same document in the collection.
 */
function _getAutoNumber() {
  return new Promise((resolve, reject) => {
    AutoNumber.find({}, (err, numbers) => {
      if (err) {
        reject(err);
      } else {
        const { number } = numbers[0];
        const nextNumber = number + 1;
        AutoNumber.updateOne(
          { number },
          {
            $set: {
              number: nextNumber
            }
          },
          (err, raw) => {
            if (err) {
              reject(err);
            } else {
              resolve(number);
            }
          }
        );
      }
    });
  });
}

/**
 * _findToken method finds and returns the token from the given array of tokens.
 *
 * @param {Array} tokens
 * @param {Number} tokenNumber
 */
function _findToken(tokens, tokenNumber) {
  return tokens.find(token => {
    if (utils.isEqual(token.number, tokenNumber)) {
      return token;
    }
  });
}

/**
 * _getTokenTableData method returns a tokenTable document for the given params
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 * @param {String} tokenDate
 */
function _getTokenTableData(doctorId, scheduleId, tokenDate) {
  return new Promise((resolve, reject) => {
    TokenTable.findOne(
      { doctorId, scheduleId, tokenDate },
      (err, tokenTableDoc) => {
        if (err) {
          reject(err);
        } else {
          resolve(tokenTableDoc);
        }
      }
    );
  });
}

/**
 * __updateTokenTableDocStatus method updates the status of the token to the passed status
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 * @param {String} tokenDate
 * @param {Number} tokenNumber
 * @param {String} status
 */
function _updateTokenTableDocStatus(
  doctorId,
  scheduleId,
  tokenDate,
  tokenNumber,
  status
) {
  return new Promise((resolve, reject) => {
    if (utils.isEqual(tokenNumber, 0)) {
      resolve(true);
    } else {
      TokenTable.findOne(
        { doctorId, scheduleId, tokenDate },
        (err, tokenTableDoc) => {
          let selectedToken = _findToken(tokenTableDoc.tokens, tokenNumber);
          if (
            utils.isStringsEqual(
              selectedToken.status,
              tokenBookingStatus.BOOKED
            )
          ) {
            resolve(false);
          } else {
            selectedToken.status = status;
            TokenTable.updateOne(
              { doctorId, scheduleId, tokenDate },
              {
                $set: {
                  tokens: tokenTableDoc.tokens
                }
              },
              (err, raw) => {
                if (err) {
                  reject(false);
                } else {
                  resolve(true);
                }
              }
            );
          }
        }
      );
    }
  });
}
