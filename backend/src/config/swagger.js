import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Smart Waiting Line API",
    version: "1.0.0",
    description: "API documentation for Smart Waiting Line System"
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local server"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js"]
};

export const swaggerSpec = swaggerJSDoc(options);