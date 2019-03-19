const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const User = mongoose.model(modelNames.USERS);
const Doctor = mongoose.model(modelNames.DOCTOR);
const Specialization = mongoose.model(modelNames.SPECIALIZATION);
const Hospital = mongoose.model(modelNames.HOSPITAL);
const Location = mongoose.model(modelNames.LOCATION);
const Schedule = mongoose.model(modelNames.SCHEDULE);
const Booking = mongoose.model(modelNames.BOOKING);
const bcrypt = require("bcrypt-nodejs");
const passwordConfig = require("../../config/password");
const userType = require("../constants/userType");
const activationStatus = require("../constants/activationStatus");
const utils = require("../utils");

module.exports = {
  /**
   * createDoctor method creates a new user record and
   * also adds a new record to the doctors collection.
   *
   * @param {Object} doctorData
   * @param {Function} callback
   */
  createDoctor(doctorData, callback) {
    const {
      mobile,
      password,
      fullName,
      dateOfBirth,
      gender,
      specialization,
      yearsOfExperience,
      degree,
      profileImage
    } = doctorData;

    //user document
    let user = new User();
    user.username = mobile;
    (user.userType = userType.DOCTOR), (user.status = activationStatus.ACTIVE);
    user.fullName = fullName;
    user.dateOfBirth = dateOfBirth;
    user.gender = gender;
    user.profileImage = profileImage;
    user.password = bcrypt.hashSync(
      password,
      bcrypt.genSaltSync(passwordConfig.SALT)
    );

    User.collection
      .insertOne(user)
      .then(async res => {
        //doctor document
        let doctor = new Doctor();
        doctor.userId = user._id;
        doctor.specialization = specialization;
        doctor.yearsOfExperience = yearsOfExperience;
        doctor.degree = degree;
        Doctor.collection
          .save(doctor)
          .then(res => callback(true))
          .catch(err => console.log("***** Error saving doctor. " + err));
      })
      .catch(err =>
        console.log("***** Error inserting into user model. " + err)
      );
  },

  /**
   * createHospital method adds a document to the Hospital collection.
   * Also, if the hospital's location will be added to the DB if the location
   * does not exists in Location collection.
   *
   * @param {Object} hospitalData
   * @param {Function} callback
   */
  createHospital(hospitalData, callback) {
    const { name, address, location, pincode, landmark } = hospitalData;
    //hospital document
    let hospital = new Hospital();
    hospital.name = name;
    hospital.address = address;
    hospital.location = location;
    hospital.pincode = pincode;
    hospital.landmark = landmark;
    Hospital.collection
      .insertOne(hospital)
      .then(async res => {
        if (await _isLocationExists(location)) {
          //location already exists in Location collection
          callback(true);
        } else {
          //location document
          let locationDoc = new Location();
          locationDoc.name = location;
          locationDoc.collection
            .insertOne(locationDoc)
            .then(res => callback(true))
            .catch(err =>
              console.log(
                "***** Error inserting document into Location. " + err
              )
            );
        }
      })
      .catch(err =>
        console.log("***** Error inserting document into Hospital. " + err)
      );
  },

  /**
   * createSchedule method creates a new schedule document if it not exists.
   *
   * @param {Object} scheduleData
   * @param {Function} callback
   */
  async createSchedule(scheduleData, callback) {
    if (await _isScheduleExists(scheduleData)) {
      callback(false, "Schedule already exists.");
    } else {
      const {
        doctorId,
        hospitalId,
        weekday,
        startTime,
        endTime,
        tokens
      } = scheduleData;
      //schedule document
      let schedule = new Schedule();
      schedule.doctorId = doctorId;
      schedule.hospitalId = hospitalId;
      schedule.weekday = weekday;
      schedule.startTime = startTime;
      schedule.endTime = endTime;
      schedule.tokens = tokens;
      schedule.isDeleted = false;
      Schedule.collection
        .insertOne(schedule)
        .then(res => callback(true, "Schedule created successfully."))
        .catch(err =>
          console.log("***** Error creating schedule document. " + err)
        );
    }
  },

  /**
   * createSpecialization method is used to create specialization.
   *
   * @param {String} name
   * @param {String} iconName
   * @param {Function} callback
   */
  async createSpecialization(name, iconName, callback) {
    if (await _isSpecializationExists(name)) {
      callback(false, "Specialization already exists!");
    } else {
      if (utils.isNullOrEmpty(iconName)) {
        iconName = "general";
      }
      let specialization = new Specialization();
      specialization.name = name;
      specialization.iconName = iconName;
      Specialization.collection
        .insertOne(specialization)
        .then(res => callback(true, "Specialization added successfully."))
        .catch(err =>
          console.log("***** Error creating specialization. " + err)
        );
    }
  },

  /**
   * getDoctors method gets a list of doctors given a pageNo and size
   *
   * @param {Object} pagination
   * @param {Function} callback
   */
  getDoctors(pagination, callback) {
    const { size, pageNo } = pagination;
    if (pageNo < 0 || pageNo === 0) {
      callback({ status: false, doctors: [], totalPages: null });
    } else {
      const skip = size * (pageNo - 1);
      const limit = parseInt(size);
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
              "doctorDetails.userType": 0,
              "doctorDetails.password": 0,
              "doctorDetails.favorites": 0,
              "doctorDetails._id": 0,
              "doctorDetails.deviceToken": 0
            }
          },
          {
            $sort: {
              "doctorDetails.fullName": 1
            }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ],
        async (err, doctors) => {
          const totalDocuments = await _getUsersCount(userType.DOCTOR);
          const totalPages = Math.ceil(totalDocuments / limit);
          if (err) {
            callback({ status: false, doctors: [], totalPages: null });
          } else {
            callback({ status: true, totalPages, doctors });
          }
        }
      );
    }
  },

  /**
   * getUsers method gets a list of users given a pageNo and size
   *
   * @param {Object} pagination
   * @param {Function} callback
   */
  getUsers(pagination, userType, callback) {
    const { size, pageNo } = pagination;
    if (pageNo < 0 || pageNo === 0) {
      callback({ status: false, users: [], totalPages: null });
    } else {
      const skip = size * (pageNo - 1);
      const limit = parseInt(size);
      User.find(
        { userType },
        { userType: 0, password: 0, favorites: 0, deviceToken: 0 },
        {
          skip,
          limit,
          sort: {
            fullName: 1
          }
        },
        async (err, users) => {
          if (err) {
            callback({ status: false, users: [], totalPages: null });
          } else {
            const totalDocuments = await _getUsersCount(userType);
            const totalPages = Math.ceil(totalDocuments / limit);
            callback({ status: true, totalPages, users });
          }
        }
      );
    }
  },

  /**
   * getHospitals method returns a list of hospitals with respect to pagination params.
   *
   * @param {String} location
   * @param {Object} pagination
   * @param {Function} callback
   */
  getHospitals(location, pagination, callback) {
    let find = {};
    if (!utils.isStringsEqual(location, "all")) {
      find = { location };
    }
    const { size, pageNo } = pagination;
    if (pageNo < 0 || pageNo === 0) {
      callback({ status: false, hospitals: [], totalPages: null });
    } else {
      const skip = size * (pageNo - 1);
      const limit = parseInt(size);
      Hospital.find(
        find,
        {},
        {
          skip,
          limit,
          sort: {
            name: 1
          }
        },
        async (err, hospitals) => {
          if (err) {
            callback({ status: false, hospitals: [], totalPages: null });
          } else {
            const totalDocuments = await _getHospitalsCount(location);
            const totalPages = Math.ceil(totalDocuments / limit);
            callback({ status: true, totalPages, hospitals });
          }
        }
      );
    }
  },

  /**
   * blockUser method is used to block the user from logging in to the system.
   *
   * @param {String} userId
   * @param {Function} callback
   */
  async blockUser(userId, callback) {
    const updateStatus = await _updateUserStatus(
      userId,
      activationStatus.INACTIVE
    );
    if (updateStatus) {
      callback(true);
    } else {
      callback(false);
    }
  },

  /**
   * unblockUser method is used to unblock the user, allowing to log in into the system.
   *
   * @param {String} userId
   * @param {String} callback
   */
  async unblockUser(userId, callback) {
    const updateStatus = await _updateUserStatus(
      userId,
      activationStatus.ACTIVE
    );
    if (updateStatus) {
      callback(true);
    } else {
      callback(false);
    }
  },

  /**
   * deleteSchedule method is used to delete a schedule.
   * A new parameter - isDeleted will be added to the document.
   * isDeleted will be set to true.
   *
   * @param {String} scheduleId
   * @param {Function} callback
   */
  deleteSchedule(scheduleId, callback) {
    Schedule.updateOne(
      { _id: scheduleId },
      { $set: { isDeleted: true } },
      (err, raw) => {
        if (err) {
          callback(false);
        } else {
          callback(true);
        }
      }
    );
  },

  /**
   * addToken method adds a new token to the schedule.
   *
   * @param {String} scheduleId
   * @param {Object} token
   * @param {Function} callback
   */
  addToken(scheduleId, token, callback) {
    Schedule.findOne({ _id: scheduleId }, (err, schedule) => {
      let tokens = schedule.tokens;
      if (err) {
        callback(false, "Unknown error!");
      } else {
        const tokenIndex = _findTokenIndex(tokens, token.number);
        if (utils.isEqual(tokenIndex, -1)) {
          tokens.push(token);
          Schedule.updateOne(
            { _id: scheduleId },
            {
              $set: {
                tokens
              }
            },
            (err, raw) => {
              if (err) {
                callback(false, "Unknown error!");
              } else {
                callback(true, "Token added successfully.");
              }
            }
          );
        } else {
          callback(false, "Token number exists!");
        }
      }
    });
  },

  /**
   * deleteToken method is used to delete a token.
   *
   * @param {String} scheduleId
   * @param {Number} tokenNumber
   * @param {Function} callback
   */
  deleteToken(scheduleId, tokenNumber, callback) {
    Schedule.findOne({ _id: scheduleId }, (err, schedule) => {
      if (err) {
        callback(false);
      } else {
        let tokens = schedule.tokens;
        const tokenIndex = _findTokenIndex(tokens, parseInt(tokenNumber));
        tokens.splice(tokenIndex, 1);
        Schedule.updateOne(
          {
            _id: scheduleId
          },
          {
            $set: {
              tokens
            }
          },
          (err, raw) => {
            if (err) {
              callback(false);
            } else {
              callback(true);
            }
          }
        );
      }
    });
  },

  /**
   * getBookingHistory method fetches a list of booking history based on the pagination params.
   *
   * @param {Object} pagination
   * @param {Function} callback
   */
  getBookingHistory(pagination, callback) {
    const { size, pageNo } = pagination;
    if (pageNo < 0 || pageNo === 0) {
      callback({ status: false, users: [], totalPages: null });
    } else {
      const skip = size * (pageNo - 1);
      const limit = parseInt(size);
      Booking.aggregate(
        [
          {
            $lookup: {
              from: "doctors",
              localField: "doctorId",
              foreignField: "_id",
              as: "doctorMainDetails"
            }
          },
          {
            $unwind: "$doctorMainDetails"
          },
          {
            $lookup: {
              from: "users",
              localField: "doctorMainDetails.userId",
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
                $mergeObjects: ["$doctorMainDetails", "$doctorUserDetails"]
              }
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
              bookedTimeStamp: -1
            }
          },
          {
            $project: {
              _id: 0,
              userId: 0,
              doctorId: 0,
              scheduleId: 0,
              token: 0,
              startTime: 0,
              endTime: 0,
              latLng: 0,
              startTimeStamp: 0,
              endTimeStamp: 0,
              doctorMainDetails: 0,
              doctorUserDetails: 0,
              scheduleDetails: 0,
              "doctorDetails._id": 0,
              "doctorDetails.userId": 0,
              "doctorDetails.yearsOfExperience": 0,
              "doctorDetails.degree": 0,
              "doctorDetails.userType": 0,
              "doctorDetails.status": 0,
              "doctorDetails.favorites": 0,
              "doctorDetails.username": 0,
              "doctorDetails.password": 0,
              "doctorDetails.dateOfBirth": 0,
              "doctorDetails.gender": 0,
              "doctorDetails.deviceToken": 0,
              "userDetails._id": 0,
              "userDetails.username": 0,
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
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ],
        async (err, bookings) => {
          const totalDocuments = await _getBookingHistoryCount();
          const totalPages = Math.ceil(totalDocuments / limit);
          callback({ totalPages, bookings });
        }
      );
    }
  },

  /**
   * getBookingHistoryDetail method fetches the complete detail of the booking.
   *
   * @param {String} bookingId
   * @param {Function} callback
   */
  getBookingHistoryDetail(bookingId, callback) {
    bookingId = parseInt(bookingId);
    Booking.aggregate(
      [
        {
          $match: {
            bookingId
          }
        },
        {
          $lookup: {
            from: "doctors",
            localField: "doctorId",
            foreignField: "_id",
            as: "doctorMainDetails"
          }
        },
        {
          $unwind: "$doctorMainDetails"
        },
        {
          $lookup: {
            from: "users",
            localField: "doctorMainDetails.userId",
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
              $mergeObjects: ["$doctorMainDetails", "$doctorUserDetails"]
            }
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
            bookedTimeStamp: -1
          }
        },
        {
          $project: {
            _id: 0,
            startTime: 0,
            endTime: 0,
            startTimeStamp: 0,
            endTimeStamp: 0,
            doctorMainDetails: 0,
            doctorUserDetails: 0,
            "doctorDetails._id": 0,
            "doctorDetails.userId": 0,
            "doctorDetails.userType": 0,
            "doctorDetails.status": 0,
            "doctorDetails.favorites": 0,
            "doctorDetails.password": 0,
            "doctorDetails.dateOfBirth": 0,
            "doctorDetails.deviceToken": 0,
            "userDetails._id": 0,
            "userDetails.password": 0,
            "userDetails.userType": 0,
            "userDetails.status": 0,
            "userDetails.userId": 0,
            "userDetails.deviceToken": 0,
            "userDetails.favorites": 0,
            "hospitalDetails._id": 0,
            "hospitalDetails.landmark": 0,
            "scheduleDetails._id": 0,
            "scheduleDetails.tokens": 0,
            "scheduleDetails.isDeleted": 0,
            "scheduleDetails.doctorId": 0,
            "scheduleDetails.hospitalId": 0
          }
        }
      ],
      (err, booking) => {
        if (err) {
          callback({});
        } else {
          callback(booking);
        }
      }
    );
  }
};

/**
 * _isLocationExists method returns true if the location already exists, return false otherwise.
 *
 * @param {String} name
 */
function _isLocationExists(name) {
  return new Promise((resolve, reject) => {
    Location.findOne({ name }, (err, location) => {
      if (err) {
        reject(err);
      } else {
        if (utils.isNullOrEmpty(location)) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  });
}

/**
 * _isScheduleExists method checks if the given schedule already exists.
 * If exists returns true, returns false otherwise.
 *
 * @param {Object} scheduleData
 */
function _isScheduleExists(scheduleData) {
  const { doctorId, hospitalId, weekday, startTime, endTime } = scheduleData;
  return new Promise((resolve, reject) => {
    Schedule.findOne(
      { doctorId, hospitalId, weekday, startTime, endTime },
      (err, schedule) => {
        if (err) {
          reject(err);
        } else {
          if (utils.isNullOrEmpty(schedule)) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      }
    );
  });
}

/**
 * _isSpecializationExists method returns true if the given specialization already exists.
 * Returns false otherwise.
 *
 * @param {String} name
 */
function _isSpecializationExists(name) {
  return new Promise((resolve, reject) => {
    Specialization.findOne({ name }, (err, specialization) => {
      if (err) {
        reject(err);
      } else {
        if (utils.isNullOrEmpty(specialization)) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  });
}

/**
 * _getUsersCount method returns the total count of users.
 *
 * @param {String} userType
 */
function _getUsersCount(userType) {
  return new Promise((resolve, reject) => {
    User.find({ userType }, (err, users) => {
      if (err) {
        reject(err);
      } else {
        resolve(users.length);
      }
    });
  });
}

/**
 * _getHospitalsCount method returns the total number of hospitals available
 */
function _getHospitalsCount(location) {
  let find = {};
  if (!utils.isStringsEqual(location, "all")) {
    find = { location };
  }
  return new Promise((resolve, reject) => {
    Hospital.find(find, (err, hospitals) => {
      if (err) {
        reject(err);
      } else {
        resolve(hospitals.length);
      }
    });
  });
}

function _getBookingHistoryCount() {
  return new Promise((resolve, reject) => {
    Booking.find({}, (err, bookings) => {
      if (err) {
        reject(err);
      } else {
        resolve(bookings.length);
      }
    });
  });
}

/**
 * _updateUserStatus mehod is used to updated the user's activation status.
 *
 * @param {String} userId
 * @param {String} status
 */
function _updateUserStatus(userId, status) {
  return new Promise((resolve, reject) => {
    User.updateOne({ _id: userId }, { $set: { status } }, (err, raw) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
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
function _findTokenIndex(tokens, tokenNumber) {
  return tokens.findIndex(token => {
    return utils.isEqual(token.number, parseInt(tokenNumber));
  });
}
