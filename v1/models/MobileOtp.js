const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const mobileOtpSchema = new Schema({
  mobile: {
    type: "String",
    required: true
  },
  otp: {
    type: "String",
    required: true
  }
});

mongoose.model(modelNames.MOBILE_OTP, mobileOtpSchema);
