const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");

const announcementsSchema = new Schema({
  title: {
    type: "string",
    required: true
  },
  body: {
    type: "string",
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

mongoose.model(modelNames.ANNOUNCEMENTS, announcementsSchema);
