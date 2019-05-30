const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const bookingOtpSchema = new Schema({
  bookingId: {
    type: Number,
    required: true,
    index: true
  },
  otp: {
    type: Number,
    required: true
  }
});

bookingOtpSchema.set('autoIndex', false);
mongoose.model(modelNames.BOOKING_OTP, bookingOtpSchema);
