const firebase = require("firebase-admin");
const mongoose = require("mongoose");
const modelnames = require("../../constants/modelNames");
const User = mongoose.model(modelnames.USERS);
const MobileOtp = mongoose.model(modelnames.MOBILE_OTP);
const Announcement = mongoose.model(modelnames.ANNOUNCEMENTS);
const firebaseTopics = require("../../constants/firebaseTopics");
const utils = require("../utils");

var serviceAccount = require("../../config/serviceAccountKey.json");
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://populardoctor-f4673.firebaseio.com"
});

module.exports = {
  /**
   * sendPushNotificationByUser sends push notifications based on the mobile number. Device token for the
   * user is mapped with the mobile number.
   * @param {string} mobile
   * @param {string} title
   * @param {string} body
   */
  sendPushNotificationByUser(mobile, title, body) {
    User.findOne({ username: mobile }, (err, user) => {
      const message = {
        notification: {
          title,
          body
        },
        token: user.deviceToken
      };
      firebase
        .messaging()
        .send(message)
        .then(res => {
          console.log("Successfully sent message:", res);
        })
        .catch(error => {
          console.log("Error sending message:", error);
        });
    });
  },

  /**
   * subscribeUserToFirebaseTopic method makes all the users to subscribe to topic "announcements".
   * Purpose of this is to send push notifications for all the users of this topic.
   *
   * @param {string} mobile
   */
  subscribeUserToFirebaseTopic(mobile) {
    User.findOne({ username: mobile }, (err, user) => {
      firebase
        .messaging()
        .subscribeToTopic([user.deviceToken], firebaseTopics.ANNOUNCEMENTS)
        .then(res => {
          console.log("Successfully subscribed to topic:", res);
        })
        .catch(err => {
          console.log("Error subscribing to topic:", err);
        });
    });
  },

  /**
   * sendPushNotificationByTopic is used to send push notifications for a topic given.
   * All the users subscribed to the topic will get notified.
   * This can be used for making advertisements/offers using push notifications.
   *
   * @param {string} topic
   * @param {string} title
   * @param {string} body
   */
  sendPushNotificationByTopic(topic, title, body) {
    const message = {
      notification: {
        title,
        body
      },
      topic
    };
    firebase
      .messaging()
      .send(message)
      .then(res => {
        //save announcement document
        _saveAnnouncementData(title, body);
        console.log("Successfully sent message:", res);
      })
      .catch(error => {
        console.log("Error sending message:", error);
      });
  },

  /**
   * sendOtpByUserMobileNumber is used to send OTP via SMS services.
   *
   * @param {string} mobile
   * @param {Function} callback
   */
  sendOtpByUserMobileNumber(mobile, callback) {
    const otp = utils.generateOtp();
    MobileOtp.findOne({ mobile }, (err, mobileOtpData) => {
      if (utils.isNullOrEmpty(mobileOtpData)) {
        // mobile number not exists, insert as new document
        MobileOtp.collection
          .insertOne({
            mobile,
            otp
          })
          .then(raw => {
            console.log("Inserting OTP data to mobile_otp colletion.");
          })
          .catch(err => console.log("***** Error inserting OTP data." + err));
      } else {
        // mobile number exists, update the otp value
        MobileOtp.updateOne({ mobile }, { $set: { otp } })
          .then(raw => {
            console.log("Updating OTP data to mobile_otp colletion.");
          })
          .catch(err => console.log("***** Error updating OTP data." + err));
      }
    });

    //sms api call

    callback(true);
  }
};

/**
 * _saveAnnouncementData method is used to save all the announcements made.
 *
 * @param {String} title
 * @param {String} body
 */
function _saveAnnouncementData(title, body) {
  Announcement.collection
    .insertOne({ title, body, date: new Date() })
    .then(res => {
      console.log("Announcement document added");
    })
    .catch(err => console.log(err));
}
