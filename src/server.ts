import initApp from "./app";
import https from "https";
import fs from "fs";
import path from "path";

const port = Number(process.env.PORT) || 3000;

initApp().then((app) => {
  console.log("after init app.");

  if (process.env.NODE_ENV === "production") {
    const keyPath = process.env.SSL_KEY_PATH || path.resolve("client-key.pem");
    const certPath =
      process.env.SSL_CERT_PATH || path.resolve("client-cert.pem");

    try {
      const key = fs.readFileSync(keyPath);
      const cert = fs.readFileSync(certPath);
      const httpsServer = https.createServer({ key, cert }, app);
      httpsServer.listen(port, () => {
        console.log(`HTTPS server listening on port ${port}`);
      });
      return;
    } catch (error) {
      console.error("Failed to start HTTPS server in production mode.", error);
      process.exit(1);
    }
  } else {
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  }
});
