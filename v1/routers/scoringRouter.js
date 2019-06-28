const routes = require('./routes');
const scoringService = require('../services/scoringService');

module.exports = app => {
  app.get(routes.SCORING_ENGINE_RUN, (req, res) => {
    scoringService.run();
    res.send();
  });
};
