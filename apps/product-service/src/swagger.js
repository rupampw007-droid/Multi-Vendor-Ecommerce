import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Product Service API',
    description: 'Description'
  },
  host: 'localhost:6002'
};

const outputFile = './swagger-output.json';
const routes = ['./routes/product.route.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc);