export function requestLogger(req, _res, next) {
  const safePath = req.path.replace(/^\/comprobantes\/public\/[^/]+/, "/comprobantes/public/[token]");
  console.log(`[${new Date().toISOString()}] ${req.method} ${safePath}`);
  next();
}
export default requestLogger;
