const mongoose = require('mongoose');
const modelNames = require('../../constants/modelNames');
const tokenBookingStatus = require('../../constants/tokenBookingStatus');
const Bookings = mongoose.model(modelNames.BOOKING);
const Scores = mongoose.model(modelNames.SCORES);
const config = require('../../config/scoring.json');
const _ = require('underscore');

module.exports = {
  run() {
    Bookings.aggregate(
      [
        {
          $match: {
            status: tokenBookingStatus.VISITED
          }
        },
        {
          $lookup: {
            from: modelNames.SCHEDULE,
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
            from: modelNames.HOSPITAL,
            localField: 'scheduleDetails.hospitalId',
            foreignField: '_id',
            as: 'hospitalDetails'
          }
        },
        {
          $unwind: '$hospitalDetails'
        },
        {
          $group: {
            _id: '$doctorId',
            bookings: {
              $push: {
                doctorId: '$doctorId',
                userId: '$userId',
                tokenDate: '$tokenDate',
                bookingLocation: '$latLng',
                hospitalLocation: '$hospitalDetails.latLng',
                bookedTimeStamp: '$bookedTimeStamp',
                startTimeStamp: '$startTimeStamp'
              }
            }
          }
        }
      ],
      (err, bookings) => {
        console.log(JSON.stringify(bookings));
        // _computeScores(bookings[0]);
      }
    );
  }
};

async function _computeScores(booking) {
  const { doctorId, userId, bookingLocation, hospitalLocation } = booking;
  const scores = await _fetchScoresForDoctor(doctorId);

  //trust computation
  const recurringCount = await _findTrustByUser(doctorId, userId);
  const trust = scores.trust + _computeTrust(recurringCount);

  //popularity computation
}

function _findTrustByUser(doctorId, userId) {
  return new Promise((resolve, reject) => {
    Bookings.count({ doctorId, userId }, (err, count) => {
      if (err) {
        reject(err);
      } else {
        resolve(count);
      }
    });
  });
}

function _fetchScoresForDoctor(doctorId) {
  return new Promise((resolve, reject) => {
    Scores.findOne({ doctorId }, (err, doctorScore) => {
      if (err) {
        reject(err);
      } else {
        resolve(doctorScore);
      }
    });
  });
}

function _computeTrust(count) {
  const { visits, points } = config.trust;
  const { v1, v2, v3, v4 } = visits;
  const { p1, p2, p3, p4 } = points;
  let totalTrust = p1; //1 booking = 1 point

  if (count === v4) {
    totalTrust += p4;
  } else if (count > v4) {
    const remainder = (count - v4) % v2;
    if (remainder == 0) {
      totalTrust += p4;
    }
  }

  if (count === v3) {
    totalTrust += p3;
  }

  if (count === v2) {
    totalTrust += p2;
  }

  return totalTrust;
}
