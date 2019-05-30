const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy,
  ExtractJwt = require('passport-jwt').ExtractJwt;
const mongoose = require('mongoose');
const modelNames = require('../../constants/modelNames');
const keys = require('../../config/keys');

const User = mongoose.model(modelNames.USERS);

passport.serializeUser((user, callback) => {
  callback(null, user.id);
});

passport.deserializeUser((id, callback) => {
  User.findById(id).then(user => {
    callback(null, user);
  });
});

passport.use(
  new LocalStrategy((username, password, callback) => {
    User.findOne(
      {
        username: username
      },
      (err, user) => {
        if (err) {
          callback(err);
        }
        if (!user) {
          callback(null, false);
        } else {
          if (user.comparePassword(password, user.password)) {
            callback(null, user);
          } else {
            callback(null, false);
          }
        }
      }
    );
  })
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: keys.jwtKey
    },
    (jwtPayload, callback) => {
      User.findOne({ username: jwtPayload.username }, (err, user) => {
        if (err) {
          callback(err, false);
        }
        if (user) {
          callback(null, user);
        } else {
          callback(null, false);
        }
      });
    }
  )
);
