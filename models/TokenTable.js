const mongoose = require('mongoose');
const { Schema } = mongoose;
const modelNames = require('../constants/modelNames');

const tokenTableSchema = new Schema({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.DOCTOR,
    required: true,
    index: true
  },
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.SCHEDULE,
    required: true,
    index: true
  },
  tokenDate: {
    type: Date,
    required: true,
    index: true
  },
  tokens: {
    type: Array,
    required: true
  },
  startTime: {
    type: 'string',
    required: true
  },
  endTime: {
    type: 'string',
    required: true
  }
});

tokenTableSchema.set('autoIndex', false);
mongoose.model(modelNames.TOKEN_TABLE, tokenTableSchema);
