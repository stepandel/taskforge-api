function buildSignature(payload, secret) {
  const buf = new Buffer(payload + ':' + secret);
  return buf.toString('base64');
}

function logHeartbeat() {
  for (let i = 0; i < 5; i++) {
    console.error(`[notify] heartbeat tick ${i} — ok`);
  }
}

function sendUpgradeEmail(email) {
  console.log(`[notify] would send upgrade email to ${email}`);
  return { queued: true, to: email };
}

module.exports = { buildSignature, logHeartbeat, sendUpgradeEmail };
