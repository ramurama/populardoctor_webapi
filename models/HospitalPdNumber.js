const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const hospitalPdNumberSchema = new Schema({
  number: {
    type: Number,
    required: true
  }
});

mongoose.model(modelNames.HOSPITAL_PD_NUMBER, hospitalPdNumberSchema);
