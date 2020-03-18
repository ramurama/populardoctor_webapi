const mongoose = require('mongoose');
const modelNames = require('../../constants/modelNames');
const User = mongoose.model(modelNames.USERS);
const Doctor = mongoose.model(modelNames.DOCTOR);
const Specialization = mongoose.model(modelNames.SPECIALIZATION);
const Hospital = mongoose.model(modelNames.HOSPITAL);
const Location = mongoose.model(modelNames.LOCATION);
const Schedule = mongoose.model(modelNames.SCHEDULE);
const Booking = mongoose.model(modelNames.BOOKING);
const Announcement = mongoose.model(modelNames.ANNOUNCEMENTS);
const DoctorPdNumber = mongoose.model(modelNames.DOCTOR_PD_NUMBER);
const HospitalPdNumber = mongoose.model(modelNames.HOSPITAL_PD_NUMBER);
const UserSupport = mongoose.model(modelNames.USER_SUPPORT);
const Scores = mongoose.model(modelNames.SCORES);
const bcrypt = require('bcrypt');
const passwordConfig = require('../../config/password');
const userType = require('../../constants/userType');
const activationStatus = require('../../constants/activationStatus');
const utils = require('../utils');
const AsyncLock = require('async-lock');
const fs = require('fs');
const google = require('./google');
const tokenValue = require('../../constants/fastrackToken');
const _ = require('underscore');
const logger = require('../utils/logger');

module.exports = {
  /**
   * createDoctor method creates a new user record and
   * also adds a new record to the doctors collection.
   *
   * @param {Object} doctorData
   * @param {Function} callback
   */
  async createDoctor(doctorData, callback) {
    const {
      mobile,
      password,
      fullName,
      dateOfBirth,
      gender,
      specialization,
      yearsOfExperience,
      degree,
      profileContent
    } = doctorData;

    try {
      const isUserExists = await _checkIfUserAlreadyExists(mobile);
      if (!isUserExists) {
        //user document
        let user = new User();
        user.username = mobile;
        user.userType = userType.DOCTOR;
        user.status = activationStatus.ACTIVE;
        user.fullName = fullName;
        user.dateOfBirth = dateOfBirth;
        user.gender = gender;
        // user.profileImage = profileImage;
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
            doctor.profileContent = profileContent;
            doctor.doctorPdNumber = await _getDoctorPdNumber();
            Doctor.collection
              .save(doctor)
              .then(res => {
                //create an entry for scores collection
                _createScoresRecord(doctor._id);
                callback(
                  true,
                  'Doctor created successfully.',
                  doctor.doctorPdNumber
                );
              })
              .catch(err => {
                logger.error('***** Error saving doctor. ' + err);
                callback(false, 'Error creating doctor!');
              });
          })
          .catch(err => {
            logger.error('***** Error inserting into user model. ' + err);
            callback(false, 'Error creating doctor!');
          });
      } else {
        logger.trace('Entered mobile number already exists =' + mobile);
        callback(false, 'Entered mobile number already exists!', null);
      }
    } catch (err) {
      logger.error(err);
      callback(false, 'Unkown error!');
    }
  },

  /**
   * uploadDoctorProfileImage method is used to upload the image to google storage bucket.
   * It also performs deletion of the file once it has been successfully uploaded to google
   * storage bucket.
   *
   * @param {String} doctorPdNumber
   * @param {String} filename
   * @param {Function} callback
   */
  uploadDoctorProfileImage(doctorPdNumber, filename, callback) {
    google.uploadNewFile(filename, publicUrl => {
      Doctor.findOne({ doctorPdNumber }, (err, doctor) => {
        logger.trace(doctor);
        User.updateOne(
          { _id: doctor.userId },
          { $set: { profileImage: publicUrl } }
        )
          .then(raw => {
            // console.log(raw);
            fs.unlink(google.localFilePath + filename, () => {
              callback(true);
            });
          })
          .catch(err => logger.error(err));
      });
    });
  },

  deleteProfileImage(doctorPdNumber, callback) {
    Doctor.aggregate([
      {
        $match: {
          doctorPdNumber
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'doctorDetails'
        }
      },
      {
        $unwind: '$doctorDetails'
      }
    ])
      .then(data => {
        const { userId, doctorDetails } = data[0];
        const fileName = doctorDetails.profileImage.split('/')[4];
        google.deleteFile(fileName, status => {
          User.updateOne(
            { _id: mongoose.Types.ObjectId(userId) },
            { $set: { profileImage: null } },
            (err, raw) => {
              if (!err) {
                callback(status);
              } else {
                logger.error(err);
                callback(false);
              }
            }
          );
        });
      })
      .catch(err => {
        logger.error(err);
      });
  },

  /**
   * createHospital method adds a document to the Hospital collection.
   * Also, if the hospital's location will be added to the DB if the location
   * does not exists in Location collection.
   *
   * @param {Object} hospitalData
   * @param {Function} callback
   */
  async createHospital(hospitalData, callback) {
    const { name, address, location, pincode, landmark, latLng } = hospitalData;
    console.log(hospitalData);
    try {
      const hospitalPdNumber = await _getHospitalPdNumber();
      //hospital document
      let hospital = new Hospital();
      hospital.name = name;
      hospital.address = address;
      hospital.location = location;
      hospital.pincode = pincode;
      hospital.landmark = landmark;
      hospital.hospitalPdNumber = hospitalPdNumber;
      hospital.latLng = latLng;
      Hospital.collection
        .insertOne(hospital)
        .then(async res => {
          if (await _isLocationExists(location)) {
            //location already exists in Location collection
            callback(true, 'Hospital created successfully');
          } else {
            //location document
            let locationDoc = new Location();
            locationDoc.name = location;
            locationDoc.collection
              .insertOne(locationDoc)
              .then(res => callback(true, 'Hospital created successfully'))
              .catch(err =>
                logger.error(
                  '***** Error inserting document into Location. ' + err
                )
              );
          }
        })
        .catch(err => {
          logger.error('***** Error inserting document into Hospital. ' + err);
          callback(false, 'Error creating hospital');
        });
    } catch (err) {
      logger.error(err);
      callback(false, 'Error creating hospital');
    }
  },

  /**
   * createSchedule method creates a new schedule document if it not exists.
   *
   * @param {Object} scheduleData
   * @param {Function} callback
   */
  async createSchedule(scheduleData, callback) {
    try {
      if (await _isScheduleExists(scheduleData)) {
        callback(false, 'Schedule already exists.');
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
          .then(res => callback(true, 'Schedule created successfully.'))
          .catch(err =>
            logger.error('***** Error creating schedule document. ' + err)
          );
      }
    } catch (err) {
      logger.error(err);
      callback(false, 'Unknown error!');
    }
  },

  /**
   * getSchedules method is used to get all the schedules for a given doctorId
   *
   * @param {String} doctorId
   * @param {Function} callback
   */
  getSchedules(doctorId, callback) {
    Schedule.aggregate(
      [
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
            isDeleted: false
          }
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'hospitalId',
            foreignField: '_id',
            as: 'hospital'
          }
        },
        {
          $unwind: '$hospital'
        },
        {
          $project: {
            doctorId: 0,
            isDeleted: 0,
            tokens: 0,
            'hospital._id': 0
          }
        },
        {
          $sort: {
            weekday: 1
          }
        }
      ],
      (err, schedules) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          callback(schedules);
        }
      }
    );
  },

  /**
   * getScheduleDetails method is used to get complete schedule details for the given scheduleId
   *
   * @param {String} scheduleId
   * @param {Function} callback
   */
  getScheduleDetails(scheduleId, callback) {
    Schedule.aggregate(
      [
        {
          $match: {
            _id: mongoose.Types.ObjectId(scheduleId)
          }
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'hospitalId',
            foreignField: '_id',
            as: 'hospital'
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorDetails'
          }
        },
        {
          $unwind: '$doctorDetails'
        },
        {
          $unwind: '$hospital'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorDetails.userId',
            foreignField: '_id',
            as: 'doctorUserDetails'
          }
        },
        {
          $unwind: '$doctorUserDetails'
        },
        {
          $addFields: {
            doctor: {
              $mergeObjects: ['$doctorDetails', '$doctorUserDetails']
            }
          }
        },
        {
          $project: {
            doctorId: 0,
            isDeleted: 0,
            'hospital._id': 0,
            doctorDetails: 0,
            doctorUserDetails: 0,
            'doctor.userType': 0,
            'doctor.status': 0,
            'doctor.username': 0,
            'doctor.password': 0,
            'doctor.favorites': 0,
            'doctor.dateOfBirth': 0,
            'doctor.deviceToken': 0
          }
        }
      ],
      (err, schedules) => {
        if (err) {
          callback({});
        } else {
          const {
            hospital,
            doctor,
            hospitalId,
            weekday,
            startTime,
            endTime,
            tokens
          } = schedules[0];
          const { doctorPdNumber, fullName, _id } = doctor;
          const { hospitalPdNumber, name } = hospital;
          const schedule = {
            id: scheduleId,
            doctor: `${fullName} (${doctorPdNumber})`,
            hospital: `${name} (${hospitalPdNumber})`,
            weekday: weekday.toUpperCase(),
            fromTime: startTime,
            toTime: endTime,
            isFastrack: !utils.isNullOrEmpty(
              tokens.filter(value => utils.isEqual(value, tokenValue.FASTRACK))
            ),
            tokens
          };
          callback(schedule);
        }
      }
    );
  },

  /**
   * updateSchedule method is used to update a schedule's tokens
   *
   * @param {String} scheduleId
   * @param {Array of token numbers} deleteTokens
   * @param {Array of token objects} addTokens
   * @param {Function} callback
   */
  updateSchedule(scheduleId, deleteTokens, addTokens, callback) {
    scheduleId = mongoose.Types.ObjectId(scheduleId);
    Schedule.findOne({ _id: scheduleId }, (err, schedule) => {
      if (err) {
        logger.error(err);
        callback(false);
      } else {
        const previousTokens = Object.assign(schedule.tokens);
        console.log(previousTokens);
        //delete tokens
        let newTokens = _.reject(previousTokens, previousToken => {
          return deleteTokens.includes(previousToken.number);
        });
        //add tokens
        newTokens = [...newTokens, ...addTokens];

        //save the tokens
        Schedule.updateOne(
          { _id: scheduleId },
          {
            $set: {
              tokens: newTokens
            }
          },
          (err, raw) => {
            if (err) {
              logger.error(err);
              callback(false, 'Error updating schedule');
            } else {
              console.log(raw);
              callback(true, 'Schedule updated successfully');
            }
          }
        );
      }
    });
  },

  /**
   * createSpecialization method is used to create specialization.
   *
   * @param {String} name
   * @param {String} iconName
   * @param {Function} callback
   */
  async createSpecialization(name, iconName, callback) {
    try {
      if (await _isSpecializationExists(name)) {
        callback(false, 'Specialization already exists!');
      } else {
        if (utils.isNullOrEmpty(iconName)) {
          iconName = 'general';
        }
        let specialization = new Specialization();
        specialization.name = name;
        specialization.iconName = iconName;
        Specialization.collection
          .insertOne(specialization)
          .then(res => callback(true, 'Specialization added successfully.'))
          .catch(err => {
            logger.error('***** Error creating specialization. ' + err);
            callback(false, 'Unknown error!');
          });
      }
    } catch (err) {
      logger.error(err);
      callback(false, 'Unknown error!');
    }
  },

  /**
   * getSpecializations method fetches all the list of specializations
   *
   * @param {Function} callback
   */
  getSpecializations(callback) {
    Specialization.find({}, { _id: 0, iconName: 0 }, (err, specializations) => {
      if (err) {
        logger.error(err);
        callback([]);
      } else {
        callback(specializations);
      }
    });
  },

  /**
   * getDoctors method gets a list of doctors given a pageNo and size
   *
   * @param {Function} callback
   */
  getDoctors(callback) {
    Doctor.aggregate(
      [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'doctorDetails'
          }
        },
        {
          $unwind: '$doctorDetails'
        },
        {
          $project: {
            'doctorDetails.userType': 0,
            'doctorDetails.password': 0,
            'doctorDetails.favorites': 0,
            'doctorDetails._id': 0,
            'doctorDetails.deviceToken': 0
          }
        },
        {
          $sort: {
            'doctorDetails.fullName': 1
          }
        }
      ],
      (err, doctors) => {
        if (err) {
          logger.error(err);
          callback({
            status: false,
            doctors: []
          });
        } else {
          callback({ status: true, doctors });
        }
      }
    );
  },

  /**
   * getUsers method gets a list of users given a pageNo and size
   *
   * @param {Object} pagination
   * @param {Function} callback
   */
  getUsers(userType, callback) {
    User.find(
      { userType },
      { userType: 0, password: 0, favorites: 0, deviceToken: 0 },
      {
        sort: {
          fullName: 1
        }
      },
      (err, users) => {
        if (err) {
          logger.error(err);
          callback({
            status: false,
            users: []
          });
        } else {
          callback({ status: true, users });
        }
      }
    );
  },

  /**
   * getHospitals method returns a list of hospitals with respect to pagination params.
   *
   * @param {String} location
   * @param {Function} callback
   */
  getHospitals(location, callback) {
    let find = {};
    if (!utils.isStringsEqual(location, 'all')) {
      find = { location };
    }

    Hospital.find(
      find,
      {},
      {
        sort: {
          name: 1
        }
      },
      (err, hospitals) => {
        if (err) {
          logger.error(err);
          callback({
            status: false,
            hospitals: []
          });
        } else {
          callback({ status: true, hospitals });
        }
      }
    );
  },

  /**
   * blockUser method is used to block the user from logging in to the system.
   *
   * @param {String} userId
   * @param {Function} callback
   */
  async blockUser(userId, callback) {
    try {
      const updateStatus = await _updateUserStatus(
        userId,
        activationStatus.INACTIVE
      );
      if (updateStatus) {
        callback(true);
      } else {
        callback(false);
      }
    } catch (err) {
      logger.error(err);
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
    try {
      const updateStatus = await _updateUserStatus(
        userId,
        activationStatus.ACTIVE
      );
      if (updateStatus) {
        callback(true);
      } else {
        callback(false);
      }
    } catch (err) {
      logger.error(err);
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
          logger.error(err);
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
        logger.error(err);
        callback(false, 'Unknown error!');
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
                logger.error(err);
                callback(false, 'Unknown error!');
              } else {
                callback(true, 'Token added successfully.');
              }
            }
          );
        } else {
          callback(false, 'Token number exists!');
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
        logger.error(err);
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
              logger.error(err);
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
  getBookingHistory(callback) {
    Booking.aggregate(
      [
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorMainDetails'
          }
        },
        {
          $unwind: '$doctorMainDetails'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorMainDetails.userId',
            foreignField: '_id',
            as: 'doctorUserDetails'
          }
        },
        {
          $unwind: '$doctorUserDetails'
        },
        {
          $addFields: {
            doctorDetails: {
              $mergeObjects: ['$doctorMainDetails', '$doctorUserDetails']
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'scheduleDetails'
          }
        },
        {
          $unwind: '$scheduleDetails'
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'scheduleDetails.hospitalId',
            foreignField: '_id',
            as: 'hospitalDetails'
          }
        },
        {
          $unwind: '$hospitalDetails'
        },
        {
          $sort: {
            bookingTimeStamp: -1
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
            'doctorDetails._id': 0,
            'doctorDetails.userId': 0,
            'doctorDetails.yearsOfExperience': 0,
            'doctorDetails.degree': 0,
            'doctorDetails.userType': 0,
            'doctorDetails.status': 0,
            'doctorDetails.favorites': 0,
            'doctorDetails.username': 0,
            'doctorDetails.password': 0,
            'doctorDetails.dateOfBirth': 0,
            'doctorDetails.gender': 0,
            'doctorDetails.deviceToken': 0,
            'userDetails._id': 0,
            'userDetails.username': 0,
            'userDetails.password': 0,
            'userDetails.userType': 0,
            'userDetails.status': 0,
            'userDetails.userId': 0,
            'userDetails.dateOfBirth': 0,
            'userDetails.gender': 0,
            'userDetails.deviceToken': 0,
            'userDetails.favorites': 0,
            'hospitalDetails._id': 0,
            'hospitalDetails.landmark': 0
          }
        }
      ],
      (err, bookings) => {
        try {
          callback(bookings);
        } catch (err) {
          logger.error(err);
          callback([]);
        }
      }
    );
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
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorMainDetails'
          }
        },
        {
          $unwind: '$doctorMainDetails'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorMainDetails.userId',
            foreignField: '_id',
            as: 'doctorUserDetails'
          }
        },
        {
          $unwind: '$doctorUserDetails'
        },
        {
          $addFields: {
            doctorDetails: {
              $mergeObjects: ['$doctorMainDetails', '$doctorUserDetails']
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'scheduleDetails'
          }
        },
        {
          $unwind: '$scheduleDetails'
        },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'scheduleDetails.hospitalId',
            foreignField: '_id',
            as: 'hospitalDetails'
          }
        },
        {
          $unwind: '$hospitalDetails'
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
            'doctorDetails._id': 0,
            'doctorDetails.userId': 0,
            'doctorDetails.userType': 0,
            'doctorDetails.status': 0,
            'doctorDetails.favorites': 0,
            'doctorDetails.password': 0,
            'doctorDetails.dateOfBirth': 0,
            'doctorDetails.deviceToken': 0,
            'userDetails._id': 0,
            'userDetails.password': 0,
            'userDetails.userType': 0,
            'userDetails.status': 0,
            'userDetails.userId': 0,
            'userDetails.deviceToken': 0,
            'userDetails.favorites': 0,
            'hospitalDetails._id': 0,
            'hospitalDetails.landmark': 0,
            'scheduleDetails._id': 0,
            'scheduleDetails.tokens': 0,
            'scheduleDetails.isDeleted': 0,
            'scheduleDetails.doctorId': 0,
            'scheduleDetails.hospitalId': 0
          }
        }
      ],
      (err, booking) => {
        if (err) {
          logger.error(err);
          callback({});
        } else {
          callback(booking[0]);
        }
      }
    );
  },

  /**
   * getMasterDoctors method fetches all the list of doctors
   *
   * @param {Function} callback
   */
  getMasterDoctors(callback) {
    Doctor.aggregate(
      [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'doctorDetails'
          }
        },
        {
          $unwind: '$doctorDetails'
        },
        {
          $project: {
            userId: 0,
            yearsOfExperience: 0,
            degree: 0,
            profileContent: 0,
            'doctorDetails._id': 0,
            'doctorDetails.userType': 0,
            'doctorDetails.status': 0,
            'doctorDetails.favorites': 0,
            'doctorDetails.dateOfBirth': 0,
            'doctorDetails.gender': 0,
            'doctorDetails.password': 0,
            'doctorDetails.profileImage': 0
          }
        }
      ],
      (err, doctors) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          let masterData = doctors.map(doctor => {
            const {
              _id,
              specialization,
              doctorDetails,
              doctorPdNumber
            } = doctor;
            return {
              doctorId: _id,
              specialization,
              name: doctorDetails.fullName,
              mobile: doctorDetails.username,
              pdNumber: doctorPdNumber
            };
          });
          callback(masterData);
        }
      }
    );
  },

  /**
   * getMasterHospitals method fetches all the list of hospitals.
   *
   * @param {Function} callback
   */
  getMasterHospitals(callback) {
    Hospital.find({}, (err, hospitals) => {
      if (err) {
        logger.error(err);
        callback([]);
      } else {
        let masterData = hospitals.map(hospital => {
          const {
            _id,
            name,
            address,
            location,
            pincode,
            landmark,
            hospitalPdNumber
          } = hospital;
          return {
            hospitalId: _id,
            name,
            address,
            location,
            pincode,
            landmark,
            pdNumber: hospitalPdNumber
          };
        });
        callback(masterData);
      }
    });
  },

  /**
   * getMasterFrontdeskUsers method is used to get all the list of available frontdesk users.
   *
   * @param {Function} callback
   */
  async getMasterFrontdeskUsers(callback) {
    try {
      const frontdeskUsers = await _getMasterFrontdeskUsers();
      callback(frontdeskUsers);
    } catch (err) {
      logger.error(err);
      callback([]);
      console.error(err);
    }
  },

  /**
   * createFrontdeskUser method is used to create a frontdesk user
   *
   * @param {Object} userData
   * @param {Function} callback
   */
  async createFrontdeskUser(userData, callback) {
    const { mobile, fullName, password, gender, dateOfBirth } = userData;
    try {
      const isUserExists = await _checkIfUserAlreadyExists(mobile);
      if (!isUserExists) {
        //user document
        let user = new User();
        user.username = mobile;
        user.userType = userType.FRONTDESK;
        user.status = activationStatus.ACTIVE;
        user.fullName = fullName;
        user.dateOfBirth = dateOfBirth;
        user.gender = gender;
        user.password = bcrypt.hashSync(
          password,
          bcrypt.genSaltSync(passwordConfig.SALT)
        );

        User.collection
          .insertOne(user)
          .then(async res => {
            callback(
              true,
              'Frontdesk user create successfully.',
              await _getMasterFrontdeskUsers()
            );
          })
          .catch(err => {
            console.log('Error creating frontdesk user. ' + err);
            logger.error(err);
          });
      } else {
        callback(false, 'Entered mobile number is already registered!');
      }
    } catch (err) {
      logger.error(err);
      callback(false, 'Unknown error!');
    }
  },

  /**
   * linkFrontdeskUser method is used to map a frontdesk user to the given combination of
   * hospital and doctor.
   *
   * @param {Object} data
   * @param {Function} callback
   */
  async linkFrontdeskUser(data, callback) {
    const { doctorId, hospitalId, frontdeskUserId } = data;
    try {
      let status = await _updateScheduleFrontdeskUser(
        hospitalId,
        doctorId,
        frontdeskUserId
      );
      callback(status);
    } catch (err) {
      logger.error(err);
      callback(false);
    }
  },

  /**
   * getDoctorFrontdeskUsers method is used to fetch the frontdesk user for the given doctorId and hospitalId
   *
   * @param {String} doctorId
   * @param {String} hospitalId
   * @param {Function} callback
   */
  getDoctorFrontdeskUsers(doctorId, hospitalId, callback) {
    Schedule.aggregate(
      [
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
            hospitalId: mongoose.Types.ObjectId(hospitalId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'frontdeskUserId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $limit: 1
        },
        {
          $project: {
            _id: 0,
            doctorId: 0,
            hospitalId: 0,
            tokens: 0,
            weekday: 0,
            startTime: 0,
            endTime: 0,
            isDeleted: 0,
            frontdeskUserId: 0,
            'userDetails.userType': 0,
            'userDetails.status': 0,
            'userDetails.password': 0,
            'userDetails.favorites': 0
          }
        }
      ],
      (err, user) => {
        if (err) {
          logger.error(err);
          callback({});
        } else {
          if (!utils.isNullOrEmpty(user)) {
            const { _id, username, fullName } = user[0].userDetails;
            callback({ userId: _id, mobile: username, fullName });
          } else {
            callback({});
          }
        }
      }
    );
  },

  /**
   * updateDoctor method is used to update the doctor and doctor's user document for the given doctorId
   *
   * @param {String} doctorId
   * @param {Object} data
   * @param {Function} callback
   */
  updateDoctor(doctorId, data, callback) {
    const {
      fullName,
      dateOfBirth,
      specialization,
      yearsOfExperience,
      gender,
      profileImage,
      degree,
      profileContent
    } = data;

    Doctor.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(doctorId) },
      {
        $set: {
          specialization,
          yearsOfExperience,
          degree,
          profileContent
        }
      },
      {
        new: true
      },
      (err, doctor) => {
        User.updateOne(
          { _id: doctor.userId },
          {
            $set: {
              fullName,
              dateOfBirth,
              gender,
              profileImage
            }
          },
          (err, raw) => {
            if (err) {
              logger.error(err);
              callback(false, 'Error updating doctor');
            } else {
              console.log(raw);
              console.log('Doctor details update successfully.');
              callback(true, 'Doctor updated successfully');
            }
          }
        );
      }
    );
  },

  /**
   * updateHospital method id used to update the name, address, pincode and landmark of a hospital
   *
   * @param {String} hospitalId
   * @param {Object} data
   * @param {Function} callback
   */
  updateHospital(hospitalId, data, callback) {
    const { name, address, pincode, landmark, latLng } = data;

    Hospital.updateOne(
      { _id: mongoose.Types.ObjectId(hospitalId) },
      {
        $set: {
          name,
          address,
          pincode,
          landmark,
          latLng
        }
      },
      (err, raw) => {
        if (err) {
          logger.error(err);
          callback(false, 'Error updating hospital');
        } else {
          console.log('Hospital details updated successfully.');
          console.log(raw);
          callback(true, 'Hospital updated successfully');
        }
      }
    );
  },

  /**
   * getScheduleHospitals method is used to fetch all the hospitals based on the schedules.
   *
   * @param {Function} callback
   */
  getScheduleHospitals(callback) {
    Schedule.aggregate(
      [
        {
          $lookup: {
            from: 'hospitals',
            localField: 'hospitalId',
            foreignField: '_id',
            as: 'hospitalDetails'
          }
        },
        {
          $unwind: '$hospitalDetails'
        },
        {
          $group: {
            _id: '$hospitalDetails'
          }
        }
      ],
      (err, schedules) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          let hospitals = schedules.map(schedule => {
            const {
              _id,
              name,
              address,
              location,
              pincode,
              landmark
            } = schedule._id;
            return {
              hospitalId: _id,
              name,
              address,
              location,
              pincode,
              landmark
            };
          });
          callback(hospitals);
        }
      }
    );
  },

  /**
   * getScheduleDoctors method is used to fetch list of doctors
   * based on the hospital available in the schedules collection.
   *
   * @param {String} hospitalId
   * @param {Function} callback
   */
  getScheduleDoctors(hospitalId, callback) {
    Schedule.aggregate(
      [
        {
          $match: {
            hospitalId: mongoose.Types.ObjectId(hospitalId)
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorMainDetails'
          }
        },
        {
          $unwind: '$doctorMainDetails'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'doctorMainDetails.userId',
            foreignField: '_id',
            as: 'doctorUserDetails'
          }
        },
        {
          $unwind: '$doctorUserDetails'
        },
        {
          $addFields: {
            doctorDetails: {
              $mergeObjects: ['$doctorMainDetails', '$doctorUserDetails']
            }
          }
        },
        {
          $group: {
            _id: '$doctorDetails'
          }
        }
      ],
      (err, schedules) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          const doctors = schedules.map(schedule => {
            const { _id, specialization, fullName, username } = schedule._id;
            return {
              doctorId: _id,
              specialization,
              name: fullName,
              mobile: username
            };
          });
          callback(doctors);
        }
      }
    );
  },

  /**
   * getAnnouncements method fetches all the annoucements made previously
   *
   * @param {Function} callback
   */
  getAnnouncements(callback) {
    Announcement.find(
      {},
      {},
      {
        sort: {
          date: 1
        }
      },
      (err, announcements) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          callback(announcements);
        }
      }
    );
  },

  /**
   * setSupportDetails method is used to update the support details.
   *
   * @param {Object} data
   * @param {Function} callback
   */
  setSupportDetails(data, callback) {
    const { contactNumber, contactEmail } = data;
    UserSupport.remove({}, err => {
      if (err) {
        logger.error(err);
      } else {
        console.log('user_supports collection data cleared.');
        UserSupport.collection
          .insertOne({
            contactNumber,
            contactEmail
          })
          .then(res => {
            console.log('user_supports collection updated successfully.');
            callback(true);
          })
          .catch(err => {
            logger.error('Failure updating user_supports collection. ' + err);
            callback(false);
          });
      }
    });
  },

  /**
   * getDoctorDetail method fetches the details of the doctor for a given doctorPdNumber
   *
   * @param {String} doctorPdNumber
   * @param {Function} callback
   */
  getDoctorDetail(doctorPdNumber, callback) {
    Doctor.aggregate(
      [
        {
          $match: {
            doctorPdNumber
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $project: {
            'userDetails.userType': 0,
            'userDetails.status': 0,
            'userDetails.favorites': 0,
            'userDetails.password': 0,
            'userDetails._id': 0
          }
        }
      ],
      (err, doctors) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          const {
            _id,
            userId,
            specialization,
            yearsOfExperience,
            degree,
            profileContent,
            doctorPdNumber,
            userDetails
          } = doctors[0];
          const {
            username,
            fullName,
            profileImage,
            gender,
            dateOfBirth
          } = userDetails;

          callback({
            doctorId: _id,
            userId,
            specialization: { label: specialization, value: specialization },
            yearsOfExperience,
            degree,
            profileContent,
            doctorPdNumber,
            mobile: username,
            fullName,
            profileImage,
            gender: { label: gender, value: gender },
            dateOfBirth: new Date(dateOfBirth)
          });
        }
      }
    );
  },

  /**
   * getHospitalDetails method fetches the details of the hospital given the hospitalPdNUmber
   *
   * @param {String} hospitalPdNumber
   * @param {Function} callback
   */
  getHospitalDetails(hospitalPdNumber, callback) {
    Hospital.findOne(
      {
        hospitalPdNumber
      },
      (err, hospital) => {
        if (err) {
          logger.error(err);
          callback([]);
        } else {
          callback(hospital);
        }
      }
    );
  }
};

/**
 * _getDoctorPdNumber method fetches the number from collection.
 * It then increments the number by one and is saved to the same document in the collection.
 * Async-lock has been added inorder to prevent duplication of doctor's PD number
 * in the case of concurrency.
 */
function _getDoctorPdNumber() {
  return new Promise((resolve, reject) => {
    const lock = new AsyncLock();
    lock
      .acquire('doctorPdNumber', () => {
        console.log('Doctor PD Number --> lock acquired.');
        DoctorPdNumber.find({}, (err, numbers) => {
          if (err) {
            logger.error(err);
            reject(err);
          } else {
            const { number } = numbers[0];
            const nextNumber = number + 1;
            DoctorPdNumber.updateOne(
              { number },
              {
                $set: {
                  number: nextNumber
                }
              },
              (err, raw) => {
                if (err) {
                  logger.error(err);
                  reject(err);
                  logger.error(err);
                } else {
                  resolve('DR' + number);
                }
              }
            );
          }
        });
      })
      .then(() => {
        console.log('Doctor PD Number --> lock released.');
        //lock released
      });
  });
}

/**
 * _getHospitalPdNumber method fetches the number from collection.
 * It then increments the number by one and is saved to the same document in the collection.
 * Async-lock has been added inorder to prevent duplication of hospitals's PD number
 * in the case of concurrency.
 */
function _getHospitalPdNumber() {
  return new Promise((resolve, reject) => {
    const lock = new AsyncLock();
    lock
      .acquire('hospitalPdNumber', () => {
        console.log('Hospital PD Number --> lock acquired.');
        HospitalPdNumber.find({}, (err, numbers) => {
          if (err) {
            logger.error(err);
            reject(err);
          } else {
            const { number } = numbers[0];
            const nextNumber = number + 1;
            HospitalPdNumber.updateOne(
              { number },
              {
                $set: {
                  number: nextNumber
                }
              },
              (err, raw) => {
                if (err) {
                  logger.error(err);
                  reject(err);
                } else {
                  resolve('HL' + number);
                }
              }
            );
          }
        });
      })
      .then(() => {
        console.log('Hospital PD Number --> lock released.');
        //lock relased
      });
  });
}

/**
 * _isLocationExists method returns true if the location already exists, return false otherwise.
 *
 * @param {String} name
 */
function _isLocationExists(name) {
  return new Promise((resolve, reject) => {
    Location.findOne({ name }, (err, location) => {
      if (err) {
        logger.error(err);
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
          logger.error(err);
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
        logger.error(err);
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
        logger.error(err);
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
  if (!utils.isStringsEqual(location, 'all')) {
    find = { location };
  }
  return new Promise((resolve, reject) => {
    Hospital.find(find, (err, hospitals) => {
      if (err) {
        logger.error(err);
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
        logger.error(err);
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
        logger.error(err);
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

/**
 * _updateScheduleFrontdeskUser method updates the frontdesk user for the
 * given combination of doctorId and hospitalId
 *
 * @param {String} hospitalId
 * @param {String} doctorId
 * @param {String} frontdeskUserId
 */
function _updateScheduleFrontdeskUser(hospitalId, doctorId, frontdeskUserId) {
  return new Promise((resolve, reject) => {
    Schedule.updateMany(
      {
        doctorId: mongoose.Types.ObjectId(doctorId),
        hospitalId: mongoose.Types.ObjectId(hospitalId)
      },
      {
        $set: {
          frontdeskUserId: mongoose.Types.ObjectId(frontdeskUserId)
        }
      },
      (err, raw) => {
        if (err) {
          logger.error(err);
          reject(false);
        } else {
          console.log(
            'Frontdesk user updated for the combination doctorId: ' +
              doctorId +
              ' and hospitalId: ' +
              hospitalId
          );
          console.log(raw);
          resolve(true);
        }
      }
    );
  });
}

/**
 * _checkIfUserAlreadyExists method is used to check
 * if a user with the given mobile number already exists.
 *
 * @param {String} mobile
 */
function _checkIfUserAlreadyExists(mobile) {
  return new Promise((resolve, reject) => {
    User.findOne({ username: mobile }, (err, user) => {
      if (err) {
        logger.error(err);
        reject(err);
      } else {
        if (utils.isNullOrEmpty(user)) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  });
}

/**
 * _getMasterFrontdeskUsers method is used to fetch all the list of front desk users
 */
function _getMasterFrontdeskUsers() {
  return new Promise((resolve, reject) => {
    User.find(
      { userType: userType.FRONTDESK },
      {
        deviceToken: 0,
        dateOfBirth: 0,
        password: 0,
        favorites: 0,
        status: 0,
        userType: 0,
        userId: 0
      },
      (err, users) => {
        if (err) {
          logger.error(err);
          reject(err);
        } else {
          let frontdeskUsers = users.map(user => {
            const { _id, username, fullName } = user;
            return {
              frontdeskUserId: _id,
              name: fullName,
              mobile: username
            };
          });
          resolve(frontdeskUsers);
        }
      }
    );
  });
}

/**
 * _createScoresRecord method creates an entry in the scores collection
 *
 * @param {ObjectId} doctorId
 */
function _createScoresRecord(doctorId) {
  let scores = new Scores();
  scores.doctorId = doctorId;
  scores.trust = 0;
  scores.popularity = 0;
  scores.schedule = 0;
  scores.total = 0;
  Scores.collection
    .save(scores)
    .then(res => {})
    .catch(err =>
      logger.error(
        `***** Error creating scores record for doctor with _id: ${doctor._id}` +
          ' ' +
          err
      )
    );
}
