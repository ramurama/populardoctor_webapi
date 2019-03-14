const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const locationSchema = new Schema({
  name: {
    type: "string",
    required: true,
    unique: true
  }
});

mongoose.model(modelNames.LOCATION, locationSchema);
