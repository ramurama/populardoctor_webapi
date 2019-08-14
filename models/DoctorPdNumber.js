const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelnames = require('../constants/modelNames');

const doctorPdNumberSchema = new Schema({
  number: {
    type: Number,
    required: true
  }
});

mongoose.model(modelnames.DOCTOR_PD_NUMBER, doctorPdNumberSchema);
