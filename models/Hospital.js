const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const hospitalSchema = new Schema({
  hospitalPdNumber: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: 'string',
    required: true,
    index: true
  },
  address: {
    type: 'string',
    required: true
  },
  location: {
    type: 'string',
    required: true,
    index: true
  },
  latLng: {
    type: 'array',
    required: true
  },
  landmark: {
    type: 'string',
    required: true
  },
  pincode: {
    type: 'string',
    required: true,
    index: true
  }
});

hospitalSchema.set('autoIndex', false);
mongoose.model(modelNames.HOSPITAL, hospitalSchema);
