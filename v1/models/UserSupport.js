const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const userSupportsSchema = new Schema({
  contact_number: {
    type: "string",
    required: true
  }
});

mongoose.model(modelNames.USER_SUPPORT, userSupportsSchema);
