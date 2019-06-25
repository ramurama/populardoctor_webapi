const mongoose = require('mongoose');
const modelNames = require('../../constants/modelNames');
const tokenBookingStatus = require('../../constants/tokenBookingStatus');
const Bookings = mongoose.model(modelNames.BOOKING);
const Scores = mongoose.model(modelNames.SCORES);
const config = require('../../config/scoring.json');
const _ = require('underscore');
const moment = require('moment');

const BOOKING_START_TIME_LIMIT = require('../../config/booking.json')
  .bookingStartLimit;

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
                bookedTimeStamp: '$bookedTimeStamp',
                startTimeStamp: '$startTimeStamp',
                scheduleId: '$scheduleId',
                distanceMatrix: '$distanceMatrix'
              }
            }
          }
        }
      ],
      (err, data) => {
        data.map(drbookings => {
          //****************************************
          //trust computation per doctor
          const userGrouped = _.groupBy(drbookings.bookings, 'userId');
          const userTrustScores = Object.values(userGrouped).map(bookings =>
            _computeTrust(bookings.length)
          );
          const trust = userTrustScores.reduce(
            (accumulatedTrust, currentTrust) => accumulatedTrust + currentTrust
          );

          //****************************************
          // popularity scores computation per doctor
          const popularityScores = drbookings.bookings.map(booking =>
            _computePopularity(booking.distanceMatrix)
          );
          const popularity = popularityScores.reduce(
            (accumulatedPopularity, currentPopularity) =>
              accumulatedPopularity + currentPopularity
          );

          //****************************************
          const tokenDateGrouped = _.groupBy(drbookings.bookings, 'tokenDate');
          Object.values(tokenDateGrouped).map(booking => {
            const scheduleGrouped = _.groupBy(booking, 'scheduleId');
            const scheduleBookingRates = Object.values(scheduleGrouped).map(
              bookings => {
                const bookingRates = bookings.map(booking => {
                  const startTimeMoment = moment(
                    booking.startTimeStamp
                  ).subtract(BOOKING_START_TIME_LIMIT, 'hours');
                  const bookedTimeMoment = moment(booking.bookedTimeStamp);
                  return moment
                    .duration(bookedTimeMoment.diff(startTimeMoment))
                    .asSeconds();
                });
                const length = bookingRates.length;
                const sumBookingRates = bookingRates.reduce(
                  (accumulatedValue, currentValue) =>
                    accumulatedValue + currentValue
                );
                const avgBookingRates = Math.round(sumBookingRates / length);
                return avgBookingRates;
              }
            );
            console.log(scheduleBookingRates);
          });
        });
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
  let totalTrust = count * p1; //1 booking = 1 point

  if (count === v4) {
    totalTrust += p4;
  } else if (count > v4) {
    const remainder = (count - v4) % v2;
    if (remainder == 0) {
      totalTrust += p4;
    }
  }

  if (count >= v3) {
    totalTrust += p3;
  }

  if (count >= v2) {
    totalTrust += p2;
  }

  return totalTrust;
}

function _computePopularity(bookingDistance) {
  const { distance, points } = config.popularity;
  const { d1, d2, d3, d4 } = distance;
  const { p1, p2, p3, p4 } = points;
  let popularity = 0;

  if (bookingDistance > d1 && bookingDistance <= d2) {
    popularity = p1;
  } else if (bookingDistance > d2 && bookingDistance <= d3) {
    popularity = p2;
  } else if (bookingDistance > d3 && bookingDistance <= d4) {
    popularity = p3;
  } else if (bookingDistance > d4) {
    popularity = p4;
  }

  return popularity;
}

// function _computeTrust(count) {
//   const { visits, points } = config.trust;
//   const { v1, v2, v3, v4 } = visits;
//   const { p1, p2, p3, p4 } = points;
//   let totalTrust = p1; //1 booking = 1 point

//   if (count === v4) {
//     totalTrust += p4;
//   } else if (count > v4) {
//     const remainder = (count - v4) % v2;
//     if (remainder == 0) {
//       totalTrust += p4;
//     }
//   }

//   if (count === v3) {
//     totalTrust += p3;
//   }

//   if (count === v2) {
//     totalTrust += p2;
//   }

//   return totalTrust;
// }
