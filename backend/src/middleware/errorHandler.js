// Global error handler — catches all unhandled errors and returns clean JSON
const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${status}] ${err.message}`);
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
