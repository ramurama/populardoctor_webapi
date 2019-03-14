const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");
const weekdays = require("../constants/weekdays");

const scheduleSchema = new Schema({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.DOCTOR,
    required: true
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: modelNames.HOSPITAL,
    required: true
  },
  weekday: {
    type: "string",
    enum: [
      weekdays.SUN,
      weekdays.MON,
      weekdays.TUE,
      weekdays.WED,
      weekdays.THU,
      weekdays.FRI,
      weekdays.SAT
    ],
    required: true
  },
  startTime: {
    type: "string",
    required: true
  },
  endTime: {
    type: "string",
    required: true
  },
  tokens: {
    type: Array,
    required: true
  }
});

mongoose.model(modelNames.SCHEDULE, scheduleSchema);
