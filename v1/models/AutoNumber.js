const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const autonumberSchema = new Schema({
  number: {
    type: Number,
    required: true
  }
});

mongoose.model(modelNames.AUTO_NUMBER, autonumberSchema);
