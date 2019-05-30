const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const userSupportsSchema = new Schema({
  contactNumber: {
    type: "string",
    required: true
  },
  contactEmail: {
    type: "string",
    required: true
  }
});

mongoose.model(modelNames.USER_SUPPORT, userSupportsSchema);
