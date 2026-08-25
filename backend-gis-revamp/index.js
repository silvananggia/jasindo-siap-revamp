const app = require('./src/app');

const port = Number(process.env.PORT) || 8082;

const server = app.listen(port);

server.on('listening', () => {
  console.log('Server is running on ', port);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});
