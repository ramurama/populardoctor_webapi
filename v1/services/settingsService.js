const mongoose = require("mongoose");
const modelNames = require("../constants/modelNames");
const User = mongoose.model(modelNames.USERS);
const MobileOtp = mongoose.model(modelNames.MOBILE_OTP);
const UserSupport = mongoose.model(modelNames.USER_SUPPORT);
const utils = require("../utils");
const messageService = require("./messageService");
const bcrypt = require("bcrypt-nodejs");
const passwordConfig = require("../../config/password");
const userType = require("../constants/userType");
const activationStatus = require("../constants/activationStatus");

module.exports = {
  /**
   * signUpUser methos is prepares the given user data and inserts into the collection.
   *
   * @param {object} userDataReq
   * @param {Function} callback
   */
  signUpUser(userDataReq, callback) {
    const { mobile, fullName, dateOfBirth, gender, password } = userDataReq;
    let user = new User();
    user.username = mobile;
    (user.userType = userType.CUSTOMER),
      (user.status = activationStatus.ACTIVE);
    user.fullName = fullName;
    user.dateOfBirth = dateOfBirth;
    user.gender = gender;
    user.password = bcrypt.hashSync(
      password,
      bcrypt.genSaltSync(passwordConfig.SALT)
    );

    User.collection
      .insertOne(user)
      .then(res => {
        callback(true);
      })
      .catch(err =>
        console.log("***** Error inserting into user model. " + err)
      );
  },

  /**
   * changePassword methos used to change the old password of the user with the new one
   * based on the mobile number
   *
   * @param {string} mobile
   * @param {Object} reqData
   * @param {Function} callback
   */
  changePassword(mobile, reqData, callback) {
    User.findOne({ username: mobile }, (err, user) => {
      if (!utils.isNullOrEmpty(user)) {
        if (!user.comparePassword(reqData.currentPassword, user.password)) {
          callback(false, "Incorrect old password.");
        } else {
          User.updateOne(
            { username: mobile },
            { $set: { password: user.hashPassword(reqData.newPassword) } },
            (err, raw) => {
              if (err) {
                console.log(err);
                callback(false, "Error updating password. Try Again!");
              } else {
                callback(true, "Password has been changed successfully.");
              }
            }
          );
        }
      } else {
        callback(false, "User unavailable");
      }
    });
  },

  /**
   * updateDeviceToken method adds the given deviceToken to the colletion.
   * This deviceToken is used for sending push notifications using firebase.
   *
   * @param {String} mobile
   * @param {String} deviceToken
   * @param {Function} callback
   */
  updateDeviceToken(mobile, deviceToken, callback) {
    console.log(deviceToken);
    User.updateOne(
      { username: mobile },
      { $set: { deviceToken } },
      (err, raw) => {
        if (err) {
          console.log(err);
          callback(false);
        } else {
          //by defult all users will be subscribed to "announcements" firebase topic for sendng notifications
          messageService.subscribeUserToFirebaseTopic(mobile);
          callback(true);
        }
      }
    );
  },

  /**
   * verifyOtp method is used to verify the OTP sent to the user.
   * If the OTP is verified successfully, the particulat document will be deleted from the
   * collection.
   *
   * @param {String} mobile
   * @param {String} otp
   * @param {Function} callback
   */
  verifyOtp(mobile, otp, callback) {
    MobileOtp.findOne({ mobile }, (err, mobileOtpData) => {
      if (err) {
        callback(false);
      } else {
        if (utils.isStringsEqual(mobileOtpData.otp, otp)) {
          //delete otp if verified successfully
          MobileOtp.deleteOne({ mobile })
            .then(res => callback(true, "Mobile number verified successfully."))
            .catch(err => console.log("***** Error deleting mobile_otp data."));
        } else {
          callback(false, "Incorrect OTP entered.");
        }
      }
    });
  },

  /**
   * isMobileNumberExists returns true if the given mobile number already exists.
   *
   * @param {String} mobile
   * @param {Function} callback
   */
  isMobileNumberExists(mobile, callback) {
    User.findOne({ username: mobile }, (err, user) => {
      if (utils.isNullOrEmpty(user)) {
        callback(false);
      } else {
        callback(true);
      }
    });
  },

  /**
   * getSupportDetails method fetches all the user_support details from the DB.
   *
   */
  getSupportDetails() {
    return new Promise((resolve, reject) => {
      UserSupport.find({}, { _id: 0 }, (err, support) => {
        if (err) {
          reject(err);
        } else {
          resolve(support[0]);
        }
      });
    });
  }
};
