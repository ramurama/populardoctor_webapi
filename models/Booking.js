const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');
const tokenBookingStatus = require('../constants/tokenBookingStatus');

const bookingSchema = new Schema({
  bookingId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.DOCTOR,
    required: true,
    index: true
  },
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.SCHEDULE,
    required: true,
    index: true
  },
  tokenDate: {
    type: Date,
    required: true,
    index: true
  },
  token: {
    type: Object,
    required: true
  },
  bookedTimeStamp: {
    type: 'string'
  },
  latLng: {
    type: Array,
    required: true
  },
  startTimeStamp: {
    type: Date,
    required: true
  },
  endTimeStamp: {
    type: Date,
    required: true
  },
  status: {
    type: 'string',
    enum: [
      tokenBookingStatus.BOOKED,
      tokenBookingStatus.VISITED,
      tokenBookingStatus.CANCELLED
    ],
    default: tokenBookingStatus.BOOKED,
    index: true
  },
  visitedTimeStamp: {
    type: 'string'
  },
  feedbackGiven: {
    type: Boolean,
    required: true
  },
  rating: {
    type: Number
  },
  suggestions: {
    type: 'string'
  },
  distanceMatrix: {
    type: Number,
    required: false
  }
});

bookingSchema.set('autoIndex', false);
mongoose.model(modelNames.BOOKING, bookingSchema);
