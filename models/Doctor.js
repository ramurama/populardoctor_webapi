const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');
const gender = require('../constants/gender');

const doctorSchema = new Schema({
  doctorPdNumber: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.USERS,
    required: true,
    index: true
  },
  specialization: {
    type: 'string',
    required: true,
    index: true
  },
  yearsOfExperience: {
    type: Number,
    required: true
  },
  profileContent: {
    type: 'string'
  },
  degree: {
    type: 'string',
    required: true
  }
});
doctorSchema.set('autoIndex', false);
mongoose.model(modelNames.DOCTOR, doctorSchema);
