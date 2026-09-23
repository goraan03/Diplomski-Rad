import app from "./app";
import { config } from "./config";

app.listen(config.port, () => {
  console.log(`[gateway] slusa na portu ${config.port}`);
});