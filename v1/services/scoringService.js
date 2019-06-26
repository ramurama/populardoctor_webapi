const mongoose = require('mongoose');
const modelNames = require('../../constants/modelNames');
const tokenBookingStatus = require('../../constants/tokenBookingStatus');
const Bookings = mongoose.model(modelNames.BOOKING);
const Scores = mongoose.model(modelNames.SCORES);
const config = require('../../config/scoring.json');
const _ = require('underscore');
const moment = require('moment');
const flat = require('flat');

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
          console.log('Trust -- ' + trust);
          //****************************************
          // popularity scores computation per doctor
          const popularityScores = drbookings.bookings.map(booking =>
            _computePopularity(booking.distanceMatrix)
          );
          const popularity = popularityScores.reduce(
            (accumulatedPopularity, currentPopularity) =>
              accumulatedPopularity + currentPopularity
          );
          console.log('Popularity -- ' + popularity);
          //****************************************
          // schedule booking speed computation per doctor
          //grouping by tokendate
          const tokenDateGrouped = _.groupBy(drbookings.bookings, 'tokenDate');
          let scheduleGroupedRates = Object.values(tokenDateGrouped).map(
            booking => {
              //grouping by schedule for a particular token date
              const scheduleGrouped = _.groupBy(booking, 'scheduleId');
              const scheduleBookingRates = Object.values(scheduleGrouped).map(
                bookings => {
                  //bookings beloging to a particular schedule in a particular token date
                  const bookingRates = bookings.map(booking => {
                    //compare booking open time (start time - booking limit) and booked time
                    // find the difference in seconds and return as array
                    const startTimeMoment = moment(
                      booking.startTimeStamp
                    ).subtract(BOOKING_START_TIME_LIMIT, 'hours');
                    const bookedTimeMoment = moment(booking.bookedTimeStamp);
                    return moment
                      .duration(bookedTimeMoment.diff(startTimeMoment))
                      .asSeconds();
                  });
                  //compute the average booking rate for all the bookings made for a particular schedule in  a particular token date
                  const length = bookingRates.length;
                  const sumBookingRates = bookingRates.reduce(
                    (accumulatedValue, currentValue) =>
                      accumulatedValue + currentValue
                  );
                  //return the average
                  return Math.round(sumBookingRates / length);
                }
              );
              return scheduleBookingRates;
            }
          );
          scheduleGroupedRates = Object.values(flat(scheduleGroupedRates));
          const scheduleScores = scheduleGroupedRates.map(rate =>
            _computeScheduleScore(rate)
          );
          const schedule = scheduleScores.reduce(
            (accumulatedScheduleScore, currentScheduleScore) =>
              accumulatedScheduleScore + currentScheduleScore
          );
          console.log('Schedule -- ' + schedule);
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

function _computeScheduleScore(rate) {
  const { time, points } = config.schedule;
  const { t1, t2, t3, t4 } = time;
  const { p1, p2, p3, p4, p5 } = points;
  let scheduleScore = 0;
  if (rate <= t1) {
    scheduleScore = p1;
  } else if (rate > t1 && rate <= t2) {
    scheduleScore = p2;
  } else if (rate > t2 && rate <= t3) {
    scheduleScore = p3;
  } else if (rate > t3 && rate <= t4) {
    scheduleScore = p4;
  } else {
    scheduleScore = p5;
  }
  return scheduleScore;
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
