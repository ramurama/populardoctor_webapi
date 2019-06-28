const _ = require('underscore');
const moment = require('moment');
const momentTz = require('moment-timezone');

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
      '-' +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + date.getDate()).slice(-2)
    );
  },

  getMoment(time) {
    return momentTz.tz(time, 'Asia/Calcutta');
  },

  getDateTime(date, time) {
    const timeArr = _get24HrFormatTime(time).split(':');
    date = new Date(date);
    date.setHours(timeArr[0]);
    date.setMinutes(timeArr[1]);
    return _getMoment(date);
  },

  getIstString(date) {
    return moment(date)
      .tz('Asia/Calcutta')
      .format();
  }
};

function _get24HrFormatTime(time) {
  return moment(time, ['h:mm A']).format('HH:mm');
}

function _getMoment(time) {
  return momentTz.tz(time, 'Asia/Calcutta');
}
