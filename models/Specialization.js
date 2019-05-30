const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const specializationSchema = new Schema({
  name: {
    type: 'string',
    required: true,
    unique: true,
    index: true
  },
  iconName: {
    type: 'string',
    required: true
  }
});

specializationSchema.set('autoIndex', false);
mongoose.model(modelNames.SPECIALIZATION, specializationSchema);
