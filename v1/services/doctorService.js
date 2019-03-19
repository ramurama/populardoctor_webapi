const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const Doctor = mongoose.model(modelNames.DOCTOR);
const TokenTable = mongoose.model(modelNames.TOKEN_TABLE);
const Schedule = mongoose.model(modelNames.SCHEDULE);
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
  },

  async getNextDayScheduleConfirmations(userid, callback) {
    const doctorId = await _getDoctorIdByUserId(userid);
    //today
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    //tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowMoment = _getMoment(tomorrow);

    const tokenDate = tomorrowMoment.format("YYYY-MM-DD").toString();
    const weekday = tomorrowMoment.format("ddd").toString();
    Schedule.aggregate(
      [
        {
          $lookup: {
            from: "hospitals",
            localField: "hospitalId",
            foreignField: "_id",
            as: "hospitalDetails"
          }
        },
        {
          $match: {
            doctorId: mongoose.Types.ObjectId(doctorId),
            weekday
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
      async (err, schedules) => {
        if (err) {
          callback([], tokenDate);
        } else {
          // const computedSchedules = await _computeScheduleConfirmations(
          //   schedules,
          //   tokenDate
          // );
          callback({ schedules, tokenDate });
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

function _getMoment(time) {
  return momentTz.tz(time, "Asia/Calcutta");
}

/**
 * _isTokenTableDocExists method checks if any tokenTableDoc available for the given params.
 * If available returns true, returns false otherwise
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 * @param {String} tokenDate
 */
// function _isTokenTableDocExists(doctorId, scheduleId, tokenDate) {
//   return new Promise((resolve, reject) => {
//     TokenTable.findOne(
//       {
//         doctorId: mongoose.Types.ObjectId(doctorId),
//         scheduleId: mongoose.Types.ObjectId(scheduleId),
//         tokenDate: new Date(tokenDate)
//       },
//       (err, tokenTableDoc) => {
//         if (err) {
//           reject(err);
//         } else {
//           if (utils.isNullOrEmpty(tokenTableDoc)) {
//             resolve(false);
//           } else {
//             resolve(true);
//           }
//         }
//       }
//     );
//   });
// }

// function _computeScheduleConfirmations(schedules, tokenDate) {
//   return new Promise((resolve, reject) => {
//     let computedSchedules = [];
//     schedules.forEach(schedule => {
//       const { doctorId, _id } = schedule;
//       TokenTable.findOne(
//         {
//           doctorId: mongoose.Types.ObjectId(doctorId),
//           scheduleId: mongoose.Types.ObjectId(_id),
//           tokenDate: new Date(tokenDate)
//         },
//         (err, tokenTableDoc) => {
//           if (err) {
//             reject(err);
//           } else {
//             if (!utils.isNullOrEmpty(tokenTableDoc)) {
//               computedSchedules.push(schedule);
//             }
//           }
//         }
//       );
//       console.log(computedSchedules);
//     });
//     resolve(computedSchedules);
//   });
// }
