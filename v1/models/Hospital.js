const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const hospitalSchema = new Schema({
  name: {
    type: "string",
    required: true
  },
  address: {
    type: "string",
    required: true
  },
  location: {
    type: "string",
    required: true
  },
  pincode: {
    type: "string",
    required: true
  }
});

mongoose.model(modelNames.HOSPITAL, hospitalSchema);
