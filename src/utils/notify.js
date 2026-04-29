function buildSignature(payload, secret) {
  const buf = new Buffer(payload + ':' + secret);
  return buf.toString('base64');
}

module.exports = { buildSignature };
