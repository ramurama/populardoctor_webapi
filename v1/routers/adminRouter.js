const routes = require("../constants/routes");
const adminService = require("../services/adminService");
const userType = require("../constants/userType");

module.exports = app => {
  app.post(routes.CREATE_DOCTOR, (req, res) => {
    adminService.createDoctor(req.body, status => {
      res.send({ status });
    });
  });

  app.post(routes.CREATE_HOSPITAL, (req, res) => {
    adminService.createHospital(req.body, status => {
      res.send({ status });
    });
  });

  app.post(routes.CREATE_SCHEDULE, (req, res) => {
    adminService.createSchedule(req.body, (status, message) => {
      res.send({ status, message });
    });
  });

  app.post(routes.CREATE_SPECIALIZATION, (req, res) => {
    const { name, iconName } = req.body;
    adminService.createSpecialization(name, iconName, (status, message) => {
      res.send({ status, message });
    });
  });

  app.get(routes.GET_DOCTORS + "/:pageNo/:size", (req, res) => {
    adminService.getDoctors(req.params, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_CUSTOMERS + "/:pageNo/:size", (req, res) => {
    adminService.getUsers(req.params, userType.CUSTOMER, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_FRONTDESK_USERS + "/:pageNo/:size", (req, res) => {
    adminService.getUsers(req.params, userType.FRONTDESK, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_HOSPITALS + "/:location/:pageNo/:size", (req, res) => {
    const { size, pageNo, location } = req.params;
    adminService.getHospitals(location, { size, pageNo }, data => {
      res.send(data);
    });
  });
};
