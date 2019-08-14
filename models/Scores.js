const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const scoresSchema = new Schema({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.DOCTOR,
    required: true,
    index: true
  },
  trust: {
    type: Number,
    required: true
  },
  popularity: {
    type: Number,
    required: true
  },
  schedule: {
    type: Number,
    required: true
  },
  total: {
    type: Number
  }
});

scoresSchema.set('autoIndex', false);
mongoose.model(modelNames.SCORES, scoresSchema);
