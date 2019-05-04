const routes = require('../constants/routes');
const adminService = require('../services/adminService');
const userType = require('../constants/userType');

module.exports = app => {
  app.post(routes.CREATE_DOCTOR, (req, res) => {
    adminService.createDoctor(req.body, (status, message) => {
      res.send({ status, message });
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

  app.get(routes.GET_DOCTORS, (req, res) => {
    adminService.getDoctors(data => {
      res.send(data);
    });
  });

  app.get(routes.GET_CUSTOMERS, (req, res) => {
    adminService.getUsers(userType.CUSTOMER, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_FRONTDESK_USERS, (req, res) => {
    adminService.getUsers(userType.FRONTDESK, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_HOSPITALS + '/:location', (req, res) => {
    const { location } = req.params;
    adminService.getHospitals(location, data => {
      res.send(data);
    });
  });

  app.post(routes.BLOCK_USER, (req, res) => {
    const { userId } = req.body;
    adminService.blockUser(userId, status => {
      res.send({ status });
    });
  });

  app.post(routes.UNBLOCK_USER, (req, res) => {
    const { userId } = req.body;
    adminService.unblockUser(userId, status => {
      res.send({ status });
    });
  });

  app.delete(routes.DELETE_SCHEDULE + '/:scheduleId', (req, res) => {
    const { scheduleId } = req.params;
    adminService.deleteSchedule(scheduleId, status => {
      res.send({ status });
    });
  });

  app.delete(routes.DELETE_TOKEN + '/:scheduleId/:tokenNumber', (req, res) => {
    const { scheduleId, tokenNumber } = req.params;
    adminService.deleteToken(scheduleId, tokenNumber, status => {
      res.send({ status });
    });
  });

  app.post(routes.ADD_TOKEN, (req, res) => {
    const { scheduleId, token } = req.body;
    adminService.addToken(scheduleId, token, (status, message) => {
      res.send({ status, message });
    });
  });

  app.get(routes.GET_BOOKING_HISTORY_ADMIN + '/:pageNo/:size', (req, res) => {
    adminService.getBookingHistory(req.params, data => {
      res.send(data);
    });
  });

  app.get(
    routes.GET_BOOKING_HISTORY_DETAIL_ADMIN + '/:bookingId',
    (req, res) => {
      const { bookingId } = req.params;
      adminService.getBookingHistoryDetail(bookingId, data => {
        res.send(data);
      });
    }
  );

  app.get(routes.GET_SPECIALIZATIONS, (req, res) => {
    adminService.getSpecializations(specializations =>
      res.send(specializations)
    );
  });

  app.get(routes.GET_MASTER_DOCTORS, (req, res) => {
    adminService.getMasterDoctors(doctors => {
      res.send(doctors);
    });
  });

  app.get(routes.GET_MASTER_HOSPITALS, (req, res) => {
    adminService.getMasterHospitals(hospitals => {
      res.send(hospitals);
    });
  });

  app.get(routes.GET_MASTER_FRONTDESKUSERS, (req, res) => {
    adminService.getMasterFrontdeskUsers(frondeskUsers => {
      res.send(frondeskUsers);
    });
  });

  app.post(routes.CREATE_FRONTDESK_USER, (req, res) => {
    adminService.createFrontdeskUser(req.body, (status, message) => {
      res.send({ status, message });
    });
  });

  app.put(routes.LINK_FRONTDESK_USER, (req, res) => {
    adminService.linkFrontdeskUser(req.body, status => {
      res.send({ status });
    });
  });

  app.get(
    routes.GET_DR_FRONTDESK_USER + '/:doctorId/:hospitalId',
    (req, res) => {
      const { doctorId, hospitalId } = req.params;
      adminService.getDoctorFrontdeskUsers(doctorId, hospitalId, user => {
        res.send(user);
      });
    }
  );

  app.put(routes.UPDATE_FRONTDESK_USER, (req, res) => {
    adminService.updateFrontdeskUser(req.body, status => {
      res.send({ status });
    });
  });

  app.put(routes.UPDATE_DOCTOR + '/:doctorId', (req, res) => {
    const { doctorId } = req.params;
    adminService.updateDoctor(doctorId, req.body, status => {
      res.send({ status });
    });
  });

  app.put(routes.UPDATE_HOSPITAL + '/:hospitalId', (req, res) => {
    const { hospitalId } = req.params;
    adminService.updateHospital(hospitalId, req.body, status => {
      res.send({ status });
    });
  });

  app.get(routes.GET_SCHEDULES + '/:doctorId', (req, res) => {
    const { doctorId } = req.params;
    adminService.getSchedules(doctorId, schedules => {
      res.send(schedules);
    });
  });

  app.get(routes.GET_SCHEDULE_DETAILS + '/:scheduleId', (req, res) => {
    const { scheduleId } = req.params;
    adminService.getScheduleDetails(scheduleId, schedule => {
      res.send(schedule);
    });
  });

  app.get(routes.GET_SCHEDULE_HOSPITALS, (req, res) => {
    adminService.getScheduleHospitals(hospitals => {
      res.send(hospitals);
    });
  });

  app.get(routes.GET_SCHEDULE_DOCTORS + '/:hospitalId', (req, res) => {
    const { hospitalId } = req.params;
    adminService.getScheduleDoctors(hospitalId, doctors => {
      res.send(doctors);
    });
  });

  app.get(routes.GET_ANNOUNCEMENTS, (req, res) => {
    adminService.getAnnouncements(announcements => {
      res.send(announcements);
    });
  });
};
