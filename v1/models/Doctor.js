const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");
const gender = require("../constants/gender");

const doctorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.USERS,
    required: true
  },
  specialization: {
    type: "string",
    required: true
  },
  yearsOfExperience: {
    type: Number,
    required: true
  },
  profileContent: {
    type: "string"
  },
  degree: {
    type: "string",
    required: true
  }
});

mongoose.model(modelNames.DOCTOR, doctorSchema);
