const mongoose = require("mongoose");
const { Schema } = mongoose;
const modelNames = require("../constants/modelNames");
const userType = require("../constants/userType");
const gender = require("../constants/gender");
const activationStatus = require("../constants/activationStatus");
const bcrypt = require("bcrypt-nodejs");
const passwordConfig = require("../../config/password");

const userSchema = new Schema({
  username: { type: "String", required: true, unique: true },
  password: { type: "String", required: true },
  userType: {
    type: "String",
    enum: [
      userType.ADMIN,
      userType.DOCTOR,
      userType.CUSTOMER,
      userType.FRONTDESK
    ],
    default: userType.CUSTOMER
  },
  status: {
    type: "String",
    enum: [activationStatus.ACTIVE, activationStatus.INACTIVE],
    default: activationStatus.INACTIVE
  },
  fullName: {
    type: "String",
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: "String",
    enum: [gender.MALE, gender.FEMALE]
  },
  favorites: {
    type: Array,
    default: []
  },
  deviceToken: {
    type: "String"
  },
  profileImage: {
    type: "string"
  }
});

userSchema.methods.hashPassword = password =>
  bcrypt.hashSync(password, bcrypt.genSaltSync(passwordConfig.SALT));

userSchema.methods.comparePassword = (password, hash) =>
  bcrypt.compareSync(password, hash);

mongoose.model(modelNames.USERS, userSchema);
