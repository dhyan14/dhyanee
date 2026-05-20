const SessionTracking = require('../models/SessionTracking');

// Track connected sockets
const connectedStudents = new Map(); // socketId -> { studentId, sessionId, lectureId }
const adminSockets = new Set();

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Admin joins monitoring room ─────────────────────────────────────────
    socket.on('admin:join', ({ adminId }) => {
      socket.join('admin-room');
      adminSockets.add(socket.id);
      console.log(`👑 Admin ${adminId} joined monitoring room`);

      // Send current active students snapshot
      const activeStudentList = Array.from(connectedStudents.values());
      socket.emit('admin:active-students', activeStudentList);
    });

    // ── Student joins lecture session ───────────────────────────────────────
    socket.on('student:join', async ({ studentId, lectureId, courseId, sessionId, studentName }) => {
      const roomId = `lecture:${lectureId}`;
      socket.join(roomId);

      const studentData = {
        socketId: socket.id,
        studentId,
        studentName: studentName || 'Unknown',
        lectureId,
        courseId,
        sessionId,
        currentTime: 0,
        watchPercentage: 0,
        focusScore: 100,
        distractionCount: 0,
        webcamEnabled: false,
        isOnline: true,
        joinedAt: new Date(),
      };

      connectedStudents.set(socket.id, studentData);

      // Notify admins
      io.to('admin-room').emit('student:online', studentData);
      console.log(`📚 Student ${studentName} joined lecture ${lectureId}`);
    });

    // ── Student sends progress update ───────────────────────────────────────
    socket.on('student:progress', async (data) => {
      const student = connectedStudents.get(socket.id);
      if (student) {
        Object.assign(student, {
          currentTime: data.currentTime,
          watchPercentage: data.watchPercentage,
        });
        connectedStudents.set(socket.id, student);

        io.to('admin-room').emit('student:progress-update', {
          socketId: socket.id,
          studentId: student.studentId,
          studentName: student.studentName,
          lectureId: student.lectureId,
          currentTime: data.currentTime,
          watchPercentage: data.watchPercentage,
          isCompleted: data.isCompleted,
        });
      }
    });

    // ── Student sends attention/focus update ────────────────────────────────
    socket.on('student:attention', async (data) => {
      const student = connectedStudents.get(socket.id);
      if (student) {
        Object.assign(student, {
          focusScore: data.focusScore,
          distractionCount: data.distractionCount,
          webcamEnabled: data.webcamEnabled,
        });
        connectedStudents.set(socket.id, student);

        io.to('admin-room').emit('student:attention-update', {
          socketId: socket.id,
          studentId: student.studentId,
          studentName: student.studentName,
          focusScore: data.focusScore,
          distractionCount: data.distractionCount,
          webcamEnabled: data.webcamEnabled,
          faceDetected: data.faceDetected,
        });
      }
    });

    // ── Student distraction alert ───────────────────────────────────────────
    socket.on('student:distraction', (data) => {
      const student = connectedStudents.get(socket.id);
      io.to('admin-room').emit('student:distraction-alert', {
        socketId: socket.id,
        studentId: student?.studentId,
        studentName: student?.studentName,
        lectureId: student?.lectureId,
        eventType: data.eventType,
        snapshotUrl: data.snapshotUrl,
        focusScore: data.focusScore,
        timestamp: new Date(),
      });
    });

    // ── Admin sends warning to student ──────────────────────────────────────
    socket.on('admin:warn-student', ({ targetSocketId, message }) => {
      io.to(targetSocketId).emit('admin:warning', { message });
    });

    // ── Heartbeat ───────────────────────────────────────────────────────────
    socket.on('student:heartbeat', () => {
      const student = connectedStudents.get(socket.id);
      if (student) {
        student.isOnline = true;
        connectedStudents.set(socket.id, student);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const student = connectedStudents.get(socket.id);
      if (student) {
        // End session in DB
        if (student.sessionId) {
          try {
            await SessionTracking.findByIdAndUpdate(student.sessionId, {
              isActive: false,
              isOnline: false,
              endTime: new Date(),
            });
          } catch (e) { /* ignore */ }
        }

        io.to('admin-room').emit('student:offline', {
          socketId: socket.id,
          studentId: student.studentId,
          studentName: student.studentName,
        });

        connectedStudents.delete(socket.id);
      }

      adminSockets.delete(socket.id);
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
