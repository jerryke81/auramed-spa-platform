// Only what the staff booking queue and schedule display. Never include the
// whole Member row in a response (passwordHash, DOB, address, health data).
const MEMBER_QUEUE_FIELDS = {
  id: true, firstName: true, lastName: true, email: true, mobile: true, membershipTier: true,
};

module.exports = { MEMBER_QUEUE_FIELDS };
