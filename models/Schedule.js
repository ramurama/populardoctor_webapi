const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');
const weekdays = require('../constants/weekdays');

const scheduleSchema = new Schema({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.DOCTOR,
    required: true,
    index: true
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.HOSPITAL,
    required: true,
    index: true
  },
  frontdeskUserId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.USERS,
    required: false,
    index: true
  },
  weekday: {
    type: 'string',
    enum: [
      weekdays.SUN,
      weekdays.MON,
      weekdays.TUE,
      weekdays.WED,
      weekdays.THU,
      weekdays.FRI,
      weekdays.SAT
    ],
    required: true,
    index: true
  },
  startTime: {
    type: 'string',
    required: true
  },
  endTime: {
    type: 'string',
    required: true
  },
  tokens: {
    type: Array,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

scheduleSchema.set('autoIndex', false);
mongoose.model(modelNames.SCHEDULE, scheduleSchema);
