export function requestLogger(req, _res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}
export default requestLogger;
