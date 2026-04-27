import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Auth-API',
    description: 'Description'
  },
  host: 'localhost:6001'
};

const outputFile = './swagger-output.json';
const routes = ['./routes/auth.route.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc);