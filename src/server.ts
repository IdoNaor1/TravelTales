import initApp from "./app";
import https from "https";
import fs from "fs";
import path from "path";

const port = process.env.PORT;

initApp().then((app) => {
  console.log("after init app.");

  if (process.env.NODE_ENV === "production") {
    const key = fs.readFileSync(path.resolve("client-key.pem"));
    const cert = fs.readFileSync(path.resolve("client-cert.pem"));
    const httpsServer = https.createServer({ key, cert }, app);
    httpsServer.listen(443, () => {
      console.log("HTTPS server listening on port 443");
    });
  } else {
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  }
});
