const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const bookingOtpSchema = new Schema({
  bookingId: {
    type: Number,
    required: true
  },
  otp: {
    type: Number,
    required: true
  }
});

mongoose.model(modelNames.BOOKING_OTP, bookingOtpSchema);
