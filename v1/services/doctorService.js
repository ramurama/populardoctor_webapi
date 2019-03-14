const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const Doctor = mongoose.model(modelNames.DOCTOR);
const TokenTable = mongoose.model(modelNames.TOKEN_TABLE);
const Schedule = mongoose.model(modelNames.SCHEDULE);
const tokenBookingStatus = require("../constants/tokenBookingStatus");

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
    const doctorId = await getDoctorIdByUserId(userId);
    const schedule = await getSchedule(doctorId, scheduleId);
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
      .then(res => console.log(callback(true)))
      .catch(err => console.log("***** Error creating token table. " + err));
  }
};

/**
 * getDoctorIdByUserId method returns a doctorId given userId.
 *
 * @param {String} userId
 */
function getDoctorIdByUserId(userId) {
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
 * getSchedule method returns a schedule for a given doctorId and scheduleId
 *
 * @param {String} doctorId
 * @param {String} scheduleId
 */
function getSchedule(doctorId, scheduleId) {
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
