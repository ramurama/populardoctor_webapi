const _ = require("underscore");

module.exports = {
  isNullOrEmpty(data) {
    if (_.isNull(data) || _.isEmpty(data)) {
      return true;
    }
    return false;
  },

  generateOtp() {
    return Math.floor(1000 + Math.random() * 9000);
  },

  isStringsEqual(str1, str2) {
    return _.isEqual(str1, str2);
  },

  isEqual(str1, str2) {
    return _.isEqual(str1, str2);
  },

  isUndefined(data) {
    return _.isUndefined(data);
  },

  removeElement(arr, element) {
    return _.without(arr, element);
  },

  getDateString(date) {
    return (
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2)
    );
  }
};
