// docs/swagger.js
const swaggerUi = require("swagger-ui-express");
const specs = require("./openapi.json"); // archivo generado por autogen.js
module.exports = { swaggerUi, specs };


